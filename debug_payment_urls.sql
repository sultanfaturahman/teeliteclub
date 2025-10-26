-- Debug query to check orders with pending status and payment URLs
SELECT 
    id,
    order_number,
    status,
    payment_url,
    payment_method,
    created_at,
    CASE 
        WHEN status = 'pending' AND payment_url IS NOT NULL THEN 'BUTTON_SHOULD_SHOW'
        WHEN status = 'pending' AND payment_url IS NULL THEN 'MISSING_PAYMENT_URL'
        ELSE 'NOT_PENDING'
    END as button_status
FROM orders 
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 20;

-- Check if there are any orders with status "menunggu_pembayaran" instead of "pending"
SELECT DISTINCT status FROM orders;

-- Check recent orders that might have payment URLs
SELECT 
    id,
    order_number,
    status,
    payment_url IS NOT NULL as has_payment_url,
    payment_method,
    created_at
FROM orders 
ORDER BY created_at DESC
LIMIT 10;