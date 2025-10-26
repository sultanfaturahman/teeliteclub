-- Add admin policies for orders and order_items

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies for orders table
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE USING (
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can delete all orders" ON public.orders FOR DELETE USING (
  public.is_admin(auth.uid())
);

-- Admin policies for order_items table
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT USING (
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can update all order items" ON public.order_items FOR UPDATE USING (
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can delete all order items" ON public.order_items FOR DELETE USING (
  public.is_admin(auth.uid())
);

-- Admin policies for payments table
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can update all payments" ON public.payments FOR UPDATE USING (
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can delete all payments" ON public.payments FOR DELETE USING (
  public.is_admin(auth.uid())
);

-- Admin policies for profiles table (if not already exists)
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  public.is_admin(auth.uid()) OR auth.uid() = id
);

-- Grant necessary permissions for the function
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;