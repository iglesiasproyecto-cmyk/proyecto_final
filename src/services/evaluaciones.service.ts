import { supabase } from '@/lib/supabaseClient'

// ============ EVALUACIONES ============

export async function getEvaluacionesByCurso(idCurso: number) {
  const { data, error } = await supabase
    .from('aula_evaluacion')
    .select('*')
    .eq('id_aula_modulo', idCurso) // Assuming idCurso refers to modulo
    .order('orden')

  if (error) throw error
  return data || []
}

export async function createEvaluacion(evaluacion: any) {
  const { data, error } = await supabase
    .from('aula_evaluacion')
    .insert([{
      titulo: evaluacion.titulo,
      descripcion: evaluacion.descripcion,
      id_aula_modulo: evaluacion.idModulo,
      estado: 'borrador',
      orden: evaluacion.orden || 1
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEvaluacion(id: number, evaluacion: any) {
  const { data, error } = await supabase
    .from('aula_evaluacion')
    .update({
      titulo: evaluacion.titulo,
      descripcion: evaluacion.descripcion,
      estado: evaluacion.estado,
      orden: evaluacion.orden
    })
    .eq('id_aula_evaluacion', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteEvaluacion(id: number) {
  const { error } = await supabase
    .from('aula_evaluacion')
    .update({ activo: false })
    .eq('id_aula_evaluacion', id)

  if (error) throw error
}

// ============ PREGUNTAS ============

export async function obtenerPreguntasPorEvaluacion(idEvaluacion: number) {
  const { data, error } = await supabase
    .from('aula_pregunta')
    .select(`
      *,
      opciones:aula_opcion(*)
    `)
    .eq('id_aula_evaluacion', idEvaluacion)
    .order('orden')

  if (error) throw error
  return data || []
}

export async function obtenerPregunta(idPregunta: number) {
  const { data, error } = await supabase
    .from('aula_pregunta')
    .select(`
      *,
      opciones:aula_opcion(*)
    `)
    .eq('id_aula_pregunta', idPregunta)
    .single()

  if (error) throw error
  return data
}

export async function crearPregunta(data: {
  idEvaluacion: number
  pregunta: string
  tipoPregunta: string
  opciones?: any[]
  respuestaCorrecta?: string
  orden?: number
}) {
  const { data: pregunta, error: preguntaError } = await supabase
    .from('aula_pregunta')
    .insert([{
      id_aula_evaluacion: data.idEvaluacion,
      pregunta: data.pregunta,
      tipo_pregunta: data.tipoPregunta,
      opciones: data.opciones || null,
      respuesta_correcta: data.respuestaCorrecta || null,
      orden: data.orden || 1
    }])
    .select()
    .single()

  if (preguntaError) throw preguntaError
  return pregunta
}

export async function actualizarPregunta(idPregunta: number, data: any) {
  const { data: pregunta, error } = await supabase
    .from('aula_pregunta')
    .update({
      pregunta: data.pregunta,
      tipo_pregunta: data.tipoPregunta,
      opciones: data.opciones,
      respuesta_correcta: data.respuestaCorrecta,
      orden: data.orden
    })
    .eq('id_aula_pregunta', idPregunta)
    .select()
    .single()

  if (error) throw error
  return pregunta
}

export async function eliminarPregunta(idPregunta: number) {
  const { error } = await supabase
    .from('aula_pregunta')
    .delete()
    .eq('id_aula_pregunta', idPregunta)

  if (error) throw error
}

// ============ OPCIONES ============

export async function crearOpcion(data: {
  idPregunta: number
  opcion: string
  esCorrecta?: boolean
  orden?: number
}) {
  const { data: opcion, error } = await supabase
    .from('aula_opcion')
    .insert([{
      id_aula_pregunta: data.idPregunta,
      opcion: data.opcion,
      es_correcta: data.esCorrecta || false,
      orden: data.orden || 1
    }])
    .select()
    .single()

  if (error) throw error
  return opcion
}

export async function actualizarOpcion(idOpcion: number, data: any) {
  const { data: opcion, error } = await supabase
    .from('aula_opcion')
    .update({
      opcion: data.opcion,
      es_correcta: data.esCorrecta,
      orden: data.orden
    })
    .eq('id_aula_opcion', idOpcion)
    .select()
    .single()

  if (error) throw error
  return opcion
}

export async function eliminarOpcion(idOpcion: number) {
  const { error } = await supabase
    .from('aula_opcion')
    .delete()
    .eq('id_aula_opcion', idOpcion)

  if (error) throw error
}

// ============ INTENTOS Y RESPUESTAS ============

export async function iniciarIntento(data: {
  idUsuario: number
  idEvaluacion: number
  idDetalleProceso?: number
}) {
  const { data: intento, error } = await supabase
    .from('aula_intento_evaluacion')
    .insert([{
      id_usuario: data.idUsuario,
      id_aula_evaluacion: data.idEvaluacion,
      estado: 'en_progreso',
      numero_intento: 1, // TODO: Calculate actual attempt number
      iniciado_en: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) throw error
  return intento
}

export async function registrarRespuesta(data: {
  idIntento: number
  idPregunta: number
  idOpcion?: number
  respuestaTexto?: string
}) {
  const { data: respuesta, error } = await supabase
    .from('aula_respuesta')
    .insert([{
      id_aula_intento_evaluacion: data.idIntento,
      id_aula_pregunta: data.idPregunta,
      id_aula_opcion: data.idOpcion || null,
      respuesta_texto: data.respuestaTexto || null
    }])
    .select()
    .single()

  if (error) throw error
  return respuesta
}

export async function obtenerRespuestasDelIntento(idIntento: number) {
  const { data, error } = await supabase
    .from('aula_respuesta')
    .select(`
      *,
      pregunta:aula_pregunta(pregunta, tipo_pregunta),
      opcion:aula_opcion(opcion, es_correcta)
    `)
    .eq('id_aula_intento_evaluacion', idIntento)

  if (error) throw error
  return data || []
}

export async function actualizarRespuesta(idRespuesta: number, data: any) {
  const { data: respuesta, error } = await supabase
    .from('aula_respuesta')
    .update({
      id_aula_opcion: data.idOpcion,
      respuesta_texto: data.respuestaTexto
    })
    .eq('id_aula_respuesta', idRespuesta)
    .select()
    .single()

  if (error) throw error
  return respuesta
}