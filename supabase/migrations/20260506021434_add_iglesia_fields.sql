-- Add missing fields to iglesia table
ALTER TABLE iglesia ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE iglesia ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE iglesia ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE iglesia ADD COLUMN IF NOT EXISTS sitio_web TEXT;