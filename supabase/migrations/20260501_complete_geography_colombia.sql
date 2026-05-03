-- ============================================================================
-- Migración: Geografía Completa de Colombia (32 Departamentos + Ciudades)
-- Fecha: 2026-05-01
-- Descripción: Inserta todos los 32 departamentos de Colombia y ciudades
--              principales. Remplaza datos anteriores.
-- ============================================================================

BEGIN;

-- Limpiar datos anteriores (mantener pais)
DELETE FROM public.ciudad WHERE id_departamento IN (
  SELECT id_departamento FROM public.departamento 
  WHERE id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
);

DELETE FROM public.departamento 
WHERE id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia');

-- Obtener ID de Colombia
WITH col AS (
  INSERT INTO public.pais (nombre) VALUES ('Colombia')
  ON CONFLICT (nombre) DO UPDATE SET nombre = 'Colombia'
  RETURNING id_pais
)

-- ============================================================================
-- DEPARTAMENTOS (32 en total)
-- ============================================================================
INSERT INTO public.departamento (nombre, id_pais)
SELECT d.nombre, col.id_pais FROM col, (VALUES
  ('Amazonas'),
  ('Antioquia'),
  ('Arauca'),
  ('Atlántico'),
  ('Bolívar'),
  ('Boyacá'),
  ('Caldas'),
  ('Caquetá'),
  ('Casanare'),
  ('Cauca'),
  ('Cesar'),
  ('Chocó'),
  ('Córdoba'),
  ('Cundinamarca'),
  ('Guainía'),
  ('Guaviare'),
  ('Huila'),
  ('La Guajira'),
  ('Magdalena'),
  ('Meta'),
  ('Nariño'),
  ('Norte de Santander'),
  ('Putumayo'),
  ('Quindío'),
  ('Risaralda'),
  ('Santander'),
  ('Sucre'),
  ('Tolima'),
  ('Valle del Cauca'),
  ('Vaupés'),
  ('Vichada'),
  ('Distrito Capital de Bogotá')
) AS d(nombre)
ON CONFLICT (nombre, id_pais) DO NOTHING;

-- ============================================================================
-- CIUDADES POR DEPARTAMENTO (principales)
-- ============================================================================

-- Amazonas
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Leticia'),
  ('Puerto Nariño'),
  ('La Chorrera')
) AS c(nombre) WHERE d.nombre = 'Amazonas' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Antioquia
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Medellín'),
  ('Bello'),
  ('Envigado'),
  ('Itagüí'),
  ('Sabaneta'),
  ('La Estrella'),
  ('Caldas'),
  ('Rionegro'),
  ('Guarne'),
  ('Turbo')
) AS c(nombre) WHERE d.nombre = 'Antioquia' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Arauca
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Arauca'),
  ('Arauquita'),
  ('Fortul'),
  ('Saravena')
) AS c(nombre) WHERE d.nombre = 'Arauca' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Atlántico
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Barranquilla'),
  ('Soledad'),
  ('Malambo'),
  ('Luruaco'),
  ('Sabanalarga')
) AS c(nombre) WHERE d.nombre = 'Atlántico' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Bolívar
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Cartagena'),
  ('Turbaco'),
  ('Magangué'),
  ('Córdoba'),
  ('Montecristo'),
  ('San Jacinto'),
  ('Arjona')
) AS c(nombre) WHERE d.nombre = 'Bolívar' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Boyacá
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Tunja'),
  ('Duitama'),
  ('Sogamoso'),
  ('Paipa'),
  ('Zipaquirá'),
  ('Ráquira'),
  ('Villa de Leyva')
) AS c(nombre) WHERE d.nombre = 'Boyacá' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Caldas
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Manizales'),
  ('Villamaría'),
  ('Palestina'),
  ('Salamina'),
  ('Neira'),
  ('Supía')
) AS c(nombre) WHERE d.nombre = 'Caldas' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Caquetá
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Florencia'),
  ('San Vicente del Caguán'),
  ('La Montañita'),
  ('Solano')
) AS c(nombre) WHERE d.nombre = 'Caquetá' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Casanare
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Yopal'),
  ('Aguazul'),
  ('Paz de Ariporo'),
  ('Tauramena')
) AS c(nombre) WHERE d.nombre = 'Casanare' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Cauca
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Popayán'),
  ('Puerto Tejada'),
  ('Santander de Quilichao'),
  ('Timbío'),
  ('El Tambo')
) AS c(nombre) WHERE d.nombre = 'Cauca' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Cesar
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Valledupar'),
  ('Bosconia'),
  ('La Paz'),
  ('Astrea')
) AS c(nombre) WHERE d.nombre = 'Cesar' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Chocó
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Quibdó'),
  ('Istmina'),
  ('Condoto'),
  ('Lloró')
) AS c(nombre) WHERE d.nombre = 'Chocó' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Córdoba
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Montería'),
  ('Cereté'),
  ('Lorica'),
  ('Chinú')
) AS c(nombre) WHERE d.nombre = 'Córdoba' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Cundinamarca
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Soacha'),
  ('Zipaquirá'),
  ('Fusagasugá'),
  ('Ubaté'),
  ('Facatativá'),
  ('Girardot'),
  ('Chía'),
  ('Cajicá'),
  ('La Calera')
) AS c(nombre) WHERE d.nombre = 'Cundinamarca' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Guainía
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Inírida'),
  ('San Felipe'),
  ('Barranco Minas')
) AS c(nombre) WHERE d.nombre = 'Guainía' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Guaviare
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('San José del Guaviare'),
  ('Calamar'),
  ('El Retorno')
) AS c(nombre) WHERE d.nombre = 'Guaviare' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Huila
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Neiva'),
  ('Pitalito'),
  ('Garzón'),
  ('Aipe'),
  ('Campoalegre')
) AS c(nombre) WHERE d.nombre = 'Huila' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- La Guajira
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Riohacha'),
  ('Maicao'),
  ('Uribia'),
  ('Manaure')
) AS c(nombre) WHERE d.nombre = 'La Guajira' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Magdalena
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Santa Marta'),
  ('Ciénaga'),
  ('Fundación'),
  ('Aracataca'),
  ('Plato')
) AS c(nombre) WHERE d.nombre = 'Magdalena' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Meta
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Villavicencio'),
  ('Acacías'),
  ('Granada'),
  ('Restrepo'),
  ('Castilla la Nueva')
) AS c(nombre) WHERE d.nombre = 'Meta' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Nariño
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Pasto'),
  ('Ipiales'),
  ('Tumaco'),
  ('Puerto Asís'),
  ('Pupiales')
) AS c(nombre) WHERE d.nombre = 'Nariño' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Norte de Santander
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Cúcuta'),
  ('Los Patios'),
  ('Villa del Rosario'),
  ('San Cayetano'),
  ('El Zulia')
) AS c(nombre) WHERE d.nombre = 'Norte de Santander' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Putumayo
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Mocoa'),
  ('Puerto Caicedo'),
  ('Puerto Guzmán'),
  ('Villagarzón')
) AS c(nombre) WHERE d.nombre = 'Putumayo' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Quindío
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Armenia'),
  ('Montenegro'),
  ('Pereira'),
  ('Salento'),
  ('Buenavista')
) AS c(nombre) WHERE d.nombre = 'Quindío' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Risaralda
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Pereira'),
  ('Dosquebradas'),
  ('Santa Rosa de Cabal'),
  ('La Virginia'),
  ('Quinchía')
) AS c(nombre) WHERE d.nombre = 'Risaralda' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Santander
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Bucaramanga'),
  ('Floridablanca'),
  ('Gibraltarén'),
  ('Piedecuesta'),
  ('Barrancabermeja')
) AS c(nombre) WHERE d.nombre = 'Santander' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Sucre
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Sincelejo'),
  ('Corozal'),
  ('San Marcos'),
  ('Sampués')
) AS c(nombre) WHERE d.nombre = 'Sucre' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Tolima
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Ibagué'),
  ('Espinal'),
  ('Chaparral'),
  ('Melgar'),
  ('Líbano')
) AS c(nombre) WHERE d.nombre = 'Tolima' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Valle del Cauca
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Cali'),
  ('Palmira'),
  ('Buenaventura'),
  ('Cartago'),
  ('Buga'),
  ('Tuluá'),
  ('Yumbo')
) AS c(nombre) WHERE d.nombre = 'Valle del Cauca' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Vaupés
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Mitú'),
  ('Papunaua'),
  ('Taraira')
) AS c(nombre) WHERE d.nombre = 'Vaupés' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Vichada
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Puerto Carreño'),
  ('La Primavera'),
  ('Cumaribo')
) AS c(nombre) WHERE d.nombre = 'Vichada' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

-- Distrito Capital de Bogotá
INSERT INTO public.ciudad (nombre, id_departamento)
SELECT c.nombre, d.id_departamento FROM public.departamento d, (VALUES
  ('Bogotá'),
  ('Usaquén'),
  ('Teusaquillo'),
  ('Chapinero'),
  ('Suba')
) AS c(nombre) WHERE d.nombre = 'Distrito Capital de Bogotá' AND d.id_pais = (SELECT id_pais FROM public.pais WHERE nombre = 'Colombia')
ON CONFLICT (nombre, id_departamento) DO NOTHING;

COMMIT;
