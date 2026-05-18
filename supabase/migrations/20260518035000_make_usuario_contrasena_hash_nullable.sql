-- Supabase Auth gestiona la contraseña en auth.users.
-- En public.usuario no debemos exigir contrasena_hash.
ALTER TABLE public.usuario
  ALTER COLUMN contrasena_hash DROP NOT NULL;
