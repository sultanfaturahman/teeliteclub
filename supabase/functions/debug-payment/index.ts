/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== DEBUG PAYMENT FUNCTION START ===');
    console.log('Method:', req.method);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    
    // Check environment variables
    const envCheck = {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_ANON_KEY: !!Deno.env.get('SUPABASE_ANON_KEY'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      MIDTRANS_SERVER_KEY: !!Deno.env.get('MIDTRANS_SERVER_KEY'),
      MIDTRANS_ENVIRONMENT: Deno.env.get('MIDTRANS_ENVIRONMENT'),
      ALLOWED_ORIGIN: Deno.env.get('ALLOWED_ORIGIN')
    };
    console.log('Environment check:', envCheck);

    // Try to parse request body
    let requestBody;
    try {
      const rawBody = await req.text();
      console.log('Raw request body length:', rawBody.length);
      console.log('Raw request body preview:', rawBody.substring(0, 200));
      
      requestBody = JSON.parse(rawBody);
      console.log('Request body parsed successfully');
      console.log('Request body keys:', Object.keys(requestBody));
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return new Response(JSON.stringify({
        error: 'Failed to parse request body',
        details: error.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return success with debug info
    return new Response(JSON.stringify({
      success: true,
      debug: {
        environment: envCheck,
        requestBodyKeys: Object.keys(requestBody),
        hasOrderData: !!requestBody.orderData,
        hasItems: !!requestBody.items,
        itemsCount: requestBody.items?.length || 0
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Debug function error:', error);
    return new Response(JSON.stringify({
      error: 'Debug function failed',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
