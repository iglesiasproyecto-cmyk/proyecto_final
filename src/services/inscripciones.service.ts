import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

type EnrollmentCandidate = {
  idUsuario: number
  nombres: string
  apellidos: string
  correo: string
  telefono: string | null
  ministerioNombre: string
  puedeInscribirse: boolean
  razonNoPuede?: string
}

type EnrollmentResult = {
  exito: boolean
  mensaje: string
  idDetalleProceso?: number
}

type CompaneroCiclo = {
  idUsuario: number
  nombre: string
  correo: string
  ministerioNombre: string
  fechaInscripcion: string
  progreso: number
}

type MiInscripcion = {
  idDetalleProceso: number
  idProceso: number
  tituloProceso: string
  descripcionProceso: string
  estado: string
  fechaInscripcion: string
  progreso: number
  completado: boolean
}

// Get users that can be enrolled in a cycle
export async function getEnrollmentCandidates(
  idCiclo: number,
  overrideMinisterio: boolean
): Promise<EnrollmentCandidate[]> {
  // Get cycle details to understand enrollment criteria
  const { data: ciclo } = await supabase
    .from('proceso')
    .select('id_ministerio, titulo')
    .eq('id_proceso', idCiclo)
    .single()

  if (!ciclo) throw new Error('Ciclo no encontrado')

  // Get all active users
  const { data: usuarios, error } = await supabase
    .from('usuario')
    .select(`
      id_usuario,
      nombres,
      apellidos,
      correo,
      telefono,
      ministerio:miembro_ministerio!inner(
        ministerio:ministerio(nombre)
      )
    `)
    .eq('activo', true)
    .order('nombres')

  if (error) throw error

  // Check enrollment status for each user
  const candidates = await Promise.all(
    (usuarios || []).map(async (usuario: any) => {
      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('detalle_proceso_curso')
        .select('id_detalle_proceso_curso')
        .eq('id_proceso', idCiclo)
        .eq('id_usuario', usuario.id_usuario)
        .eq('activo', true)
        .single()

      const ministerioNombre = usuario.ministerio?.[0]?.ministerio?.nombre || 'Sin ministerio'
      const perteneceAMinisterio = usuario.ministerio?.some((m: any) => m.id_ministerio === ciclo.id_ministerio) || false

      let puedeInscribirse = !existingEnrollment
      let razonNoPuede: string | undefined

      if (existingEnrollment) {
        razonNoPuede = 'Ya está inscrito en este ciclo'
      } else if (!overrideMinisterio && !perteneceAMinisterio) {
        puedeInscribirse = false
        razonNoPuede = `No pertenece al ministerio ${ciclo.titulo}`
      }

      return {
        idUsuario: usuario.id_usuario,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        telefono: usuario.telefono,
        ministerioNombre,
        puedeInscribirse,
        razonNoPuede,
      }
    })
  )

  return candidates
}

// Enroll multiple users in a cycle
export async function enrollUsers(
  idCiclo: number,
  userIds: number[],
  overrideMinisterio: boolean
): Promise<EnrollmentResult[]> {
  const results: EnrollmentResult[] = []

  for (const userId of userIds) {
    try {
      // Check if already enrolled
      const { data: existing } = await supabase
        .from('detalle_proceso_curso')
        .select('id_detalle_proceso_curso')
        .eq('id_proceso', idCiclo)
        .eq('id_usuario', userId)
        .single()

      if (existing) {
        results.push({
          exito: false,
          mensaje: 'Usuario ya está inscrito en este ciclo',
        })
        continue
      }

      // Check ministry requirement if not overriding
      if (!overrideMinisterio) {
        const { data: ciclo } = await supabase
          .from('proceso')
          .select('id_ministerio')
          .eq('id_proceso', idCiclo)
          .single()

        if (ciclo?.id_ministerio) {
          const { data: membership } = await supabase
            .from('miembro_ministerio')
            .select('id_miembro_ministerio')
            .eq('id_usuario', userId)
            .eq('id_ministerio', ciclo.id_ministerio)
            .eq('fecha_salida', null)
            .single()

          if (!membership) {
            results.push({
              exito: false,
              mensaje: 'Usuario no pertenece al ministerio requerido',
            })
            continue
          }
        }
      }

      // Create enrollment
      const { data: enrollment, error } = await supabase
        .from('detalle_proceso_curso')
        .insert({
          id_proceso: idCiclo,
          id_usuario: userId,
          activo: true,
        })
        .select('id_detalle_proceso_curso')
        .single()

      if (error) {
        results.push({
          exito: false,
          mensaje: `Error al inscribir: ${error.message}`,
        })
      } else {
        results.push({
          exito: true,
          mensaje: 'Inscripción exitosa',
          idDetalleProceso: enrollment.id_detalle_proceso_curso,
        })
      }
    } catch (error: any) {
      results.push({
        exito: false,
        mensaje: `Error inesperado: ${error.message}`,
      })
    }
  }

  return results
}

// Withdraw/deactivate an enrollment
export async function retirarInscripcion(idDetalleProceso: number): Promise<void> {
  const { error } = await supabase
    .from('detalle_proceso_curso')
    .update({ activo: false })
    .eq('id_detalle_proceso_curso', idDetalleProceso)

  if (error) throw error
}

// Reactivate an enrollment
export async function reactivarInscripcion(idDetalleProceso: number): Promise<void> {
  const { error } = await supabase
    .from('detalle_proceso_curso')
    .update({ activo: true })
    .eq('id_detalle_proceso_curso', idDetalleProceso)

  if (error) throw error
}

// Get companions/classmates in a cycle
export async function getCompanerosCiclo(idCiclo: number): Promise<CompaneroCiclo[]> {
  const { data, error } = await supabase
    .from('detalle_proceso_curso')
    .select(`
      id_usuario,
      inscrito_en,
      usuario:usuario(
        id_usuario,
        nombres,
        apellidos,
        correo
      ),
      ministerio:miembro_ministerio!inner(
        ministerio:ministerio(nombre)
      )
    `)
    .eq('id_proceso', idCiclo)
    .eq('activo', true)

  if (error) throw error

  // Calculate progress for each companion
  const companeros = await Promise.all(
    (data || []).map(async (item: any) => {
      // Get progress calculation (simplified - you might want to use the actual progress logic)
      const progreso = 0 // TODO: Implement actual progress calculation

      return {
        idUsuario: item.usuario.id_usuario,
        nombre: `${item.usuario.nombres} ${item.usuario.apellidos}`,
        correo: item.usuario.correo,
        ministerioNombre: item.ministerio?.[0]?.ministerio?.nombre || 'Sin ministerio',
        fechaInscripcion: item.inscrito_en,
        progreso,
      }
    })
  )

  return companeros
}

// Get user's enrollments
export async function getMisInscripciones(idUsuario: number): Promise<MiInscripcion[]> {
  const { data, error } = await supabase
    .from('detalle_proceso_curso')
    .select(`
      id_detalle_proceso_curso,
      inscrito_en,
      proceso:proceso(
        id_proceso,
        titulo,
        descripcion,
        estado
      )
    `)
    .eq('id_usuario', idUsuario)
    .eq('activo', true)
    .order('inscrito_en', { ascending: false })

  if (error) throw error

  // Calculate progress for each enrollment
  const inscripciones = await Promise.all(
    (data || []).map(async (item: any) => {
      // Get progress calculation (simplified - you might want to use the actual progress logic)
      const progreso = 0 // TODO: Implement actual progress calculation

      return {
        idDetalleProceso: item.id_detalle_proceso_curso,
        idProceso: item.proceso.id_proceso,
        tituloProceso: item.proceso.titulo,
        descripcionProceso: item.proceso.descripcion,
        estado: item.proceso.estado,
        fechaInscripcion: item.inscrito_en,
        progreso,
        completado: progreso === 100,
      }
    })
  )

  return inscripciones
}