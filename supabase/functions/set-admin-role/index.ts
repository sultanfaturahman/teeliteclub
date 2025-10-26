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
    const { user_email, make_admin } = await req.json();

    console.log('Set admin role request:', { user_email, make_admin });

    if (!user_email) {
      return new Response(JSON.stringify({ 
        error: 'user_email is required' 
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

    // Find user by email
    const { data: userData, error: userError } = await supabaseService.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      return new Response(JSON.stringify({ 
        error: 'Failed to find user',
        details: userError.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const targetUser = userData.users.find(u => u.email === user_email);
    
    if (!targetUser) {
      return new Response(JSON.stringify({ 
        error: 'User not found',
        user_email 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Update user role in profiles table
    const newRole = make_admin ? 'admin' : 'user';
    const { data: updateResult, error: updateError } = await supabaseService
      .from('profiles')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUser.id)
      .select('id, email, role')
      .single();

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to update user role',
        details: updateError.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log('User role updated successfully:', updateResult);

    return new Response(JSON.stringify({
      success: true,
      user: updateResult,
      message: `User ${user_email} role updated to ${newRole}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in set-admin-role function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
