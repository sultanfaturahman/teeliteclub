-- Add unique constraint to product_sizes table to prevent duplicate entries
-- This will ensure that each product can only have one record per size

-- First, remove any existing duplicate entries (keep the latest one)
DELETE FROM public.product_sizes
WHERE id NOT IN (
  SELECT DISTINCT ON (product_id, ukuran) id
  FROM public.product_sizes
  ORDER BY product_id, ukuran, created_at DESC
);

-- Add unique constraint on (product_id, ukuran) combination
ALTER TABLE public.product_sizes
ADD CONSTRAINT product_sizes_product_id_ukuran_unique
UNIQUE (product_id, ukuran);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT product_sizes_product_id_ukuran_unique ON public.product_sizes
IS 'Ensures each product can only have one stock record per size';

-- Add stock_reduced flag to orders table to track inventory reduction
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS stock_reduced BOOLEAN DEFAULT false;

-- Add comment to document the new column
COMMENT ON COLUMN public.orders.stock_reduced
IS 'Tracks whether inventory has been reduced for this order to prevent duplicate reductions';
