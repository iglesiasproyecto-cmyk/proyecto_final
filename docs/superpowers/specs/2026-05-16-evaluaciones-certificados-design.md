# Diseño: Sistema de Evaluaciones y Certificados

**Fecha:** 2026-05-16  
**Scope:** Implementar evaluaciones por módulo y emisión automática de certificados  
**Status:** Especificación aprobada por usuario

---

## 1. Visión General

Implementar un sistema de evaluaciones (quizzes por módulo) y certificados automáticos basados en desempeño:

- **Evaluaciones:** Quiz de múltiple choice / verdadero-falso por cada módulo
- **Intentos:** Ilimitados, se cuenta el primer intento si aprueba o la mejor calificación si falla
- **Certificados:** Se emiten automáticamente cuando usuario aprueba todas las evaluaciones (≥70%) de un curso
- **Restricción:** Usuario no puede ver respuestas correctas hasta después de enviar su intento

---

## 2. Esquema de Base de Datos (Existente, Verificado)

### Tablas Requeridas
```
aula_evaluacion
├─ id_aula_modulo (FK) — evaluación por módulo
├─ puntaje_minimo (int) — score requerido (default: 70)
├─ reintentos_permitidos (bool) — si pueden reintentar
├─ max_intentos (int | null) — límite de intentos (null = ilimitado)
└─ titulo, descripcion, orden

aula_pregunta
├─ id_aula_evaluacion (FK)
├─ tipo (enum: 'multiple_choice' | 'verdadero_falso')
├─ enunciado (text)
└─ orden

aula_opcion
├─ id_aula_pregunta (FK)
├─ texto (text)
├─ es_correcta (bool) — NO mostrar hasta después del envío
└─ orden

aula_intento_evaluacion
├─ id_aula_evaluacion (FK)
├─ id_usuario (FK)
├─ numero_intento (int) — incrementa con cada intento
├─ puntaje_obtenido (0-100)
├─ aprobado (bool) — si puntaje >= puntaje_minimo
├─ iniciado_en (timestamp)
├─ finalizado_en (timestamp)
└─ fecha_intento (date)

aula_certificado
├─ id_aula_curso (FK)
├─ id_usuario (FK)
├─ emitido_en (timestamp)
├─ numero_certificado (string, UUID)
└─ fecha_certificacion (date)
```

**Verificación:** ✅ Todas las tablas existen con estructura correcta.

---

## 3. Flujo de Usuario (Servidor)

### Fase 1: Completar Módulo
1. Usuario completa todas las **actividades** del módulo (aula_progreso_actividad)
2. Sistema desbloquea evaluación del módulo → botón "Hacer Evaluación"

### Fase 2: Responder Evaluación
1. Usuario entra al quiz (interfaz AulaEvaluacionInterfaz)
   - Ve preguntas sin mostrar cuál es la respuesta correcta
   - Selecciona respuesta para cada pregunta
   - Timer opcional (si se decide implementar)
2. Envía respuestas → Backend calcula puntaje
   - Si **aprueba (≥70%)**: Muestra resultado, evalúa resto del curso
   - Si **falla (<70%)**: Permite reintentar (si reintentos_permitidos=true)

### Fase 3: Certificado Automático
1. Sistema verifica: ¿Todas las evaluaciones de módulos están aprobadas?
2. Si sí:
   - INSERT INTO aula_certificado
   - Generar número certificado (UUID)
   - Emitir_en = NOW()
3. Usuario ve badge/notificación "¡Certificado Completado!"

---

## 4. Lógica de Calificación

### Scoring
- **Pregunta correcta:** +100/n_preguntas puntos (donde n = total preguntas)
- **Pregunta incorrecta:** 0 puntos
- **Score final:** (correctas / total) × 100

### Registro de Intentos
```
Intento 1: 60% → FALLA, puede reintentar
Intento 2: 55% → FALLA, puede reintentar
Intento 3: 80% → APRUEBA ✅ (este se registra para certificación)
Intento 4+: No permitido (ya aprobó)
```

**Regla especial:** Si aprueba el primer intento, está aprobado y no puede reintentar (bloquea).

---

## 5. Componentes a Crear

### Frontend
1. **AulaEvaluacionInterfaz** (`src/app/components/aula/AulaEvaluacionInterfaz.tsx`)
   - Mostrar preguntas una por una o todas en una página
   - Radio buttons para respuestas
   - Botón "Enviar respuestas"
   - Mostrar timer si aplica

2. **ResultadosEvaluacion** (`src/app/components/aula/ResultadosEvaluacion.tsx`)
   - Mostrar puntaje obtenido
   - Mostrar si aprobó/reprobó
   - Feedback: "¡Aprobaste!" o "Necesitas XX% más. Puedes reintentar."
   - Botón "Ver respuestas correctas" (post-envío)
   - Botón "Reintentar evaluación"

3. **MisCertificados** (`src/app/components/aula/MisCertificados.tsx`)
   - Galería de certificados emitidos al usuario
   - Mostrar curso, fecha, número de certificado
   - Descargar/ver certificado (PDF)

4. **CertificadoBadge** (componente pequeño)
   - Badge en tarjeta del curso: "📜 Certificado Completado"

### Hooks
1. **useIntentoEvaluacion** (`src/hooks/useIntentoEvaluacion.ts`)
   - `registrarIntento(idEvaluacion, respuestas[])` → calcula score, registra
   - `obtenerIntentosUsuario(idEvaluacion)` → lista de intentos previos

2. **useEmitirCertificado** (helper)
   - Verificar si todas evaluaciones aprobadas
   - Emitir certificado si corresponde

3. **useEvaluacionCurso** (`src/hooks/useEvaluacionCurso.ts`)
   - Obtener evaluaciones pendientes de un curso
   - Estado: no iniciado | en progreso | aprobado | reprobado

### Services
1. **evaluaciones.service.ts** (crear/actualizar)
   - `obtenerEvaluacionModulo(idModulo)` → devuelve evaluación + preguntas + opciones
   - `registrarIntentoEvaluacion(payload)` → RPC o direct insert
   - `calcularPuntaje(respuestasUsuario, respuestasCorrectas)` → score
   - `verificarYEmitirCertificado(idUsuario, idCurso)` → RPC

### Backend (RPC/Supabase Functions)
1. **registrar_intento_evaluacion(id_evaluacion, id_usuario, respuestas_json)**
   - Valida que usuario no haya aprobado ya
   - Calcula puntaje
   - Inserta en aula_intento_evaluacion
   - Retorna {puntaje, aprobado, numero_intento}

2. **emitir_certificado_si_corresponde(id_usuario, id_curso)**
   - Verifica: ¿Hay evaluaciones sin aprobar?
   - Si todas aprobadas: INSERT INTO aula_certificado + genera número
   - Retorna {certificado_emitido: bool, id_certificado: int}

---

## 6. Respuestas a Preguntas de Diseño

| Pregunta | Decisión |
|----------|----------|
| ¿Evaluaciones dónde? | Por módulo (no por curso) |
| ¿Tipo de preguntas? | Multiple choice + Verdadero/Falso |
| ¿Límite de intentos? | Ilimitados (reintentos_permitidos = true) |
| ¿Score que se cuenta? | Si aprueba 1er intento → ese. Si falla → mejor intento |
| ¿Puntaje mínimo? | 70% (configurable por evaluación) |
| ¿Cuándo emitir certificado? | Cuando todas evaluaciones del curso ≥70% |
| ¿El usuario ve respuestas correctas? | Solo después de enviar intento |
| ¿Se puede desaprobar un curso? | No: una vez aprobada evaluación, está aprobada |

---

## 7. User Stories Implementadas

1. **Como servidor:** Quiero completar actividades → quiz → obtener certificado
2. **Como líder:** Quiero crear quizzes por módulo y ver quién aprobó
3. **Como servidor:** Quiero reintentar una evaluación si falló (sin límite)
4. **Como servidor:** Quiero descargar mi certificado en PDF

---

## 8. Consideraciones de Seguridad

- ✅ RLS (Row Level Security) en aula_intento_evaluacion: usuario solo ve sus intentos
- ✅ RPC con SECURITY DEFINER para evitar manipulación de scores
- ✅ No mostrar respuestas correctas antes de envío (frontend + backend)
- ✅ Validar que usuario está inscrito en curso antes de permitir evaluación

---

## 9. Fase de Implementación

**Orden recomendado:**
1. Crear RPC `registrar_intento_evaluacion`
2. Crear servicio `evaluaciones.service.ts`
3. Crear hook `useIntentoEvaluacion`
4. Crear componente `AulaEvaluacionInterfaz`
5. Crear componente `ResultadosEvaluacion`
6. Crear RPC `emitir_certificado_si_corresponde`
7. Crear componente `MisCertificados`
8. Integrar con flujo de cursos existente

---

## 10. Decisiones Pendientes (Opcionales)

- ¿Feedback de respuestas inmediato o al final?
- ¿Timer por pregunta o por evaluación completa?
- ¿PDF de certificado con firma digital?
- ¿Mostrar estadísticas: preguntas más difíciles?

