-- Confirmar todos los usuarios existentes en auth.users
-- Esto permite que puedan iniciar sesión sin confirmación de email

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- Opcional: Crear política de permiso para usuarios sin confirmación
-- (aunque Supabase por defecto no permite login sin confirmación)

-- Para verificar qué usuarios están confirmados:
-- SELECT id, email, email_confirmed_at FROM auth.users;
