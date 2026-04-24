-- =============================================================================
-- DATOS DE PRUEBA: IGLESIAS, SEDES, PASTORES
-- =============================================================================
-- Ejecutar esto en el SQL Editor de Supabase (https://supabase.com/dashboard)
-- Instrucciones:
-- 1. Ve a tu proyecto IGLESIABD en Supabase
-- 2. En el menú lateral, haz clic en "SQL Editor"
-- 3. Crea una "New query"
-- 4. Pega TODO este código
-- 5. Presiona el botón "Run" (▶️)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. IGLESIAS DE PRUEBA
-- ─────────────────────────────────────────────────────────────────────────────

WITH ciudad_bogota AS (
  SELECT c.id_ciudad
  FROM public.ciudad c
  JOIN public.departamento dg ON dg.id_departamento = c.id_departamento
  WHERE c.nombre = 'Bogotá' AND dg.nombre = 'Cundinamarca'
  LIMIT 1
),
ciudad_medellin AS (
  SELECT c.id_ciudad
  FROM public.ciudad c
  JOIN public.departamento dg ON dg.id_departamento = c.id_departamento
  WHERE c.nombre = 'Medellín' AND dg.nombre = 'Antioquia'
  LIMIT 1
),
ciudad_cali AS (
  SELECT c.id_ciudad
  FROM public.ciudad c
  JOIN public.departamento dg ON dg.id_departamento = c.id_departamento
  WHERE c.nombre = 'Cali' AND dg.nombre = 'Valle del Cauca'
  LIMIT 1
),
ciudad_barranquilla AS (
  SELECT c.id_ciudad
  FROM public.ciudad c
  JOIN public.departamento dg ON dg.id_departamento = c.id_departamento
  WHERE c.nombre = 'Barranquilla' AND dg.nombre = 'Atlántico'
  LIMIT 1
)
INSERT INTO public.iglesia (nombre, fecha_fundacion, estado, id_ciudad)
SELECT * FROM (VALUES
  ('Iglesia Puerta del Cielo', '2005-03-20'::date, 'activa', (SELECT id_ciudad FROM ciudad_medellin)),
  ('Centro Cristiano Vida Nueva', '2012-07-08'::date, 'activa', (SELECT id_ciudad FROM ciudad_cali)),
  ('Iglesia Fuente de Bendición', '2008-11-15'::date, 'activa', (SELECT id_ciudad FROM ciudad_barranquilla)),
  ('Iglesia Monte de Sion', '2015-01-10'::date, 'activa', (SELECT id_ciudad FROM ciudad_bogota)),
  ('Casa de Oración El Shaddai', '2002-05-25'::date, 'inactiva', (SELECT id_ciudad FROM ciudad_medellin))
) AS v(nombre, fecha_fundacion, estado, id_ciudad)
WHERE NOT EXISTS (
  SELECT 1 FROM public.iglesia i WHERE i.nombre = v.nombre
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SEDES DE PRUEBA
-- ─────────────────────────────────────────────────────────────────────────────

WITH iglesias AS (
  SELECT id_iglesia, nombre FROM public.iglesia
  WHERE nombre IN (
    'Iglesia Central',
    'Iglesia Puerta del Cielo',
    'Centro Cristiano Vida Nueva',
    'Iglesia Fuente de Bendición',
    'Iglesia Monte de Sion',
    'Casa de Oración El Shaddai'
  )
),
ciudades AS (
  SELECT c.id_ciudad, c.nombre AS ciudad_nombre, dg.nombre AS depto_nombre
  FROM public.ciudad c
  JOIN public.departamento dg ON dg.id_departamento = c.id_departamento
  WHERE (c.nombre = 'Bogotá' AND dg.nombre = 'Cundinamarca')
     OR (c.nombre = 'Medellín' AND dg.nombre = 'Antioquia')
     OR (c.nombre = 'Cali' AND dg.nombre = 'Valle del Cauca')
     OR (c.nombre = 'Barranquilla' AND dg.nombre = 'Atlántico')
     OR (c.nombre = 'Soacha' AND dg.nombre = 'Cundinamarca')
     OR (c.nombre = 'Bello' AND dg.nombre = 'Antioquia')
     OR (c.nombre = 'Palmira' AND dg.nombre = 'Valle del Cauca')
     OR (c.nombre = 'Soledad' AND dg.nombre = 'Atlántico')
)
INSERT INTO public.sede (nombre, direccion, id_ciudad, id_iglesia, estado)
SELECT * FROM (VALUES
  -- Iglesia Central (Bogotá)
  ('Sede Principal Central', 'Calle 100 #15-20, Bogotá', 
   (SELECT id_ciudad FROM ciudades WHERE ciudad_nombre = 'Bogotá'),
   (SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Central'),
   'activa'),
  ('Sede Soacha', 'Carrera 5 #23-45, Soacha',
   (SELECT id_ciudad FROM ciudades WHERE ciudad_nombre = 'Soacha'),
   (SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Central'),
   'activa'),

  -- Iglesia Puerta del Cielo (Medellín)
  ('Sede Principal Medellín', 'Carrera 65 #45-30, Medellín',
   (SELECT id_ciudad FROM ciudades WHERE ciudad_nombre = 'Medellín'),
   (SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Puerta del Cielo'),
   'activa'),
  ('Sede Bello', 'Calle 45 #32-15, Bello',
   (SELECT id_ciudad FROM ciudades WHERE ciudad_nombre = 'Bello'),
   (SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Puerta del Cielo'),
   'activa'),

  -- Centro Cristiano Vida Nueva (Cali)
  ('Sede Principal Cali', 'Avenida Roosevelt #28-40, Cali',
   (SELECT id_ciudad FROM ciudades WHERE ciudad_nombre = 'Cali'),
   (SELECT id_iglesia FROM iglesias WHERE nombre = 'Centro Cristiano Vida Nueva'),
   'activa'),
  ('Sede Palmira', 'Carrera 8 #15-60, Palmira',
   (SELECT id_ciudad FROM ciudades WHERE ciudad_nombre = 'Palmira'),
   (SELECT id_iglesia FROM iglesias WHERE nombre = 'Centro Cristiano Vida Nueva'),
   'en_construccion'),

  -- Iglesia Fuente de Bendición (Barranquilla)
  ('Sede Principal Barranquilla', 'Calle 72 #45-20, Barranquilla',
   (SELECT id_ciudad FROM ciudades WHERE ciudad_nombre = 'Barranquilla'),
   (SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Fuente de Bendición'),
   'activa'),
  ('Sede Soledad', 'Carrera 12 #8-45, Soledad',
   (SELECT id_ciudad FROM ciudades WHERE ciudad_nombre = 'Soledad'),
   (SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Fuente de Bendición'),
   'activa'),

  -- Iglesia Monte de Sion (Bogotá)
  ('Sede Principal Monte de Sion', 'Avenida Carrera 9 #127-50, Bogotá',
   (SELECT id_ciudad FROM ciudades WHERE ciudad_nombre = 'Bogotá'),
   (SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Monte de Sion'),
   'activa'),

  -- Casa de Oración El Shaddai (Medellín)
  ('Sede Principal El Shaddai', 'Calle 33 #65-20, Medellín',
   (SELECT id_ciudad FROM ciudades WHERE ciudad_nombre = 'Medellín'),
   (SELECT id_iglesia FROM iglesias WHERE nombre = 'Casa de Oración El Shaddai'),
   'inactiva')
) AS v(nombre, direccion, id_ciudad, id_iglesia, estado)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sede s WHERE s.nombre = v.nombre
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PASTORES DE PRUEBA
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.pastor (nombres, apellidos, correo, telefono, id_usuario)
SELECT * FROM (VALUES
  ('Juan Carlos', 'Rodríguez Pérez', 'jcrodriguez@iglesia.com', '3001234567', NULL),
  ('María Elena', 'Gómez Castro', 'megomez@iglesia.com', '3109876543', NULL),
  ('Pedro José', 'Martínez López', 'pjmartinez@iglesia.com', '3204567890', NULL),
  ('Ana Lucía', 'Fernández Silva', 'afernandez@iglesia.com', '3012345678', NULL),
  ('Luis Alberto', 'Torres Ramírez', 'ltorres@iglesia.com', '3158765432', NULL),
  ('Carmen Rosa', 'Díaz Herrera', 'cdiaz@iglesia.com', '3145678901', NULL),
  ('Andrés Felipe', 'Morales Soto', 'amorales@iglesia.com', '3172345678', NULL),
  ('Diana Patricia', 'Vargas Jiménez', 'dvargas@iglesia.com', '3189012345', NULL),
  ('Jorge Enrique', 'Castro Mendoza', 'jcastro@iglesia.com', '3123456789', NULL),
  ('Luz Marina', 'Reyes Guerrero', 'lreyes@iglesia.com', '3198765432', NULL)
) AS v(nombres, apellidos, correo, telefono, id_usuario)
WHERE NOT EXISTS (
  SELECT 1 FROM public.pastor p WHERE p.correo = v.correo
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RELACIONES IGLESIA-PASTOR
-- ─────────────────────────────────────────────────────────────────────────────

WITH iglesias AS (
  SELECT id_iglesia, nombre FROM public.iglesia
  WHERE nombre IN (
    'Iglesia Central',
    'Iglesia Puerta del Cielo',
    'Centro Cristiano Vida Nueva',
    'Iglesia Fuente de Bendición',
    'Iglesia Monte de Sion',
    'Casa de Oración El Shaddai'
  )
),
pastores AS (
  SELECT id_pastor, correo FROM public.pastor
  WHERE correo IN (
    'jcrodriguez@iglesia.com',
    'megomez@iglesia.com',
    'pjmartinez@iglesia.com',
    'afernandez@iglesia.com',
    'ltorres@iglesia.com',
    'cdiaz@iglesia.com',
    'amorales@iglesia.com',
    'dvargas@iglesia.com',
    'jcastro@iglesia.com',
    'lreyes@iglesia.com'
  )
)
INSERT INTO public.iglesia_pastor (
  id_iglesia, id_pastor, es_principal, fecha_inicio, fecha_fin, observaciones
)
SELECT * FROM (VALUES
  -- Iglesia Central
  ((SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Central'),
   (SELECT id_pastor FROM pastores WHERE correo = 'jcrodriguez@iglesia.com'),
   true, '2010-01-15'::date, NULL, 'Pastor fundador y principal'),
  ((SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Central'),
   (SELECT id_pastor FROM pastores WHERE correo = 'megomez@iglesia.com'),
   false, '2015-06-20'::date, NULL, 'Pastora asociada - enseñanza'),

  -- Iglesia Puerta del Cielo
  ((SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Puerta del Cielo'),
   (SELECT id_pastor FROM pastores WHERE correo = 'pjmartinez@iglesia.com'),
   true, '2005-03-20'::date, NULL, 'Pastor principal'),
  ((SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Puerta del Cielo'),
   (SELECT id_pastor FROM pastores WHERE correo = 'afernandez@iglesia.com'),
   false, '2010-08-12'::date, NULL, 'Pastora de jóvenes'),

  -- Centro Cristiano Vida Nueva
  ((SELECT id_iglesia FROM iglesias WHERE nombre = 'Centro Cristiano Vida Nueva'),
   (SELECT id_pastor FROM pastores WHERE correo = 'ltorres@iglesia.com'),
   true, '2012-07-08'::date, NULL, 'Pastor principal'),
  ((SELECT id_iglesia FROM iglesias WHERE nombre = 'Centro Cristiano Vida Nueva'),
   (SELECT id_pastor FROM pastores WHERE correo = 'cdiaz@iglesia.com'),
   false, '2018-03-15'::date, NULL, 'Pastora de alabanza'),

  -- Iglesia Fuente de Bendición
  ((SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Fuente de Bendición'),
   (SELECT id_pastor FROM pastores WHERE correo = 'amorales@iglesia.com'),
   true, '2008-11-15'::date, NULL, 'Pastor principal'),
  ((SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Fuente de Bendición'),
   (SELECT id_pastor FROM pastores WHERE correo = 'dvargas@iglesia.com'),
   false, '2015-01-20'::date, NULL, 'Pastora de mujeres'),

  -- Iglesia Monte de Sion
  ((SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Monte de Sion'),
   (SELECT id_pastor FROM pastores WHERE correo = 'jcastro@iglesia.com'),
   true, '2015-01-10'::date, NULL, 'Pastor principal'),
  ((SELECT id_iglesia FROM iglesias WHERE nombre = 'Iglesia Monte de Sion'),
   (SELECT id_pastor FROM pastores WHERE correo = 'lreyes@iglesia.com'),
   false, '2020-06-01'::date, NULL, 'Pastora de niños'),

  -- Casa de Oración El Shaddai (inactiva - pastor ya no está)
  ((SELECT id_iglesia FROM iglesias WHERE nombre = 'Casa de Oración El Shaddai'),
   (SELECT id_pastor FROM pastores WHERE correo = 'jcrodriguez@iglesia.com'),
   true, '2002-05-25'::date, '2023-12-31'::date, 'Pastor anterior - iglesia inactiva')
) AS v(id_iglesia, id_pastor, es_principal, fecha_inicio, fecha_fin, observaciones)
WHERE NOT EXISTS (
  SELECT 1 FROM public.iglesia_pastor ip
  WHERE ip.id_iglesia = v.id_iglesia AND ip.id_pastor = v.id_pastor
);

-- =============================================================================
-- RESUMEN DE DATOS INSERTADOS
-- =============================================================================
-- Este script inserta:
--   • 5 iglesias nuevas (total 6 con la existente)
--   • 10 sedes (2 por iglesia activa, 1 por inactiva)
--   • 10 pastores
--   • 13 relaciones iglesia-pastor
-- =============================================================================

