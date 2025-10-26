-- Create system_settings table to store configurable site settings
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - only admins can manage settings
CREATE POLICY "Anyone can view settings" 
ON public.system_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage settings" 
ON public.system_settings 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Insert default hero image setting
INSERT INTO public.system_settings (key, value, description) 
VALUES ('hero_image_url', '/lovable-uploads/a773ac2f-9e06-49da-a3b9-b4425905b493.png', 'URL for the hero section background image');

-- Add trigger for updating updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();