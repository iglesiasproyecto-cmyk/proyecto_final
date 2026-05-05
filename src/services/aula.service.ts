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