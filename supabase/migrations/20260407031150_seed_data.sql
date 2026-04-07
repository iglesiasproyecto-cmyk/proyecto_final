-- Migration: Seed initial data
-- Date: 2026-03-31
-- Purpose: Add Colombia geography, roles, event types, and demo data

-- ── Geografía: Colombia ──
INSERT INTO public.pais (nombre) VALUES ('Colombia')
ON CONFLICT DO NOTHING;

WITH col AS (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
INSERT INTO public.departamento (nombre, id_pais)
SELECT d.nombre, col.id_pais FROM col, (VALUES
  ('Cundinamarca'), ('Antioquia'), ('Valle del Cauca'),
  ('Atlántico'), ('Santander'), ('Bolívar')
) AS d(nombre)
ON CONFLICT DO NOTHING;

INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, dg.id_departamento
FROM (VALUES
  ('Bogotá',        'Cundinamarca'),
  ('Soacha',        'Cundinamarca'),
  ('Medellín',      'Antioquia'),
  ('Bello',         'Antioquia'),
  ('Cali',          'Valle del Cauca'),
  ('Palmira',       'Valle del Cauca'),
  ('Barranquilla',  'Atlántico'),
  ('Soledad',       'Atlántico'),
  ('Bucaramanga',   'Santander'),
  ('Floridablanca', 'Santander'),
  ('Cartagena',     'Bolívar'),
  ('Turbaco',       'Bolívar')
) AS c(nombre, depto)
JOIN public.departamento dg ON dg.nombre = c.depto
ON CONFLICT DO NOTHING;

-- ── Roles ──
INSERT INTO public.rol (nombre, descripcion) VALUES
  ('Super Administrador',     'Gestión global de iglesias en la plataforma'),
  ('Administrador de Iglesia','Gestión de ministerios, miembros y eventos'),
  ('Líder',                   'Gestión completa de su ministerio'),
  ('Servidor',                'Lectura general y actualización de sus tareas')
ON CONFLICT DO NOTHING;

-- ── Tipos de evento ──
INSERT INTO public.tipo_evento (nombre, descripcion) VALUES
  ('Culto dominical',      'Servicio principal de adoración'),
  ('Conferencia',          'Evento de formación y enseñanza'),
  ('Retiro espiritual',    'Encuentro de crecimiento espiritual'),
  ('Evangelismo',          'Actividad de alcance comunitario'),
  ('Reunión de líderes',   'Reunión de coordinación de líderes'),
  ('Actividad de ministerio', 'Actividad específica de un ministerio')
ON CONFLICT DO NOTHING;

-- ── Demo: Iglesia ──
INSERT INTO public.iglesia (nombre, fecha_fundacion, estado, id_ciudad)
SELECT 'Iglesia Central', '2010-01-15', 'activa', c.id_ciudad
FROM public.ciudad c
JOIN public.departamento dg ON dg.id_departamento = c.id_departamento
WHERE c.nombre = 'Bogotá' AND dg.nombre = 'Cundinamarca'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ── Demo: Sede ──
INSERT INTO public.sede (nombre, direccion, id_ciudad, id_iglesia, estado)
SELECT 'Sede Principal', 'Calle 100 #15-20, Bogotá', c.id_ciudad, ig.id_iglesia, 'activa'
FROM public.ciudad c
JOIN public.departamento dg ON dg.id_departamento = c.id_departamento,
     public.iglesia ig
WHERE c.nombre = 'Bogotá' AND dg.nombre = 'Cundinamarca'
  AND ig.nombre = 'Iglesia Central'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ── Demo: Ministerio ──
INSERT INTO public.ministerio (nombre, descripcion, estado, id_sede)
SELECT 'Ministerio de Jóvenes', 'Ministerio para jóvenes de 15 a 30 años', 'activo', s.id_sede
FROM public.sede s WHERE s.nombre = 'Sede Principal'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ── Demo: Evento (próximo domingo) ──
INSERT INTO public.evento (
  nombre, descripcion, id_tipo_evento,
  fecha_inicio, fecha_fin, estado, id_iglesia, id_sede
)
SELECT
  'Culto Dominical',
  'Servicio principal de adoración dominical',
  te.id_tipo_evento,
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '7 days' + INTERVAL '2 hours',
  'programado',
  ig.id_iglesia,
  s.id_sede
FROM public.tipo_evento te, public.iglesia ig, public.sede s
WHERE te.nombre = 'Culto dominical'
  AND ig.nombre = 'Iglesia Central'
  AND s.nombre = 'Sede Principal'
ON CONFLICT DO NOTHING;
