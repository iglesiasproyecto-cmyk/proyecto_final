-- Add fecha_nacimiento column to usuario table
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- Update the migration comment
COMMENT ON COLUMN usuario.fecha_nacimiento IS 'Fecha de nacimiento del usuario';
