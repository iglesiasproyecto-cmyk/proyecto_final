// ── Geografía ──
export interface Pais {
  idPais: number
  nombre: string
  creadoEn: string
  actualizadoEn: string
}

export interface DepartamentoGeo {
  idDepartamentoGeo: number
  nombre: string
  idPais: number
  creadoEn: string
  actualizadoEn: string
}

export interface Ciudad {
  idCiudad: number
  nombre: string
  idDepartamentoGeo: number
  creadoEn: string
  actualizadoEn: string
}

// ── Iglesia & Sedes ──
export interface Iglesia {
  idIglesia: number
  nombre: string
  fechaFundacion: string | null
  estado: 'activa' | 'inactiva' | 'fusionada' | 'cerrada'
  idCiudad: number
  direccion: string | null
  telefono: string | null
  descripcion: string | null
  sitioWeb: string | null
  creadoEn: string
  actualizadoEn: string
  ciudadNombre?: string
  departamentoGeoNombre?: string
  paisNombre?: string
}

export interface Pastor {
  idPastor: number
  nombres: string
  apellidos: string
  correo: string
  telefono: string | null
  idUsuario: number | null
  idIglesia: number | null
  creadoEn: string
  actualizadoEn: string
  // computed
  iglesiaNombre?: string
}

export interface IglesiaPastor {
  idIglesiaPastor: number
  idIglesia: number
  idPastor: number
  esPrincipal: boolean
  fechaInicio: string
  fechaFin: string | null
  observaciones: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface SedePastor {
  idSedePastor: number
  idSede: number
  idPastor: number
  esPrincipal: boolean
  fechaInicio: string
  fechaFin: string | null
  observaciones: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface Sede {
  idSede: number
  nombre: string
  direccion: string | null
  idCiudad: number
  idIglesia: number
  estado: 'activa' | 'inactiva' | 'en_construccion'
  creadoEn: string
  actualizadoEn: string
}

// ── Ministerios ──
export interface Ministerio {
  idMinisterio: number
  nombre: string
  descripcion: string | null
  estado: 'activo' | 'inactivo' | 'suspendido'
  idSede: number
  creadoEn: string
  actualizadoEn: string
  idIglesia?: number
  liderNombre?: string
  cantidadMiembros?: number
}

export interface MiembroMinisterio {
  idMiembroMinisterio: number
  idUsuario: number
  idMinisterio: number
  rolEnMinisterio: string | null
  fechaIngreso: string
  fechaSalida: string | null
  creadoEn: string
  actualizadoEn: string
  nombreCompleto?: string
  correo?: string
  telefono?: string
  activo?: boolean
}

export interface UsuarioSede {
  id: number
  idUsuario: number
  idSede: number
  fechaIngreso: string
  estado: 'activo' | 'inactivo'
  creadoEn: string
  actualizadoEn: string
  usuarioNombre?: string
  usuarioCorreo?: string
  sedeNombre?: string
}

// ── Usuarios & Roles ──
export interface Rol {
  idRol: number
  nombre: string
  descripcion: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface Usuario {
  idUsuario: number
  nombres: string
  apellidos: string
  correo: string
  telefono: string | null
  fechaNacimiento: string | null
  activo: boolean
  ultimoAcceso: string | null
  authUserId: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface UsuarioRol {
  idUsuarioRol: number
  idUsuario: number
  idRol: number
  idIglesia: number
  idSede: number | null
  fechaInicio: string
  fechaFin: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface AdminSedeAsignacion {
  idAdminSedeAsignacion: number
  idUsuario: number
  idSede: number
  idIglesia: number
  idRol: number
  fechaInicio: string
  fechaFin: string | null
  creadoEn: string
  actualizadoEn: string
  // Computed (enriquecido)
  nombreCompleto?: string
  correo?: string
  sedeNombre?: string
  iglesiaNombre?: string
  ciudadNombre?: string
}

// ── Notificaciones ──
export interface Notificacion {
  idNotificacion: number
  idUsuario: number
  titulo: string
  mensaje: string
  leida: boolean
  fechaLectura: string | null
  tipo: 'informacion' | 'alerta' | 'tarea' | 'evento' | 'curso'
  creadoEn: string
  actualizadoEn: string
}

export interface Evento {
  idEvento: number
  nombre: string
  descripcion: string | null
  tipoEventoTexto?: string | null
  fechaInicio: string
  fechaFin: string
  estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado'
  idIglesia: number
  idSede: number | null
  idMinisterio: number | null
  creadoEn: string
  actualizadoEn: string
  ministerioNombre?: string
  sedeNombre?: string
}

export interface Tarea {
  idTarea: number
  titulo: string
  descripcion: string | null
  fechaLimite: string | null
  estado: 'pendiente' | 'en_progreso' | 'en_revision' | 'completada' | 'cancelada'
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  idEvento: number | null
  idUsuarioCreador: number
  idMinisterio: number | null
  idIglesia: number | null
  creadoEn: string
  actualizadoEn: string
  archivedAt?: string | null
  asignados?: TareaAsignada[]
}

export interface TareaAsignada {
  idTareaAsignada: number
  idTarea: number
  idUsuario: number
  fechaAsignacion: string
  fechaCompletado: string | null
  observaciones: string | null
  creadoEn: string
  actualizadoEn: string
  nombreCompleto?: string
}

export interface TareaEvidencia {
  idTareaEvidencia: number
  idTareaAsignada: number
  idUsuario: number
  objectPath: string
  nombreArchivo: string
  creadoEn: string
  actualizadoEn: string
  nombreCompleto?: string
}

// ── Aula ──
export interface AulaCurso {
  idAulaCurso: number
  idMinisterio: number | null
  idIglesia: number | null
  idUsuarioCreador: number
  titulo: string
  descripcion: string | null
  imagenUrl: string | null
  estado: 'borrador' | 'activo' | 'archivado'
  ordenSecuencial: boolean
  creadoEn: string
  actualizadoEn: string
  eliminadoEn: string | null
  // computed
  ministerioNombre?: string
  iglesiaNombre?: string
  tipo?: 'ministerio' | 'iglesia'
}

// ── Presupuesto ──
export interface PresupuestoItem {
  idPresupuestoItem: number
  idEvento: number
  tipo: 'ingreso' | 'egreso'
  categoria: string
  descripcion: string | null
  montoPlaneado: number
  montoReal: number | null
  creadoPor: number | null
  creadoEn: string
  actualizadoEn: string
}

export interface PresupuestoResumenEvento {
  idEvento: number
  nombreEvento: string
  fechaInicio: string
  idMinisterio: number | null
  idSede: number | null
  items: PresupuestoItem[]
  ingresosPlaneados: number
  ingresosReales: number
  egresosPlaneados: number
  egresosReales: number
  balanceNeto: number
}

// ── Session ──
export type RolClave = 'super_admin' | 'admin_iglesia' | 'admin_sede' | 'lider' | 'servidor'

export interface SessionUser {
  idUsuario: number
  nombres: string
  apellidos: string
  correo: string
  telefono: string | null
  activo: boolean
  rol: RolClave
  iglesiasIds: number[]
  idIglesiaActiva: number
  idMinisterio?: number
  idMiembroMinisterio?: number
}

export interface DisponibilidadRegla {
  id: number;
  usuarioId: number;
  tipo: 'fecha_especifica' | 'recurrente';
  fecha?: string;        // 'YYYY-MM-DD'
  fechaFin?: string;     // 'YYYY-MM-DD' — rango opcional
  patron?: {
    tipo: 'semanal' | 'mensual';
    diasSemana?: number[];   // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
    semanaDelMes?: number;   // 1–4, o -1 = última
  };
  nota?: string;
  activo: boolean;
  createdAt: string;
}
