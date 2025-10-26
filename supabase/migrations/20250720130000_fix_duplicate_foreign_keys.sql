-- Fix duplicate foreign key constraints that might cause relationship ambiguity

-- First, check if we have duplicate constraints and remove them
DO $$
BEGIN
    -- Remove any duplicate foreign key constraints if they exist
    
    -- For order_items table, ensure we only have one product_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_order_items_product_id' 
        AND table_name = 'order_items'
    ) THEN
        ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS fk_order_items_product_id;
    END IF;
    
    -- Ensure the standard foreign key exists and is properly named
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_items_product_id_fkey' 
        AND table_name = 'order_items'
    ) THEN
        ALTER TABLE public.order_items 
        ADD CONSTRAINT order_items_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    END IF;
    
    -- For product_sizes table, ensure we only have one product_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_product_sizes_product_id' 
        AND table_name = 'product_sizes'
    ) THEN
        ALTER TABLE public.product_sizes DROP CONSTRAINT IF EXISTS fk_product_sizes_product_id;
    END IF;
    
    -- Ensure the standard foreign key exists for product_sizes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'product_sizes_product_id_fkey' 
        AND table_name = 'product_sizes'
    ) THEN
        ALTER TABLE public.product_sizes 
        ADD CONSTRAINT product_sizes_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    END IF;
    
END $$;

-- Add comments to document the relationships
COMMENT ON CONSTRAINT order_items_product_id_fkey ON public.order_items 
IS 'Links order items to their corresponding products';

COMMENT ON CONSTRAINT product_sizes_product_id_fkey ON public.product_sizes 
IS 'Links product sizes to their corresponding products';

-- Verify the constraints are properly set up
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('order_items', 'product_sizes')
    AND ccu.table_name = 'products'
ORDER BY tc.table_name, tc.constraint_name;