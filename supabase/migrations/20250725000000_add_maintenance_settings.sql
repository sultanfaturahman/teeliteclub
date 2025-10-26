-- Add maintenance settings table
-- Created: 2025-07-25
-- Purpose: Store maintenance mode settings for countdown and announcements

-- Create maintenance_settings table
CREATE TABLE IF NOT EXISTS maintenance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  maintenance_start TIMESTAMPTZ,
  maintenance_end TIMESTAMPTZ,
  title TEXT NOT NULL DEFAULT 'Maintenance Mode',
  message TEXT NOT NULL DEFAULT 'We are currently under maintenance. Please check back later.',
  countdown_message TEXT NOT NULL DEFAULT 'New products will be available in:',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO maintenance_settings (is_enabled, title, message, countdown_message)
VALUES (
  false,
  'Produk Baru Segera Hadir!',
  'Kami sedang mempersiapkan koleksi terbaru untuk Anda. Terima kasih atas kesabaran Anda.',
  'Produk baru akan tersedia dalam:'
);

-- Add RLS policy for admin access
ALTER TABLE maintenance_settings ENABLE ROW LEVEL SECURITY;

-- Allow all users to read maintenance settings (for public maintenance page)
CREATE POLICY "Allow public read access to maintenance settings"
ON maintenance_settings
FOR SELECT
TO public
USING (true);

-- Allow admin users to update maintenance settings
CREATE POLICY "Allow admin update maintenance settings"
ON maintenance_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow admin users to insert maintenance settings
CREATE POLICY "Allow admin insert maintenance settings"
ON maintenance_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_maintenance_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_maintenance_settings_updated_at
BEFORE UPDATE ON maintenance_settings
FOR EACH ROW
EXECUTE FUNCTION update_maintenance_settings_updated_at();

-- Add comment for documentation
COMMENT ON TABLE maintenance_settings IS 'Stores maintenance mode configuration for countdown announcements';