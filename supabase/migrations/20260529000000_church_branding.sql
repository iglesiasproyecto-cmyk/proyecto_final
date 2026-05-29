-- Add branding columns to iglesia
ALTER TABLE public.iglesia
  ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;

-- Create church-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('church-logos', 'church-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read on all files in church-logos
CREATE POLICY "church_logos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'church-logos');

-- Allow admin_iglesia to upload/update logos for their own church
CREATE POLICY "church_logos_admin_write"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'church-logos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "church_logos_admin_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'church-logos'
  AND auth.role() = 'authenticated'
);
