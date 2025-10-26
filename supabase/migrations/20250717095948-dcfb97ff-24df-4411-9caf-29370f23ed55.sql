-- Update recent pending orders to paid status for testing
UPDATE orders 
SET status = 'paid', updated_at = NOW()
WHERE status = 'pending' AND payment_method = 'midtrans' 
AND created_at > NOW() - INTERVAL '1 hour';