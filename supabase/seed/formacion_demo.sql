-- ============================================================================
-- Seed de demostración para probar el módulo de Formación.
-- NO usar en producción. Ejecutar manualmente desde el SQL Editor de Supabase
-- (o `psql`) en el proyecto de pruebas.
--
-- Crea 4 usuarios (uno por rol), los enlaza a la "Iglesia Central" / "Sede
-- Principal" / "Ministerio de Jóvenes" del seed base, crea 2 cursos con
-- módulos, un ciclo activo, inscribe al Servidor y precarga avance parcial.
--
-- Es idempotente: puede re-ejecutarse sin duplicar filas.
-- Credenciales (todos): contraseña = 'Test1234!'
--    super@test.dev      → Super Administrador
--    admin@test.dev      → Administrador de Iglesia
--    lider@test.dev      → Líder
--    servidor@test.dev   → Servidor
-- ============================================================================

BEGIN;

-- pgcrypto provee crypt() y gen_salt() para bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------
-- 1. Auth users + usuario rows (el trigger handle_new_user los enlaza)
-- ------------------------------------------------------------------
DO $seed$
DECLARE
  v_password text := 'Test1234!';
  v_hash     text := crypt('Test1234!', gen_salt('bf'));
  v_instance uuid := '00000000-0000-0000-0000-000000000000';
  rec        record;
  v_id       uuid;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('super@test.dev',    'Super',    'Admin Demo',   '+57 300 000 0001'),
      ('admin@test.dev',    'Admin',    'Iglesia Demo', '+57 300 000 0002'),
      ('lider@test.dev',    'Lider',    'Demo',         '+57 300 000 0003'),
      ('servidor@test.dev', 'Servidor', 'Iglesia',      '+57 300 000 0004')
    ) t(correo, nombres, apellidos, telefono)
  LOOP
    SELECT id INTO v_id FROM auth.users WHERE email = rec.correo;

    IF v_id IS NULL THEN
      v_id := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token,
        raw_app_meta_data, raw_user_meta_data, is_super_admin
      ) VALUES (
        v_instance, v_id, 'authenticated', 'authenticated', rec.correo, v_hash,
        now(), now(), now(),
        '', '', '', '',
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('nombres', rec.nombres, 'apellidos', rec.apellidos),
        false
      );

      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_id, v_id::text,
        jsonb_build_object('sub', v_id::text, 'email', rec.correo, 'email_verified', true),
        'email', now(), now(), now()
      );
    ELSE
      -- Refresca password + metadata para entornos repetidos
      UPDATE auth.users
         SET encrypted_password = v_hash,
             email_confirmed_at = COALESCE(email_confirmed_at, now()),
             raw_user_meta_data = jsonb_build_object('nombres', rec.nombres, 'apellidos', rec.apellidos),
             updated_at = now()
       WHERE id = v_id;
    END IF;

    -- Nos aseguramos de que public.usuario quede alineado
    UPDATE public.usuario
       SET nombres = rec.nombres,
           apellidos = rec.apellidos,
           telefono = rec.telefono,
           activo = true
     WHERE auth_user_id = v_id;
  END LOOP;

  RAISE NOTICE 'Auth users sincronizados. Password demo: %', v_password;
END
$seed$;

-- ------------------------------------------------------------------
-- 2. Iglesia / Sede / Ministerio de demo (reutiliza si existen)
-- ------------------------------------------------------------------
DO $seed$
DECLARE
  v_id_iglesia     bigint;
  v_id_sede        bigint;
  v_id_ministerio  bigint;
  v_id_ciudad      bigint;
BEGIN
  SELECT c.id_ciudad INTO v_id_ciudad
    FROM public.ciudad c
    JOIN public.departamento d ON d.id_departamento = c.id_departamento
   WHERE c.nombre = 'Bogotá' AND d.nombre = 'Cundinamarca'
   LIMIT 1;

  SELECT id_iglesia INTO v_id_iglesia FROM public.iglesia WHERE nombre = 'Iglesia Central' LIMIT 1;
  IF v_id_iglesia IS NULL AND v_id_ciudad IS NOT NULL THEN
    INSERT INTO public.iglesia (nombre, fecha_fundacion, estado, id_ciudad)
    VALUES ('Iglesia Central', '2010-01-15', 'activa', v_id_ciudad)
    RETURNING id_iglesia INTO v_id_iglesia;
  END IF;

  SELECT id_sede INTO v_id_sede FROM public.sede WHERE nombre = 'Sede Principal' AND id_iglesia = v_id_iglesia LIMIT 1;
  IF v_id_sede IS NULL THEN
    INSERT INTO public.sede (nombre, direccion, id_ciudad, id_iglesia, estado)
    VALUES ('Sede Principal', 'Calle 100 #15-20, Bogotá', v_id_ciudad, v_id_iglesia, 'activa')
    RETURNING id_sede INTO v_id_sede;
  END IF;

  SELECT id_ministerio INTO v_id_ministerio FROM public.ministerio WHERE nombre = 'Ministerio de Jóvenes' AND id_sede = v_id_sede LIMIT 1;
  IF v_id_ministerio IS NULL THEN
    INSERT INTO public.ministerio (nombre, descripcion, estado, id_sede)
    VALUES ('Ministerio de Jóvenes', 'Ministerio para jóvenes de 15 a 30 años', 'activo', v_id_sede)
    RETURNING id_ministerio INTO v_id_ministerio;
  END IF;
END
$seed$;

-- ------------------------------------------------------------------
-- 3. usuario_rol (idempotente vía ON CONFLICT lógico)
-- ------------------------------------------------------------------
DO $seed$
DECLARE
  v_id_iglesia    bigint;
  v_id_ministerio bigint;
  rec             record;
  v_id_usuario    bigint;
  v_id_rol        bigint;
BEGIN
  SELECT id_iglesia INTO v_id_iglesia FROM public.iglesia WHERE nombre = 'Iglesia Central' LIMIT 1;
  SELECT m.id_ministerio INTO v_id_ministerio
    FROM public.ministerio m
    JOIN public.sede s ON s.id_sede = m.id_sede
   WHERE m.nombre = 'Ministerio de Jóvenes' AND s.id_iglesia = v_id_iglesia
   LIMIT 1;

  FOR rec IN
    SELECT * FROM (VALUES
      ('super@test.dev',    'Super Administrador',      NULL::bigint),  -- Super Admin sin iglesia
      ('admin@test.dev',    'Administrador de Iglesia', v_id_iglesia),
      ('lider@test.dev',    'Líder',                    v_id_iglesia),
      ('servidor@test.dev', 'Servidor',                 v_id_iglesia)
    ) t(correo, rol_nombre, id_iglesia)
  LOOP
    SELECT id_usuario INTO v_id_usuario FROM public.usuario WHERE correo = rec.correo LIMIT 1;
    SELECT id_rol     INTO v_id_rol     FROM public.rol     WHERE nombre = rec.rol_nombre LIMIT 1;
    CONTINUE WHEN v_id_usuario IS NULL OR v_id_rol IS NULL;

    -- Cierra filas previas de otros roles (si las hubiera)
    UPDATE public.usuario_rol
       SET fecha_fin = CURRENT_DATE
     WHERE id_usuario = v_id_usuario
       AND id_rol <> v_id_rol
       AND fecha_fin IS NULL;

    -- Inserta si no hay asignación activa de ese rol
    IF NOT EXISTS (
      SELECT 1 FROM public.usuario_rol
       WHERE id_usuario = v_id_usuario
         AND id_rol = v_id_rol
         AND fecha_fin IS NULL
    ) THEN
      INSERT INTO public.usuario_rol (id_usuario, id_rol, id_iglesia, fecha_inicio)
      VALUES (v_id_usuario, v_id_rol, rec.id_iglesia, CURRENT_DATE);
    END IF;
  END LOOP;

  -- Líder y Servidor como miembros del ministerio
  FOR rec IN
    SELECT correo FROM (VALUES ('lider@test.dev'), ('servidor@test.dev')) t(correo)
  LOOP
    SELECT id_usuario INTO v_id_usuario FROM public.usuario WHERE correo = rec.correo LIMIT 1;
    CONTINUE WHEN v_id_usuario IS NULL OR v_id_ministerio IS NULL;

    IF NOT EXISTS (
      SELECT 1 FROM public.miembro_ministerio
       WHERE id_usuario = v_id_usuario
         AND id_ministerio = v_id_ministerio
         AND fecha_fin IS NULL
    ) THEN
      INSERT INTO public.miembro_ministerio (id_usuario, id_ministerio, rol_ministerio, fecha_inicio)
      VALUES (
        v_id_usuario,
        v_id_ministerio,
        CASE WHEN rec.correo = 'lider@test.dev' THEN 'Líder' ELSE 'Servidor' END,
        CURRENT_DATE
      );
    END IF;
  END LOOP;
END
$seed$;

-- ------------------------------------------------------------------
-- 4. Cursos + módulos + ciclo + inscripción + avance
-- ------------------------------------------------------------------
DO $seed$
DECLARE
  v_id_iglesia    bigint;
  v_id_ministerio bigint;
  v_id_super      bigint;
  v_id_lider      bigint;
  v_id_servidor   bigint;
  v_id_curso1     bigint;
  v_id_curso2     bigint;
  v_id_mod1a      bigint;
  v_id_mod1b      bigint;
  v_id_mod1c      bigint;
  v_id_ciclo      bigint;
  v_id_detalle    bigint;
BEGIN
  SELECT id_iglesia INTO v_id_iglesia FROM public.iglesia WHERE nombre = 'Iglesia Central' LIMIT 1;
  SELECT m.id_ministerio INTO v_id_ministerio
    FROM public.ministerio m
    JOIN public.sede s ON s.id_sede = m.id_sede
   WHERE m.nombre = 'Ministerio de Jóvenes' AND s.id_iglesia = v_id_iglesia
   LIMIT 1;

  SELECT id_usuario INTO v_id_super    FROM public.usuario WHERE correo = 'super@test.dev'    LIMIT 1;
  SELECT id_usuario INTO v_id_lider    FROM public.usuario WHERE correo = 'lider@test.dev'    LIMIT 1;
  SELECT id_usuario INTO v_id_servidor FROM public.usuario WHERE correo = 'servidor@test.dev' LIMIT 1;

  -- Curso 1: activo con módulos publicados
  SELECT id_curso INTO v_id_curso1
    FROM public.curso WHERE nombre = 'Fundamentos de Liderazgo (DEMO)' AND id_ministerio = v_id_ministerio LIMIT 1;
  IF v_id_curso1 IS NULL THEN
    INSERT INTO public.curso (nombre, descripcion, duracion_horas, estado, id_ministerio, id_usuario_creador)
    VALUES (
      'Fundamentos de Liderazgo (DEMO)',
      'Curso introductorio para nuevos líderes. Cubre llamado, carácter y servicio.',
      8, 'activo', v_id_ministerio, COALESCE(v_id_lider, v_id_super)
    )
    RETURNING id_curso INTO v_id_curso1;
  END IF;

  -- Curso 2: borrador (para probar transiciones)
  SELECT id_curso INTO v_id_curso2
    FROM public.curso WHERE nombre = 'Evangelismo Personal (DEMO)' AND id_ministerio = v_id_ministerio LIMIT 1;
  IF v_id_curso2 IS NULL THEN
    INSERT INTO public.curso (nombre, descripcion, duracion_horas, estado, id_ministerio, id_usuario_creador)
    VALUES (
      'Evangelismo Personal (DEMO)',
      'Aún en preparación. Técnicas y testimonio personal.',
      6, 'borrador', v_id_ministerio, COALESCE(v_id_lider, v_id_super)
    )
    RETURNING id_curso INTO v_id_curso2;
  END IF;

  -- Módulos del curso 1
  SELECT id_modulo INTO v_id_mod1a FROM public.modulo WHERE id_curso = v_id_curso1 AND titulo = 'El llamado al liderazgo' LIMIT 1;
  IF v_id_mod1a IS NULL THEN
    INSERT INTO public.modulo (titulo, descripcion, contenido_md, orden, estado, id_curso)
    VALUES (
      'El llamado al liderazgo',
      'Reconocer el llamado y responder con humildad.',
      E'# El llamado al liderazgo\n\nEl liderazgo cristiano nace de un **llamado**.\n\n- Servicio antes que posición\n- Carácter antes que carisma\n- Fidelidad antes que éxito\n\nVideo introductorio:\n\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ',
      1, 'publicado', v_id_curso1
    )
    RETURNING id_modulo INTO v_id_mod1a;
  END IF;

  SELECT id_modulo INTO v_id_mod1b FROM public.modulo WHERE id_curso = v_id_curso1 AND titulo = 'Carácter del líder' LIMIT 1;
  IF v_id_mod1b IS NULL THEN
    INSERT INTO public.modulo (titulo, descripcion, contenido_md, orden, estado, id_curso)
    VALUES (
      'Carácter del líder',
      'Los frutos del Espíritu en la vida diaria.',
      E'# Carácter del líder\n\nEl carácter se construye en lo oculto.\n\n1. Integridad\n2. Humildad\n3. Paciencia\n4. Autocontrol',
      2, 'publicado', v_id_curso1
    )
    RETURNING id_modulo INTO v_id_mod1b;
  END IF;

  SELECT id_modulo INTO v_id_mod1c FROM public.modulo WHERE id_curso = v_id_curso1 AND titulo = 'Servir en equipo' LIMIT 1;
  IF v_id_mod1c IS NULL THEN
    INSERT INTO public.modulo (titulo, descripcion, contenido_md, orden, estado, id_curso)
    VALUES (
      'Servir en equipo',
      'Trabajar con otros sin competir (aún en borrador).',
      E'# Servir en equipo\n\n_Contenido en preparación_.',
      3, 'borrador', v_id_curso1
    )
    RETURNING id_modulo INTO v_id_mod1c;
  END IF;

  -- Ciclo en curso para el Curso 1
  SELECT id_proceso_asignado_curso INTO v_id_ciclo
    FROM public.proceso_asignado_curso
   WHERE id_curso = v_id_curso1 AND id_iglesia = v_id_iglesia
   ORDER BY fecha_inicio DESC LIMIT 1;
  IF v_id_ciclo IS NULL THEN
    INSERT INTO public.proceso_asignado_curso (id_curso, id_iglesia, fecha_inicio, fecha_fin, estado)
    VALUES (
      v_id_curso1, v_id_iglesia,
      CURRENT_DATE - INTERVAL '7 days',
      CURRENT_DATE + INTERVAL '30 days',
      'en_curso'
    )
    RETURNING id_proceso_asignado_curso INTO v_id_ciclo;
  END IF;

  -- Inscripción del Servidor
  IF v_id_servidor IS NOT NULL THEN
    SELECT id_detalle_proceso_curso INTO v_id_detalle
      FROM public.detalle_proceso_curso
     WHERE id_proceso_asignado_curso = v_id_ciclo AND id_usuario = v_id_servidor
     LIMIT 1;
    IF v_id_detalle IS NULL THEN
      INSERT INTO public.detalle_proceso_curso (id_proceso_asignado_curso, id_usuario, estado, fecha_inscripcion)
      VALUES (v_id_ciclo, v_id_servidor, 'inscrito', now())
      RETURNING id_detalle_proceso_curso INTO v_id_detalle;
    END IF;

    -- Precargar avance: un módulo completado (33% del curso)
    IF v_id_mod1a IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.avance_modulo
       WHERE id_usuario = v_id_servidor
         AND id_modulo  = v_id_mod1a
         AND id_detalle_proceso_curso = v_id_detalle
    ) THEN
      INSERT INTO public.avance_modulo (id_usuario, id_modulo, id_detalle_proceso_curso)
      VALUES (v_id_servidor, v_id_mod1a, v_id_detalle);
    END IF;
  END IF;
END
$seed$;

COMMIT;

-- ============================================================================
-- Verificación rápida
-- ============================================================================
SELECT u.correo,
       r.nombre AS rol,
       (SELECT COUNT(*) FROM public.miembro_ministerio mm
         WHERE mm.id_usuario = u.id_usuario AND mm.fecha_fin IS NULL) AS ministerios_activos
  FROM public.usuario u
  LEFT JOIN public.usuario_rol ur ON ur.id_usuario = u.id_usuario AND ur.fecha_fin IS NULL
  LEFT JOIN public.rol r ON r.id_rol = ur.id_rol
 WHERE u.correo LIKE '%@test.dev'
 ORDER BY u.correo;
