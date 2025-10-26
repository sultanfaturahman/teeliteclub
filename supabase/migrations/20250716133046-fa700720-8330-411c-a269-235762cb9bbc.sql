-- Phase 1: Critical Role Security Fixes (Corrected)

-- Create security definer function to safely check user roles
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Create audit table for role changes
CREATE TABLE public.role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_role text,
  new_role text NOT NULL,
  changed_by uuid,
  changed_at timestamp with time zone DEFAULT now(),
  action text NOT NULL
);

-- Enable RLS on audit table
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.role_audit_log
FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');

-- Create role validation function
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Prevent users from changing their own role unless they are admin
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    -- Only allow role changes if the person making the change is an admin
    IF public.get_user_role(auth.uid()) != 'admin' AND auth.uid() = NEW.id THEN
      RAISE EXCEPTION 'Users cannot change their own role';
    END IF;
    
    -- Log the role change
    INSERT INTO public.role_audit_log (user_id, old_role, new_role, changed_by, action)
    VALUES (NEW.id, OLD.role, NEW.role, auth.uid(), 'UPDATE');
  END IF;
  
  -- For inserts, only allow admin role assignment by existing admins
  IF TG_OP = 'INSERT' AND NEW.role = 'admin' THEN
    IF public.get_user_role(auth.uid()) != 'admin' THEN
      RAISE EXCEPTION 'Only admins can assign admin role';
    END IF;
    
    -- Log the role assignment
    INSERT INTO public.role_audit_log (user_id, old_role, new_role, changed_by, action)
    VALUES (NEW.id, NULL, NEW.role, auth.uid(), 'INSERT');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add the validation trigger to profiles table
CREATE TRIGGER validate_role_changes
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_change();

-- Update the profiles RLS policies - separate UPDATE and INSERT policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Policy for regular profile updates (non-role fields)
CREATE POLICY "Users can update own profile data"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Phase 2: Database Function Security - Update functions with proper search_path

-- Update get_dashboard_stats function
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE(total_products bigint, total_value numeric, low_stock_products bigint, out_of_stock_products bigint, total_categories bigint, recent_products bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_products,
    SUM(price * stock_quantity) as total_value,
    COUNT(CASE WHEN stock_quantity < 10 AND stock_quantity > 0 THEN 1 END) as low_stock_products,
    COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock_products,
    COUNT(DISTINCT category) as total_categories,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_products
  FROM public.products;
END;
$$;

-- Update get_category_breakdown function
CREATE OR REPLACE FUNCTION public.get_category_breakdown()
RETURNS TABLE(category text, product_count bigint, total_value numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.category,
    COUNT(*) as product_count,
    SUM(p.price * p.stock_quantity) as total_value
  FROM public.products p
  GROUP BY p.category
  ORDER BY product_count DESC;
END;
$$;

-- Update get_recent_activity function
CREATE OR REPLACE FUNCTION public.get_recent_activity()
RETURNS TABLE(id uuid, name text, action text, date timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    CASE 
      WHEN p.created_at = p.updated_at THEN 'Created'
      ELSE 'Updated'
    END as action,
    p.updated_at as date
  FROM public.products p
  ORDER BY p.updated_at DESC
  LIMIT 10;
END;
$$;

-- Update update_product_search_vector function
CREATE OR REPLACE FUNCTION public.update_product_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', 
    COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, '')
  );
  RETURN NEW;
END;
$$;

-- Update handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Update generate_order_number function
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN 'TEE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;