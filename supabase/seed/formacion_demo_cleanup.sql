-- ============================================================================
-- Revierte el seed de formacion_demo.sql. Ejecutar manualmente.
-- Borra los 4 usuarios @test.dev y todos los datos que cuelgan de ellos.
-- Los cursos/módulos/ciclo DEMO se borran por nombre (sufijo "(DEMO)").
-- ============================================================================

BEGIN;

-- Borrar cursos DEMO (cascadea a módulos, recursos, procesos, detalles, avance, evaluaciones)
DELETE FROM public.curso
 WHERE nombre IN ('Fundamentos de Liderazgo (DEMO)', 'Evangelismo Personal (DEMO)');

-- Borrar miembro_ministerio de los usuarios demo
DELETE FROM public.miembro_ministerio
 WHERE id_usuario IN (SELECT id_usuario FROM public.usuario WHERE correo LIKE '%@test.dev');

-- Borrar usuario_rol de los usuarios demo
DELETE FROM public.usuario_rol
 WHERE id_usuario IN (SELECT id_usuario FROM public.usuario WHERE correo LIKE '%@test.dev');

-- Borrar auth.users (ON DELETE SET NULL en usuario.auth_user_id deja la fila)
DELETE FROM auth.users
 WHERE email IN ('super@test.dev','admin@test.dev','lider@test.dev','servidor@test.dev');

-- Borrar las filas huérfanas de public.usuario
DELETE FROM public.usuario
 WHERE correo IN ('super@test.dev','admin@test.dev','lider@test.dev','servidor@test.dev');

COMMIT;
