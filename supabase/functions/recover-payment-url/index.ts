/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ 
        error: 'order_id is required' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create service client
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get order details
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found or access denied');
    }

    // Check if order is eligible for payment URL recovery
    if (order.status !== 'pending') {
      return new Response(JSON.stringify({ 
        error: 'Order is not in pending status',
        current_status: order.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (order.payment_url) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Order already has payment URL',
        payment_url: order.payment_url
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Create new Midtrans payment for legacy order
    const environment = Deno.env.get('MIDTRANS_ENVIRONMENT') || 'sandbox';
    const isProduction = environment === 'production';
    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');

    if (!serverKey) {
      throw new Error('Midtrans server key not configured');
    }

    const snapUrl = isProduction 
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    // Prepare Midtrans transaction data
    const transactionData = {
      transaction_details: {
        order_id: order.order_number,
        gross_amount: Math.round(order.total)
      },
      customer_details: {
        first_name: order.nama_pembeli || 'Customer',
        email: order.email_pembeli || user.email,
        phone: order.telepon_pembeli || ''
      },
      callbacks: {
        finish: `${Deno.env.get('ALLOWED_ORIGIN')}/finish-payment?order_id=${order.order_number}&transaction_status={transaction_status}&status_code={status_code}`,
        unfinish: `${Deno.env.get('ALLOWED_ORIGIN')}/payment-error?order_id=${order.order_number}&transaction_status=cancel&error_type=cancelled`,
        error: `${Deno.env.get('ALLOWED_ORIGIN')}/payment-error?order_id=${order.order_number}&transaction_status=failure&error_type=system&error_code={status_code}`
      }
    };

    // Call Midtrans API
    const midtransResponse = await fetch(snapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(serverKey + ':')}`
      },
      body: JSON.stringify(transactionData)
    });

    if (!midtransResponse.ok) {
      const errorText = await midtransResponse.text();
      throw new Error(`Midtrans API error: ${errorText}`);
    }

    const midtransData = await midtransResponse.json();

    // Update order with new payment URL
    const { error: updateError } = await supabaseService
      .from('orders')
      .update({ 
        payment_url: midtransData.redirect_url,
        tracking_number: midtransData.token,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment URL recovered successfully',
      payment_url: midtransData.redirect_url,
      order_number: order.order_number
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error recovering payment URL:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to recover payment URL'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
