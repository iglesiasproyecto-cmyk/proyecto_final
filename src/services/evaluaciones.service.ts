import { supabase } from '@/lib/supabaseClient'

export interface Pregunta {
  id_aula_pregunta: number
  enunciado: string
  tipo: 'multiple_choice' | 'verdadero_falso'
  orden: number
  opciones: Opcion[]
}

export interface Opcion {
  id_aula_opcion: number
  texto: string
  orden: number
  // es_correcta is NOT sent to client before submission
}

export interface Evaluacion {
  id_aula_evaluacion: number
  id_aula_modulo: number
  titulo: string
  descripcion: string | null
  puntaje_minimo: number
  reintentos_permitidos: boolean
  max_intentos: number | null
  preguntas: Pregunta[]
  orden: number
}

export interface IntentoEvaluacion {
  id_aula_intento_evaluacion: number
  numero_intento: number
  puntaje_obtenido: number
  aprobado: boolean
  finalizado_en: string
}

// Fetch evaluation + questions + options (without correct answers shown)
export async function obtenerEvaluacionModulo(idModulo: number): Promise<Evaluacion | null> {
  const { data, error } = await supabase
    .from('aula_evaluacion')
    .select(`
      id_aula_evaluacion,
      id_aula_modulo,
      titulo,
      descripcion,
      puntaje_minimo,
      reintentos_permitidos,
      max_intentos,
      orden,
      preguntas:aula_pregunta(
        id_aula_pregunta,
        enunciado,
        tipo,
        orden,
        opciones:aula_opcion(
          id_aula_opcion,
          texto,
          orden
        )
      )
    `)
    .eq('id_aula_modulo', idModulo)
    .single()

  if (error) throw error
  if (!data) return null

  // Sort preguntas and opciones by orden
  const preguntas = (data.preguntas || [])
    .sort((a: any, b: any) => a.orden - b.orden)
    .map((p: any) => ({
      ...p,
      opciones: (p.opciones || []).sort((a: any, b: any) => a.orden - b.orden)
    }))

  return {
    id_aula_evaluacion: data.id_aula_evaluacion,
    id_aula_modulo: data.id_aula_modulo,
    titulo: data.titulo,
    descripcion: data.descripcion,
    puntaje_minimo: data.puntaje_minimo,
    reintentos_permitidos: data.reintentos_permitidos,
    max_intentos: data.max_intentos,
    orden: data.orden,
    preguntas
  }
}

// Submit evaluation attempt:
//   1) INSERT aula_intento_evaluacion (draft)
//   2) INSERT aula_respuesta for each answer
//   3) Call finalizar_intento_evaluacion() — SECURITY DEFINER, calculates score server-side
export async function registrarIntentoEvaluacion(
  idAulaEvaluacion: number,
  idUsuario: number,
  respuestas: Record<string, string>   // { idPregunta: idOpcion }
): Promise<{ puntaje: number; aprobado: boolean; correctas: number; total: number; puntaje_min: number }> {
  // Determine attempt number
  const { data: prevAttempts, error: cntErr } = await supabase
    .from('aula_intento_evaluacion')
    .select('id_aula_intento_evaluacion', { count: 'exact', head: false })
    .eq('id_aula_evaluacion', idAulaEvaluacion)
    .eq('id_usuario', idUsuario)
  if (cntErr) throw cntErr
  const numeroIntento = (prevAttempts?.length ?? 0) + 1

  // Create draft attempt
  const { data: intento, error: intentoErr } = await supabase
    .from('aula_intento_evaluacion')
    .insert({
      id_usuario: idUsuario,
      id_aula_evaluacion: idAulaEvaluacion,
      puntaje_obtenido: 0,
      aprobado: false,
      numero_intento: numeroIntento,
    })
    .select('id_aula_intento_evaluacion')
    .single()
  if (intentoErr) throw intentoErr

  const idIntento = intento.id_aula_intento_evaluacion

  // Insert one row per answered question
  const rows = Object.entries(respuestas)
    .filter(([, val]) => val !== '')
    .map(([idPregunta, idOpcion]) => ({
      id_aula_intento_evaluacion: idIntento,
      id_aula_pregunta: Number(idPregunta),
      id_aula_opcion: Number(idOpcion),
    }))

  if (rows.length > 0) {
    const { error: respErr } = await supabase.from('aula_respuesta').insert(rows)
    if (respErr) throw respErr
  }

  // Score calculation is done server-side via SECURITY DEFINER function
  const { data: resultado, error: finErr } = await supabase
    .rpc('finalizar_intento_evaluacion', { p_id_intento: idIntento })
  if (finErr) throw finErr

  const r = resultado as { puntaje: number; aprobado: boolean; correctas: number; total: number; puntaje_min: number }
  return {
    id_intento: idIntento,
    numero_intento: numeroIntento,
    puntaje_obtenido: r.puntaje,
    aprobado: r.aprobado,
    correctas: r.correctas,
    total: r.total,
    puntaje_minimo: r.puntaje_min,
  }
}

// Get user's previous attempts
export async function obtenerIntentosUsuario(
  idAulaEvaluacion: number,
  idUsuario: number
): Promise<IntentoEvaluacion[]> {
  const { data, error } = await supabase
    .from('aula_intento_evaluacion')
    .select('*')
    .eq('id_aula_evaluacion', idAulaEvaluacion)
    .eq('id_usuario', idUsuario)
    .order('numero_intento', { ascending: false })

  if (error) throw error
  return data || []
}

// Get which of the student's answers were correct, per question.
// Uses aula_respuesta.es_correcta (set server-side by finalizar_intento_evaluacion)
// so es_correcta from aula_opcion is never sent to the client.
export async function obtenerRespuestasCorrectasEvaluacion(
  idIntento: number
): Promise<Record<number, boolean>> {
  const { data, error } = await supabase
    .from('aula_respuesta')
    .select('id_aula_pregunta, id_aula_opcion, es_correcta')
    .eq('id_aula_intento_evaluacion', idIntento)

  if (error) throw error

  const resultado: Record<number, boolean> = {}
  data?.forEach((r: any) => {
    if (r.id_aula_pregunta != null) {
      resultado[r.id_aula_pregunta] = r.es_correcta ?? false
    }
  })
  return resultado
}

// Get user certificates
export async function obtenerCertificadosUsuario(
  idUsuario: number
): Promise<any[]> {
  const { data, error } = await supabase
    .from('aula_certificado')
    .select(`
      id_aula_certificado,
      numero_certificado,
      emitido_en,
      fecha_certificacion,
      aula_curso:aula_curso(
        id_aula_curso,
        titulo,
        ministerio:ministerio(nombre)
      )
    `)
    .eq('id_usuario', idUsuario)
    .order('emitido_en', { ascending: false })

  if (error) throw error
  return data || []
}

// Emit certificate if all evaluations passed
export async function emitirCertificadoSiCorresponde(
  idUsuario: number,
  idAulaCurso: number
) {
  const { data, error } = await supabase.rpc('emitir_certificado_si_corresponde', {
    p_id_usuario: idUsuario,
    p_id_aula_curso: idAulaCurso
  })

  if (error) throw error
  return data
}
