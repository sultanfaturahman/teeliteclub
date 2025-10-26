-- Debug SQL queries to check stock reduction status
-- Run these queries to investigate why stock isn't being reduced

-- 1. Check recent orders and their status
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.total,
  o.created_at,
  o.updated_at,
  -- Check if stock_reduced column exists and its value
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'stock_reduced'
    ) THEN 'Column exists'
    ELSE 'Column missing'
  END as stock_reduced_column_status
FROM orders o
ORDER BY o.created_at DESC
LIMIT 10;

-- 2. Check order items for recent orders
SELECT 
  oi.id,
  oi.order_id,
  oi.product_id,
  oi.ukuran,
  oi.jumlah,
  oi.harga,
  o.order_number,
  o.status as order_status,
  p.name as product_name
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
WHERE o.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY o.created_at DESC;

-- 3. Check current product stock levels
SELECT 
  p.id,
  p.name,
  p.stock_quantity as total_stock_in_products_table,
  -- Calculate actual total from product_sizes
  COALESCE(SUM(ps.stok), 0) as actual_total_from_sizes,
  -- Show difference
  p.stock_quantity - COALESCE(SUM(ps.stok), 0) as stock_difference
FROM products p
LEFT JOIN product_sizes ps ON p.id = ps.product_id
GROUP BY p.id, p.name, p.stock_quantity
ORDER BY p.name;

-- 4. Check product sizes stock levels
SELECT 
  ps.product_id,
  p.name as product_name,
  ps.ukuran,
  ps.stok,
  ps.created_at
FROM product_sizes ps
JOIN products p ON ps.product_id = p.id
ORDER BY p.name, ps.ukuran;

-- 5. Check payment records
SELECT 
  pay.id,
  pay.order_id,
  pay.amount,
  pay.status,
  pay.created_at,
  o.order_number,
  o.status as order_status
FROM payments pay
JOIN orders o ON pay.order_id = o.id
ORDER BY pay.created_at DESC
LIMIT 10;

-- 6. Check if stock_reduced column exists
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Find orders that should have had stock reduced but maybe didn't
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.created_at,
  COUNT(oi.id) as item_count,
  SUM(oi.jumlah) as total_quantity,
  -- Check if there are successful payments
  COUNT(pay.id) as payment_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN payments pay ON o.id = pay.order_id AND pay.status = 'paid'
WHERE o.status = 'paid'
  AND o.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY o.id, o.order_number, o.status, o.created_at
ORDER BY o.created_at DESC;

-- 8. Check for any errors in the webhook processing
-- (This would require checking Supabase function logs, but we can check data consistency)
SELECT 
  'Data Consistency Check' as check_type,
  COUNT(*) as paid_orders_count,
  COUNT(CASE WHEN EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.order_id = o.id
  ) THEN 1 END) as orders_with_items,
  COUNT(CASE WHEN EXISTS (
    SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'paid'
  ) THEN 1 END) as orders_with_payments
FROM orders o
WHERE o.status = 'paid'
  AND o.created_at >= NOW() - INTERVAL '24 hours';
