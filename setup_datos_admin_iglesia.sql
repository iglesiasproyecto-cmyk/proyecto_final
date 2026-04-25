-- 📋 SCRIPT PARA POBLAR DATOS DE PRUEBA - ADMIN IGLESIA
-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard/project/heibyjbvfiokmduwwawm/sql)

-- 1. LIMPIAR DATOS EXISTENTES (opcional - descomentar si es necesario)
-- DELETE FROM public.sede_pastor;
-- DELETE FROM public.sede;
-- DELETE FROM public.pastor;
-- DELETE FROM public.usuario_rol WHERE id_rol IN (SELECT id_rol FROM public.rol WHERE nombre = 'Administrador de Iglesia');
-- DELETE FROM public.usuario WHERE correo = 'admin@test.dev';
-- DELETE FROM public.iglesia WHERE nombre = 'Iglesia Central Demo';

-- 2. CREAR IGLESIA
INSERT INTO public.iglesia (nombre)
VALUES ('Iglesia Central Demo');

-- 3. CREAR USUARIO ADMIN IGLESIA
INSERT INTO public.usuario (nombres, apellidos, correo, telefono, activo)
VALUES ('Admin', 'Iglesia Demo', 'admin@test.dev', '+1234567890', true);

-- 4. ASIGNAR ROL ADMIN IGLESIA AL USUARIO
INSERT INTO public.usuario_rol (id_usuario, id_rol, id_iglesia, fecha_inicio)
SELECT
  u.id_usuario,
  r.id_rol,
  i.id_iglesia,
  CURRENT_DATE
FROM public.usuario u
CROSS JOIN public.rol r
CROSS JOIN public.iglesia i
WHERE u.correo = 'admin@test.dev'
  AND r.nombre = 'Administrador de Iglesia'
  AND i.nombre = 'Iglesia Central Demo';

-- 5. CREAR CIUDAD (si no existe)
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT 'Bogotá', 1
WHERE NOT EXISTS (SELECT 1 FROM public.ciudad WHERE nombre = 'Bogotá');

-- 6. CREAR SEDES PARA LA IGLESIA
INSERT INTO public.sede (nombre, direccion, id_ciudad, id_iglesia, estado)
SELECT
  sedes.nombre,
  sedes.direccion,
  c.id_ciudad,
  i.id_iglesia,
  'activo'
FROM (
  VALUES
    ('Sede Centro', 'Calle 123 #45-67'),
    ('Sede Norte', 'Carrera 89 #12-34'),
    ('Sede Sur', 'Avenida 456 #78-90')
) AS sedes(nombre, direccion)
CROSS JOIN public.ciudad c
CROSS JOIN public.iglesia i
WHERE c.nombre = 'Bogotá'
  AND i.nombre = 'Iglesia Central Demo';

-- 7. CREAR PASTORES
INSERT INTO public.pastor (nombres, apellidos, correo, telefono)
VALUES
  ('Juan', 'Pérez', 'juan.perez@iglesia.dev', '+1234567891'),
  ('María', 'González', 'maria.gonzalez@iglesia.dev', '+1234567892');

-- 8. ASIGNAR PASTORES A SEDES
-- Sede Centro y Sede Norte tienen pastores asignados
-- Sede Sur queda sin pastor (vacante)
INSERT INTO public.sede_pastor (id_sede, id_pastor, es_principal, fecha_inicio)
SELECT
  s.id_sede,
  p.id_pastor,
  true,
  CURRENT_DATE
FROM public.sede s
CROSS JOIN public.pastor p
WHERE s.nombre IN ('Sede Centro', 'Sede Norte')
  AND p.nombres = 'Juan';

-- 9. VERIFICACIÓN
SELECT
  '✅ Datos creados exitosamente' as status,
  (SELECT COUNT(*) FROM public.iglesia WHERE nombre = 'Iglesia Central Demo') as iglesias,
  (SELECT COUNT(*) FROM public.usuario WHERE correo = 'admin@test.dev') as usuarios,
  (SELECT COUNT(*) FROM public.sede) as sedes,
  (SELECT COUNT(*) FROM public.pastor) as pastores,
  (SELECT COUNT(*) FROM public.sede_pastor) as asignaciones;

-- 📝 INSTRUCCIONES:
-- 1. Copia y pega este script completo en el SQL Editor de Supabase
-- 2. Ejecuta el script (botón "Run")
-- 3. Verifica que aparezca "✅ Datos creados exitosamente"
-- 4. Recarga tu aplicación para ver la sección "Pastores por Sede" con datos reales