-- Delete all existing products and related data
-- First delete product sizes
DELETE FROM public.product_sizes;

-- Delete order items (this will remove the foreign key constraint)
DELETE FROM public.order_items;

-- Delete cart items
DELETE FROM public.cart_items;

-- Delete payments for orders that will be deleted
DELETE FROM public.payments 
WHERE order_id IN (SELECT id FROM public.orders);

-- Delete all orders
DELETE FROM public.orders;

-- Finally delete all products
DELETE FROM public.products;

-- Reset sequences if needed
SELECT setval(pg_get_serial_sequence('products', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('product_sizes', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('orders', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('order_items', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('cart_items', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('payments', 'id'), 1, false);