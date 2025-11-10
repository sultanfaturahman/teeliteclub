/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ATTEMPT_SEPARATOR = '-ATTEMPT-';

const buildAttemptedOrderId = (baseOrderNumber = '') => {
  const trimmedBase = baseOrderNumber.trim();
  const suffix = `${ATTEMPT_SEPARATOR}${Date.now()}`;
  const maxLength = 50;

  if (!trimmedBase) {
    return `ORDER${suffix}`;
  }

  if (trimmedBase.length + suffix.length <= maxLength) {
    return `${trimmedBase}${suffix}`;
  }

  return `${trimmedBase.slice(0, maxLength - suffix.length)}${suffix}`;
};

const getBaseUrl = () => {
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return (
    Deno.env.get('PUBLIC_BASE_URL') ||
    Deno.env.get('ALLOWED_ORIGIN') ||
    allowedOrigins[0] ||
    'http://localhost:5173'
  );
};

const getSnapUrl = () => {
  const environment = Deno.env.get('MIDTRANS_ENVIRONMENT') === 'production' ? 'production' : 'sandbox';
  return environment === 'production'
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
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

    if (order.status !== 'pending') {
      return new Response(JSON.stringify({ 
        error: 'Order is not in pending status',
        current_status: order.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');
    if (!serverKey) {
      throw new Error('Midtrans server key not configured');
    }

    // Cancel existing pending payment attempts before creating a new one
    const cancelPendingResult = await supabaseService
      .from('payments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('order_id', order.id)
      .eq('status', 'pending');

    if (cancelPendingResult.error) {
      console.error('Failed to cancel pending payments before recovery:', cancelPendingResult.error);
    }

    const midtransOrderId = buildAttemptedOrderId(order.order_number);
    const snapUrl = getSnapUrl();
    const baseUrl = getBaseUrl();
    const roundedTotal = Math.round(order.total || 0);

    // Prepare Midtrans transaction data
    const transactionData = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: roundedTotal
      },
      customer_details: {
        first_name: order.nama_pembeli || user.email?.split('@')[0] || 'Customer',
        email: order.email_pembeli || user.email,
        phone: order.telepon_pembeli || ''
      },
      callbacks: {
        finish: `${baseUrl}/finish-payment?order_id=${midtransOrderId}&transaction_status={transaction_status}&status_code={status_code}`,
        unfinish: `${baseUrl}/payment-error?order_id=${order.order_number}&transaction_status=cancel&error_type=cancelled`,
        error: `${baseUrl}/payment-error?order_id=${order.order_number}&transaction_status=failure&error_type=system&error_code={status_code}`
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

    // Update order with new payment details
    const { error: updateError } = await supabaseService
      .from('orders')
      .update({ 
        payment_url: midtransData.redirect_url,
        tracking_number: midtransOrderId,
        payment_method: 'Midtrans',
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    // Upsert latest payment attempt metadata
    const paymentUpsertResult = await supabaseService
      .from('payments')
      .upsert(
        {
          order_id: order.id,
          amount: order.total,
          status: 'pending',
          payment_proof: JSON.stringify({
            midtrans_order_id: midtransOrderId,
            generated_at: new Date().toISOString(),
            source: 'recover-payment-url'
          }),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'order_id' }
      );

    if (paymentUpsertResult.error) {
      console.error('Failed to upsert payment record during recovery:', paymentUpsertResult.error);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment session regenerated successfully',
      payment_url: midtransData.redirect_url,
      token: midtransData.token,
      order_number: order.order_number,
      midtrans_order_id: midtransOrderId
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
