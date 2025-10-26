-- Add payment_url field to orders table to store Midtrans payment URL (if not exists)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_url TEXT;

-- Add comment to document the field
COMMENT ON COLUMN public.orders.payment_url IS 'Stores the Midtrans payment URL for incomplete payments';

-- Add index for faster queries on pending payments (if not exists)
CREATE INDEX IF NOT EXISTS idx_orders_status_payment_url ON public.orders(status, payment_url) 
WHERE status = 'pending' AND payment_url IS NOT NULL;