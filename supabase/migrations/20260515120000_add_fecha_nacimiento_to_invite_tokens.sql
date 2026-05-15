-- Agregar columna fecha_nacimiento a invite_tokens
ALTER TABLE invite_tokens
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- Comentario: Campo opcional para guardar la fecha de nacimiento del invitado durante la invitación
