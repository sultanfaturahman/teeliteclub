/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
}

// Function to verify Midtrans signature
async function verifySignature(notification: MidtransNotification, serverKey: string): Promise<boolean> {
  try {
    const orderId = notification.order_id;
    const statusCode = notification.status_code;
    const grossAmount = notification.gross_amount;
    
    const signatureString = `${orderId}${statusCode}${grossAmount}${serverKey}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex === notification.signature_key;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    const notification = await req.json() as MidtransNotification;

    // Validate required fields
    if (!notification.order_id || !notification.transaction_status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Verify Midtrans signature for security
    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');
    if (!serverKey) {
      console.error('MIDTRANS_SERVER_KEY not configured - webhook authentication failed');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const isSignatureValid = await verifySignature(notification, serverKey);
    if (!isSignatureValid) {
      console.error('Invalid signature detected');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('=== MIDTRANS WEBHOOK RECEIVED ===');
    console.log('Notification:', JSON.stringify(notification, null, 2));
    console.log('Timestamp:', new Date().toISOString());

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    let orderStatus = 'pending';

    // Determine order status based on Midtrans notification
    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        orderStatus = 'paid';
      }
    } else if (transactionStatus === 'settlement') {
      orderStatus = 'paid';
    } else if (transactionStatus === 'cancel' ||
      transactionStatus === 'deny' ||
      transactionStatus === 'expire') {
      orderStatus = 'cancelled';
    } else if (transactionStatus === 'pending') {
      orderStatus = 'pending';
    }

    // Get order data first
    const { data: orderData, error: orderError } = await supabaseService
      .from('orders')
      .select('id, total, status')
      .eq('order_number', orderId)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      return new Response(JSON.stringify({ 
        error: 'Order not found',
        order_id: orderId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Validate payment amount against stored order total
    const expectedAmount = orderData.total.toString();
    if (notification.gross_amount !== expectedAmount) {
      console.error(`Amount mismatch: expected ${expectedAmount}, received ${notification.gross_amount}`);
      return new Response(JSON.stringify({ 
        error: 'Payment amount validation failed',
        order_id: orderId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Update order status in database
    const { error: updateError } = await supabaseService
      .from('orders')
      .update({
        status: orderStatus,
        updated_at: new Date().toISOString()
      })
      .eq('order_number', orderId);

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

    // Create or update payment record
    const { data: existingPayment } = await supabaseService
      .from('payments')
      .select('id')
      .eq('order_id', orderData.id)
      .single();

    if (existingPayment) {
      // Update existing payment
      const { error: paymentError } = await supabaseService
        .from('payments')
        .update({
          status: orderStatus,
          payment_proof: JSON.stringify(notification),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPayment.id);

      if (paymentError) {
        console.error('Error updating payment record:', paymentError);
      }
    } else {
      // Create new payment record
      const { error: paymentError } = await supabaseService
        .from('payments')
        .insert({
          order_id: orderData.id,
          amount: orderData.total,
          status: orderStatus,
          payment_proof: JSON.stringify(notification)
        });

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
      }
    }

    // If payment is successful, update product stock
    if (orderStatus === 'paid' && orderData) {
      console.log('Payment successful, checking if stock reduction is needed for order:', orderData.id);

      // Check if stock has already been reduced for this order to prevent duplicates
      let stockAlreadyReduced = false;

      try {
        // Check if there's already a successful payment for this order
        const { data: existingPayments } = await supabaseService
          .from('payments')
          .select('id, status')
          .eq('order_id', orderData.id)
          .eq('status', 'paid');

        // If there are multiple paid payments for this order, stock was already reduced
        stockAlreadyReduced = existingPayments && existingPayments.length > 1;
      } catch (error) {
        console.error('Error checking stock reduction status:', error);
        stockAlreadyReduced = false;
      }

      console.log('Stock already reduced:', stockAlreadyReduced);

      // Only reduce stock if this is the first successful payment for this order
      if (!stockAlreadyReduced) {
        console.log('Reducing stock for order:', orderData.id);

        const { data: orderItems, error: orderItemsError } = await supabaseService
          .from('order_items')
          .select('product_id, jumlah, ukuran')
          .eq('order_id', orderData.id);

        if (orderItemsError) {
          console.error('Error fetching order items:', orderItemsError);
          return new Response(JSON.stringify({
            error: 'Failed to fetch order items',
            details: orderItemsError.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }

        if (!orderItems || orderItems.length === 0) {
          console.log('No order items found for this order - this may indicate a data issue');
          console.log('Order ID:', orderData.id);
          return new Response(JSON.stringify({
            status: 'warning',
            message: 'No order items found',
            order_id: orderData.id
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        console.log(`Found ${orderItems.length} order items to process`);

        const stockUpdatePromises = orderItems.map(async (item: { product_id: string; jumlah: number; ukuran: string }) => {
          console.log(`Processing item: product ${item.product_id}, size ${item.ukuran}, quantity ${item.jumlah}`);

          try {
            // Update product_sizes table (size-specific stock)
            const { data: currentSizeStock, error: sizeStockError } = await supabaseService
              .from('product_sizes')
              .select('stok')
              .eq('product_id', item.product_id)
              .eq('ukuran', item.ukuran)
              .single();

            if (sizeStockError) {
              console.error(`Error fetching current stock for product ${item.product_id}, size ${item.ukuran}:`, sizeStockError);
              return { success: false, error: sizeStockError };
            }

            if (!currentSizeStock) {
              console.error(`No stock record found for product ${item.product_id}, size ${item.ukuran}`);
              return { success: false, error: 'No stock record found' };
            }

            const currentStock = currentSizeStock.stok || 0;
            const newSizeStock = Math.max(0, currentStock - item.jumlah);

            console.log(`Current stock for ${item.ukuran}: ${currentStock}, reducing by ${item.jumlah}, new stock: ${newSizeStock}`);

            const { error: updateSizeStockError } = await supabaseService
              .from('product_sizes')
              .update({ stok: newSizeStock })
              .eq('product_id', item.product_id)
              .eq('ukuran', item.ukuran);

            if (updateSizeStockError) {
              console.error('Error updating size stock:', updateSizeStockError);
              return { success: false, error: updateSizeStockError };
            }

            console.log(`Successfully updated size stock: ${item.ukuran} = ${newSizeStock}`);
            return { success: true, productId: item.product_id };
          } catch (error) {
            console.error(`Error processing item ${item.product_id}:`, error);
            return { success: false, error };
          }
        });

        const stockUpdateResults = await Promise.all(stockUpdatePromises);
        const failedUpdates = stockUpdateResults.filter((result: { success: boolean }) => !result.success);
        
        if (failedUpdates.length > 0) {
          console.error(`Failed to update stock for ${failedUpdates.length} items`);
        }

        // Recalculate and update total stock in products table
        const uniqueProductIds = [...new Set(orderItems.map((item: { product_id: string }) => item.product_id))] as string[];
        console.log(`Recalculating total stock for ${uniqueProductIds.length} unique products`);

        const productStockPromises = uniqueProductIds.map(async (productId) => {
          console.log(`Recalculating total stock for product: ${productId}`);

          try {
            const { data: allSizes, error: sizesError } = await supabaseService
              .from('product_sizes')
              .select('stok')
              .eq('product_id', productId);

            if (sizesError) {
              console.error(`Error fetching sizes for product ${productId}:`, sizesError);
              return { success: false, productId, error: sizesError };
            }

            if (!allSizes || allSizes.length === 0) {
              console.log(`No size records found for product ${productId}`);
              return { success: false, productId, error: 'No size records found' };
            }

            const totalStock = allSizes.reduce((total: number, size: { stok?: number }) => total + (size.stok || 0), 0);
            console.log(`Product ${productId} - sizes found: ${allSizes.length}, total stock: ${totalStock}`);

            const { error: productStockError } = await supabaseService
              .from('products')
              .update({ stock_quantity: totalStock })
              .eq('id', productId);

            if (productStockError) {
              console.error('Error updating product total stock:', productStockError);
              return { success: false, productId, error: productStockError };
            }

            console.log(`Successfully updated product ${productId} total stock: ${totalStock}`);
            return { success: true, productId };
          } catch (error) {
            console.error(`Error processing product ${productId}:`, error);
            return { success: false, productId, error };
          }
        });

        const productStockResults = await Promise.all(productStockPromises);
        const failedProductUpdates = productStockResults.filter(result => !result.success);
        
        if (failedProductUpdates.length > 0) {
          console.error(`Failed to update total stock for ${failedProductUpdates.length} products`);
        }

        console.log('Stock reduction completed successfully');
      } else {
        console.log('Stock already reduced for this order, skipping stock reduction');
      }
    }

    // If payment failed/cancelled, restore reserved stock
    if ((orderStatus === 'cancelled' || orderStatus === 'failed') && orderData) {
      console.log('Payment failed/cancelled, restoring reserved stock for order:', orderData.id);

      const { data: orderItems, error: orderItemsError } = await supabaseService
        .from('order_items')
        .select('product_id, jumlah, ukuran')
        .eq('order_id', orderData.id);

      if (orderItemsError) {
        console.error('Error fetching order items for stock restoration:', orderItemsError);
      } else if (orderItems && orderItems.length > 0) {
        console.log(`Restoring stock for ${orderItems.length} order items`);

        const stockRestorePromises = orderItems.map(async (item: { product_id: string; jumlah: number; ukuran: string }) => {
          console.log(`Restoring stock for product ${item.product_id}, size ${item.ukuran}, quantity ${item.jumlah}`);

          try {
            // Get current stock
            const { data: currentSizeStock, error: sizeStockError } = await supabaseService
              .from('product_sizes')
              .select('stok')
              .eq('product_id', item.product_id)
              .eq('ukuran', item.ukuran)
              .single();

            if (sizeStockError) {
              console.error(`Error fetching current stock for product ${item.product_id}, size ${item.ukuran}:`, sizeStockError);
              return { success: false, error: sizeStockError };
            }

            const currentStock = currentSizeStock?.stok || 0;
            const restoredStock = currentStock + item.jumlah;

            console.log(`Restoring stock for ${item.ukuran}: ${currentStock} + ${item.jumlah} = ${restoredStock}`);

            const { error: updateSizeStockError } = await supabaseService
              .from('product_sizes')
              .update({ stok: restoredStock })
              .eq('product_id', item.product_id)
              .eq('ukuran', item.ukuran);

            if (updateSizeStockError) {
              console.error('Error restoring size stock:', updateSizeStockError);
              return { success: false, error: updateSizeStockError };
            }

            console.log(`Successfully restored size stock: ${item.ukuran} = ${restoredStock}`);
            return { success: true, productId: item.product_id };
          } catch (error) {
            console.error(`Error restoring stock for item ${item.product_id}:`, error);
            return { success: false, error };
          }
        });

        const stockRestoreResults = await Promise.all(stockRestorePromises);
        const failedRestores = stockRestoreResults.filter((result: { success: boolean }) => !result.success);
        
        if (failedRestores.length > 0) {
          console.error(`Failed to restore stock for ${failedRestores.length} items`);
        }

        // Recalculate and update total stock in products table
        const uniqueProductIds = [...new Set(orderItems.map((item: { product_id: string }) => item.product_id))] as string[];
        console.log(`Recalculating total stock for ${uniqueProductIds.length} unique products after restoration`);

        const productStockRestorePromises = uniqueProductIds.map(async (productId) => {
          try {
            const { data: allSizes, error: sizesError } = await supabaseService
              .from('product_sizes')
              .select('stok')
              .eq('product_id', productId);

            if (sizesError) {
              console.error(`Error fetching sizes for product ${productId}:`, sizesError);
              return { success: false, productId, error: sizesError };
            }

            if (!allSizes || allSizes.length === 0) {
              console.log(`No size records found for product ${productId}`);
              return { success: false, productId, error: 'No size records found' };
            }

            const totalStock = allSizes.reduce((total: number, size: { stok?: number }) => total + (size.stok || 0), 0);
            console.log(`Product ${productId} - total stock after restoration: ${totalStock}`);

            const { error: productStockError } = await supabaseService
              .from('products')
              .update({ stock_quantity: totalStock })
              .eq('id', productId);

            if (productStockError) {
              console.error('Error updating product total stock after restoration:', productStockError);
              return { success: false, productId, error: productStockError };
            }

            console.log(`Successfully updated product ${productId} total stock after restoration: ${totalStock}`);
            return { success: true, productId };
          } catch (error) {
            console.error(`Error processing product ${productId} restoration:`, error);
            return { success: false, productId, error };
          }
        });

        await Promise.all(productStockRestorePromises);
        console.log('Stock restoration completed');
      }
    }

    console.log(`Order ${orderId} status updated to: ${orderStatus}`);

    return new Response(JSON.stringify({ 
      status: 'success',
      order_id: orderId,
      order_status: orderStatus 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing Midtrans webhook:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
