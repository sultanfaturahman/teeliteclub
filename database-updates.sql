-- Add payment_url field to orders table if it doesn't exist
-- Run this script in your Supabase SQL editor if you encounter "failed to load orders" errors

-- Add payment_url column (will fail silently if it already exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'payment_url'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN payment_url TEXT;
        RAISE NOTICE 'Added payment_url column to orders table';
    ELSE
        RAISE NOTICE 'payment_url column already exists';
    END IF;
END $$;

-- Add comment to document the field
COMMENT ON COLUMN public.orders.payment_url IS 'Stores the Midtrans payment URL for incomplete payments';

-- Add index for faster queries on pending payments (only if column exists)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'payment_url'
    ) THEN
        -- Drop index if it exists, then create it
        DROP INDEX IF EXISTS idx_orders_status_payment_url;
        CREATE INDEX idx_orders_status_payment_url ON public.orders(status, payment_url) 
        WHERE status = 'pending' AND payment_url IS NOT NULL;
        RAISE NOTICE 'Created index on orders (status, payment_url)';
    END IF;
END $$;