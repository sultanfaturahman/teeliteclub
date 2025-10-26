/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== CHECK PAYMENT STATUS FUNCTION START ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));

    const { order_id, transaction_status, status_code } = await req.json();

    console.log('Payment status check request:', { order_id, transaction_status, status_code });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user from JWT (since verify_jwt = false, we handle auth manually)
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);

    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    console.log('Auth result:', { hasUser: !!data.user, error: authError?.message });

    if (authError || !data.user) {
      console.error('Authentication error:', authError);
      throw new Error(`User not authenticated: ${authError?.message || 'No user data'}`);
    }

    const user = data.user;
    console.log('User authenticated:', user.id);

    // Create service client for database updates
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get order from database using service client (bypasses RLS)
    console.log('Querying order:', { order_id, user_id: user.id });

    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select('*')
      .eq('order_number', order_id)
      .eq('user_id', user.id)
      .single();

    console.log('Order query result:', { hasOrder: !!order, error: orderError?.message });

    if (orderError || !order) {
      throw new Error(`Order not found or access denied: ${orderError?.message || 'No order data'}`);
    }

    console.log('Order found:', order.id, order.status);

    let paymentStatus = null;
    
    // If we have transaction status from URL params, use it as primary source
    if (transaction_status) {
      console.log('Using transaction status from URL params:', transaction_status);
      paymentStatus = {
        order_id: order_id,
        transaction_status: transaction_status,
        status_code: status_code,
        transaction_time: new Date().toISOString(),
        gross_amount: order.total.toString()
      };
    } else {
      // Try to get from Midtrans API as fallback
      const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');
      const isProduction = Deno.env.get('MIDTRANS_ENVIRONMENT') === 'production';
      
      if (serverKey) {
        try {
          const statusUrl = isProduction 
            ? `https://api.midtrans.com/v2/${order_id}/status`
            : `https://api.sandbox.midtrans.com/v2/${order_id}/status`;

          console.log('Checking with Midtrans API:', statusUrl);

          const midtransResponse = await fetch(statusUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Basic ${btoa(serverKey + ':')}`
            }
          });

          if (midtransResponse.ok) {
            paymentStatus = await midtransResponse.json();
            console.log('Midtrans API response:', paymentStatus);
          } else {
            console.warn('Midtrans API error:', midtransResponse.status, midtransResponse.statusText);
          }
        } catch (midtransError) {
          console.error('Midtrans API call failed:', midtransError);
        }
      }
    }

    // If no payment status available, create a default one based on order status
    if (!paymentStatus) {
      console.log('No payment status available, using order status:', order.status);
      paymentStatus = {
        order_id: order_id,
        transaction_status: order.status === 'paid' ? 'settlement' : 'pending',
        transaction_time: order.updated_at || order.created_at,
        gross_amount: order.total.toString()
      };
    }

    console.log('Final payment status:', paymentStatus);

    // Update order status based on payment status
    let newOrderStatus = order.status;
    if (paymentStatus.transaction_status === 'settlement' || paymentStatus.transaction_status === 'capture') {
      newOrderStatus = 'paid';
    } else if (paymentStatus.transaction_status === 'pending') {
      newOrderStatus = 'pending'; // Keep as 'pending' so Continue Payment button shows
    } else if (['deny', 'cancel', 'expire', 'failure'].includes(paymentStatus.transaction_status)) {
      newOrderStatus = 'cancelled'; // Use 'cancelled' instead of 'payment_failed' to match DB constraint
    }

    // Update order status if changed
    if (newOrderStatus !== order.status) {
      console.log('Updating order status from', order.status, 'to', newOrderStatus);
      
      // Prepare update object
      const updateData: any = { status: newOrderStatus };
      
      // Clear payment_url if payment is successful
      if (newOrderStatus === 'paid') {
        updateData.payment_url = null;
        console.log('Clearing payment URL for successful payment');
      }
      
      await supabaseService
        .from('orders')
        .update(updateData)
        .eq('id', order.id);
      
      order.status = newOrderStatus;
    }

    // Create or update payment record
    try {
      const { error: paymentError } = await supabaseService
        .from('payments')
        .upsert({
          order_id: order.id,
          amount: parseFloat(paymentStatus.gross_amount || order.total.toString()),
          status: paymentStatus.transaction_status,
          payment_proof: JSON.stringify(paymentStatus),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'order_id'
        });

      if (paymentError) {
        console.error('Error updating payment record:', paymentError);
      } else {
        console.log('Payment record updated successfully');
      }
    } catch (paymentRecordError) {
      console.error('Failed to update payment record:', paymentRecordError);
    }

    return new Response(JSON.stringify({
      order,
      payment_status: paymentStatus
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
