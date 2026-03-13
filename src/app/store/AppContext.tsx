import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

// ═══════════════════════════════════════════════════════════
// INTERFACES — Matching IGLESIABD Schema v2.0
// ═══════════════════════════════════════════════════════════

// ── Geografía ──
export interface Pais {
  idPais: string;
  nombre: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface DepartamentoGeo {
  idDepartamentoGeo: string;
  nombre: string;
  idPais: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Ciudad {
  idCiudad: string;
  nombre: string;
  idDepartamentoGeo: string;
  creadoEn: string;
  actualizadoEn: string;
}

// ── Iglesia & Sedes ──
export interface Iglesia {
  idIglesia: string;
  nombre: string;
  fechaFundacion: string | null;
  estado: "activa" | "inactiva" | "fusionada" | "cerrada";
  idCiudad: string;
  creadoEn: string;
  actualizadoEn: string;
  // Denormalized for display
  ciudadNombre?: string;
  departamentoGeoNombre?: string;
  paisNombre?: string;
}

export interface Pastor {
  idPastor: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string | null;
  idUsuario: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface IglesiaPastor {
  idIglesiaPastor: string;
  idIglesia: string;
  idPastor: string;
  esPrincipal: boolean;
  fechaInicio: string;
  fechaFin: string | null;
  observaciones: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Sede {
  idSede: string;
  nombre: string;
  direccion: string | null;
  idCiudad: string;
  idIglesia: string;
  estado: "activa" | "inactiva" | "en_construccion";
  creadoEn: string;
  actualizadoEn: string;
}

// ── Ministerios ──
export interface Ministerio {
  idMinisterio: string;
  nombre: string;
  descripcion: string | null;
  estado: "activo" | "inactivo" | "suspendido";
  idSede: string;
  creadoEn: string;
  actualizadoEn: string;
  // Denormalized
  idIglesia?: string;
  liderNombre?: string;
  cantidadMiembros?: number;
}

export interface MiembroMinisterio {
  idMiembroMinisterio: string;
  idUsuario: string;
  idMinisterio: string;
  rolEnMinisterio: string | null;
  fechaIngreso: string;
  fechaSalida: string | null;
  creadoEn: string;
  actualizadoEn: string;
  // Denormalized from Usuario
  nombreCompleto?: string;
  correo?: string;
  telefono?: string;
  activo?: boolean;
}

// ── Usuarios & Roles ──
export interface Rol {
  idRol: string;
  nombre: string;
  descripcion: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Usuario {
  idUsuario: string;
  nombres: string;
  apellidos: string;
  correo: string;
  contrasenaHash: string;
  telefono: string | null;
  activo: boolean;
  ultimoAcceso: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface UsuarioRol {
  idUsuarioRol: string;
  idUsuario: string;
  idRol: string;
  idIglesia: string;
  idSede: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

// ── Notificaciones ──
export interface Notificacion {
  idNotificacion: string;
  idUsuario: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaLectura: string | null;
  tipo: "informacion" | "alerta" | "tarea" | "evento" | "curso";
  creadoEn: string;
  actualizadoEn: string;
}

// ── Eventos & Tareas ──
export interface TipoEvento {
  idTipoEvento: string;
  nombre: string;
  descripcion: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Evento {
  idEvento: string;
  nombre: string;
  descripcion: string | null;
  idTipoEvento: string;
  fechaInicio: string;
  fechaFin: string;
  estado: "programado" | "en_curso" | "finalizado" | "cancelado";
  idIglesia: string;
  idSede: string | null;
  idMinisterio: string | null;
  creadoEn: string;
  actualizadoEn: string;
  // Denormalized
  tipoEventoNombre?: string;
  ministerioNombre?: string;
  sedeNombre?: string;
}

export interface Tarea {
  idTarea: string;
  titulo: string;
  descripcion: string | null;
  fechaLimite: string | null;
  estado: "pendiente" | "en_progreso" | "completada" | "cancelada";
  prioridad: "baja" | "media" | "alta" | "urgente";
  idEvento: string | null;
  idUsuarioCreador: string;
  creadoEn: string;
  actualizadoEn: string;
  // Denormalized
  idMinisterio?: string;
  asignados?: TareaAsignada[];
}

export interface TareaAsignada {
  idTareaAsignada: string;
  idTarea: string;
  idUsuario: string;
  fechaAsignacion: string;
  fechaCompletado: string | null;
  observaciones: string | null;
  creadoEn: string;
  actualizadoEn: string;
  // Denormalized
  nombreCompleto?: string;
}

// ── Cursos & Formación ──
export interface Curso {
  idCurso: string;
  nombre: string;
  descripcion: string | null;
  duracionHoras: number | null;
  estado: "borrador" | "activo" | "inactivo" | "archivado";
  idMinisterio: string;
  idUsuarioCreador: string;
  creadoEn: string;
  actualizadoEn: string;
  // Enriched
  modulos?: Modulo[];
}

export interface Modulo {
  idModulo: string;
  titulo: string;
  descripcion: string | null;
  orden: number;
  estado: "borrador" | "publicado" | "archivado";
  idCurso: string;
  creadoEn: string;
  actualizadoEn: string;
  // Frontend convenience (not in DB)
  recursos?: Recurso[];
}

export interface Recurso {
  idRecurso: string;
  idModulo: string;
  nombre: string;
  tipo: "archivo" | "enlace";
  url: string;
}

export interface Evaluacion {
  idEvaluacion: string;
  idModulo: string;
  idUsuario: string;
  calificacion: number | null;
  estado: "pendiente" | "aprobado" | "reprobado" | "en_revision";
  observaciones: string | null;
  fechaEvaluacion: string | null;
  creadoEn: string;
  actualizadoEn: string;
  // Denormalized
  nombreUsuario?: string;
  tituloModulo?: string;
  nombreCurso?: string;
  idMinisterio?: string;
}

export interface ProcesoAsignadoCurso {
  idProcesoAsignadoCurso: string;
  idCurso: string;
  idIglesia: string;
  fechaInicio: string;
  fechaFin: string;
  estado: "programado" | "en_curso" | "finalizado" | "cancelado";
  creadoEn: string;
  actualizadoEn: string;
}

export interface DetalleProcesoCurso {
  idDetalleProcesoCurso: string;
  idProcesoAsignadoCurso: string;
  idUsuario: string;
  fechaInscripcion: string;
  estado: "inscrito" | "en_progreso" | "completado" | "retirado";
  creadoEn: string;
  actualizadoEn: string;
  // Denormalized for display
  nombreCompleto?: string;
  correo?: string;
}

// ── Session User (frontend convenience) ──
export type RolClave = "super_admin" | "admin_iglesia" | "lider" | "servidor";

export interface SessionUser {
  idUsuario: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string | null;
  activo: boolean;
  rol: RolClave;
  iglesiasIds: string[];
  idIglesiaActiva: string;
  idMinisterio?: string;
  idMiembroMinisterio?: string;
}

// ═══════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════

const now = "2026-03-06T12:00:00";

// ── Geografía ──
const mockPaises: Pais[] = [
  { idPais: "p1", nombre: "Guatemala", creadoEn: now, actualizadoEn: now },
  { idPais: "p2", nombre: "El Salvador", creadoEn: now, actualizadoEn: now },
  { idPais: "p3", nombre: "Honduras", creadoEn: now, actualizadoEn: now },
];

const mockDepartamentosGeo: DepartamentoGeo[] = [
  { idDepartamentoGeo: "dg1", nombre: "Guatemala", idPais: "p1", creadoEn: now, actualizadoEn: now },
  { idDepartamentoGeo: "dg2", nombre: "San Salvador", idPais: "p2", creadoEn: now, actualizadoEn: now },
  { idDepartamentoGeo: "dg3", nombre: "Francisco Morazán", idPais: "p3", creadoEn: now, actualizadoEn: now },
];

const mockCiudades: Ciudad[] = [
  { idCiudad: "ci1", nombre: "Ciudad de Guatemala", idDepartamentoGeo: "dg1", creadoEn: now, actualizadoEn: now },
  { idCiudad: "ci2", nombre: "San Salvador", idDepartamentoGeo: "dg2", creadoEn: now, actualizadoEn: now },
  { idCiudad: "ci3", nombre: "Tegucigalpa", idDepartamentoGeo: "dg3", creadoEn: now, actualizadoEn: now },
];

// ── Iglesias ──
const mockIglesias: Iglesia[] = [
  { idIglesia: "ig1", nombre: "Iglesia Vida Nueva", fechaFundacion: "2005-06-15", estado: "activa", idCiudad: "ci1", creadoEn: now, actualizadoEn: now, ciudadNombre: "Ciudad de Guatemala", departamentoGeoNombre: "Guatemala", paisNombre: "Guatemala" },
  { idIglesia: "ig2", nombre: "Iglesia Gracia y Verdad", fechaFundacion: "2010-03-20", estado: "activa", idCiudad: "ci2", creadoEn: now, actualizadoEn: now, ciudadNombre: "San Salvador", departamentoGeoNombre: "San Salvador", paisNombre: "El Salvador" },
  { idIglesia: "ig3", nombre: "Comunidad Cristiana Shalom", fechaFundacion: "2015-11-01", estado: "inactiva", idCiudad: "ci3", creadoEn: now, actualizadoEn: now, ciudadNombre: "Tegucigalpa", departamentoGeoNombre: "Francisco Morazán", paisNombre: "Honduras" },
];

// ── Pastores ──
const mockPastores: Pastor[] = [
  { idPastor: "pa1", nombres: "Juan", apellidos: "Pérez", correo: "pastor@vidanueva.org", telefono: "+502 5555-0001", idUsuario: "u2", creadoEn: now, actualizadoEn: now },
  { idPastor: "pa2", nombres: "Roberto", apellidos: "Mendoza", correo: "pastor@graciaverdad.org", telefono: "+503 5555-0002", idUsuario: null, creadoEn: now, actualizadoEn: now },
];

const mockIglesiaPastores: IglesiaPastor[] = [
  { idIglesiaPastor: "ip1", idIglesia: "ig1", idPastor: "pa1", esPrincipal: true, fechaInicio: "2005-06-15", fechaFin: null, observaciones: "Pastor fundador", creadoEn: now, actualizadoEn: now },
  { idIglesiaPastor: "ip2", idIglesia: "ig2", idPastor: "pa2", esPrincipal: true, fechaInicio: "2010-03-20", fechaFin: null, observaciones: null, creadoEn: now, actualizadoEn: now },
];

// ── Sedes ──
const mockSedes: Sede[] = [
  { idSede: "s1", nombre: "Sede Central Vida Nueva", direccion: "Av. Principal 123", idCiudad: "ci1", idIglesia: "ig1", estado: "activa", creadoEn: now, actualizadoEn: now },
  { idSede: "s2", nombre: "Sede Norte Vida Nueva", direccion: "Blvd. Norte 456", idCiudad: "ci1", idIglesia: "ig1", estado: "activa", creadoEn: now, actualizadoEn: now },
  { idSede: "s3", nombre: "Sede Central Gracia y Verdad", direccion: "Calle Central 456", idCiudad: "ci2", idIglesia: "ig2", estado: "activa", creadoEn: now, actualizadoEn: now },
];

// ── Roles ──
const mockRoles: Rol[] = [
  { idRol: "r1", nombre: "Super Administrador", descripcion: "Gestión global de iglesias en la plataforma", creadoEn: now, actualizadoEn: now },
  { idRol: "r2", nombre: "Administrador de Iglesia", descripcion: "Gestión de departamentos, miembros y eventos globales", creadoEn: now, actualizadoEn: now },
  { idRol: "r3", nombre: "Líder", descripcion: "Gestión completa de su ministerio", creadoEn: now, actualizadoEn: now },
  { idRol: "r4", nombre: "Servidor", descripcion: "Lectura general y actualización de sus tareas", creadoEn: now, actualizadoEn: now },
];

// ── Usuarios ──
const mockUsuarios: Usuario[] = [
  { idUsuario: "u1", nombres: "Admin", apellidos: "Global", correo: "super@email.com", contrasenaHash: "$2b$10$hash1", telefono: "+502 5555-9000", activo: true, ultimoAcceso: "2026-03-06T08:00:00", creadoEn: now, actualizadoEn: now },
  { idUsuario: "u2", nombres: "Juan", apellidos: "Pérez", correo: "admin@email.com", contrasenaHash: "$2b$10$hash2", telefono: "+502 5555-9001", activo: true, ultimoAcceso: "2026-03-06T07:30:00", creadoEn: now, actualizadoEn: now },
  { idUsuario: "u3", nombres: "María", apellidos: "López", correo: "lider@email.com", contrasenaHash: "$2b$10$hash3", telefono: "+502 5555-0001", activo: true, ultimoAcceso: "2026-03-05T20:00:00", creadoEn: now, actualizadoEn: now },
  { idUsuario: "u4", nombres: "José", apellidos: "García", correo: "colider@email.com", contrasenaHash: "$2b$10$hash4", telefono: "+502 5555-0002", activo: true, ultimoAcceso: "2026-03-05T18:00:00", creadoEn: now, actualizadoEn: now },
  { idUsuario: "u5", nombres: "Elena", apellidos: "Ruiz", correo: "coordinador@email.com", contrasenaHash: "$2b$10$hash5", telefono: "+502 5555-0003", activo: true, ultimoAcceso: "2026-03-05T15:00:00", creadoEn: now, actualizadoEn: now },
  { idUsuario: "u6", nombres: "Roberto", apellidos: "Díaz", correo: "servidor@email.com", contrasenaHash: "$2b$10$hash6", telefono: "+502 5555-0004", activo: true, ultimoAcceso: "2026-03-04T10:00:00", creadoEn: now, actualizadoEn: now },
  { idUsuario: "u7", nombres: "Sofía", apellidos: "Hernández", correo: "sofia@email.com", contrasenaHash: "$2b$10$hash7", telefono: "+502 5555-0005", activo: true, ultimoAcceso: null, creadoEn: now, actualizadoEn: now },
  { idUsuario: "u8", nombres: "Daniel", apellidos: "Morales", correo: "daniel@email.com", contrasenaHash: "$2b$10$hash8", telefono: "+502 5555-0006", activo: true, ultimoAcceso: null, creadoEn: now, actualizadoEn: now },
  { idUsuario: "u9", nombres: "Andrea", apellidos: "Castillo", correo: "andrea@email.com", contrasenaHash: "$2b$10$hash9", telefono: "+502 5555-0007", activo: false, ultimoAcceso: null, creadoEn: now, actualizadoEn: now },
  { idUsuario: "u10", nombres: "Carlos", apellidos: "Rodríguez", correo: "carlos@email.com", contrasenaHash: "$2b$10$hash10", telefono: "+502 5555-0008", activo: true, ultimoAcceso: null, creadoEn: now, actualizadoEn: now },
];

// ── UsuarioRol ──
const mockUsuarioRoles: UsuarioRol[] = [
  { idUsuarioRol: "ur1", idUsuario: "u1", idRol: "r1", idIglesia: "ig1", idSede: null, fechaInicio: "2020-01-01", fechaFin: null, creadoEn: now, actualizadoEn: now },
  { idUsuarioRol: "ur2", idUsuario: "u2", idRol: "r2", idIglesia: "ig1", idSede: "s1", fechaInicio: "2020-01-01", fechaFin: null, creadoEn: now, actualizadoEn: now },
  { idUsuarioRol: "ur3", idUsuario: "u3", idRol: "r3", idIglesia: "ig1", idSede: "s1", fechaInicio: "2021-06-01", fechaFin: null, creadoEn: now, actualizadoEn: now },
  { idUsuarioRol: "ur4", idUsuario: "u4", idRol: "r4", idIglesia: "ig1", idSede: "s1", fechaInicio: "2022-01-01", fechaFin: null, creadoEn: now, actualizadoEn: now },
  { idUsuarioRol: "ur5", idUsuario: "u5", idRol: "r4", idIglesia: "ig1", idSede: "s1", fechaInicio: "2022-06-01", fechaFin: null, creadoEn: now, actualizadoEn: now },
  { idUsuarioRol: "ur6", idUsuario: "u6", idRol: "r4", idIglesia: "ig1", idSede: "s1", fechaInicio: "2023-01-01", fechaFin: null, creadoEn: now, actualizadoEn: now },
];

// ── Ministerios ──
const mockMinisterios: Ministerio[] = [
  { idMinisterio: "min1", nombre: "Alabanza y Adoración", descripcion: "Ministerio de música y alabanza", estado: "activo", idSede: "s1", creadoEn: now, actualizadoEn: now, idIglesia: "ig1", liderNombre: "María López", cantidadMiembros: 7 },
  { idMinisterio: "min2", nombre: "Jóvenes", descripcion: "Ministerio juvenil para edades 15-30", estado: "activo", idSede: "s1", creadoEn: now, actualizadoEn: now, idIglesia: "ig1", liderNombre: "Carlos Rodríguez", cantidadMiembros: 3 },
  { idMinisterio: "min3", nombre: "Ujieres", descripcion: "Equipo de bienvenida y protocolo", estado: "activo", idSede: "s1", creadoEn: now, actualizadoEn: now, idIglesia: "ig1", liderNombre: "Ana Martínez", cantidadMiembros: 12 },
  { idMinisterio: "min4", nombre: "Escuela Dominical", descripcion: "Formación bíblica para niños y adultos", estado: "activo", idSede: "s1", creadoEn: now, actualizadoEn: now, idIglesia: "ig1", liderNombre: "Pedro Sánchez", cantidadMiembros: 20 },
  { idMinisterio: "min5", nombre: "Misiones", descripcion: "Alcance comunitario y misional", estado: "inactivo", idSede: "s1", creadoEn: now, actualizadoEn: now, idIglesia: "ig1", liderNombre: "Laura Gómez", cantidadMiembros: 8 },
];

// ── MiembroMinisterio ──
const mockMiembrosMinisterio: MiembroMinisterio[] = [
  { idMiembroMinisterio: "mm1", idUsuario: "u3", idMinisterio: "min1", rolEnMinisterio: "lider", fechaIngreso: "2021-06-01", fechaSalida: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "María López", correo: "lider@email.com", telefono: "+502 5555-0001", activo: true },
  { idMiembroMinisterio: "mm2", idUsuario: "u4", idMinisterio: "min1", rolEnMinisterio: "servidor", fechaIngreso: "2022-01-01", fechaSalida: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "José García", correo: "colider@email.com", telefono: "+502 5555-0002", activo: true },
  { idMiembroMinisterio: "mm3", idUsuario: "u5", idMinisterio: "min1", rolEnMinisterio: "servidor", fechaIngreso: "2022-06-01", fechaSalida: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "Elena Ruiz", correo: "coordinador@email.com", telefono: "+502 5555-0003", activo: true },
  { idMiembroMinisterio: "mm4", idUsuario: "u6", idMinisterio: "min1", rolEnMinisterio: "servidor", fechaIngreso: "2023-01-01", fechaSalida: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "Roberto Díaz", correo: "servidor@email.com", telefono: "+502 5555-0004", activo: true },
  { idMiembroMinisterio: "mm5", idUsuario: "u7", idMinisterio: "min1", rolEnMinisterio: "servidor", fechaIngreso: "2023-03-01", fechaSalida: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "Sofía Hernández", correo: "sofia@email.com", telefono: "+502 5555-0005", activo: true },
  { idMiembroMinisterio: "mm6", idUsuario: "u8", idMinisterio: "min1", rolEnMinisterio: "servidor", fechaIngreso: "2023-06-01", fechaSalida: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "Daniel Morales", correo: "daniel@email.com", telefono: "+502 5555-0006", activo: true },
  { idMiembroMinisterio: "mm7", idUsuario: "u9", idMinisterio: "min1", rolEnMinisterio: "servidor", fechaIngreso: "2023-06-01", fechaSalida: "2025-12-01", creadoEn: now, actualizadoEn: now, nombreCompleto: "Andrea Castillo", correo: "andrea@email.com", telefono: "+502 5555-0007", activo: false },
  { idMiembroMinisterio: "mm8", idUsuario: "u10", idMinisterio: "min2", rolEnMinisterio: "lider", fechaIngreso: "2022-01-01", fechaSalida: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "Carlos Rodríguez", correo: "carlos@email.com", telefono: "+502 5555-0008", activo: true },
];

// ── TipoEvento ──
const mockTiposEvento: TipoEvento[] = [
  { idTipoEvento: "te1", nombre: "Culto", descripcion: "Servicio de adoración regular", creadoEn: now, actualizadoEn: now },
  { idTipoEvento: "te2", nombre: "Conferencia", descripcion: "Evento de capacitación y enseñanza", creadoEn: now, actualizadoEn: now },
  { idTipoEvento: "te3", nombre: "Retiro", descripcion: "Actividad de convivencia fuera de sede", creadoEn: now, actualizadoEn: now },
  { idTipoEvento: "te4", nombre: "Ensayo", descripcion: "Práctica de ministerio", creadoEn: now, actualizadoEn: now },
  { idTipoEvento: "te5", nombre: "Vigilia", descripcion: "Reunión nocturna de oración", creadoEn: now, actualizadoEn: now },
];

// ── Eventos ──
const mockEventos: Evento[] = [
  { idEvento: "ev1", nombre: "Culto General Dominical", descripcion: "Servicio de adoración para toda la iglesia", idTipoEvento: "te1", fechaInicio: "2026-03-01T09:00", fechaFin: "2026-03-01T12:00", estado: "programado", idIglesia: "ig1", idSede: "s1", idMinisterio: null, creadoEn: now, actualizadoEn: now, tipoEventoNombre: "Culto", sedeNombre: "Sede Central Vida Nueva" },
  { idEvento: "ev2", nombre: "Noche de Oración", descripcion: "Vigilia de oración comunitaria", idTipoEvento: "te5", fechaInicio: "2026-03-05T19:00", fechaFin: "2026-03-05T22:00", estado: "programado", idIglesia: "ig1", idSede: "s1", idMinisterio: null, creadoEn: now, actualizadoEn: now, tipoEventoNombre: "Vigilia", sedeNombre: "Sede Central Vida Nueva" },
  { idEvento: "ev3", nombre: "Ensayo de Alabanza", descripcion: "Preparación musical para el domingo", idTipoEvento: "te4", fechaInicio: "2026-03-07T18:00", fechaFin: "2026-03-07T20:00", estado: "programado", idIglesia: "ig1", idSede: "s1", idMinisterio: "min1", creadoEn: now, actualizadoEn: now, tipoEventoNombre: "Ensayo", ministerioNombre: "Alabanza y Adoración", sedeNombre: "Sede Central Vida Nueva" },
  { idEvento: "ev4", nombre: "Retiro de Jóvenes", descripcion: "Campamento juvenil de fin de semana", idTipoEvento: "te3", fechaInicio: "2026-03-14T08:00", fechaFin: "2026-03-16T17:00", estado: "programado", idIglesia: "ig1", idSede: null, idMinisterio: "min2", creadoEn: now, actualizadoEn: now, tipoEventoNombre: "Retiro", ministerioNombre: "Jóvenes" },
  { idEvento: "ev5", nombre: "Conferencia de Liderazgo", descripcion: "Capacitación para líderes de todos los ministerios", idTipoEvento: "te2", fechaInicio: "2026-03-20T09:00", fechaFin: "2026-03-20T17:00", estado: "programado", idIglesia: "ig1", idSede: "s1", idMinisterio: null, creadoEn: now, actualizadoEn: now, tipoEventoNombre: "Conferencia", sedeNombre: "Sede Central Vida Nueva" },
];

// ── Tareas ──
const mockTareas: Tarea[] = [
  { idTarea: "ta1", titulo: "Preparar lista de canciones", descripcion: "Seleccionar canciones para el culto del domingo", fechaLimite: "2026-02-28", estado: "completada", prioridad: "media", idEvento: "ev1", idUsuarioCreador: "u3", creadoEn: now, actualizadoEn: now, idMinisterio: "min1", asignados: [
    { idTareaAsignada: "tas1", idTarea: "ta1", idUsuario: "u3", fechaAsignacion: now, fechaCompletado: "2026-02-28T10:00", observaciones: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "María López" },
    { idTareaAsignada: "tas2", idTarea: "ta1", idUsuario: "u4", fechaAsignacion: now, fechaCompletado: "2026-02-28T10:00", observaciones: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "José García" },
  ]},
  { idTarea: "ta2", titulo: "Coordinar sonido e iluminación", descripcion: "Verificar equipo de audio y luces para el ensayo", fechaLimite: "2026-03-06", estado: "en_progreso", prioridad: "alta", idEvento: "ev3", idUsuarioCreador: "u3", creadoEn: now, actualizadoEn: now, idMinisterio: "min1", asignados: [
    { idTareaAsignada: "tas3", idTarea: "ta2", idUsuario: "u5", fechaAsignacion: now, fechaCompletado: null, observaciones: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "Elena Ruiz" },
  ]},
  { idTarea: "ta3", titulo: "Diseñar flyer del retiro", descripcion: "Crear material promocional para redes sociales", fechaLimite: "2026-03-01", estado: "pendiente", prioridad: "media", idEvento: "ev4", idUsuarioCreador: "u10", creadoEn: now, actualizadoEn: now, idMinisterio: "min2", asignados: [
    { idTareaAsignada: "tas4", idTarea: "ta3", idUsuario: "u10", fechaAsignacion: now, fechaCompletado: null, observaciones: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "Carlos Rodríguez" },
  ]},
  { idTarea: "ta4", titulo: "Limpiar instrumentos", descripcion: "Mantenimiento trimestral de todos los instrumentos", fechaLimite: "2026-03-10", estado: "pendiente", prioridad: "baja", idEvento: null, idUsuarioCreador: "u3", creadoEn: now, actualizadoEn: now, idMinisterio: "min1", asignados: [
    { idTareaAsignada: "tas5", idTarea: "ta4", idUsuario: "u6", fechaAsignacion: now, fechaCompletado: null, observaciones: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "Roberto Díaz" },
    { idTareaAsignada: "tas6", idTarea: "ta4", idUsuario: "u7", fechaAsignacion: now, fechaCompletado: null, observaciones: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "Sofía Hernández" },
    { idTareaAsignada: "tas7", idTarea: "ta4", idUsuario: "u8", fechaAsignacion: now, fechaCompletado: null, observaciones: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "Daniel Morales" },
  ]},
  { idTarea: "ta5", titulo: "Registrar asistentes al retiro", descripcion: "Crear lista de participantes confirmados", fechaLimite: "2026-03-10", estado: "en_progreso", prioridad: "alta", idEvento: "ev4", idUsuarioCreador: "u10", creadoEn: now, actualizadoEn: now, idMinisterio: "min2", asignados: [
    { idTareaAsignada: "tas8", idTarea: "ta5", idUsuario: "u10", fechaAsignacion: now, fechaCompletado: null, observaciones: null, creadoEn: now, actualizadoEn: now, nombreCompleto: "Carlos Rodríguez" },
  ]},
];

// ── Cursos (was AulaModules) ──
const mockCursos: Curso[] = [
  {
    idCurso: "cu1", nombre: "Fundamentos de la Adoración", descripcion: "Principios bíblicos de la alabanza", duracionHoras: 12, estado: "activo", idMinisterio: "min1", idUsuarioCreador: "u3", creadoEn: now, actualizadoEn: now,
    modulos: [
      { idModulo: "mo1", titulo: "¿Qué es la adoración?", descripcion: "La adoración es la respuesta del corazón humano a la grandeza de Dios...", orden: 1, estado: "publicado", idCurso: "cu1", creadoEn: now, actualizadoEn: now, recursos: [{ idRecurso: "rec1", idModulo: "mo1", nombre: "Guía de Estudio PDF", tipo: "archivo", url: "#" }, { idRecurso: "rec2", idModulo: "mo1", nombre: "Video: Adoración en Espíritu", tipo: "enlace", url: "https://youtube.com" }] },
      { idModulo: "mo2", titulo: "La adoración en el Antiguo Testamento", descripcion: "Desde el tabernáculo hasta el templo de Salomón...", orden: 2, estado: "publicado", idCurso: "cu1", creadoEn: now, actualizadoEn: now, recursos: [{ idRecurso: "rec3", idModulo: "mo2", nombre: "Mapa del Tabernáculo", tipo: "archivo", url: "#" }] },
    ],
  },
  {
    idCurso: "cu2", nombre: "Teoría Musical Básica", descripcion: "Conceptos fundamentales de música", duracionHoras: 20, estado: "activo", idMinisterio: "min1", idUsuarioCreador: "u3", creadoEn: now, actualizadoEn: now,
    modulos: [
      { idModulo: "mo3", titulo: "Notas y escalas", descripcion: "Las notas musicales son la base de toda composición...", orden: 1, estado: "publicado", idCurso: "cu2", creadoEn: now, actualizadoEn: now, recursos: [] },
      { idModulo: "mo4", titulo: "Acordes básicos", descripcion: "Un acorde es un conjunto de notas tocadas simultáneamente...", orden: 2, estado: "publicado", idCurso: "cu2", creadoEn: now, actualizadoEn: now, recursos: [{ idRecurso: "rec4", idModulo: "mo4", nombre: "Diagrama de acordes", tipo: "archivo", url: "#" }] },
      { idModulo: "mo5", titulo: "Ritmo y compás", descripcion: "El ritmo es el patrón de sonidos y silencios en el tiempo...", orden: 3, estado: "publicado", idCurso: "cu2", creadoEn: now, actualizadoEn: now, recursos: [] },
    ],
  },
  {
    idCurso: "cu3", nombre: "Liderazgo en el Ministerio", descripcion: "Cómo liderar con excelencia", duracionHoras: 8, estado: "activo", idMinisterio: "min1", idUsuarioCreador: "u3", creadoEn: now, actualizadoEn: now,
    modulos: [
      { idModulo: "mo6", titulo: "Servir con humildad", descripcion: "El líder de adoración es ante todo un servidor...", orden: 1, estado: "publicado", idCurso: "cu3", creadoEn: now, actualizadoEn: now, recursos: [] },
    ],
  },
];

// ── Evaluaciones ──
const mockEvaluaciones: Evaluacion[] = [
  // ── Roberto Díaz (u6) — Fundamentos de la Adoración ──
  { idEvaluacion: "eva1", idModulo: "mo1", idUsuario: "u6", calificacion: 85.00, estado: "aprobado", observaciones: "Excelente comprensión de los conceptos fundamentales de adoración.", fechaEvaluacion: "2026-02-15", creadoEn: now, actualizadoEn: now, nombreUsuario: "Roberto Díaz", tituloModulo: "¿Qué es la adoración?", nombreCurso: "Fundamentos de la Adoración", idMinisterio: "min1" },
  { idEvaluacion: "eva2", idModulo: "mo2", idUsuario: "u6", calificacion: 92.50, estado: "aprobado", observaciones: "Notable manejo del contenido histórico.", fechaEvaluacion: "2026-02-22", creadoEn: now, actualizadoEn: now, nombreUsuario: "Roberto Díaz", tituloModulo: "La adoración en el Antiguo Testamento", nombreCurso: "Fundamentos de la Adoración", idMinisterio: "min1" },
  // ── Roberto Díaz (u6) — Teoría Musical Básica ──
  { idEvaluacion: "eva7", idModulo: "mo3", idUsuario: "u6", calificacion: 78.00, estado: "aprobado", observaciones: "Buen desempeño. Reforzar lectura de clave de fa.", fechaEvaluacion: "2026-01-10", creadoEn: now, actualizadoEn: now, nombreUsuario: "Roberto Díaz", tituloModulo: "Notas y escalas", nombreCurso: "Teoría Musical Básica", idMinisterio: "min1" },
  { idEvaluacion: "eva8", idModulo: "mo4", idUsuario: "u6", calificacion: 82.00, estado: "aprobado", observaciones: "Domina acordes mayores, necesita práctica en menores.", fechaEvaluacion: "2026-01-25", creadoEn: now, actualizadoEn: now, nombreUsuario: "Roberto Díaz", tituloModulo: "Acordes básicos", nombreCurso: "Teoría Musical Básica", idMinisterio: "min1" },
  { idEvaluacion: "eva9", idModulo: "mo5", idUsuario: "u6", calificacion: null, estado: "pendiente", observaciones: null, fechaEvaluacion: null, creadoEn: now, actualizadoEn: now, nombreUsuario: "Roberto Díaz", tituloModulo: "Ritmo y compás", nombreCurso: "Teoría Musical Básica", idMinisterio: "min1" },
  // ── Roberto Díaz (u6) — Liderazgo en el Ministerio ──
  { idEvaluacion: "eva10", idModulo: "mo6", idUsuario: "u6", calificacion: 90.00, estado: "aprobado", observaciones: "Demuestra actitud de servicio excepcional.", fechaEvaluacion: "2026-03-01", creadoEn: now, actualizadoEn: now, nombreUsuario: "Roberto Díaz", tituloModulo: "Servir con humildad", nombreCurso: "Liderazgo en el Ministerio", idMinisterio: "min1" },

  // ── Sofía Hernández (u7) — Fundamentos de la Adoración ──
  { idEvaluacion: "eva3", idModulo: "mo1", idUsuario: "u7", calificacion: 70.00, estado: "aprobado", observaciones: "Aprobado con observaciones. Mejorar participación en discusiones.", fechaEvaluacion: "2026-02-15", creadoEn: now, actualizadoEn: now, nombreUsuario: "Sofía Hernández", tituloModulo: "¿Qué es la adoración?", nombreCurso: "Fundamentos de la Adoración", idMinisterio: "min1" },
  { idEvaluacion: "eva11", idModulo: "mo2", idUsuario: "u7", calificacion: 55.00, estado: "reprobado", observaciones: "No alcanzó el mínimo. Se recomienda repetir el módulo y asistir a tutorías.", fechaEvaluacion: "2026-02-22", creadoEn: now, actualizadoEn: now, nombreUsuario: "Sofía Hernández", tituloModulo: "La adoración en el Antiguo Testamento", nombreCurso: "Fundamentos de la Adoración", idMinisterio: "min1" },
  // ── Sofía Hernández (u7) — Teoría Musical Básica ──
  { idEvaluacion: "eva4", idModulo: "mo3", idUsuario: "u7", calificacion: 88.00, estado: "aprobado", observaciones: "Excelente progreso en teoría musical.", fechaEvaluacion: "2026-01-18", creadoEn: now, actualizadoEn: now, nombreUsuario: "Sofía Hernández", tituloModulo: "Notas y escalas", nombreCurso: "Teoría Musical Básica", idMinisterio: "min1" },
  { idEvaluacion: "eva12", idModulo: "mo4", idUsuario: "u7", calificacion: 91.50, estado: "aprobado", observaciones: "Muy buen oído para acordes. Progreso destacado.", fechaEvaluacion: "2026-02-01", creadoEn: now, actualizadoEn: now, nombreUsuario: "Sofía Hernández", tituloModulo: "Acordes básicos", nombreCurso: "Teoría Musical Básica", idMinisterio: "min1" },
  { idEvaluacion: "eva13", idModulo: "mo5", idUsuario: "u7", calificacion: null, estado: "en_revision", observaciones: "Evaluación entregada, pendiente de calificación por el líder.", fechaEvaluacion: "2026-03-05", creadoEn: now, actualizadoEn: now, nombreUsuario: "Sofía Hernández", tituloModulo: "Ritmo y compás", nombreCurso: "Teoría Musical Básica", idMinisterio: "min1" },

  // ── Daniel Morales (u8) — Teoría Musical Básica ──
  { idEvaluacion: "eva5", idModulo: "mo3", idUsuario: "u8", calificacion: 95.00, estado: "aprobado", observaciones: "Dominio completo del tema.", fechaEvaluacion: "2026-01-20", creadoEn: now, actualizadoEn: now, nombreUsuario: "Daniel Morales", tituloModulo: "Notas y escalas", nombreCurso: "Teoría Musical Básica", idMinisterio: "min1" },
  { idEvaluacion: "eva14", idModulo: "mo4", idUsuario: "u8", calificacion: 97.00, estado: "aprobado", observaciones: "Rendimiento sobresaliente. Candidato a asistente de enseñanza.", fechaEvaluacion: "2026-02-05", creadoEn: now, actualizadoEn: now, nombreUsuario: "Daniel Morales", tituloModulo: "Acordes básicos", nombreCurso: "Teoría Musical Básica", idMinisterio: "min1" },
  { idEvaluacion: "eva15", idModulo: "mo5", idUsuario: "u8", calificacion: 89.00, estado: "aprobado", observaciones: "Buen manejo del compás compuesto.", fechaEvaluacion: "2026-02-20", creadoEn: now, actualizadoEn: now, nombreUsuario: "Daniel Morales", tituloModulo: "Ritmo y compás", nombreCurso: "Teoría Musical Básica", idMinisterio: "min1" },
  // ── Daniel Morales (u8) — Fundamentos de la Adoración ──
  { idEvaluacion: "eva16", idModulo: "mo1", idUsuario: "u8", calificacion: 76.00, estado: "aprobado", observaciones: "Aprobado. Mejorar la profundidad en las reflexiones escritas.", fechaEvaluacion: "2026-02-15", creadoEn: now, actualizadoEn: now, nombreUsuario: "Daniel Morales", tituloModulo: "¿Qué es la adoración?", nombreCurso: "Fundamentos de la Adoración", idMinisterio: "min1" },
  { idEvaluacion: "eva17", idModulo: "mo2", idUsuario: "u8", calificacion: null, estado: "en_revision", observaciones: "Trabajo entregado fuera de plazo. Se evaluará con penalización.", fechaEvaluacion: "2026-03-02", creadoEn: now, actualizadoEn: now, nombreUsuario: "Daniel Morales", tituloModulo: "La adoración en el Antiguo Testamento", nombreCurso: "Fundamentos de la Adoración", idMinisterio: "min1" },
  // ── Daniel Morales (u8) — Liderazgo en el Ministerio ──
  { idEvaluacion: "eva18", idModulo: "mo6", idUsuario: "u8", calificacion: null, estado: "pendiente", observaciones: null, fechaEvaluacion: null, creadoEn: now, actualizadoEn: now, nombreUsuario: "Daniel Morales", tituloModulo: "Servir con humildad", nombreCurso: "Liderazgo en el Ministerio", idMinisterio: "min1" },

  // ── Elena Ruiz (u5) — Fundamentos de la Adoración ──
  { idEvaluacion: "eva6", idModulo: "mo1", idUsuario: "u5", calificacion: null, estado: "pendiente", observaciones: null, fechaEvaluacion: null, creadoEn: now, actualizadoEn: now, nombreUsuario: "Elena Ruiz", tituloModulo: "¿Qué es la adoración?", nombreCurso: "Fundamentos de la Adoración", idMinisterio: "min1" },
  { idEvaluacion: "eva19", idModulo: "mo2", idUsuario: "u5", calificacion: 68.00, estado: "aprobado", observaciones: "Justo en el límite. Se sugiere refuerzo.", fechaEvaluacion: "2026-02-25", creadoEn: now, actualizadoEn: now, nombreUsuario: "Elena Ruiz", tituloModulo: "La adoración en el Antiguo Testamento", nombreCurso: "Fundamentos de la Adoración", idMinisterio: "min1" },
  // ── Elena Ruiz (u5) — Teoría Musical Básica ──
  { idEvaluacion: "eva20", idModulo: "mo3", idUsuario: "u5", calificacion: 84.00, estado: "aprobado", observaciones: "Buen avance en lectura musical.", fechaEvaluacion: "2026-01-28", creadoEn: now, actualizadoEn: now, nombreUsuario: "Elena Ruiz", tituloModulo: "Notas y escalas", nombreCurso: "Teoría Musical Básica", idMinisterio: "min1" },
  { idEvaluacion: "eva21", idModulo: "mo4", idUsuario: "u5", calificacion: 72.50, estado: "aprobado", observaciones: "Aprobado. Necesita más práctica con acordes de séptima.", fechaEvaluacion: "2026-02-10", creadoEn: now, actualizadoEn: now, nombreUsuario: "Elena Ruiz", tituloModulo: "Acordes básicos", nombreCurso: "Teoría Musical Básica", idMinisterio: "min1" },
  { idEvaluacion: "eva22", idModulo: "mo5", idUsuario: "u5", calificacion: 58.00, estado: "reprobado", observaciones: "No logró mantener el tempo en los ejercicios prácticos. Repetir módulo.", fechaEvaluacion: "2026-02-28", creadoEn: now, actualizadoEn: now, nombreUsuario: "Elena Ruiz", tituloModulo: "Ritmo y compás", nombreCurso: "Teoría Musical Básica", idMinisterio: "min1" },
  // ── Elena Ruiz (u5) — Liderazgo en el Ministerio ──
  { idEvaluacion: "eva23", idModulo: "mo6", idUsuario: "u5", calificacion: 93.00, estado: "aprobado", observaciones: "Excelente reflexión sobre liderazgo servicial. Ejemplo para el equipo.", fechaEvaluacion: "2026-03-03", creadoEn: now, actualizadoEn: now, nombreUsuario: "Elena Ruiz", tituloModulo: "Servir con humildad", nombreCurso: "Liderazgo en el Ministerio", idMinisterio: "min1" },
];

// ── Procesos Asignados de Curso (Ciclos Lectivos) ──
const mockProcesosAsignadoCurso: ProcesoAsignadoCurso[] = [
  { idProcesoAsignadoCurso: "pac1", idCurso: "cu1", idIglesia: "ig1", fechaInicio: "2026-01-15", fechaFin: "2026-03-30", estado: "en_curso", creadoEn: now, actualizadoEn: now },
  { idProcesoAsignadoCurso: "pac2", idCurso: "cu2", idIglesia: "ig1", fechaInicio: "2026-02-01", fechaFin: "2026-05-31", estado: "en_curso", creadoEn: now, actualizadoEn: now },
  { idProcesoAsignadoCurso: "pac3", idCurso: "cu3", idIglesia: "ig1", fechaInicio: "2026-03-15", fechaFin: "2026-04-30", estado: "programado", creadoEn: now, actualizadoEn: now },
  { idProcesoAsignadoCurso: "pac4", idCurso: "cu1", idIglesia: "ig1", fechaInicio: "2025-10-01", fechaFin: "2025-12-15", estado: "finalizado", creadoEn: now, actualizadoEn: now },
  { idProcesoAsignadoCurso: "pac5", idCurso: "cu2", idIglesia: "ig1", fechaInicio: "2025-08-01", fechaFin: "2025-11-30", estado: "finalizado", creadoEn: now, actualizadoEn: now },
  { idProcesoAsignadoCurso: "pac6", idCurso: "cu3", idIglesia: "ig1", fechaInicio: "2026-06-01", fechaFin: "2026-07-15", estado: "programado", creadoEn: now, actualizadoEn: now },
];

// ── Detalle Proceso Curso (Inscripciones) ──
const mockDetallesProcesoCurso: DetalleProcesoCurso[] = [
  // pac1 — Fundamentos de la Adoración (en_curso)
  { idDetalleProcesoCurso: "dpc1", idProcesoAsignadoCurso: "pac1", idUsuario: "u5", fechaInscripcion: "2026-01-15", estado: "en_progreso", creadoEn: now, actualizadoEn: now, nombreCompleto: "Elena Ruiz", correo: "coordinador@email.com" },
  { idDetalleProcesoCurso: "dpc2", idProcesoAsignadoCurso: "pac1", idUsuario: "u6", fechaInscripcion: "2026-01-15", estado: "en_progreso", creadoEn: now, actualizadoEn: now, nombreCompleto: "Roberto Díaz", correo: "servidor@email.com" },
  { idDetalleProcesoCurso: "dpc3", idProcesoAsignadoCurso: "pac1", idUsuario: "u7", fechaInscripcion: "2026-01-16", estado: "en_progreso", creadoEn: now, actualizadoEn: now, nombreCompleto: "Sofía Hernández", correo: "sofia@email.com" },
  { idDetalleProcesoCurso: "dpc4", idProcesoAsignadoCurso: "pac1", idUsuario: "u8", fechaInscripcion: "2026-01-16", estado: "en_progreso", creadoEn: now, actualizadoEn: now, nombreCompleto: "Daniel Morales", correo: "daniel@email.com" },
  // pac2 — Teoría Musical Básica (en_curso)
  { idDetalleProcesoCurso: "dpc5", idProcesoAsignadoCurso: "pac2", idUsuario: "u5", fechaInscripcion: "2026-02-01", estado: "en_progreso", creadoEn: now, actualizadoEn: now, nombreCompleto: "Elena Ruiz", correo: "coordinador@email.com" },
  { idDetalleProcesoCurso: "dpc6", idProcesoAsignadoCurso: "pac2", idUsuario: "u6", fechaInscripcion: "2026-02-01", estado: "en_progreso", creadoEn: now, actualizadoEn: now, nombreCompleto: "Roberto Díaz", correo: "servidor@email.com" },
  { idDetalleProcesoCurso: "dpc7", idProcesoAsignadoCurso: "pac2", idUsuario: "u7", fechaInscripcion: "2026-02-02", estado: "en_progreso", creadoEn: now, actualizadoEn: now, nombreCompleto: "Sofía Hernández", correo: "sofia@email.com" },
  { idDetalleProcesoCurso: "dpc8", idProcesoAsignadoCurso: "pac2", idUsuario: "u8", fechaInscripcion: "2026-02-02", estado: "en_progreso", creadoEn: now, actualizadoEn: now, nombreCompleto: "Daniel Morales", correo: "daniel@email.com" },
  // pac3 — Liderazgo en el Ministerio (programado)
  { idDetalleProcesoCurso: "dpc9", idProcesoAsignadoCurso: "pac3", idUsuario: "u5", fechaInscripcion: "2026-03-10", estado: "inscrito", creadoEn: now, actualizadoEn: now, nombreCompleto: "Elena Ruiz", correo: "coordinador@email.com" },
  { idDetalleProcesoCurso: "dpc10", idProcesoAsignadoCurso: "pac3", idUsuario: "u6", fechaInscripcion: "2026-03-10", estado: "inscrito", creadoEn: now, actualizadoEn: now, nombreCompleto: "Roberto Díaz", correo: "servidor@email.com" },
  { idDetalleProcesoCurso: "dpc11", idProcesoAsignadoCurso: "pac3", idUsuario: "u8", fechaInscripcion: "2026-03-11", estado: "inscrito", creadoEn: now, actualizadoEn: now, nombreCompleto: "Daniel Morales", correo: "daniel@email.com" },
  // pac4 — Fundamentos de la Adoración (finalizado - ciclo anterior)
  { idDetalleProcesoCurso: "dpc12", idProcesoAsignadoCurso: "pac4", idUsuario: "u5", fechaInscripcion: "2025-10-01", estado: "completado", creadoEn: now, actualizadoEn: now, nombreCompleto: "Elena Ruiz", correo: "coordinador@email.com" },
  { idDetalleProcesoCurso: "dpc13", idProcesoAsignadoCurso: "pac4", idUsuario: "u7", fechaInscripcion: "2025-10-01", estado: "completado", creadoEn: now, actualizadoEn: now, nombreCompleto: "Sofía Hernández", correo: "sofia@email.com" },
  { idDetalleProcesoCurso: "dpc14", idProcesoAsignadoCurso: "pac4", idUsuario: "u9", fechaInscripcion: "2025-10-02", estado: "retirado", creadoEn: now, actualizadoEn: now, nombreCompleto: "Andrea Castillo", correo: "andrea@email.com" },
  // pac5 — Teoría Musical Básica (finalizado)
  { idDetalleProcesoCurso: "dpc15", idProcesoAsignadoCurso: "pac5", idUsuario: "u6", fechaInscripcion: "2025-08-01", estado: "completado", creadoEn: now, actualizadoEn: now, nombreCompleto: "Roberto Díaz", correo: "servidor@email.com" },
  { idDetalleProcesoCurso: "dpc16", idProcesoAsignadoCurso: "pac5", idUsuario: "u8", fechaInscripcion: "2025-08-01", estado: "completado", creadoEn: now, actualizadoEn: now, nombreCompleto: "Daniel Morales", correo: "daniel@email.com" },
  { idDetalleProcesoCurso: "dpc17", idProcesoAsignadoCurso: "pac5", idUsuario: "u7", fechaInscripcion: "2025-08-02", estado: "completado", creadoEn: now, actualizadoEn: now, nombreCompleto: "Sofía Hernández", correo: "sofia@email.com" },
];

// ── Notificaciones ──
const mockNotificaciones: Notificacion[] = [
  { idNotificacion: "n1", idUsuario: "current", titulo: "Nuevo evento global", mensaje: "Se ha programado el Culto General Dominical para el 1 de marzo.", leida: false, fechaLectura: null, tipo: "evento", creadoEn: "2026-02-26T10:00", actualizadoEn: "2026-02-26T10:00" },
  { idNotificacion: "n2", idUsuario: "current", titulo: "Tarea asignada", mensaje: "Se te ha asignado la tarea 'Coordinar sonido e iluminación'. Fecha límite: 6 de marzo.", leida: false, fechaLectura: null, tipo: "tarea", creadoEn: "2026-02-25T15:30", actualizadoEn: "2026-02-25T15:30" },
  { idNotificacion: "n3", idUsuario: "current", titulo: "Nueva evaluación registrada", mensaje: "Se ha registrado una evaluación para el módulo '¿Qué es la adoración?' del curso Fundamentos.", leida: false, fechaLectura: null, tipo: "curso", creadoEn: "2026-02-24T09:00", actualizadoEn: "2026-02-24T09:00" },
  { idNotificacion: "n4", idUsuario: "current", titulo: "Retiro de Jóvenes", mensaje: "Se ha creado el evento 'Retiro de Jóvenes' del 14 al 16 de marzo.", leida: true, fechaLectura: "2026-02-23T16:00", tipo: "evento", creadoEn: "2026-02-23T14:00", actualizadoEn: "2026-02-23T16:00" },
  { idNotificacion: "n5", idUsuario: "current", titulo: "Estado de tarea actualizado", mensaje: "La tarea 'Preparar lista de canciones' ha sido marcada como Completada.", leida: true, fechaLectura: "2026-02-22T12:00", tipo: "tarea", creadoEn: "2026-02-22T11:00", actualizadoEn: "2026-02-22T12:00" },
  { idNotificacion: "n6", idUsuario: "current", titulo: "Bienvenido a la plataforma", mensaje: "Tu cuenta ha sido configurada exitosamente. Explora los módulos disponibles.", leida: true, fechaLectura: "2026-02-20T09:00", tipo: "informacion", creadoEn: "2026-02-20T08:00", actualizadoEn: "2026-02-20T09:00" },
];

// ═══════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════

interface AppState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  // Geografía
  paises: Pais[];
  departamentosGeo: DepartamentoGeo[];
  ciudades: Ciudad[];
  // Iglesia & Sedes
  iglesias: Iglesia[];
  pastores: Pastor[];
  iglesiaPastores: IglesiaPastor[];
  sedes: Sede[];
  // Ministerios
  ministerios: Ministerio[];
  miembrosMinisterio: MiembroMinisterio[];
  // Usuarios & Roles
  roles: Rol[];
  usuarios: Usuario[];
  usuarioRoles: UsuarioRol[];
  // Notificaciones
  notificaciones: Notificacion[];
  // Eventos
  tiposEvento: TipoEvento[];
  eventos: Evento[];
  // Tareas
  tareas: Tarea[];
  // Cursos
  cursos: Curso[];
  // Evaluaciones
  evaluaciones: Evaluacion[];
  // Ciclos Lectivos
  procesosAsignadoCurso: ProcesoAsignadoCurso[];
  detallesProcesoCurso: DetalleProcesoCurso[];
  // UI
  sidebarOpen: boolean;
  // Actions
  login: (email: string, password: string) => boolean;
  logout: () => void;
  setActiveChurch: (idIglesia: string) => void;
  toggleSidebar: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateTareaEstado: (idTarea: string, estado: Tarea["estado"]) => void;
  toggleIglesiaEstado: (idIglesia: string) => void;
  updateIglesia: (idIglesia: string, data: Partial<Iglesia>) => void;
  createIglesia: (data: Omit<Iglesia, "idIglesia">) => void;
  toggleMinisterioEstado: (idMinisterio: string) => void;
  // Super Admin CRUD
  addPais: (nombre: string) => void;
  updatePais: (idPais: string, nombre: string) => void;
  deletePais: (idPais: string) => void;
  addDepartamentoGeo: (nombre: string, idPais: string) => void;
  updateDepartamentoGeo: (id: string, nombre: string) => void;
  deleteDepartamentoGeo: (id: string) => void;
  addCiudad: (nombre: string, idDepartamentoGeo: string) => void;
  updateCiudad: (id: string, nombre: string) => void;
  deleteCiudad: (id: string) => void;
  addSede: (data: Omit<Sede, "idSede" | "creadoEn" | "actualizadoEn">) => void;
  updateSede: (id: string, data: Partial<Sede>) => void;
  toggleSedeEstado: (id: string) => void;
  addPastor: (data: Omit<Pastor, "idPastor" | "creadoEn" | "actualizadoEn">) => void;
  updatePastor: (id: string, data: Partial<Pastor>) => void;
  addIglesiaPastor: (data: Omit<IglesiaPastor, "idIglesiaPastor" | "creadoEn" | "actualizadoEn">) => void;
  removeIglesiaPastor: (id: string) => void;
  toggleUsuarioActivo: (idUsuario: string) => void;
  addTipoEvento: (nombre: string, descripcion: string) => void;
  updateTipoEvento: (id: string, nombre: string, descripcion: string) => void;
  deleteTipoEvento: (id: string) => void;
  // Ciclos Lectivos
  addProcesoAsignadoCurso: (data: Omit<ProcesoAsignadoCurso, "idProcesoAsignadoCurso" | "creadoEn" | "actualizadoEn">) => void;
  updateProcesoAsignadoCurso: (id: string, data: Partial<ProcesoAsignadoCurso>) => void;
  deleteProcesoAsignadoCurso: (id: string) => void;
  addDetalleProcesoCurso: (data: Omit<DetalleProcesoCurso, "idDetalleProcesoCurso" | "creadoEn" | "actualizadoEn">) => void;
  updateDetalleProcesoCurso: (id: string, data: Partial<DetalleProcesoCurso>) => void;
  deleteDetalleProcesoCurso: (id: string) => void;
  // Evaluaciones CRUD
  addEvaluacion: (data: Omit<Evaluacion, "idEvaluacion" | "creadoEn" | "actualizadoEn">) => void;
  updateEvaluacion: (id: string, data: Partial<Evaluacion>) => void;
  deleteEvaluacion: (id: string) => void;
  // Dark mode
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [iglesias, setIglesias] = useState(mockIglesias);
  const [ministerios, setMinisterios] = useState(mockMinisterios);
  const [tareas, setTareas] = useState(mockTareas);
  const [notificaciones, setNotificaciones] = useState(mockNotificaciones);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paises, setPaises] = useState(mockPaises);
  const [departamentosGeo, setDepartamentosGeo] = useState(mockDepartamentosGeo);
  const [ciudades, setCiudades] = useState(mockCiudades);
  const [sedes, setSedes] = useState(mockSedes);
  const [pastores, setPastores] = useState(mockPastores);
  const [iglesiaPastoresState, setIglesiaPastores] = useState(mockIglesiaPastores);
  const [usuarios, setUsuarios] = useState(mockUsuarios);
  const [tiposEvento, setTiposEvento] = useState(mockTiposEvento);
  const [procesosAsignadoCurso, setProcesosAsignadoCurso] = useState(mockProcesosAsignadoCurso);
  const [detallesProcesoCurso, setDetallesProcesoCurso] = useState(mockDetallesProcesoCurso);
  const [evaluaciones, setEvaluaciones] = useState(mockEvaluaciones);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sei-dark-mode") === "true";
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("sei-dark-mode", String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => setDarkMode((p) => !p), []);

  const login = useCallback((email: string, _password: string) => {
    const roleMap: Record<string, { idUsuario: string; rol: RolClave; nombres: string; apellidos: string; idMinisterio?: string; idMiembroMinisterio?: string }> = {
      "super@email.com": { idUsuario: "u1", rol: "super_admin", nombres: "Admin", apellidos: "Global" },
      "admin@email.com": { idUsuario: "u2", rol: "admin_iglesia", nombres: "Juan", apellidos: "Pérez" },
      "lider@email.com": { idUsuario: "u3", rol: "lider", nombres: "María", apellidos: "López", idMinisterio: "min1", idMiembroMinisterio: "mm1" },
      "servidor@email.com": { idUsuario: "u6", rol: "servidor", nombres: "Roberto", apellidos: "Díaz", idMinisterio: "min1", idMiembroMinisterio: "mm4" },
    };
    const mapped = roleMap[email] || { idUsuario: "u2", rol: "admin_iglesia" as RolClave, nombres: "Juan", apellidos: "Pérez" };
    setUser({
      idUsuario: mapped.idUsuario,
      nombres: mapped.nombres,
      apellidos: mapped.apellidos,
      correo: email || "admin@email.com",
      telefono: "+502 5555-9999",
      activo: true,
      rol: mapped.rol,
      iglesiasIds: ["ig1", "ig2"],
      idIglesiaActiva: "ig1",
      idMinisterio: mapped.idMinisterio,
      idMiembroMinisterio: mapped.idMiembroMinisterio,
    });
    return true;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const setActiveChurch = useCallback((idIglesia: string) => {
    setUser((prev) => prev ? { ...prev, idIglesiaActiva: idIglesia } : null);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);

  const markNotificationRead = useCallback((id: string) => {
    setNotificaciones((prev) => prev.map((n) => (n.idNotificacion === id ? { ...n, leida: true, fechaLectura: new Date().toISOString() } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    const now = new Date().toISOString();
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true, fechaLectura: n.fechaLectura || now })));
  }, []);

  const updateTareaEstado = useCallback((idTarea: string, estado: Tarea["estado"]) => {
    setTareas((prev) => prev.map((t) => (t.idTarea === idTarea ? { ...t, estado } : t)));
  }, []);

  const toggleIglesiaEstado = useCallback((idIglesia: string) => {
    setIglesias((prev) => prev.map((ig) => (ig.idIglesia === idIglesia ? { ...ig, estado: ig.estado === "activa" ? "inactiva" : "activa" } : ig)));
  }, []);

  const updateIglesia = useCallback((idIglesia: string, data: Partial<Iglesia>) => {
    setIglesias((prev) => prev.map((ig) => (ig.idIglesia === idIglesia ? { ...ig, ...data } : ig)));
  }, []);

  const createIglesia = useCallback((data: Omit<Iglesia, "idIglesia">) => {
    setIglesias((prev) => {
      const newId = `ig${Date.now()}`;
      return [...prev, { idIglesia: newId, ...data }];
    });
  }, []);

  const toggleMinisterioEstado = useCallback((idMinisterio: string) => {
    setMinisterios((prev) => prev.map((m) => (m.idMinisterio === idMinisterio ? { ...m, estado: m.estado === "activo" ? "inactivo" : "activo" } : m)));
  }, []);

  const addPais = useCallback((nombre: string) => {
    setPaises((prev) => {
      const newId = `p${Date.now()}`;
      return [...prev, { idPais: newId, nombre, creadoEn: now, actualizadoEn: now }];
    });
  }, []);

  const updatePais = useCallback((idPais: string, nombre: string) => {
    setPaises((prev) => prev.map((p) => (p.idPais === idPais ? { ...p, nombre, actualizadoEn: now } : p)));
  }, []);

  const deletePais = useCallback((idPais: string) => {
    setPaises((prev) => prev.filter((p) => p.idPais !== idPais));
  }, []);

  const addDepartamentoGeo = useCallback((nombre: string, idPais: string) => {
    setDepartamentosGeo((prev) => {
      const newId = `dg${Date.now()}`;
      return [...prev, { idDepartamentoGeo: newId, nombre, idPais, creadoEn: now, actualizadoEn: now }];
    });
  }, []);

  const updateDepartamentoGeo = useCallback((id: string, nombre: string) => {
    setDepartamentosGeo((prev) => prev.map((d) => (d.idDepartamentoGeo === id ? { ...d, nombre, actualizadoEn: now } : d)));
  }, []);

  const deleteDepartamentoGeo = useCallback((id: string) => {
    setDepartamentosGeo((prev) => prev.filter((d) => d.idDepartamentoGeo !== id));
  }, []);

  const addCiudad = useCallback((nombre: string, idDepartamentoGeo: string) => {
    setCiudades((prev) => {
      const newId = `ci${Date.now()}`;
      return [...prev, { idCiudad: newId, nombre, idDepartamentoGeo, creadoEn: now, actualizadoEn: now }];
    });
  }, []);

  const updateCiudad = useCallback((id: string, nombre: string) => {
    setCiudades((prev) => prev.map((c) => (c.idCiudad === id ? { ...c, nombre, actualizadoEn: now } : c)));
  }, []);

  const deleteCiudad = useCallback((id: string) => {
    setCiudades((prev) => prev.filter((c) => c.idCiudad !== id));
  }, []);

  const addSede = useCallback((data: Omit<Sede, "idSede" | "creadoEn" | "actualizadoEn">) => {
    setSedes((prev) => {
      const newId = `s${Date.now()}`;
      return [...prev, { idSede: newId, ...data, creadoEn: now, actualizadoEn: now }];
    });
  }, []);

  const updateSede = useCallback((id: string, data: Partial<Sede>) => {
    setSedes((prev) => prev.map((s) => (s.idSede === id ? { ...s, ...data, actualizadoEn: now } : s)));
  }, []);

  const toggleSedeEstado = useCallback((id: string) => {
    setSedes((prev) => prev.map((s) => (s.idSede === id ? { ...s, estado: s.estado === "activa" ? "inactiva" : "activa" } : s)));
  }, []);

  const addPastor = useCallback((data: Omit<Pastor, "idPastor" | "creadoEn" | "actualizadoEn">) => {
    setPastores((prev) => {
      const newId = `pa${Date.now()}`;
      return [...prev, { idPastor: newId, ...data, creadoEn: now, actualizadoEn: now }];
    });
  }, []);

  const updatePastor = useCallback((id: string, data: Partial<Pastor>) => {
    setPastores((prev) => prev.map((p) => (p.idPastor === id ? { ...p, ...data, actualizadoEn: now } : p)));
  }, []);

  const addIglesiaPastor = useCallback((data: Omit<IglesiaPastor, "idIglesiaPastor" | "creadoEn" | "actualizadoEn">) => {
    setIglesiaPastores((prev) => {
      const newId = `ip${Date.now()}`;
      return [...prev, { idIglesiaPastor: newId, ...data, creadoEn: now, actualizadoEn: now }];
    });
  }, []);

  const removeIglesiaPastor = useCallback((id: string) => {
    setIglesiaPastores((prev) => prev.filter((ip) => ip.idIglesiaPastor !== id));
  }, []);

  const toggleUsuarioActivo = useCallback((idUsuario: string) => {
    setUsuarios((prev) => prev.map((u) => (u.idUsuario === idUsuario ? { ...u, activo: !u.activo } : u)));
  }, []);

  const addTipoEvento = useCallback((nombre: string, descripcion: string) => {
    setTiposEvento((prev) => {
      const newId = `te${Date.now()}`;
      return [...prev, { idTipoEvento: newId, nombre, descripcion, creadoEn: now, actualizadoEn: now }];
    });
  }, []);

  const updateTipoEvento = useCallback((id: string, nombre: string, descripcion: string) => {
    setTiposEvento((prev) => prev.map((te) => (te.idTipoEvento === id ? { ...te, nombre, descripcion, actualizadoEn: now } : te)));
  }, []);

  const deleteTipoEvento = useCallback((id: string) => {
    setTiposEvento((prev) => prev.filter((te) => te.idTipoEvento !== id));
  }, []);

  // ── Ciclos Lectivos ──
  const addProcesoAsignadoCurso = useCallback((data: Omit<ProcesoAsignadoCurso, "idProcesoAsignadoCurso" | "creadoEn" | "actualizadoEn">) => {
    setProcesosAsignadoCurso((prev) => {
      const newId = `pac${Date.now()}`;
      return [...prev, { idProcesoAsignadoCurso: newId, ...data, creadoEn: now, actualizadoEn: now }];
    });
  }, []);

  const updateProcesoAsignadoCurso = useCallback((id: string, data: Partial<ProcesoAsignadoCurso>) => {
    setProcesosAsignadoCurso((prev) => prev.map((p) => (p.idProcesoAsignadoCurso === id ? { ...p, ...data, actualizadoEn: now } : p)));
  }, []);

  const deleteProcesoAsignadoCurso = useCallback((id: string) => {
    setProcesosAsignadoCurso((prev) => prev.filter((p) => p.idProcesoAsignadoCurso !== id));
    setDetallesProcesoCurso((prev) => prev.filter((d) => d.idProcesoAsignadoCurso !== id));
  }, []);

  const addDetalleProcesoCurso = useCallback((data: Omit<DetalleProcesoCurso, "idDetalleProcesoCurso" | "creadoEn" | "actualizadoEn">) => {
    setDetallesProcesoCurso((prev) => {
      const newId = `dpc${Date.now()}`;
      return [...prev, { idDetalleProcesoCurso: newId, ...data, creadoEn: now, actualizadoEn: now }];
    });
  }, []);

  const updateDetalleProcesoCurso = useCallback((id: string, data: Partial<DetalleProcesoCurso>) => {
    setDetallesProcesoCurso((prev) => prev.map((d) => (d.idDetalleProcesoCurso === id ? { ...d, ...data, actualizadoEn: now } : d)));
  }, []);

  const deleteDetalleProcesoCurso = useCallback((id: string) => {
    setDetallesProcesoCurso((prev) => prev.filter((d) => d.idDetalleProcesoCurso !== id));
  }, []);

  // ── Evaluaciones CRUD ──
  const addEvaluacion = useCallback((data: Omit<Evaluacion, "idEvaluacion" | "creadoEn" | "actualizadoEn">) => {
    setEvaluaciones((prev) => {
      const newId = `eva${Date.now()}`;
      return [...prev, { idEvaluacion: newId, ...data, creadoEn: now, actualizadoEn: now }];
    });
  }, []);

  const updateEvaluacion = useCallback((id: string, data: Partial<Evaluacion>) => {
    setEvaluaciones((prev) => prev.map((e) => (e.idEvaluacion === id ? { ...e, ...data, actualizadoEn: now } : e)));
  }, []);

  const deleteEvaluacion = useCallback((id: string) => {
    setEvaluaciones((prev) => prev.filter((e) => e.idEvaluacion !== id));
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        paises,
        departamentosGeo,
        ciudades,
        iglesias,
        pastores,
        iglesiaPastores: iglesiaPastoresState,
        sedes,
        ministerios,
        miembrosMinisterio: mockMiembrosMinisterio,
        roles: mockRoles,
        usuarios,
        usuarioRoles: mockUsuarioRoles,
        notificaciones,
        tiposEvento,
        eventos: mockEventos,
        tareas,
        cursos: mockCursos,
        evaluaciones,
        procesosAsignadoCurso,
        detallesProcesoCurso,
        sidebarOpen,
        login,
        logout,
        setActiveChurch,
        toggleSidebar,
        markNotificationRead,
        markAllNotificationsRead,
        updateTareaEstado,
        toggleIglesiaEstado,
        updateIglesia,
        createIglesia,
        toggleMinisterioEstado,
        addPais,
        updatePais,
        deletePais,
        addDepartamentoGeo,
        updateDepartamentoGeo,
        deleteDepartamentoGeo,
        addCiudad,
        updateCiudad,
        deleteCiudad,
        addSede,
        updateSede,
        toggleSedeEstado,
        addPastor,
        updatePastor,
        addIglesiaPastor,
        removeIglesiaPastor,
        toggleUsuarioActivo,
        addTipoEvento,
        updateTipoEvento,
        deleteTipoEvento,
        addProcesoAsignadoCurso,
        updateProcesoAsignadoCurso,
        deleteProcesoAsignadoCurso,
        addDetalleProcesoCurso,
        updateDetalleProcesoCurso,
        deleteDetalleProcesoCurso,
        addEvaluacion,
        updateEvaluacion,
        deleteEvaluacion,
        darkMode,
        toggleDarkMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}