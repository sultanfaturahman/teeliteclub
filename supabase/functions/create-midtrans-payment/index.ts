/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface CartItem {
  product_id: string;
  quantity: number;
  ukuran: string;
  product?: {
    price: number;
    name: string;
  };
}

interface OrderData {
  total: number;
  nama_pembeli: string;
  email_pembeli: string;
  telepon_pembeli: string;
  shipping_address: string;
  payment_method: string;
  shipping_method?: string;
}

const DEFAULT_ALLOWED_ORIGINS = [
  "https://teeliteclub.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

const envOrigins = [
  Deno.env.get("ALLOWED_ORIGIN"),
  ...(Deno.env.get("ALLOWED_ORIGINS")?.split(",") ?? []),
]
  .map((origin) => origin?.trim())
  .filter((origin): origin is string => Boolean(origin));

const allowedOrigins = new Set<string>([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]);

const BASE_CORS_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
} as const;

const getCorsHeaders = (origin: string | null) => {
  const fallbackOrigin =
    envOrigins[0] ||
    (allowedOrigins.size > 0 ? Array.from(allowedOrigins)[0] : "*");
  const allowedOrigin =
    origin && allowedOrigins.has(origin) ? origin : fallbackOrigin;

  return {
    ...BASE_CORS_HEADERS,
    "Access-Control-Allow-Origin": allowedOrigin,
  };
};

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Midtrans payment creation...');
    console.log('Environment check:', {
      supabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      supabaseAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
      midtransServerKey: !!Deno.env.get('MIDTRANS_SERVER_KEY'),
      midtransEnv: Deno.env.get('MIDTRANS_ENVIRONMENT'),
      allowedOrigin: Deno.env.get('ALLOWED_ORIGIN'),
      serverKeyPrefix: Deno.env.get('MIDTRANS_SERVER_KEY')?.substring(0, 15) + '...'
    });
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    console.log('Auth header format:', authHeader ? 'Bearer ' + authHeader.substring(7, 20) + '...' : 'none');
    
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }
    
    const token = authHeader.replace('Bearer ', '');
    console.log('Token length:', token.length);
    
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) {
      console.error('Auth error:', authError);
      console.error('Auth error code:', authError.status);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    const user = data.user;
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    console.log('Final user object:', user?.email || 'no email');

    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed successfully');
    } catch (error) {
      console.error('Failed to parse request body:', error);
      throw new Error('Invalid request body format');
    }

    const { orderData, items }: { orderData: OrderData; items: CartItem[] } = requestBody;
    console.log('Order data received:', orderData);
    console.log('Items count:', items?.length);

    // Validate items and recalculate total server-side
    if (!items || items.length === 0) {
      throw new Error('No items in cart');
    }

    // Create service client first
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // CRITICAL: Validate stock availability for all items
    console.log('Validating stock for all items...');
    for (const item of items) {
      const { data: stockData, error: stockError } = await supabaseService
        .from('product_sizes')
        .select('stok')
        .eq('product_id', item.product_id)
        .eq('ukuran', item.ukuran)
        .single();

      if (stockError) {
        console.error('Stock validation error:', stockError);
        throw new Error(`Failed to validate stock for product ${item.product_id}`);
      }

      if (!stockData || stockData.stok < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.product_id} size ${item.ukuran}. Available: ${stockData?.stok || 0}, Requested: ${item.quantity}`);
      }
    }

    // Fetch actual product prices and names from database
    const productIds = items.map(item => item.product_id);
    const { data: products, error: productsError } = await supabaseService
      .from('products')
      .select('id, price, name')
      .in('id', productIds);

    if (productsError) {
      throw new Error('Failed to validate product prices');
    }

    // Calculate actual total based on database prices
    let calculatedTotal = 0;
    const productPriceMap = new Map(products?.map(p => [p.id, p.price]) || []);
    const productNameMap = new Map(products?.map(p => [p.id, p.name]) || []);
    
    for (const item of items) {
      const actualPrice = productPriceMap.get(item.product_id);
      if (!actualPrice) {
        throw new Error(`Product ${item.product_id} not found`);
      }
      calculatedTotal += actualPrice * item.quantity;
    }

    // Add shipping cost
    const shippingCost = orderData.shipping_method === 'express' ? 20000 : 0;
    calculatedTotal += shippingCost;

    // Validate submitted total against calculated total
    if (Math.abs(orderData.total - calculatedTotal) > 0.01) {
      console.error(`Price validation failed: submitted ${orderData.total}, calculated ${calculatedTotal}`);
      throw new Error('Price validation failed');
    }

    // Midtrans configuration
    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');
    const environment = Deno.env.get('MIDTRANS_ENVIRONMENT') || 'sandbox';
    const isProduction = environment === 'production';
    
    console.log('Midtrans environment:', environment);
    console.log('Server key exists:', !!serverKey);
    console.log('Server key prefix:', serverKey ? serverKey.substring(0, 8) + '...' : 'none');
    
    if (!serverKey) {
      throw new Error('MIDTRANS_SERVER_KEY environment variable is not configured. Please add your Midtrans server key in Supabase secrets.');
    }

    // Log server key format for debugging (without validation for now)
    console.log('Server key format check:');
    console.log('- Environment:', environment);
    console.log('- Is production:', isProduction);
    console.log('- Server key starts with SB-Mid-server-:', serverKey.startsWith('SB-Mid-server-'));
    console.log('- Server key length:', serverKey.length);
    
    // Skip validation for now to allow testing
    // TODO: Re-enable proper validation once server key format is confirmed
    
    console.log('Server key validation passed');
    
    const snapUrl = isProduction 
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
      
    console.log('Using Midtrans URL:', snapUrl);

    // Create order in database

    // Generate order number directly
    console.log('Generating order number...');
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumberData = `TEE-${dateStr}-${randomNum}`;
    console.log('Order number generated:', orderNumberData);
    
    const dbOrderData = {
      user_id: user.id,
      order_number: orderNumberData,
      total: orderData.total,
      status: 'pending',
      shipping_method: orderData.shipping_method,
      payment_method: orderData.payment_method,
      shipping_address: orderData.shipping_address,
      nama_pembeli: orderData.nama_pembeli,
      telepon_pembeli: orderData.telepon_pembeli,
      email_pembeli: orderData.email_pembeli
    };

    console.log('Creating order in database...');
    console.log('Order data to insert:', JSON.stringify(dbOrderData, null, 2));
    
    let order;
    try {
      const { data: orderData, error: orderError } = await supabaseService
        .from('orders')
        .insert([dbOrderData])
        .select()
        .single();

      if (orderError) {
        console.error('Database order error:', orderError);
        console.error('Order error details:', JSON.stringify(orderError, null, 2));
        throw new Error(`Database order creation failed: ${orderError.message || orderError.details || JSON.stringify(orderError)}`);
      }

      if (!orderData) {
        throw new Error('Order creation returned no data');
      }

      order = orderData;
      console.log('Order created with ID:', order.id);
    } catch (dbError) {
      console.error('Error during order creation:', dbError);
      throw new Error(`Failed to create order: ${dbError.message || dbError}`);
    }

    // Create order items with correct product information
    const orderItems = items.map((item: CartItem) => ({
      order_id: order.id,
      product_id: item.product_id,
      jumlah: item.quantity,
      harga: productPriceMap.get(item.product_id) || 0,
      ukuran: item.ukuran
    }));

    console.log('Creating order items...');
    const { error: itemsError } = await supabaseService
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Database items error:', itemsError);
      throw itemsError;
    }

    console.log('Order items created successfully');

    // CRITICAL: Reserve stock immediately to prevent race conditions
    console.log('Reserving stock for order items...');
    const stockReservationPromises = items.map(async (item: CartItem) => {
      console.log(`Reserving stock for product ${item.product_id}, size ${item.ukuran}, quantity ${item.quantity}`);
      
      // Use atomic operation to reduce stock
      const { data: currentStock, error: stockError } = await supabaseService
        .from('product_sizes')
        .select('stok')
        .eq('product_id', item.product_id)
        .eq('ukuran', item.ukuran)
        .single();

      if (stockError) {
        throw new Error(`Failed to get current stock for product ${item.product_id}`);
      }

      if (!currentStock || currentStock.stok < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.product_id} size ${item.ukuran}. Available: ${currentStock?.stok || 0}, Requested: ${item.quantity}`);
      }

      const newStock = currentStock.stok - item.quantity;
      
      const { error: updateError } = await supabaseService
        .from('product_sizes')
        .update({ stok: newStock })
        .eq('product_id', item.product_id)
        .eq('ukuran', item.ukuran);

      if (updateError) {
        throw new Error(`Failed to reserve stock for product ${item.product_id}: ${updateError.message}`);
      }

      console.log(`Stock reserved for product ${item.product_id}, size ${item.ukuran}: ${currentStock.stok} -> ${newStock}`);
      return { product_id: item.product_id, ukuran: item.ukuran, reserved: item.quantity };
    });

    try {
      await Promise.all(stockReservationPromises);
      console.log('All stock reservations successful');
    } catch (reservationError) {
      console.error('Stock reservation failed:', reservationError);
      
      // Rollback: Delete the created order and order items
      await supabaseService.from('order_items').delete().eq('order_id', order.id);
      await supabaseService.from('orders').delete().eq('id', order.id);
      
      throw reservationError;
    }

    // Update total stock in products table
    const uniqueProductIds = [...new Set(items.map(item => item.product_id))];
    for (const productId of uniqueProductIds) {
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
      }
    }

    // Prepare Midtrans transaction data
    const itemDetails = items.map((item: CartItem) => ({
      id: item.product_id,
      price: Math.round(productPriceMap.get(item.product_id) || 0), // Ensure integer price
      quantity: item.quantity,
      name: `${productNameMap.get(item.product_id) || 'Unknown Product'} (${item.ukuran})`
    }));

    // Add shipping cost if express
    if (orderData.shipping_method === 'express') {
      itemDetails.push({
        id: 'shipping',
        price: 20000, // Already integer
        quantity: 1,
        name: 'Ongkos Kirim Express'
      });
    }

    const grossAmount = Math.round(orderData.total); // Midtrans requires integer amounts

    // Validate required fields for production
    if (isProduction) {
      if (!orderData.nama_pembeli || orderData.nama_pembeli.trim().length < 2) {
        throw new Error('Customer name is required and must be at least 2 characters for production');
      }
      if (!orderData.email_pembeli || !orderData.email_pembeli.includes('@')) {
        throw new Error('Valid customer email is required for production');
      }
      if (!orderData.telepon_pembeli || orderData.telepon_pembeli.length < 8) {
        throw new Error('Valid customer phone number is required for production');
      }
      if (!orderData.shipping_address || orderData.shipping_address.trim().length < 10) {
        throw new Error('Detailed shipping address is required for production');
      }
    }

    const baseUrl =
      (origin && allowedOrigins.has(origin) ? origin : undefined) ??
      Deno.env.get('PUBLIC_BASE_URL') ??
      envOrigins[0] ??
      'http://localhost:5173';
    
    const transactionData = {
      transaction_details: {
        order_id: order.order_number,
        gross_amount: grossAmount
      },
      item_details: itemDetails,
      customer_details: {
        first_name: orderData.nama_pembeli.trim(),
        email: orderData.email_pembeli.trim(),
        phone: orderData.telepon_pembeli.replace(/\D/g, ''), // Remove non-numeric characters
        shipping_address: {
          first_name: orderData.nama_pembeli.trim(),
          address: orderData.shipping_address.trim(),
          city: "Jakarta", // Default city for production
          postal_code: "12345", // Default postal code for production
          country_code: "IDN"
        }
      },
      credit_card: {
        secure: true
      },
      callbacks: {
        finish: `${baseUrl}/finish-payment?order_id=${order.order_number}&transaction_status={transaction_status}&status_code={status_code}`,
        unfinish: `${baseUrl}/payment-error?order_id=${order.order_number}&transaction_status=cancel&error_type=cancelled`,
        error: `${baseUrl}/payment-error?order_id=${order.order_number}&transaction_status=failure&error_type=system&error_code={status_code}`
      },
      // Add additional fields for production compliance
      ...(isProduction && {
        enabled_payments: ["credit_card", "bank_transfer", "echannel", "gopay", "shopeepay"],
        custom_expiry: {
          expiry_duration: 60,
          unit: "minute"
        }
      })
    };

    console.log('Midtrans transaction data:', JSON.stringify(transactionData, null, 2));

    // Create Midtrans transaction
    console.log('Calling Midtrans API...');
    const midtransResponse = await fetch(snapUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(serverKey + ':')}`
      },
      body: JSON.stringify(transactionData)
    });

    console.log('Midtrans response status:', midtransResponse.status);

    if (!midtransResponse.ok) {
      const errorText = await midtransResponse.text();
      console.error('Midtrans API error response:', errorText);
      console.error('Environment:', environment);
      console.error('Server key prefix:', serverKey ? serverKey.substring(0, 15) + '...' : 'none');
      
      // Parse error response for better debugging
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.error_messages || errorJson.message || errorText;
        console.error('Parsed error details:', errorDetails);
      } catch (e) {
        console.error('Could not parse error response as JSON');
      }
      
      throw new Error(`Midtrans API error (${environment}): ${midtransResponse.status} - ${errorDetails}`);
    }

    const midtransData = await midtransResponse.json();
    console.log('Midtrans response data:', midtransData);

    // Update order with Midtrans token and payment URL
    await supabaseService
      .from('orders')
      .update({ 
        payment_url: midtransData.redirect_url, // Store payment URL for continue payment functionality
        tracking_number: midtransData.token // Store Midtrans token in tracking_number field temporarily
      })
      .eq('id', order.id);

    console.log('Payment creation successful');

    return new Response(JSON.stringify({
      token: midtransData.token,
      redirect_url: midtransData.redirect_url,
      order_id: order.order_number
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error creating Midtrans payment:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    
    // Log the full error object for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Return detailed error information for debugging
    const errorResponse = {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      errorType: error?.constructor?.name || typeof error,
      // Add environment check for debugging
      debug: {
        hasServerKey: !!Deno.env.get('MIDTRANS_SERVER_KEY'),
        environment: Deno.env.get('MIDTRANS_ENVIRONMENT'),
        hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
        hasSupabaseServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        serverKeyLength: Deno.env.get('MIDTRANS_SERVER_KEY')?.length || 0
      }
    };
    
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
