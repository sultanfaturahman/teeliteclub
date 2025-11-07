import type { VercelRequest, VercelResponse } from '@vercel/node';
  import { createClient } from '@supabase/supabase-js';

  const ATTEMPT_SEPARATOR = '-ATTEMPT-';

  const buildAttemptedOrderId = (baseOrderNumber = '') => {
    const trimmedBase = baseOrderNumber.trim();
    const suffix = `${ATTEMPT_SEPARATOR}${Date.now()}`;
    const maxLength = 50;

    if (!trimmedBase) return `ORDER${suffix}`;
    return trimmedBase.length + suffix.length <= maxLength
      ? `${trimmedBase}${suffix}`
      : `${trimmedBase.slice(0, maxLength - suffix.length)}${suffix}`;
  };

  const getBaseUrl = () => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    return (
      process.env.PUBLIC_BASE_URL ||
      process.env.ALLOWED_ORIGIN ||
      allowedOrigins[0] ||
      'http://localhost:5173'
    );
  };

  const getSnapUrl = () =>
    process.env.MIDTRANS_ENVIRONMENT === 'production'
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { orderId } = req.query as { orderId?: string };
    const { expectedTotal } = (req.body as { expectedTotal?: number }) ?? {};
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!orderId) return res.status(400).json({ error: 'Order ID is required' });
    if (!authHeader || !authHeader.toString().startsWith('Bearer '))
      return res.status(401).json({ error: 'Authorization header missing' });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const midtransServerKey = process.env.MIDTRANS_SERVER_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !midtransServerKey) {
      console.error('Missing required environment variables for change-method endpoint');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
      const accessToken = authHeader.toString().slice(7);
      const authClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
      const { data: userData, error: authError } = await authClient.auth.getUser(accessToken);

      if (authError || !userData?.user) {
        console.error('Authentication failed for change-method endpoint:', authError);
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const user = userData.user;
      const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

      const { data: order, error: orderError } = await serviceClient
        .from('orders')
        .select('id, order_number, status, total, payment_method, shipping_method, shipping_address, nama_pembeli,
  email_pembeli, telepon_pembeli, tracking_number, payment_url')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (orderError || !order) {
        console.error('Order not found or access denied:', orderError);
        return res.status(404).json({ error: 'Order not found' });
      }

      if (['paid', 'shipped', 'delivered'].includes(order.status))
        return res.status(409).json({ error: 'Order sudah diselesaikan' });

      const roundedOrderTotal = Math.round(Number(order.total || 0));
      const expectedTotalNumber = typeof expectedTotal === 'number' ? Math.round(expectedTotal) : null;
      if (expectedTotalNumber !== null && expectedTotalNumber !== roundedOrderTotal)
        return res.status(400).json({ error: 'Total pesanan tidak sesuai' });

      const { data: paidPayment } = await serviceClient
        .from('payments')
        .select('id')
        .eq('order_id', order.id)
        .eq('status', 'paid')
        .maybeSingle();

      if (paidPayment) return res.status(409).json({ error: 'Pembayaran sudah berhasil sebelumnya' });

      const cancelPendingResult = await serviceClient
        .from('payments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('order_id', order.id)
        .eq('status', 'pending');

      if (cancelPendingResult.error) {
        console.error('Failed to cancel pending payments before change-method:', cancelPendingResult.error);
      }

      const midtransOrderId = buildAttemptedOrderId(order.order_number);
      const baseUrl = getBaseUrl();
      const snapUrl = getSnapUrl();

      const transactionData = {
        transaction_details: {
          order_id: midtransOrderId,
          gross_amount: roundedOrderTotal
        },
        customer_details: {
          first_name: order.nama_pembeli || user.email?.split('@')[0] || 'Customer',
          email: order.email_pembeli || user.email,
          phone: order.telepon_pembeli || ''
        },
        callbacks: {
          finish: `${baseUrl}/finish-payment?order_id=${midtransOrderId}&transaction_status={transaction_status}
  &status_code={status_code}`,
          unfinish: `${baseUrl}/payment-error?order_id=${order.order_number}
  &transaction_status=cancel&error_type=cancelled`,
          error: `${baseUrl}/payment-error?order_id=${order.order_number}
  &transaction_status=failure&error_type=system&error_code={status_code}`
        }
      };

      const midtransResponse = await fetch(snapUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${midtransServerKey}:`).toString('base64')}`
        },
        body: JSON.stringify(transactionData)
      });

      if (!midtransResponse.ok) {
        const errorText = await midtransResponse.text();
        console.error('Midtrans API error during change-method:', errorText);
        return res.status(502).json({ error: 'Midtrans API error', details: errorText });
      }

      const midtransData = await midtransResponse.json();

      const orderUpdateResult = await serviceClient
        .from('orders')
        .update({
          payment_url: midtransData.redirect_url,
          tracking_number: midtransOrderId,
          payment_method: 'Midtrans',
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (orderUpdateResult.error) {
        console.error('Failed to update order after change-method:', orderUpdateResult.error);
        return res.status(500).json({ error: 'Gagal memperbarui pesanan' });
      }

      const paymentUpsertResult = await serviceClient
        .from('payments')
        .upsert(
          {
            order_id: order.id,
            amount: order.total,
            status: 'pending',
            payment_proof: JSON.stringify({
              midtrans_order_id: midtransOrderId,
              generated_at: new Date().toISOString(),
              source: 'change-method'
            }),
            updated_at: new Date().toISOString()
          },
          { onConflict: 'order_id' }
        );

      if (paymentUpsertResult.error) {
        console.error('Failed to upsert payment record for change-method:', paymentUpsertResult.error);
      }

      return res.status(200).json({
        token: midtransData.token,
        redirect_url: midtransData.redirect_url,
        midtrans_order_id: midtransOrderId
      });
    } catch (error) {
      console.error('Error handling change-method request:', error);
      return res.status(500).json({ error: 'Gagal membuat sesi pembayaran baru' });
    }
  }