-- ============================================================
-- Script para crear usuario Admin con rol "Super Administrador"
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- PASO 0: Reemplaza este UUID con el de tu usuario en Auth > Users
-- (El que aparece en tus logs es este:)
DO $$
DECLARE
  v_auth_user_id uuid := '7c78f2b3-fcbb-412e-9406-cbee85e72e79';  -- ← Cámbialo si es diferente
  v_id_usuario   bigint;
  v_id_rol       bigint;
  v_id_pais      bigint;
  v_id_depto     bigint;
  v_id_ciudad    bigint;
  v_id_iglesia   bigint;
BEGIN

  -- ========================================
  -- PASO 1: Crear roles si no existen
  -- ========================================
  INSERT INTO public.rol (nombre, descripcion)
  VALUES
    ('Super Administrador', 'Acceso total al sistema'),
    ('Administrador de Iglesia', 'Gestión completa de una iglesia'),
    ('Líder', 'Líder de ministerio'),
    ('Servidor', 'Servidor/miembro activo')
  ON CONFLICT (nombre) DO NOTHING;

  -- Obtener id del rol Super Administrador
  SELECT id_rol INTO v_id_rol FROM public.rol WHERE nombre = 'Super Administrador';

  -- ========================================
  -- PASO 2: Crear geografía si no existe
  -- ========================================
  -- País
  INSERT INTO public.pais (nombre)
  VALUES ('Colombia')
  ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
  RETURNING id_pais INTO v_id_pais;

  IF v_id_pais IS NULL THEN
    SELECT id_pais INTO v_id_pais FROM public.pais WHERE nombre = 'Colombia';
  END IF;

  -- Departamento
  SELECT id_departamento INTO v_id_depto
  FROM public.departamento WHERE nombre = 'Cundinamarca' AND id_pais = v_id_pais;

  IF v_id_depto IS NULL THEN
    INSERT INTO public.departamento (nombre, id_pais)
    VALUES ('Cundinamarca', v_id_pais)
    RETURNING id_departamento INTO v_id_depto;
  END IF;

  -- Ciudad
  SELECT id_ciudad INTO v_id_ciudad
  FROM public.ciudad WHERE nombre = 'Bogotá' AND id_departamento = v_id_depto;

  IF v_id_ciudad IS NULL THEN
    INSERT INTO public.ciudad (nombre, id_departamento)
    VALUES ('Bogotá', v_id_depto)
    RETURNING id_ciudad INTO v_id_ciudad;
  END IF;

  -- ========================================
  -- PASO 3: Crear iglesia si no existe
  -- ========================================
  SELECT id_iglesia INTO v_id_iglesia
  FROM public.iglesia WHERE nombre = 'Iglesia Principal';

  IF v_id_iglesia IS NULL THEN
    INSERT INTO public.iglesia (nombre, fecha_fundacion, estado, id_ciudad)
    VALUES ('Iglesia Principal', '2020-01-01', 'activa', v_id_ciudad)
    RETURNING id_iglesia INTO v_id_iglesia;
  END IF;

  -- ========================================
  -- PASO 4: Crear usuario en tabla public.usuario
  -- ========================================
  SELECT id_usuario INTO v_id_usuario
  FROM public.usuario WHERE auth_user_id = v_auth_user_id;

  IF v_id_usuario IS NULL THEN
    INSERT INTO public.usuario (
      nombres, apellidos, correo, contrasena_hash,
      telefono, activo, auth_user_id
    ) VALUES (
      'Admin',
      'Sistema',
      'admin@iglesiabd.com',
      'managed-by-supabase-auth',  -- La contraseña real está en Auth
      '+57 300 000 0000',
      true,
      v_auth_user_id
    )
    RETURNING id_usuario INTO v_id_usuario;

    RAISE NOTICE '✅ Usuario creado con id_usuario: %', v_id_usuario;
  ELSE
    RAISE NOTICE 'ℹ️ Usuario ya existe con id_usuario: %', v_id_usuario;
  END IF;

  -- ========================================
  -- PASO 5: Asignar rol Super Administrador
  -- ========================================
  -- Super Admin no debe estar ligado a una iglesia específica
  IF NOT EXISTS (
    SELECT 1 FROM public.usuario_rol
    WHERE id_usuario = v_id_usuario
      AND id_rol = v_id_rol
      AND fecha_fin IS NULL
  ) THEN
    INSERT INTO public.usuario_rol (id_usuario, id_rol, id_iglesia, fecha_inicio)
    VALUES (v_id_usuario, v_id_rol, NULL, CURRENT_DATE);  -- iglesia_id = NULL para Super Admin

    RAISE NOTICE '✅ Rol Super Administrador asignado (sin iglesia específica)';
  ELSE
    RAISE NOTICE 'ℹ️ El usuario ya tiene rol Super Administrador';
  END IF;

  RAISE NOTICE '🎉 ¡Listo! Ahora puedes hacer login con admin@iglesiabd.com / Password123!';

END $$;
