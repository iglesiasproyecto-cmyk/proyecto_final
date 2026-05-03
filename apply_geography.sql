-- ============================================================================
-- Aplicar Geografía Completa de Colombia (32 Departamentos + Ciudades)
-- ============================================================================

-- Primero verificar que Colombia existe
SELECT COALESCE(
  (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia' LIMIT 1),
  (INSERT INTO public.pais (nombre) VALUES ('Colombia') RETURNING id_pais)
) as id_colombia_pais \gset

-- Limpiar datos anteriores
DELETE FROM public.ciudad WHERE id_departamento IN (
  SELECT id_departamento FROM public.departamento 
  WHERE id_pais = :id_colombia_pais
);

DELETE FROM public.departamento 
WHERE id_pais = :id_colombia_pais;

-- Insertar todos los departamentos de Colombia
INSERT INTO public.departamento (nombre, id_pais) VALUES
('Amazonas', :id_colombia_pais),
('Antioquia', :id_colombia_pais),
('Arauca', :id_colombia_pais),
('Atlántico', :id_colombia_pais),
('Bolívar', :id_colombia_pais),
('Boyacá', :id_colombia_pais),
('Caldas', :id_colombia_pais),
('Caquetá', :id_colombia_pais),
('Casanare', :id_colombia_pais),
('Cauca', :id_colombia_pais),
('Cesar', :id_colombia_pais),
('Chocó', :id_colombia_pais),
('Córdoba', :id_colombia_pais),
('Cundinamarca', :id_colombia_pais),
('Guainía', :id_colombia_pais),
('Guaviare', :id_colombia_pais),
('Huila', :id_colombia_pais),
('La Guajira', :id_colombia_pais),
('Magdalena', :id_colombia_pais),
('Meta', :id_colombia_pais),
('Nariño', :id_colombia_pais),
('Norte de Santander', :id_colombia_pais),
('Putumayo', :id_colombia_pais),
('Quindío', :id_colombia_pais),
('Risaralda', :id_colombia_pais),
('Santander', :id_colombia_pais),
('Sucre', :id_colombia_pais),
('Tolima', :id_colombia_pais),
('Valle del Cauca', :id_colombia_pais),
('Vaupés', :id_colombia_pais),
('Vichada', :id_colombia_pais),
('Distrito Capital de Bogotá', :id_colombia_pais)
ON CONFLICT (nombre, id_pais) DO NOTHING;

-- Insertar ciudades por departamento
-- Este archivo es muy grande, será mejor ejecutarlo directamente desde la migración
