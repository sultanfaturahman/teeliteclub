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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, new_status } = await req.json();

    console.log('Update order status request:', { order_id, new_status });

    if (!order_id || !new_status) {
      return new Response(JSON.stringify({ 
        error: 'order_id and new_status are required' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Authenticate user (optional for admin functions)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: userData } = await supabaseService.auth.getUser(token);
      console.log('Request from user:', userData.user?.email);
    }

    // Update order status
    const { data: updateResult, error: updateError } = await supabaseService
      .from('orders')
      .update({ 
        status: new_status,
        updated_at: new Date().toISOString()
      })
      .eq('order_number', order_id)
      .select('id, order_number, status, user_id')
      .single();

    if (updateError) {
      console.error('Error updating order status:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to update order status',
        details: updateError.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!updateResult) {
      return new Response(JSON.stringify({ 
        error: 'Order not found',
        order_id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log('Order status updated successfully:', updateResult);

    return new Response(JSON.stringify({
      success: true,
      order: updateResult,
      message: `Order ${order_id} status updated to ${new_status}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in update-order-status function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
