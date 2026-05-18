import { supabase } from '@/lib/supabaseClient'

// Optimized function to load complete aula course data in a single query
// This prevents N+1 query problems by loading the entire course tree:
// Course -> Modules -> Activities + Evaluations -> Questions -> Options
// in one comprehensive query instead of dozens of separate requests

// Option 1: Direct nested joins (current implementation)
export async function getAulaCursoCompleto(idCurso: number) {
  const { data, error } = await supabase
    .from('aula_curso')
    .select(`
      *,
      ministerio:ministerio(nombre),
      modulos:aula_modulo(
        *,
        actividades:aula_actividad(
          *,
          progreso:aula_progreso_actividad(
            completada,
            completada_en,
            id_usuario
          )
        ),
        evaluaciones:aula_evaluacion(
          *,
          preguntas:aula_pregunta(
            *,
            opciones:aula_opcion(*)
          ),
          intentos:aula_intento_evaluacion(
            id_usuario,
            aprobado,
            puntaje_obtenido,
            iniciado_en
          )
        ),
        archivos:aula_modulo_archivo(*),
        enlaces:aula_modulo_enlace(*)
      ),
      inscripciones:aula_inscripcion(
        id_usuario,
        activo,
        inscrito_en,
        usuario:usuario(
          id_usuario,
          nombres,
          apellidos,
          correo
        )
      ),
      certificados:aula_certificado(
        id_usuario,
        emitido_en,
        usuario:usuario(
          id_usuario,
          nombres,
          apellidos,
          correo
        )
      )
    `)
    .eq('id_aula_curso', idCurso)
    .single()

  if (error) throw error
  return data
}

// Option 2: RPC function (recommended for complex queries)
// Uncomment when RPC is implemented in Supabase:
// export async function getAulaCursoCompleto(idCurso: number) {
//   const { data, error } = await supabase.rpc('get_aula_curso_completo', {
//     p_id_curso: idCurso
//   })
//   if (error) throw error
//   return data
// }

export type TipoCurso = 'ministerio' | 'iglesia'

export interface AulaCursoEnriquecido {
  idAulaCurso: number
  titulo: string
  descripcion: string | null
  imagenUrl: string | null
  estado: 'borrador' | 'activo' | 'archivado'
  ordenSecuencial: boolean
  idMinisterio: number | null
  idIglesia: number | null
  idUsuarioCreador: number
  tipo: TipoCurso
  ministerioNombre?: string
  iglesiaNombre?: string
  creadoEn: string
  actualizadoEn: string
}

export async function getCursosParaUsuario(): Promise<AulaCursoEnriquecido[]> {
  const { data, error } = await supabase
    .from('aula_curso')
    .select(`
      *,
      ministerio:id_ministerio(nombre),
      iglesia:id_iglesia(nombre)
    `)
    .order('creado_en', { ascending: false })

  if (error) throw error

  return (data ?? []).map((r: any) => ({
    idAulaCurso: r.id_aula_curso,
    titulo: r.titulo,
    descripcion: r.descripcion,
    imagenUrl: r.imagen_url,
    estado: r.estado,
    ordenSecuencial: r.orden_secuencial,
    idMinisterio: r.id_ministerio,
    idIglesia: r.id_iglesia,
    idUsuarioCreador: r.id_usuario_creador,
    tipo: r.id_iglesia ? 'iglesia' : 'ministerio',
    ministerioNombre: r.ministerio?.nombre ?? undefined,
    iglesiaNombre: r.iglesia?.nombre ?? undefined,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }))
}

/**
 * Obtiene los cursos de los ministerios que pertenecen a las sedes indicadas.
 * Usado por el admin_sede para ver/gestionar solo los cursos de su sede.
 */
export async function getCursosParaSede(sedeIds: number[]): Promise<AulaCursoEnriquecido[]> {
  if (sedeIds.length === 0) return []

  // 1. Resolve ministerio IDs that belong to these sedes
  const { data: ministerios, error: minError } = await supabase
    .from('ministerio')
    .select('id_ministerio')
    .in('id_sede', sedeIds)

  if (minError) throw minError

  const ministerioIds = (ministerios ?? []).map((m: any) => m.id_ministerio)
  if (ministerioIds.length === 0) return []

  // 2. Fetch courses for those ministerios
  const { data, error } = await supabase
    .from('aula_curso')
    .select(`
      *,
      ministerio:id_ministerio(nombre),
      iglesia:id_iglesia(nombre)
    `)
    .in('id_ministerio', ministerioIds)
    .order('creado_en', { ascending: false })

  if (error) throw error

  return (data ?? []).map((r: any) => ({
    idAulaCurso: r.id_aula_curso,
    titulo: r.titulo,
    descripcion: r.descripcion,
    imagenUrl: r.imagen_url,
    estado: r.estado,
    ordenSecuencial: r.orden_secuencial,
    idMinisterio: r.id_ministerio,
    idIglesia: r.id_iglesia,
    idUsuarioCreador: r.id_usuario_creador,
    tipo: 'ministerio' as TipoCurso,
    ministerioNombre: r.ministerio?.nombre ?? undefined,
    iglesiaNombre: r.iglesia?.nombre ?? undefined,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at,
  }))
}

export async function crearCurso(params: {
  titulo: string
  descripcion?: string
  idMinisterio?: number | null
  idIglesia?: number | null
  idUsuarioCreador: number
  ordenSecuencial?: boolean
}): Promise<AulaCursoEnriquecido> {
  if (!params.idMinisterio && !params.idIglesia) {
    throw new Error('Un curso debe pertenecer a un ministerio o a una iglesia')
  }
  if (params.idMinisterio && params.idIglesia) {
    throw new Error('Un curso no puede pertenecer a un ministerio y a una iglesia al mismo tiempo')
  }

  const { data, error } = await supabase
    .from('aula_curso')
    .insert({
      titulo: params.titulo,
      descripcion: params.descripcion ?? null,
      id_ministerio: params.idMinisterio ?? null,
      id_iglesia: params.idIglesia ?? null,
      id_usuario_creador: params.idUsuarioCreador,
      orden_secuencial: params.ordenSecuencial ?? true,
      estado: 'borrador',
    })
    .select(`*, ministerio:id_ministerio(nombre), iglesia:id_iglesia(nombre)`)
    .single()

  if (error) throw error

  return {
    idAulaCurso: data.id_aula_curso,
    titulo: data.titulo,
    descripcion: data.descripcion,
    imagenUrl: data.imagen_url,
    estado: data.estado,
    ordenSecuencial: data.orden_secuencial,
    idMinisterio: data.id_ministerio,
    idIglesia: data.id_iglesia,
    idUsuarioCreador: data.id_usuario_creador,
    tipo: data.id_iglesia ? 'iglesia' : 'ministerio',
    ministerioNombre: (data as any).ministerio?.nombre ?? undefined,
    iglesiaNombre: (data as any).iglesia?.nombre ?? undefined,
    creadoEn: data.creado_en,
    actualizadoEn: data.updated_at,
  }
}
