import { supabase } from '@/lib/supabaseClient'
import type {
  Pregunta,
  OpcionRespuesta,
  RespuestaEvaluacion,
  EvaluacionIntento,
  EvaluacionConPreguntas,
  PreguntaConOpciones,
  ResultadoEvaluacion
} from '@/types/app.types'

// ============ PREGUNTAS ============

export async function crearPregunta(data: {
  idEvaluacion: number
  titulo: string
  descripcion?: string
  tipo: 'multiple_choice' | 'verdadero_falso' | 'abierta'
  orden: number
}): Promise<Pregunta> {
  const { data: newRow, error } = await supabase
    .from('pregunta')
    .insert([{
      id_evaluacion: data.idEvaluacion,
      titulo: data.titulo,
      descripcion: data.descripcion,
      tipo: data.tipo,
      orden: data.orden,
      activo: true
    }])
    .select()
    .single()

  if (error) throw error
  return mapPregunta(newRow)
}

export async function obtenerPreguntasPorEvaluacion(idEvaluacion: number): Promise<PreguntaConOpciones[]> {
  const { data, error } = await supabase
    .from('pregunta')
    .select(`
      *,
      opcion_respuesta(*)
    `)
    .eq('id_evaluacion', idEvaluacion)
    .eq('activo', true)
    .order('orden', { ascending: true })

  if (error) throw error
  return (data as any[]).map(p => ({
    pregunta: mapPregunta(p),
    opciones: (p.opcion_respuesta || []).map(mapOpcionRespuesta)
  }))
}

export async function obtenerPregunta(idPregunta: number): Promise<PreguntaConOpciones> {
  const { data, error } = await supabase
    .from('pregunta')
    .select(`
      *,
      opcion_respuesta(*)
    `)
    .eq('id_pregunta', idPregunta)
    .single()

  if (error) throw error
  return {
    pregunta: mapPregunta(data),
    opciones: (data.opcion_respuesta || []).map(mapOpcionRespuesta)
  }
}

export async function actualizarPregunta(
  idPregunta: number,
  data: Partial<Pregunta>
): Promise<Pregunta> {
  const { data: updated, error } = await supabase
    .from('pregunta')
    .update({
      titulo: data.titulo,
      descripcion: data.descripcion,
      tipo: data.tipo
    })
    .eq('id_pregunta', idPregunta)
    .select()
    .single()

  if (error) throw error
  return mapPregunta(updated)
}

export async function eliminarPregunta(idPregunta: number): Promise<void> {
  const { error } = await supabase
    .from('pregunta')
    .delete()
    .eq('id_pregunta', idPregunta)

  if (error) throw error
}

// ============ OPCIONES RESPUESTA ============

export async function crearOpcion(data: {
  idPregunta: number
  textoOpcion: string
  esCorrecta: boolean
  puntos: number
  orden: number
}): Promise<OpcionRespuesta> {
  const { data: newRow, error } = await supabase
    .from('opcion_respuesta')
    .insert([{
      id_pregunta: data.idPregunta,
      texto_opcion: data.textoOpcion,
      es_correcta: data.esCorrecta,
      puntos: data.puntos,
      orden: data.orden
    }])
    .select()
    .single()

  if (error) throw error
  return mapOpcionRespuesta(newRow)
}

export async function actualizarOpcion(
  idOpcion: number,
  data: Partial<OpcionRespuesta>
): Promise<OpcionRespuesta> {
  const { data: updated, error } = await supabase
    .from('opcion_respuesta')
    .update({
      texto_opcion: data.textoOpcion,
      es_correcta: data.esCorrecta,
      puntos: data.puntos
    })
    .eq('id_opcion', idOpcion)
    .select()
    .single()

  if (error) throw error
  return mapOpcionRespuesta(updated)
}

export async function eliminarOpcion(idOpcion: number): Promise<void> {
  const { error } = await supabase
    .from('opcion_respuesta')
    .delete()
    .eq('id_opcion', idOpcion)

  if (error) throw error
}

// ============ RESPUESTAS ============

export async function registrarRespuesta(data: {
  idIntento: number
  idPregunta: number
  idOpcionSelected: number
}): Promise<RespuestaEvaluacion> {
  // Obtener puntos de la opción seleccionada
  const { data: opcion, error: errorOpcion } = await supabase
    .from('opcion_respuesta')
    .select('puntos')
    .eq('id_opcion', data.idOpcionSelected)
    .single()

  if (errorOpcion) throw errorOpcion

  const { data: newRow, error } = await supabase
    .from('respuesta_evaluacion')
    .insert([{
      id_intento: data.idIntento,
      id_pregunta: data.idPregunta,
      id_opcion_selected: data.idOpcionSelected,
      puntos_obtenidos: opcion.puntos
    }])
    .select()
    .single()

  if (error) throw error
  return mapRespuestaEvaluacion(newRow)
}

export async function obtenerRespuestasDelIntento(
  idIntento: number
): Promise<RespuestaEvaluacion[]> {
  const { data, error } = await supabase
    .from('respuesta_evaluacion')
    .select('*')
    .eq('id_intento', idIntento)

  if (error) throw error
  return (data || []).map(mapRespuestaEvaluacion)
}

export async function actualizarRespuesta(
  idRespuesta: number,
  data: Partial<RespuestaEvaluacion>
): Promise<RespuestaEvaluacion> {
  const { data: updated, error } = await supabase
    .from('respuesta_evaluacion')
    .update({
      id_opcion_selected: data.idOpcionSelected,
      puntos_obtenidos: data.puntosObtenidos
    })
    .eq('id_respuesta', idRespuesta)
    .select()
    .single()

  if (error) throw error
  return mapRespuestaEvaluacion(updated)
}

// ============ INTENTOS ============

export async function iniciarIntento(data: {
  idEvaluacion: number
  idUsuario: number
  numeroIntento: number
}): Promise<EvaluacionIntento> {
  const { data: newRow, error } = await supabase
    .from('evaluacion_intento')
    .insert([{
      id_evaluacion: data.idEvaluacion,
      id_usuario: data.idUsuario,
      numero_intento: data.numeroIntento,
      estado: 'en_progreso'
    }])
    .select()
    .single()

  if (error) throw error
  return mapEvaluacionIntento(newRow)
}

export async function finalizarIntento(data: {
  idIntento: number
  puntajeTotal: number
  puntajeMaximo: number
  tiempoDuracion: number
}): Promise<EvaluacionIntento> {
  const porcentaje = (data.puntajeTotal / data.puntajeMaximo) * 100

  const { data: updated, error } = await supabase
    .from('evaluacion_intento')
    .update({
      fecha_fin: new Date().toISOString(),
      estado: 'completado',
      puntaje_total: data.puntajeTotal,
      puntaje_maximo: data.puntajeMaximo,
      porcentaje: porcentaje,
      tiempo_duracion: data.tiempoDuracion
    })
    .eq('id_intento', data.idIntento)
    .select()
    .single()

  if (error) throw error

  return mapEvaluacionIntento(updated)
}

export async function abandonarIntento(idIntento: number): Promise<EvaluacionIntento> {
  const { data: updated, error } = await supabase
    .from('evaluacion_intento')
    .update({
      estado: 'abandonado'
    })
    .eq('id_intento', idIntento)
    .select()
    .single()

  if (error) throw error
  return mapEvaluacionIntento(updated)
}

export async function obtenerResultadoIntento(idIntento: number): Promise<ResultadoEvaluacion> {
  // Obtener intento
  const { data: intento, error: errorIntento } = await supabase
    .from('evaluacion_intento')
    .select('*')
    .eq('id_intento', idIntento)
    .single()

  if (errorIntento) throw errorIntento

  // Obtener respuestas del intento
  const { data: respuestas, error: errorRespuestas } = await supabase
    .from('respuesta_evaluacion')
    .select('*')
    .eq('id_intento', idIntento)

  if (errorRespuestas) throw errorRespuestas

  const respondidas = (respuestas || []).filter(r => r.id_opcion_selected).length
  const correctas = (respuestas || []).filter(r => r.puntos_obtenidos > 0).length

  return {
    intento: mapEvaluacionIntento(intento),
    respuestas: (respuestas || []).map(mapRespuestaEvaluacion),
    detalles: {
      totalPreguntas: (respuestas || []).length,
      respondidas,
      correctas,
      puntajeObtenido: intento.puntaje_total || 0,
      puntajeMaximo: intento.puntaje_maximo || 0,
      porcentaje: intento.porcentaje || 0
    }
  }
}

export async function obtenerIntentosUsuario(
  idUsuario: number,
  idEvaluacion: number
): Promise<EvaluacionIntento[]> {
  const { data, error } = await supabase
    .from('evaluacion_intento')
    .select('*')
    .eq('id_usuario', idUsuario)
    .eq('id_evaluacion', idEvaluacion)
    .order('numero_intento', { ascending: true })

  if (error) throw error
  return (data || []).map(mapEvaluacionIntento)
}

// ============ MAPEOS ============

function mapPregunta(r: any): Pregunta {
  return {
    idPregunta: r.id_pregunta,
    idEvaluacion: r.id_evaluacion,
    titulo: r.titulo,
    descripcion: r.descripcion,
    tipo: r.tipo,
    orden: r.orden,
    activo: r.activo,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at
  }
}

function mapOpcionRespuesta(r: any): OpcionRespuesta {
  return {
    idOpcion: r.id_opcion,
    idPregunta: r.id_pregunta,
    textoOpcion: r.texto_opcion,
    esCorrecta: r.es_correcta,
    puntos: r.puntos,
    orden: r.orden,
    creadoEn: r.creado_en,
    actualizadoEn: r.updated_at
  }
}

function mapRespuestaEvaluacion(r: any): RespuestaEvaluacion {
  return {
    idRespuesta: r.id_respuesta,
    idPregunta: r.id_pregunta,
    idIntento: r.id_intento,
    idOpcionSelected: r.id_opcion_selected,
    puntosObtenidos: r.puntos_obtenidos,
    respondidoEn: r.respondido_en,
    creadoEn: r.creado_en
  }
}

function mapEvaluacionIntento(r: any): EvaluacionIntento {
  return {
    idIntento: r.id_intento,
    idEvaluacion: r.id_evaluacion,
    idUsuario: r.id_usuario,
    numeroIntento: r.numero_intento,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    estado: r.estado,
    puntajeTotal: r.puntaje_total,
    puntajeMaximo: r.puntaje_maximo,
    porcentaje: r.porcentaje,
    tiempoDuracion: r.tiempo_duracion,
    creadoEn: r.creado_en
  }
}
