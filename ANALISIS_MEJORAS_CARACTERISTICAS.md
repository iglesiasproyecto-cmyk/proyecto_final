# 📊 Análisis de Mejoras - IGLESIABD
**Análisis Especializado de Características**
**Fecha**: 24 de Abril, 2026

---

## 🎯 Resumen Ejecutivo

IGLESIABD cuenta con una base sólida en las tres características clave. Sin embargo, existen **31+ oportunidades de mejora** que elevarían la plataforma a nivel empresarial. Este documento detalla cada mejora, su impacto, y nivel de complejidad.

---

# 📅 SECCIÓN 1: ORGANIZAR EVENTOS Y TAREAS

## ✅ Estado Actual

### Fortalezas
- ✅ **Arquitectura robusta**: Servicio modularizado (`eventos.service.ts`) con CRUD completo
- ✅ **UI moderna**: EventsPage con diseño responsivo, filtros por estado, agrupación por mes
- ✅ **React Query**: Caching y sincronización automática de datos
- ✅ **Tareas asociadas**: Sistema de tarea_asignada funcional con enriquecimiento de datos
- ✅ **Estados bien definidos**: evento (4 estados) + tarea (4 estados) + prioridad (4 niveles)
- ✅ **RLS**: Policies de seguridad en fase 3

### Limitaciones Identificadas
```
Problemas actuales:
├─ UI/UX (7 problemas)
├─ Funcionalidades (12 problemas)
├─ Análisis & Reportes (4 problemas)
├─ Integración (5 problemas)
└─ Performance (2 problemas)
```

---

## 🚀 MEJORAS RECOMENDADAS (por prioridad)

### **P1: CRÍTICAS (Impacto Alto, Urgencia Alta)**

#### 1️⃣ **FALTA: Vista Calendario Interactiva**
- **Problema**: Los eventos solo se muestran en grid/lista. Falta vista de calendario mes/semana/día
- **Impacto**: Usuarios no pueden visualizar eventos de forma temporal cohesiva
- **Solución Recomendada**:
  ```tsx
  // Integrar react-big-calendar o similar
  <Calendar
    events={eventos.map(e => ({
      title: e.nombre,
      start: new Date(e.fechaInicio),
      end: new Date(e.fechaFin),
      resource: e
    }))}
    style={{ height: 'auto' }}
  />
  ```
- **Archivos a crear/modificar**: 
  - `src/app/components/EventsPage.tsx` (agregar tab con vista calendario)
  - `package.json` (agregar `react-big-calendar` o `fullcalendar`)
- **Tiempo estimado**: 4-6 horas
- **Complejidad**: Media

---

#### 2️⃣ **FALTA: Filtros Avanzados en Tareas**
- **Problema**: TasksPage solo muestra lista básica. Faltan filtros por prioridad, estado, asignado a mí, próxima fecha límite
- **Impacto**: Difícil priorizar tareas en proyectos grandes
- **Solución Recomendada**:
  ```tsx
  const filteredTareas = tareas
    .filter(t => {
      if (filtroEstado && t.estado !== filtroEstado) return false
      if (filtroPrioridad && t.prioridad !== filtroPrioridad) return false
      if (filtroMisAsignaciones && !t.asignados?.some(a => a.idUsuario === usuarioActual.idUsuario)) return false
      return true
    })
    .sort((a, b) => {
      if (ordenarPor === 'fecha') return new Date(a.fechaLimite || '').getTime() - new Date(b.fechaLimite || '').getTime()
      if (ordenarPor === 'prioridad') return PRIORIDAD_ORDER[b.prioridad] - PRIORIDAD_ORDER[a.prioridad]
      return 0
    })
  ```
- **Archivos a crear/modificar**:
  - `src/app/components/TasksPage.tsx` (agregar UI de filtros)
  - `src/hooks/useEventos.ts` (opcional: agregar hook con filtros)
- **Tiempo estimado**: 3-4 horas
- **Complejidad**: Baja-Media

---

#### 3️⃣ **FALTA: Notificaciones en Tiempo Real para Tareas Asignadas**
- **Problema**: Cuando se asigna una tarea a un usuario, no recibe notificación automática
- **Impacto**: Usuarios no se enteran de nuevas responsabilidades hasta que visitan la app
- **Solución Recomendada**:
  ```tsx
  // En createTareaAsignada (eventos.service.ts)
  export async function createTareaAsignada(data: {
    idTarea: number
    idUsuario: number
    observaciones?: string
  }): Promise<TareaAsignada> {
    const result = await supabase
      .from('tarea_asignada')
      .insert([...])
      .select()
      .single()
    
    // Crear notificación automática
    await supabase
      .from('notificacion')
      .insert([{
        id_usuario: data.idUsuario,
        titulo: 'Nueva tarea asignada',
        mensaje: `Se te ha asignado una tarea`,
        tipo: 'tarea'
      }])
    
    // Integrar con servicio de email
    await enviarEmailNotificacion(idUsuario, 'tarea')
    
    return mapTareaAsignada(result)
  }
  ```
- **Archivos a crear/modificar**:
  - `src/services/eventos.service.ts` (agregar lógica)
  - `src/services/notificaciones.service.ts` (crear si no existe)
  - `supabase/functions/send-email-task/` (crear función edge)
- **Tiempo estimado**: 6-8 horas
- **Complejidad**: Media-Alta

---

#### 4️⃣ **FALTA: Drag & Drop de Tareas entre Estados**
- **Problema**: Solo se puede cambiar estado desde un dropdown. Falta experiencia visual intuitiva
- **Impacto**: Workflow menos eficiente (requiere abrir diálogo para cada cambio de estado)
- **Solución Recomendada**:
  ```tsx
  // Usar react-dnd o react-beautiful-dnd
  <DndContext>
    {['pendiente', 'en_progreso', 'completada', 'cancelada'].map(estado => (
      <Droppable key={estado} id={estado}>
        {tareas.filter(t => t.estado === estado).map(tarea => (
          <Draggable key={tarea.idTarea} id={tarea.idTarea}>
            <TareaCard tarea={tarea} />
          </Draggable>
        ))}
      </Droppable>
    ))}
  </DndContext>
  ```
- **Archivos a crear/modificar**:
  - `src/app/components/TasksPage.tsx` (refactor completo a Kanban)
  - `package.json` (agregar `@dnd-kit/core` o `react-beautiful-dnd`)
- **Tiempo estimado**: 5-7 horas
- **Complejidad**: Media

---

### **P2: IMPORTANTES (Impacto Alto, Urgencia Media)**

#### 5️⃣ **FALTA: Recordatorios Automáticos por Email**
- **Problema**: Los usuarios no reciben recordatorios de fechas límite próximas
- **Impacto**: Tareas se olvidan, plazos se pierden
- **Solución Recomendada**:
  ```sql
  -- Crear trigger que ejecute función para recordatorios (24h antes)
  CREATE FUNCTION check_task_reminders()
  RETURNS void AS $$
  BEGIN
    -- Seleccionar tareas con fecha_limite en 24h
    -- Enviar email a asignados
  END;
  $$ LANGUAGE plpgsql;
  
  -- Ejecutar via pg_cron o Cloud Tasks
  ```
- **Archivos a crear/modificar**:
  - `supabase/functions/task-reminders-scheduler/` (nueva función)
  - `supabase/migrations/` (agregar trigger)
- **Tiempo estimado**: 4-5 horas
- **Complejidad**: Media

---

#### 6️⃣ **FALTA: Historial Completo de Cambios en Tareas**
- **Problema**: No hay auditoría de quién cambió qué estado o cuándo
- **Impacto**: Imposible rastrear cambios, cumplimiento regulatorio débil
- **Solución Recomendada**:
  ```sql
  CREATE TABLE tarea_historial (
    id_historial BIGSERIAL PRIMARY KEY,
    id_tarea BIGINT REFERENCES tarea(id_tarea),
    id_usuario BIGINT REFERENCES usuario(id_usuario),
    campo_modificado VARCHAR(50),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    fecha_cambio TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- **Archivos a crear/modificar**:
  - `supabase/migrations/` (crear tabla + trigger)
  - `src/services/eventos.service.ts` (mostrar historial)
- **Tiempo estimado**: 3-4 horas
- **Complejidad**: Baja-Media

---

#### 7️⃣ **FALTA: Asignación de Tareas a Múltiples Ministerios**
- **Problema**: Una tarea solo pertenece a un evento, que a su vez pertenece a 0-1 ministerio
- **Impacto**: No se pueden crear tareas multidepartamentales
- **Solución Recomendada**:
  ```sql
  CREATE TABLE tarea_ministerio (
    id_tarea_ministerio BIGSERIAL PRIMARY KEY,
    id_tarea BIGINT REFERENCES tarea(id_tarea),
    id_ministerio BIGINT REFERENCES ministerio(id_ministerio),
    UNIQUE(id_tarea, id_ministerio)
  );
  ```
- **Archivos a crear/modificar**:
  - `supabase/migrations/` (crear tabla)
  - `src/services/eventos.service.ts` (actualizar CRUD)
- **Tiempo estimado**: 3-4 horas
- **Complejidad**: Baja-Media

---

#### 8️⃣ **FALTA: Dashboard de Tareas Personales**
- **Problema**: Usuario común no tiene vista de sus tareas asignadas en dashboard
- **Impacto**: No saben cuáles son sus responsabilidades sin navegar a TasksPage
- **Solución Recomendada**:
  ```tsx
  // Agregar a ServidorDashboard (DashboardPage.tsx)
  const misTareas = tareas.filter(t => 
    t.asignados?.some(a => a.idUsuario === usuarioActual.idUsuario)
  )
  
  <div className="space-y-2">
    {misTareas.slice(0, 5).map(t => (
      <div key={t.idTarea} className="p-3 rounded-lg bg-accent/20 flex justify-between items-center">
        <span>{t.titulo}</span>
        <Badge>{t.prioridad}</Badge>
      </div>
    ))}
  </div>
  ```
- **Archivos a crear/modificar**:
  - `src/app/components/DashboardPage.tsx` (agregar sección "Mis Tareas")
  - `src/hooks/useEventos.ts` (agregar hook si necesario)
- **Tiempo estimado**: 2-3 horas
- **Complejidad**: Baja

---

### **P3: DESEABLES (Impacto Medio, Urgencia Baja)**

#### 9️⃣ **FALTA: Estadísticas y Reportes de Tareas**
- **Problema**: No hay análisis de productividad, velocidad de entrega, patrones de retraso
- **Impacto**: Imposible medir eficiencia operativa
- **Sugerencia**:
  - Gráfico: Tarea completada vs. atrasada (por mes)
  - Gráfico: Distribución de prioridades en tareas asignadas
  - Reporte: Usuarios con más tareas incompletas
  - Métrica: Tiempo promedio de completar tarea
- **Complejidad**: Media-Alta
- **Tiempo**: 6-8 horas

---

#### 🔟 **MEJORA: Búsqueda Full-Text en Eventos/Tareas**
- **Problema**: Solo se pueden filtrar por estado/prioridad, no por contenido
- **Sugerencia**: Integrar búsqueda FTS de Supabase
- **Complejidad**: Baja
- **Tiempo**: 2-3 horas

---

#### 1️⃣1️⃣ **MEJORA: Exportación a iCal**
- **Problema**: Los eventos no se pueden sincronizar con Google Calendar, Outlook, etc.
- **Sugerencia**: Generar archivo .ics que sea descargable/subscriptible
- **Complejidad**: Media
- **Tiempo**: 3-4 horas

---

---

# 📚 SECCIÓN 2: CREAR Y GESTIONAR CURSOS ACADÉMICOS CON MÓDULOS

## ✅ Estado Actual

### Fortalezas
- ✅ **Estructura sólida**: 4 tablas interconectadas (curso, modulo, recurso, proceso_asignado_curso)
- ✅ **UI completa**: ClassroomPage y MisCursosPage con vistas de estudiante y profesor
- ✅ **Enriquecimiento**: getCursosEnriquecidos() trae módulos y recursos juntos
- ✅ **Editor Markdown**: ModuloContenidoEditor con preview en vivo
- ✅ **Recursos**: Sistema de archivos y enlaces por módulo
- ✅ **Progreso**: Sistema de avance por estudiante

### Limitaciones Identificadas
```
Problemas actuales:
├─ UI/UX (5 problemas)
├─ Funcionalidades (8 problemas)
├─ Gestión (4 problemas)
└─ Análisis (3 problemas)
```

---

## 🚀 MEJORAS RECOMENDADAS

### **P1: CRÍTICAS**

#### 1️⃣ **FALTA: Visualización de Prerequisites de Módulos**
- **Problema**: No hay forma de definir qué módulos deben completarse antes que otros
- **Impacto**: Estudiantes pueden acceder en orden equivocado
- **Solución Recomendada**:
  ```sql
  CREATE TABLE modulo_prerequisito (
    id_prerequisito BIGSERIAL PRIMARY KEY,
    id_modulo BIGINT REFERENCES modulo(id_modulo),
    id_modulo_requerido BIGINT REFERENCES modulo(id_modulo),
    UNIQUE(id_modulo, id_modulo_requerido)
  );
  
  ALTER TABLE modulo ADD COLUMN es_obligatorio_completar BOOLEAN DEFAULT false;
  ```
  ```tsx
  // Validar en ModuloDetailPage
  if (avanceActual?.estado !== 'completado' && modulo.esObligatorioCompletar) {
    return <div>Completa el módulo anterior para continuar</div>
  }
  ```
- **Archivos a crear/modificar**:
  - `supabase/migrations/` (nueva tabla)
  - `src/app/components/classroom/ModuloDetailPage.tsx` (agregar validación)
- **Tiempo estimado**: 4-5 horas
- **Complejidad**: Media

---

#### 2️⃣ **FALTA: Reordenamiento Drag & Drop de Módulos**
- **Problema**: El orden de módulos es fijo. Cambiar orden requiere editar `orden` manualmente en cada módulo
- **Impacto**: Difícil reorganizar cursos después de crear múltiples módulos
- **Solución Recomendada**:
  ```tsx
  // En CursoDetailPage (nueva página)
  <DndContext onDragEnd={(e) => {
    const { active, over } = e
    if (over?.id) {
      // Intercambiar orden
      updateModuloOrden(active.id, newOrden)
    }
  }}>
    {modulos.map(m => (
      <Draggable key={m.idModulo} id={m.idModulo}>
        <ModuloCard orden={m.orden} />
      </Draggable>
    ))}
  </DndContext>
  ```
- **Archivos a crear/modificar**:
  - `src/app/components/CursoDetailPage.tsx` (nueva página o tab)
  - `src/services/cursos.service.ts` (agregar updateModuloOrden())
- **Tiempo estimado**: 4-5 horas
- **Complejidad**: Media

---

#### 3️⃣ **FALTA: Clonación/Reutilización de Cursos**
- **Problema**: Para crear un curso similar, hay que hacerlo desde cero
- **Impacto**: Mucho trabajo repetitivo para cursos recurrentes
- **Solución Recomendada**:
  ```tsx
  export async function clonarCurso(idCursoOrigen: number, nuevoNombre: string): Promise<Curso> {
    const cursoOrigen = await getCurso(idCursoOrigen)
    const modulosOrigen = await getModulos(idCursoOrigen)
    
    // Crear curso nuevo
    const cursNuevo = await createCurso({...})
    
    // Clonar módulos y recursos
    for (const modOrigen of modulosOrigen) {
      const modNuevo = await createModulo({...})
      const recursos = await getRecursos(modOrigen.idModulo)
      for (const rec of recursos) {
        await createRecurso({...})
      }
    }
    
    return cursNuevo
  }
  ```
- **Archivos a crear/modificar**:
  - `src/services/cursos.service.ts` (agregar función)
  - `src/app/components/CursosPage.tsx` (agregar botón de clonación)
- **Tiempo estimado**: 3-4 horas
- **Complejidad**: Baja-Media

---

#### 4️⃣ **FALTA: Cronograma Visual de Cursos**
- **Problema**: No hay forma de ver la duración estimada y progreso global del curso
- **Impacto**: Estudiantes no saben cuánto falta para terminar
- **Solución Recomendada**:
  ```tsx
  // Agregar a ModuloDetailPage o nueva página
  <div className="space-y-3">
    <h3>Cronograma del Curso</h3>
    {modulos.map((m, i) => (
      <div key={m.idModulo} className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${avances.find(a => a.idModulo === m.idModulo) ? 'bg-green-500' : 'bg-gray-300'}`}>
          {i + 1}
        </div>
        <div className="flex-1">
          <p>{m.titulo}</p>
          <Progress value={avances.find(a => a.idModulo === m.idModulo) ? 100 : 0} />
        </div>
      </div>
    ))}
  </div>
  ```
- **Archivos a crear/modificar**:
  - `src/app/components/classroom/ModuloDetailPage.tsx` (agregar sección)
  - `src/app/components/ClassroomPage.tsx` (agregar vista cronograma)
- **Tiempo estimado**: 3-4 horas
- **Complejidad**: Baja-Media

---

#### 5️⃣ **FALTA: Estadísticas de Enrolamiento**
- **Problema**: No hay visibilidad sobre cuántos estudiantes están en cada ciclo/curso
- **Impacto**: Imposible medir adopción y engagement
- **Solución Recomendada**:
  ```tsx
  // Agregar a DashboardPage o nueva página de Gestión de Cursos
  export function useCursoEstadisticas(idCurso: number) {
    return useQuery({
      queryKey: ['curso-stats', idCurso],
      queryFn: async () => {
        const { data } = await supabase.rpc('get_curso_stats', { p_id_curso: idCurso })
        return data // { totalInscritos, completados, enProgreso, abandonados }
      }
    })
  }
  ```
- **Archivos a crear/modificar**:
  - `supabase/migrations/` (crear función RPC)
  - `src/hooks/useCursos.ts` (agregar hook)
  - `src/app/components/CursosManagementPage.tsx` (nueva página)
- **Tiempo estimado**: 4-5 horas
- **Complejidad**: Media

---

### **P2: IMPORTANTES**

#### 6️⃣ **FALTA: Sincronización con iCal/Google Calendar**
- **Problema**: No se puede sincronizar fechas de cursos con calendarios externos
- **Solución**: Generar feed iCal descargable
- **Complejidad**: Media
- **Tiempo**: 3-4 horas

---

#### 7️⃣ **FALTA: Sistema de Revisión de Contenido Antes de Publicar**
- **Problema**: Cualquiera puede publicar módulos sin revisión
- **Solución**: Agregar flujo de aprobación (draft → review → approved → published)
- **Complejidad**: Media
- **Tiempo**: 4-5 horas

---

#### 8️⃣ **MEJORA: Plantillas Reutilizables para Cursos**
- **Problema**: No hay forma de crear "plantillas" de cursos estándar
- **Solución**: Sistema de templates con estructura pre-cargada
- **Complejidad**: Media-Alta
- **Tiempo**: 6-8 horas

---

### **P3: DESEABLES**

#### 9️⃣ **MEJORA: Comentarios en Módulos**
- **Problema**: Estudiantes no pueden hacer preguntas en línea
- **Solución**: Sistema de comentarios/Q&A por módulo
- **Complejidad**: Media
- **Tiempo**: 4-5 horas

---

#### 🔟 **MEJORA: Certificados Automáticos**
- **Problema**: No hay forma de generar certificados al completar cursos
- **Solución**: Template de certificado + generación PDF
- **Complejidad**: Media-Alta
- **Tiempo**: 5-6 horas

---

---

# 🎓 SECCIÓN 3: GESTIONAR EVALUACIONES

## ✅ Estado Actual

### Fortalezas
- ✅ **Implementación completa**: 4 tablas (pregunta, opcion_respuesta, respuesta_evaluacion, evaluacion_intento)
- ✅ **Tipos de preguntas**: multiple_choice, verdadero_falso, abierta (base para expandir)
- ✅ **Puntuación automática**: Calcula automáticamente basada en opciones seleccionadas
- ✅ **Historial de intentos**: Rastreo de múltiples intentos
- ✅ **RLS**: Policies de seguridad
- ✅ **UI moderna**: EvaluationsPage con dashboard de resultados

### Limitaciones Identificadas
```
Problemas actuales:
├─ Tipos de Preguntas (5 problemas)
├─ Seguridad & Validación (3 problemas)
├─ Análisis (4 problemas)
├─ UX (3 problemas)
└─ Performance (2 problemas)
```

---

## 🚀 MEJORAS RECOMENDADAS

### **P1: CRÍTICAS**

#### 1️⃣ **FALTA: Tipos Adicionales de Preguntas**
- **Problema**: Solo hay 3 tipos (multiple choice, V/F, abierta). Falta: emparejar, escribir respuesta corta, arrastrar-soltar
- **Impacto**: Evaluaciones limitadas a formato básico
- **Solución Recomendada**:
  ```sql
  ALTER TABLE pregunta ADD COLUMN tipo VARCHAR(50) CHECK (tipo IN (
    'multiple_choice', 'verdadero_falso', 'abierta',
    'respuesta_corta', 'emparejar', 'arrastrar_soltar',
    'completa_espacio', 'selector_imagen'
  ));
  ```
  ```tsx
  // Componentes por tipo
  const PREGUNTA_COMPONENTES = {
    'respuesta_corta': PreguntaRespuestaCorta,
    'emparejar': PreguntaEmparejar,
    'arrastrar_soltar': PreguntaArrastrarSoltar,
    // etc.
  }
  ```
- **Archivos a crear/modificar**:
  - `supabase/migrations/` (actualizar enum)
  - `src/app/components/classroom/ResolucionEvaluacion.tsx` (agregar casos)
  - `src/app/components/classroom/CreadorPreguntas.tsx` (agregar interfaz)
- **Tiempo estimado**: 6-8 horas
- **Complejidad**: Media-Alta

---

#### 2️⃣ **FALTA: Banco de Preguntas Reutilizable**
- **Problema**: Cada pregunta está vinculada a una evaluación. No se puede reutilizar
- **Impacto**: Duplicación de trabajo al crear evaluaciones similares
- **Solución Recomendada**:
  ```sql
  CREATE TABLE pregunta_template (
    id_pregunta_template BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(255),
    descripcion TEXT,
    tipo VARCHAR(50),
    id_usuario_creador BIGINT REFERENCES usuario(id_usuario),
    tags VARCHAR(255)[], -- array de tags para búsqueda
    creado_en TIMESTAMPTZ DEFAULT NOW()
  );
  
  CREATE TABLE opcion_template (
    id_opcion_template BIGSERIAL PRIMARY KEY,
    id_pregunta_template BIGINT REFERENCES pregunta_template(id_pregunta_template),
    texto_opcion TEXT,
    es_correcta BOOLEAN,
    puntos INT
  );
  ```
  ```tsx
  // UI para seleccionar preguntas de template
  <BancoPreguntasDrawer
    onSelectPregunta={(template) => {
      // Clonar en evaluación actual
      crearPreguntaDesdeTemplate(template)
    }}
  />
  ```
- **Archivos a crear/modificar**:
  - `supabase/migrations/` (crear tablas template)
  - `src/services/evaluaciones.service.ts` (agregar funciones)
  - `src/app/components/classroom/BancoPreguntasDrawer.tsx` (nuevo componente)
- **Tiempo estimado**: 6-8 horas
- **Complejidad**: Media-Alta

---

#### 3️⃣ **FALTA: Límites de Tiempo por Pregunta/Evaluación**
- **Problema**: No hay límites de tiempo, evaluaciones pueden durar indefinidamente
- **Impacto**: Evaluaciones no válidas (demasiado tiempo para pensar)
- **Solución Recomendada**:
  ```sql
  ALTER TABLE evaluacion ADD COLUMN tiempo_limite_minutos INT;
  ALTER TABLE pregunta ADD COLUMN tiempo_limite_segundos INT;
  ```
  ```tsx
  // En ResolucionEvaluacion
  useEffect(() => {
    if (!tiempoInicio) return
    const interval = setInterval(() => {
      const elapsed = (Date.now() - tiempoInicio) / 1000
      if (evaluacion.tiempoLimite && elapsed > evaluacion.tiempoLimite * 60) {
        finalizarIntento() // Auto-guardar y cerrar
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [tiempoInicio])
  ```
- **Archivos a crear/modificar**:
  - `supabase/migrations/` (agregar columnas)
  - `src/app/components/classroom/ResolucionEvaluacion.tsx` (agregar timer)
  - `src/types/app.types.ts` (actualizar interfaces)
- **Tiempo estimado**: 4-5 horas
- **Complejidad**: Media

---

#### 4️⃣ **FALTA: Barajado Aleatorio de Preguntas y Opciones**
- **Problema**: Las preguntas y opciones siempre aparecen en el mismo orden. Facilita fraude
- **Impacto**: Estudiantes pueden memorizar respuestas posicionales
- **Solución Recomendada**:
  ```tsx
  export async function iniciarIntento(data: {
    idEvaluacion: number
    idUsuario: number
    barajearPreguntas?: boolean
    barajearOpciones?: boolean
  }): Promise<EvaluacionIntento> {
    let preguntas = await obtenerPreguntasPorEvaluacion(data.idEvaluacion)
    
    if (data.barajearPreguntas) {
      preguntas = preguntas.sort(() => Math.random() - 0.5)
    }
    
    // Almacenar orden barajado en JSON
    const intento = await supabase
      .from('evaluacion_intento')
      .insert([{
        id_evaluacion: data.idEvaluacion,
        id_usuario: data.idUsuario,
        orden_preguntas_json: JSON.stringify(preguntas.map(p => p.id_pregunta)),
        barajear_opciones: data.barajearOpciones
      }])
      .select()
      .single()
    
    return mapEvaluacionIntento(intento)
  }
  ```
- **Archivos a crear/modificar**:
  - `src/services/evaluaciones.service.ts` (agregar lógica)
  - `src/types/app.types.ts` (agregar campos)
  - `src/app/components/classroom/ResolucionEvaluacion.tsx` (usar orden guardado)
- **Tiempo estimado**: 4-5 horas
- **Complejidad**: Media

---

#### 5️⃣ **FALTA: Retroalimentación Inteligente por Pregunta**
- **Problema**: Estudiante contesta mal y no recibe explicación de por qué
- **Impacto**: Aprendizaje superficial, sin refuerzo pedagógico
- **Solución Recomendada**:
  ```sql
  ALTER TABLE pregunta ADD COLUMN retroalimentacion_correcta TEXT;
  ALTER TABLE pregunta ADD COLUMN retroalimentacion_incorrecta TEXT;
  ALTER TABLE opcion_respuesta ADD COLUMN retroalimentacion_opcion TEXT;
  ```
  ```tsx
  // En ResolucionEvaluacion, después de responder
  {mostrarResultados && esIncorrecto && (
    <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
      <p className="font-semibold text-rose-600">Incorrecto</p>
      <p className="text-sm mt-1">{pregunta.retroalimentacionIncorrecta}</p>
      <p className="text-xs text-rose-600 mt-2">
        {opcionSeleccionada.retroalimentacionOpcion}
      </p>
    </div>
  )}
  ```
- **Archivos a crear/modificar**:
  - `supabase/migrations/` (agregar columnas)
  - `src/app/components/classroom/ResolucionEvaluacion.tsx` (mostrar feedback)
- **Tiempo estimado**: 3-4 horas
- **Complejidad**: Baja-Media

---

### **P2: IMPORTANTES**

#### 6️⃣ **FALTA: Análisis de Rendimiento por Pregunta**
- **Problema**: No hay análisis de qué preguntas causan más dificultad
- **Impacto**: Imposible mejorar evaluaciones con datos
- **Solución**: Dashboard con índice de dificultad, discriminación, etc.
- **Complejidad**: Media-Alta
- **Tiempo**: 6-8 horas

---

#### 7️⃣ **FALTA: Exportación de Resultados (PDF/Excel)**
- **Problema**: No se pueden exportar resultados para análisis externo
- **Solución**: Integrar jsPDF o similar
- **Complejidad**: Media
- **Tiempo**: 3-4 horas

---

#### 8️⃣ **FALTA: Sistema Anti-Fraude (Detección de Copiadores)**
- **Problema**: No hay forma de detectar patrones sospechosos (copiar respuestas, tiempos anormales)
- **Solución**: Análisis de intentos similares, detección de anomalías
- **Complejidad**: Alta
- **Tiempo**: 8-10 horas

---

#### 9️⃣ **FALTA: Validación de Respuestas Abiertas (IA)**
- **Problema**: Las respuestas abiertas deben ser calificadas manualmente
- **Solución**: Integrar AI (OpenAI/Claude) para auto-evaluar similitud
- **Complejidad**: Alta
- **Tiempo**: 6-8 horas

---

### **P3: DESEABLES**

#### 🔟 **MEJORA: Simulacros / Modo Práctica**
- **Problema**: No hay forma de practicar sin que se registre como intento oficial
- **Solución**: Modo práctica que no cuenta en estadísticas
- **Complejidad**: Baja
- **Tiempo**: 2-3 horas

---

#### 1️⃣1️⃣ **MEJORA: Encuestas de Satisfacción**
- **Problema**: No hay retroalimentación de estudiantes sobre contenido
- **Solución**: Encuesta post-evaluación
- **Complejidad**: Baja
- **Tiempo**: 2-3 horas

---

---

# 📊 MATRIZ DE PRIORIZACIÓN

## Recomendación General por Línea de Trabajo

```
EVENTOS Y TAREAS (11 mejoras identificadas)
├─ P1 (4 críticas): Vista calendario, Filtros, Notificaciones RT, Drag & Drop
├─ P2 (5 importantes): Recordatorios, Historial, Multi-ministerios, Dashboard personal, Reportes
└─ P3 (2 deseables): Búsqueda FTS, iCal

CURSOS Y MÓDULOS (10 mejoras identificadas)
├─ P1 (5 críticas): Prerequisites, Drag & Drop orden, Clonación, Cronograma, Estadísticas
├─ P2 (4 importantes): iCal, Flujo revisión, Plantillas, Comentarios
└─ P3 (1 deseable): Certificados

EVALUACIONES (11 mejoras identificadas)
├─ P1 (5 críticas): Tipos adicionales, Banco preguntas, Límites tiempo, Barajado, Retroalimentación
├─ P2 (4 importantes): Análisis rendimiento, Exportación, Anti-fraude, Validación IA
└─ P3 (2 deseables): Modo práctica, Encuestas
```

---

# 🎯 ROADMAP SUGERIDO (Próximos 3 Meses)

## Mes 1: Experiencia de Usuario
- ✅ Vista calendario para eventos
- ✅ Filtros avanzados en tareas
- ✅ Kanban de tareas (Drag & Drop)
- Estimado: **18-22 horas**

## Mes 2: Funcionalidades Críticas
- ✅ Notificaciones RT + Email
- ✅ Prerequisites en módulos
- ✅ Reordenamiento módulos
- ✅ Tipos adicionales de preguntas
- ✅ Banco de preguntas
- Estimado: **24-30 horas**

## Mes 3: Análisis & Mejora Continua
- ✅ Estadísticas de tareas
- ✅ Dashboard de cursos
- ✅ Análisis de evaluaciones
- ✅ Cronograma visual
- Estimado: **16-20 horas**

**Total Estimado**: 58-72 horas de desarrollo

---

# 💡 Conclusión

El proyecto IGLESIABD tiene una **base arquitectónica sólida** para las tres características. Las mejoras sugeridas transformarían la plataforma de una versión funcional a una **solución empresarial completa** con:

1. **Experiencia de usuario intuitiva** (calendarios, drag & drop, filtros)
2. **Automatización y notificaciones** (recordatorios, asignaciones)
3. **Análisis y reportes** (productividad, aprendizaje)
4. **Seguridad y validación** (anti-fraude, auditoría)

Todas las mejoras son **técnicamente viables** con el stack actual (React, Supabase, TypeScript).

