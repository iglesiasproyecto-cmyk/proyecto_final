-- ================================================
-- LIMPIEZA COMPLETA DEL SISTEMA IGLESIABD
-- Script actualizado con TODAS las tablas existentes
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ================================================

-- IMPORTANTE: Ejecutar en el orden correcto para evitar problemas de foreign keys

-- 1. ELIMINAR DATOS DE EVALUACIONES Y RESPUESTAS
DELETE FROM public.respuesta_evaluacion;
DELETE FROM public.evaluacion_intento;
DELETE FROM public.opcion_respuesta;
DELETE FROM public.pregunta;
DELETE FROM public.evaluacion;
DELETE FROM public.resultado_evaluacion;

-- 2. ELIMINAR RECURSOS Y MÓDULOS DE CURSOS
DELETE FROM public.recurso;
DELETE FROM public.avance_modulo;
DELETE FROM public.modulo;

-- 3. ELIMINAR PROCESOS Y DETALLES DE CURSOS
DELETE FROM public.detalle_proceso_curso;
DELETE FROM public.proceso_asignado_curso;

-- 4. ELIMINAR CURSOS
DELETE FROM public.curso;

-- 5. ELIMINAR TAREAS Y ASIGNACIONES
DELETE FROM public.tarea_asignada;
DELETE FROM public.tarea;

-- 6. ELIMINAR EVENTOS
DELETE FROM public.evento;

-- 7. ELIMINAR MIEMBROS DE MINISTERIOS
DELETE FROM public.miembro_ministerio;

-- 8. ELIMINAR MINISTERIOS
DELETE FROM public.ministerio;

-- 9. ELIMINAR NOTIFICACIONES
DELETE FROM public.notificacion;

-- 10. ELIMINAR SEDES Y ASIGNACIONES DE PASTORES
DELETE FROM public.sede_pastor;
DELETE FROM public.sede;

-- 11. ELIMINAR IGLESIAS Y ASIGNACIONES DE PASTORES
DELETE FROM public.iglesia_pastor;
DELETE FROM public.iglesia;

-- 12. ELIMINAR PASTORES
DELETE FROM public.pastor;

-- 13. ELIMINAR USUARIOS Y ROLES
DELETE FROM public.usuario_rol;
DELETE FROM public.usuario;

-- ================================================
-- VERIFICACIÓN DE LIMPIEZA COMPLETA
-- ================================================

SELECT '✅ VERIFICACIÓN FINAL DE LIMPIEZA:' as status;
SELECT
  'iglesia' as tabla, COUNT(*) as registros FROM iglesia
  UNION ALL
  SELECT 'sede', COUNT(*) FROM sede
  UNION ALL
  SELECT 'pastor', COUNT(*) FROM pastor
  UNION ALL
  SELECT 'usuario', COUNT(*) FROM usuario
  UNION ALL
  SELECT 'usuario_rol', COUNT(*) FROM usuario_rol
  UNION ALL
  SELECT 'ministerio', COUNT(*) FROM ministerio
  UNION ALL
  SELECT 'miembro_ministerio', COUNT(*) FROM miembro_ministerio
  UNION ALL
  SELECT 'evento', COUNT(*) FROM evento
  UNION ALL
  SELECT 'tarea', COUNT(*) FROM tarea
  UNION ALL
  SELECT 'tarea_asignada', COUNT(*) FROM tarea_asignada
  UNION ALL
  SELECT 'notificacion', COUNT(*) FROM notificacion
  UNION ALL
  SELECT 'curso', COUNT(*) FROM curso
  UNION ALL
  SELECT 'modulo', COUNT(*) FROM modulo
  UNION ALL
  SELECT 'recurso', COUNT(*) FROM recurso
  UNION ALL
  SELECT 'proceso_asignado_curso', COUNT(*) FROM proceso_asignado_curso
  UNION ALL
  SELECT 'detalle_proceso_curso', COUNT(*) FROM detalle_proceso_curso
  UNION ALL
  SELECT 'avance_modulo', COUNT(*) FROM avance_modulo
  UNION ALL
  SELECT 'evaluacion', COUNT(*) FROM evaluacion
  UNION ALL
  SELECT 'pregunta', COUNT(*) FROM pregunta
  UNION ALL
  SELECT 'opcion_respuesta', COUNT(*) FROM opcion_respuesta
  UNION ALL
  SELECT 'evaluacion_intento', COUNT(*) FROM evaluacion_intento
  UNION ALL
  SELECT 'respuesta_evaluacion', COUNT(*) FROM respuesta_evaluacion
  UNION ALL
  SELECT 'resultado_evaluacion', COUNT(*) FROM resultado_evaluacion
  UNION ALL
  SELECT 'tipo_evento', COUNT(*) FROM tipo_evento
ORDER BY registros DESC, tabla;

-- Verificar que las tablas de estructura se mantuvieron
SELECT '📊 TABLAS DE ESTRUCTURA (PRESERVADAS):' as status;
SELECT
  'pais' as tabla, COUNT(*) as registros FROM pais
  UNION ALL
  SELECT 'departamento', COUNT(*) FROM departamento
  UNION ALL
  SELECT 'ciudad', COUNT(*) FROM ciudad
  UNION ALL
  SELECT 'rol', COUNT(*) FROM rol
ORDER BY registros DESC;</content>
<parameter name="filePath">scripts/limpieza_completa_actualizada.sql