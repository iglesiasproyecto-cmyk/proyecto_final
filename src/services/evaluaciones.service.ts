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

// Submit evaluation attempt via RPC
export async function registrarIntentoEvaluacion(
  idAulaEvaluacion: number,
  idUsuario: number,
  respuestas: Record<string, string>
) {
  const { data, error } = await supabase.rpc('registrar_intento_evaluacion', {
    p_id_aula_evaluacion: idAulaEvaluacion,
    p_id_usuario: idUsuario,
    p_respuestas: respuestas
  })

  if (error) throw error
  return data
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

// Get correct answers after submission (show only after finalizado_en)
export async function obtenerRespuestasCorrectasEvaluacion(
  idAulaEvaluacion: number
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('aula_pregunta')
    .select(`
      id_aula_pregunta,
      opciones:aula_opcion(
        id_aula_opcion,
        es_correcta
      )
    `)
    .eq('id_aula_evaluacion', idAulaEvaluacion)

  if (error) throw error

  const respuestasCorrectas: Record<string, number> = {}
  data?.forEach((pregunta: any) => {
    const opcionCorrecta = pregunta.opciones?.find((o: any) => o.es_correcta)
    if (opcionCorrecta) {
      respuestasCorrectas[pregunta.id_aula_pregunta] = opcionCorrecta.id_aula_opcion
    }
  })

  return respuestasCorrectas
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
