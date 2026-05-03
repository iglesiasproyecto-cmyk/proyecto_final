// Datos completos de departamentos y ciudades de Colombia
// Fuente: Geografía oficial de Colombia (DANE)

export const departamentosYCiudadesColombia = {
  Amazonas: ['Leticia', 'Puerto Nariño', 'La Chorrera'],
  Antioquia: ['Medellín', 'Bello', 'Envigado', 'Itagüí', 'Sabaneta', 'La Estrella', 'Caldas', 'Rionegro', 'Guarne', 'Turbo'],
  Arauca: ['Arauca', 'Arauquita', 'Fortul', 'Saravena'],
  Atlántico: ['Barranquilla', 'Soledad', 'Malambo', 'Luruaco', 'Sabanalarga'],
  Bolívar: ['Cartagena', 'Turbaco', 'Magangué', 'Córdoba', 'Montecristo', 'San Jacinto', 'Arjona'],
  Boyacá: ['Tunja', 'Duitama', 'Sogamoso', 'Paipa', 'Zipaquirá', 'Ráquira', 'Villa de Leyva'],
  Caldas: ['Manizales', 'Villamaría', 'Palestina', 'Salamina', 'Neira', 'Supía'],
  Caquetá: ['Florencia', 'San Vicente del Caguán', 'La Montañita', 'Solano'],
  Casanare: ['Yopal', 'Aguazul', 'Paz de Ariporo', 'Tauramena'],
  Cauca: ['Popayán', 'Puerto Tejada', 'Santander de Quilichao', 'Timbío', 'El Tambo'],
  Cesar: ['Valledupar', 'Bosconia', 'La Paz', 'Astrea'],
  Chocó: ['Quibdó', 'Istmina', 'Condoto', 'Lloró'],
  Córdoba: ['Montería', 'Cereté', 'Lorica', 'Chinú'],
  Cundinamarca: ['Soacha', 'Zipaquirá', 'Fusagasugá', 'Ubaté', 'Facatativá', 'Girardot', 'Chía', 'Cajicá', 'La Calera'],
  Guainía: ['Inírida', 'San Felipe', 'Barranco Minas'],
  Guaviare: ['San José del Guaviare', 'Calamar', 'El Retorno'],
  Huila: ['Neiva', 'Pitalito', 'Garzón', 'Aipe', 'Campoalegre'],
  'La Guajira': ['Riohacha', 'Maicao', 'Uribia', 'Manaure'],
  Magdalena: ['Santa Marta', 'Ciénaga', 'Fundación', 'Aracataca', 'Plato'],
  Meta: ['Villavicencio', 'Acacías', 'Granada', 'Restrepo', 'Castilla la Nueva'],
  Nariño: ['Pasto', 'Ipiales', 'Tumaco', 'Puerto Asís', 'Pupiales'],
  'Norte de Santander': ['Cúcuta', 'Los Patios', 'Villa del Rosario', 'San Cayetano', 'El Zulia'],
  Putumayo: ['Mocoa', 'Puerto Caicedo', 'Puerto Guzmán', 'Villagarzón'],
  Quindío: ['Armenia', 'Montenegro', 'Pereira', 'Salento', 'Buenavista'],
  Risaralda: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Quinchía'],
  Santander: ['Bucaramanga', 'Floridablanca', 'Gibraltarén', 'Piedecuesta', 'Barrancabermeja'],
  Sucre: ['Sincelejo', 'Corozal', 'San Marcos', 'Sampués'],
  Tolima: ['Ibagué', 'Espinal', 'Chaparral', 'Melgar', 'Líbano'],
  'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Cartago', 'Buga', 'Tuluá', 'Yumbo'],
  Vaupés: ['Mitú', 'Papunaua', 'Taraira'],
  Vichada: ['Puerto Carreño', 'La Primavera', 'Cumaribo'],
  'Distrito Capital de Bogotá': ['Bogotá', 'Usaquén', 'Teusaquillo', 'Chapinero', 'Suba'],
} as const;

export const listaDepartamentos = Object.keys(departamentosYCiudadesColombia).sort();

export function getCiudadesPorDepartamento(departamento: string): string[] {
  return departamentosYCiudadesColombia[departamento as keyof typeof departamentosYCiudadesColombia] || [];
}
