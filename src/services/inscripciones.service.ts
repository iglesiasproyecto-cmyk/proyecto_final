import { supabase } from '@/lib/supabaseClient'

export async function inscribirUsuariosCurso(
  idAulaCurso: number,
  userIds: number[]
) {
  const { data, error } = await supabase.rpc('inscribir_usuarios_curso', {
    p_id_aula_curso: idAulaCurso,
    p_user_ids: userIds,
  })

  if (error) {
    console.error('Error inscribiendo usuarios:', error)
    throw new Error(error.message)
  }

  return data
}

export async function retirarInscripcion(idAulaInscripcion: number) {
  const { data, error } = await supabase
    .from('aula_inscripcion')
    .update({
      activo: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id_aula_inscripcion', idAulaInscripcion)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function reactivarInscripcion(idAulaInscripcion: number) {
  const { data, error } = await supabase
    .from('aula_inscripcion')
    .update({
      activo: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id_aula_inscripcion', idAulaInscripcion)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getInscripcionesCurso(idAulaCurso: number) {
  const { data, error } = await supabase
    .from('aula_inscripcion')
    .select(`
      id_aula_inscripcion,
      id_aula_curso,
      id_usuario,
      activo,
      inscrito_en,
      updated_at,
      usuario (
        id_usuario,
        nombres,
        apellidos,
        correo,
        telefono,
        activo
      )
    `)
    .eq('id_aula_curso', idAulaCurso)
    .order('inscrito_en', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getCandidatosInscripcionCurso(idAulaCurso: number) {
  // 1. Obtener ministerio del curso
  const { data: curso, error: cursoError } = await supabase
    .from('aula_curso')
    .select('id_aula_curso, id_ministerio')
    .eq('id_aula_curso', idAulaCurso)
    .eq('estado', 'activo')
    .single()

  if (cursoError) throw cursoError
  if (!curso) throw new Error('Curso no encontrado')

  // 2. Usuarios activos del ministerio
  const { data: miembros, error: miembrosError } = await supabase
    .from('miembro_ministerio')
    .select(`
      id_usuario,
      usuario (
        id_usuario,
        nombres,
        apellidos,
        correo,
        telefono,
        activo
      )
    `)
    .eq('id_ministerio', curso.id_ministerio)
    .is('fecha_salida', null)

  if (miembrosError) throw miembrosError

  // 3. Inscritos activos
  const { data: inscritos, error: inscritosError } = await supabase
    .from('aula_inscripcion')
    .select('id_usuario')
    .eq('id_aula_curso', idAulaCurso)
    .eq('activo', true)

  if (inscritosError) throw inscritosError

  const inscritosIds = new Set((inscritos ?? []).map((i) => i.id_usuario))

  // 4. Filtrar candidatos
  return (miembros ?? [])
    .map((m: any) => m.usuario)
    .filter((u: any) => u && u.activo === true)
    .filter((u: any) => !inscritosIds.has(u.id_usuario))
}

export async function getCompanerosCiclo(idCurso: number): Promise<CompaneroCiclo[]> {
  try {
    // Obtener todas las inscripciones activas del curso
    const { data: inscripciones, error: inscError } = await supabase
      .from('aula_inscripcion')
      .select(`
        id_usuario,
        usuario:usuario(id_usuario, nombres, apellidos, correo)
      `)
      .eq('id_aula_curso', idCurso)
      .eq('activo', true)

    if (inscError) {
      throw inscError
    }

    if (!inscripciones || inscripciones.length === 0) {
      return []
    }

    // Para cada usuario, calcular su progreso
    const companeros = await Promise.all(
      inscripciones.map(async (insc) => {
        const progreso = await calcularProgresoUsuario(insc.id_usuario, idCurso)

        return {
          idUsuario: insc.usuario.id_usuario,
          nombres: insc.usuario.nombres,
          apellidos: insc.usuario.apellidos,
          correo: insc.usuario.correo,
          progreso: progreso.porcentaje,
          completado: progreso.completado,
        }
      })
    )

    return companeros

  } catch (error) {
    console.error('Error getting course companions:', error)
    throw error
  }
}

export async function getMisInscripciones(idUsuario: number): Promise<MisInscripciones[]> {
  try {
    const { data, error } = await supabase
      .from('aula_inscripcion')
      .select(`
        id_aula_inscripcion,
        inscrito_en,
        activo,
        aula_curso:aula_curso(
          id_aula_curso,
          titulo,
          descripcion,
          ministerio:ministerio(nombre)
        )
      `)
      .eq('id_usuario', idUsuario)
      .eq('activo', true)
      .order('inscrito_en', { ascending: false })

    if (error) {
      throw error
    }

    return data?.map(insc => ({
      idAulaInscripcion: insc.id_aula_inscripcion,
      idAulaCurso: insc.aula_curso.id_aula_curso,
      tituloCurso: insc.aula_curso.titulo,
      descripcionCurso: insc.aula_curso.descripcion,
      ministerio: insc.aula_curso.ministerio?.nombre || 'Sin ministerio',
      inscritoEn: insc.inscrito_en,
      activo: insc.activo,
    })) || []

  } catch (error) {
    console.error('Error getting user enrollments:', error)
    throw error
  }
}

// Función auxiliar para calcular progreso de usuario
async function calcularProgresoUsuario(idUsuario: number, idCurso: number): Promise<{ porcentaje: number; completado: boolean }> {
  try {
    // Obtener todas las actividades del curso
    const { data: actividades, error: actError } = await supabase
      .from('aula_actividad')
      .select('id')
      .eq('id_aula_modulo', await getModuloIdFromCurso(idCurso))

    if (actError) {
      throw actError
    }

    if (!actividades || actividades.length === 0) {
      return { porcentaje: 0, completado: false }
    }

    // Obtener actividades completadas por el usuario
    const { data: completadas, error: compError } = await supabase
      .from('aula_progreso_actividad')
      .select('id')
      .eq('id_usuario', idUsuario)
      .in('id_aula_actividad', actividades.map(a => a.id))
      .not('completada_en', 'is', null)

    if (compError) {
      throw compError
    }

    const totalActividades = actividades.length
    const actividadesCompletadas = completadas?.length || 0
    const porcentaje = totalActividades > 0 ? Math.round((actividadesCompletadas / totalActividades) * 100) : 0
    const completado = porcentaje === 100

    return { porcentaje, completado }

  } catch (error) {
    console.error('Error calculating user progress:', error)
    return { porcentaje: 0, completado: false }
  }
}

// Función auxiliar para obtener módulos del curso
async function getModuloIdFromCurso(idCurso: number): Promise<number> {
  // Esta es una simplificación - en un sistema real, un curso puede tener múltiples módulos
  const { data, error } = await supabase
    .from('aula_modulo')
    .select('id_aula_modulo')
    .eq('id_aula_curso', idCurso)
    .limit(1)
    .single()

  if (error) {
    throw error
  }

  return data?.id_aula_modulo || 0
}