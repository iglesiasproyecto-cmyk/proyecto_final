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
  creadoEn: string
  actualizadoEn: string
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
  contrasenaHash: string
  telefono: string | null
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

// ── Eventos & Tareas ──
export interface TipoEvento {
  idTipoEvento: number
  nombre: string
  descripcion: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface Evento {
  idEvento: number
  nombre: string
  descripcion: string | null
  idTipoEvento: number
  fechaInicio: string
  fechaFin: string
  estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado'
  idIglesia: number
  idSede: number | null
  idMinisterio: number | null
  creadoEn: string
  actualizadoEn: string
  tipoEventoNombre?: string
  ministerioNombre?: string
  sedeNombre?: string
}

export interface Tarea {
  idTarea: number
  titulo: string
  descripcion: string | null
  fechaLimite: string | null
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada'
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  idEvento: number | null
  idUsuarioCreador: number
  creadoEn: string
  actualizadoEn: string
  idMinisterio?: number
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

// ── Cursos & Formación ──
export interface Curso {
  idCurso: number
  nombre: string
  descripcion: string | null
  duracionHoras: number | null
  estado: 'borrador' | 'activo' | 'inactivo' | 'archivado'
  idMinisterio: number
  idUsuarioCreador: number
  creadoEn: string
  actualizadoEn: string
  modulos?: Modulo[]
}

export interface Modulo {
  idModulo: number
  titulo: string
  descripcion: string | null
  contenidoMd: string | null
  orden: number
  estado: 'borrador' | 'publicado' | 'archivado'
  idCurso: number
  creadoEn: string
  actualizadoEn: string
  recursos?: Recurso[]
}

export interface Recurso {
  idRecurso: number
  idModulo: number
  nombre: string
  tipo: 'archivo' | 'enlace'
  url: string
}

export interface Evaluacion {
  idEvaluacion: number
  idModulo: number
  idUsuario: number
  calificacion: number | null
  estado: 'pendiente' | 'aprobado' | 'reprobado' | 'en_revision'
  observaciones: string | null
  fechaEvaluacion: string | null
  creadoEn: string
  actualizadoEn: string
  nombreUsuario?: string
  tituloModulo?: string
  nombreCurso?: string
  idMinisterio?: number
}

export interface ProcesoAsignadoCurso {
  idProcesoAsignadoCurso: number
  idCurso: number
  idIglesia: number
  fechaInicio: string
  fechaFin: string
  estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado'
  creadoEn: string
  actualizadoEn: string
}

export interface DetalleProcesoCurso {
  idDetalleProcesoCurso: number
  idProcesoAsignadoCurso: number
  idUsuario: number
  fechaInscripcion: string
  estado: 'inscrito' | 'en_progreso' | 'completado' | 'retirado'
  creadoEn: string
  actualizadoEn: string
  nombreCompleto?: string
  correo?: string
}

// ── Session ──
export type RolClave = 'super_admin' | 'admin_iglesia' | 'lider' | 'servidor'

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
