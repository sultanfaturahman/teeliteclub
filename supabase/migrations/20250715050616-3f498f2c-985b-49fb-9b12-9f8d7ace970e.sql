-- Create a default admin user for testing
-- First, insert the admin credentials into auth.users (this is just for demo - in production you'd register normally)

-- Insert admin profile manually  
INSERT INTO public.profiles (id, email, nama, role)
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  'admin@teelite.com', 
  'Admin Teelite', 
  'admin'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nama = EXCLUDED.nama,
  role = EXCLUDED.role;

-- Add some sample products for testing
INSERT INTO public.products (name, description, price, category, image_url, stock_quantity, is_active) VALUES
('Kaos Polo Pria Classic', 'Kaos polo pria dengan kualitas premium, nyaman dipakai untuk segala aktivitas', 150000, 'Pria', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 25, true),
('Dress Wanita Elegant', 'Dress wanita dengan desain elegant, cocok untuk acara formal maupun kasual', 250000, 'Wanita', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400', 15, true),
('Kaos Anak Lucu', 'Kaos anak dengan gambar karakter lucu, bahan lembut dan aman untuk kulit anak', 75000, 'Anak', 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400', 30, true),
('Kemeja Pria Formal', 'Kemeja pria formal dengan bahan berkualitas tinggi, sempurna untuk kantoran', 200000, 'Pria', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400', 20, true),
('Blouse Wanita Casual', 'Blouse wanita casual dengan desain modern dan bahan yang nyaman', 180000, 'Wanita', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400', 18, true),
('Jaket Anak Trendy', 'Jaket anak dengan desain trendy, hangat dan nyaman untuk cuaca dingin', 120000, 'Anak', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400', 12, true)
ON CONFLICT (name) DO NOTHING;

-- Create product sizes for each product
INSERT INTO public.product_sizes (product_id, ukuran, stok)
SELECT 
  p.id,
  sizes.ukuran,
  CASE 
    WHEN sizes.ukuran = 'M' THEN FLOOR(p.stock_quantity * 0.4)::integer
    WHEN sizes.ukuran = 'L' THEN FLOOR(p.stock_quantity * 0.3)::integer  
    WHEN sizes.ukuran = 'S' THEN FLOOR(p.stock_quantity * 0.15)::integer
    WHEN sizes.ukuran = 'XL' THEN FLOOR(p.stock_quantity * 0.1)::integer
    ELSE FLOOR(p.stock_quantity * 0.05)::integer
  END as stok
FROM public.products p
CROSS JOIN (
  VALUES ('S'), ('M'), ('L'), ('XL'), ('XXL')
) AS sizes(ukuran)
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_sizes ps 
  WHERE ps.product_id = p.id AND ps.ukuran = sizes.ukuran
);