/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('=== CLEANUP EXPIRED ORDERS ===');
    console.log('Timestamp:', new Date().toISOString());

    // Find orders that are pending for more than 2 hours
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() - 2);

    const { data: expiredOrders, error: ordersError } = await supabaseService
      .from('orders')
      .select(`
        id, 
        order_number,
        created_at,
        status,
        order_items (
          product_id,
          jumlah,
          ukuran
        )
      `)
      .eq('status', 'pending')
      .lt('created_at', expiryTime.toISOString());

    if (ordersError) {
      throw new Error(`Failed to fetch expired orders: ${ordersError.message}`);
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('No expired orders found');
      return new Response(JSON.stringify({
        status: 'success',
        message: 'No expired orders found',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Found ${expiredOrders.length} expired orders to cleanup`);

    let processedCount = 0;
    let errorCount = 0;

    for (const order of expiredOrders) {
      try {
        console.log(`Processing expired order: ${order.order_number} (${order.id})`);

        // Restore stock for each order item
        if (order.order_items && order.order_items.length > 0) {
          console.log(`Restoring stock for ${order.order_items.length} items in order ${order.order_number}`);

          for (const item of order.order_items) {
            try {
              // Get current stock
              const { data: currentStock, error: stockError } = await supabaseService
                .from('product_sizes')
                .select('stok')
                .eq('product_id', item.product_id)
                .eq('ukuran', item.ukuran)
                .single();

              if (stockError) {
                console.error(`Error getting stock for product ${item.product_id}, size ${item.ukuran}:`, stockError);
                continue;
              }

              const newStock = (currentStock?.stok || 0) + item.jumlah;

              const { error: updateError } = await supabaseService
                .from('product_sizes')
                .update({ stok: newStock })
                .eq('product_id', item.product_id)
                .eq('ukuran', item.ukuran);

              if (updateError) {
                console.error(`Error restoring stock for product ${item.product_id}:`, updateError);
                continue;
              }

              console.log(`Restored stock for product ${item.product_id}, size ${item.ukuran}: +${item.jumlah} = ${newStock}`);
            } catch (itemError) {
              console.error(`Error processing item ${item.product_id}:`, itemError);
            }
          }

          // Update total stock for affected products
          const uniqueProductIds = [...new Set(order.order_items.map(item => item.product_id))];
          for (const productId of uniqueProductIds) {
            try {
              const { data: allSizes } = await supabaseService
                .from('product_sizes')
                .select('stok')
                .eq('product_id', productId);

              if (allSizes) {
                const totalStock = allSizes.reduce((total, size) => total + (size.stok || 0), 0);
                
                await supabaseService
                  .from('products')
                  .update({ stock_quantity: totalStock })
                  .eq('id', productId);

                console.log(`Updated total stock for product ${productId}: ${totalStock}`);
              }
            } catch (productError) {
              console.error(`Error updating total stock for product ${productId}:`, productError);
            }
          }
        }

        // Update order status to expired
        const { error: orderUpdateError } = await supabaseService
          .from('orders')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (orderUpdateError) {
          console.error(`Error updating order ${order.order_number} status:`, orderUpdateError);
          errorCount++;
          continue;
        }

        console.log(`Successfully processed expired order: ${order.order_number}`);
        processedCount++;

      } catch (orderError) {
        console.error(`Error processing order ${order.order_number}:`, orderError);
        errorCount++;
      }
    }

    console.log(`Cleanup completed: ${processedCount} orders processed, ${errorCount} errors`);

    return new Response(JSON.stringify({
      status: 'success',
      message: `Cleanup completed`,
      processed: processedCount,
      errors: errorCount,
      total_found: expiredOrders.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in cleanup function:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
