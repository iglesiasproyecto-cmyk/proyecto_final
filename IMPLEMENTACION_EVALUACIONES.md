# 🎓 Guía de Implementación - Sistema de Evaluaciones Completo

**Fecha**: 24 de Abril de 2026  
**Estado**: ✅ Implementación Completada  
**Versión**: 1.0

---

## 📋 Resumen de lo Implementado

Se ha completado un **sistema integral de evaluaciones** con las siguientes características:

✅ **Creación de preguntas** con múltiples opciones  
✅ **Puntuación automática** basada en opciones seleccionadas  
✅ **Resolución interactiva** de evaluaciones  
✅ **Cálculo de puntaje final** automático  
✅ **Historial de intentos** del estudiante  
✅ **Visualización de resultados** detallados  
✅ **Row Level Security (RLS)** para proteger datos  

---

## 🗂️ Archivos Creados

### 1. **Migraciones SQL**
- **Ubicación**: `supabase/migrations/20260424_evaluaciones_preguntas.sql`
- **Contenido**: 4 tablas nuevas + RLS policies + funciones helper
- **Tablas**:
  - `pregunta` - Preguntas de evaluaciones
  - `opcion_respuesta` - Opciones para cada pregunta
  - `respuesta_evaluacion` - Respuestas del usuario
  - `evaluacion_intento` - Rastreo de intentos

### 2. **Tipos TypeScript**
- **Ubicación**: `src/types/app.types.ts` (agregado)
- **Interfaces nuevas**:
  - `Pregunta`
  - `OpcionRespuesta`
  - `RespuestaEvaluacion`
  - `EvaluacionIntento`
  - `EvaluacionConPreguntas`
  - `PreguntaConOpciones`
  - `ResultadoEvaluacion`

### 3. **Servicios**
- **Ubicación**: `src/services/evaluaciones.service.ts` (nuevo)
- **Funciones principales**:
  - CRUD de preguntas y opciones
  - Registro de respuestas
  - Gestión de intentos
  - Cálculo de resultados

### 4. **Hooks React Query**
- **Ubicación**: `src/hooks/useEvaluaciones.ts` (nuevo)
- **Hooks disponibles**:
  - `usePreguntasPorEvaluacion()` - Obtener preguntas
  - `useCrearPregunta()` - Crear pregunta
  - `useCrearOpcion()` - Crear opción
  - `useRegistrarRespuesta()` - Registrar respuesta
  - `useFinalizarIntento()` - Finalizar evaluación
  - `useObtenerResultadoIntento()` - Ver resultados

### 5. **Componentes React**

#### **CreadorPreguntas.tsx**
- **Ubicación**: `src/app/components/classroom/CreadorPreguntas.tsx`
- **Funcionalidad**: 
  - Crear preguntas
  - Agregar opciones de respuesta
  - Editar puntuaciones
  - Expandir/contraer preguntas
  - Eliminar preguntas y opciones

#### **ResolucionEvaluacion.tsx**
- **Ubicación**: `src/app/components/classroom/ResolucionEvaluacion.tsx`
- **Funcionalidad**:
  - Navegación pregunta por pregunta
  - Selección de opciones interactiva
  - Indicador de progreso
  - Contador de tiempo
  - Abandono de evaluación

#### **ResultadosEvaluacion.tsx**
- **Ubicación**: `src/app/components/classroom/ResultadosEvaluacion.tsx`
- **Funcionalidad**:
  - Visualización de puntaje total
  - Gráfico circular de porcentaje
  - Estadísticas detalladas
  - Repaso de respuestas
  - Indicadores de aprobado/reprobado

---

## 🚀 Cómo Usar

### **1. Aplicar Migraciones**

```bash
# Opción 1: Usar Supabase CLI
cd proyecto_final
supabase db reset

# Opción 2: Usar aplicación manual (si no funciona anterior)
supabase migration deploy
```

**Validar**: Las tablas deberán aparecer en Supabase Dashboard

### **2. Integrar CreadorPreguntas en AdminPage**

En tu página de administración de evaluaciones:

```tsx
import { CreadorPreguntas } from '@/app/components/classroom/CreadorPreguntas'

export function MisEvaluacionesAdmin() {
  const idEvaluacion = 1 // obtener del contexto/params

  return (
    <div>
      <CreadorPreguntas idEvaluacion={idEvaluacion} />
    </div>
  )
}
```

**Funcionalidades**:
- Crear nuevas preguntas
- Agregar opciones (A, B, C, D)
- Asignar puntos a cada opción
- Marcar respuesta correcta
- Eliminar preguntas/opciones

### **3. Integrar ResolucionEvaluacion en EstudiantePage**

En tu página de resolución para estudiantes:

```tsx
import { ResolucionEvaluacion } from '@/app/components/classroom/ResolucionEvaluacion'

export function ResolverEvaluacionPage() {
  const idEvaluacion = 1 // obtener del contexto/params
  const [idIntento, setIdIntento] = useState<number | null>(null)
  
  const iniciarIntento = useIniciarIntento()

  // Iniciar intento cuando el componente monta
  useEffect(() => {
    if (!idIntento) {
      iniciarIntento.mutate({
        idEvaluacion,
        idUsuario: usuarioActual.idUsuario,
        numeroIntento: 1
      }, {
        onSuccess: (data) => setIdIntento(data.idIntento)
      })
    }
  }, [])

  return (
    <div>
      {idIntento && (
        <ResolucionEvaluacion
          idEvaluacion={idEvaluacion}
          idIntento={idIntento}
          onFinalized={(id) => {
            // Redirigir a resultados
            navigate(`/app/evaluaciones/${id}/resultados`)
          }}
        />
      )}
    </div>
  )
}
```

**Funcionalidades**:
- Navegación entre preguntas
- Selector de opciones con UI visual
- Contador de tiempo
- Indicador de respuestas (verde = respondida)
- Botón "Finalizar Evaluación" en última pregunta

### **4. Integrar ResultadosEvaluacion en ResultadosPage**

En tu página de resultados:

```tsx
import { ResultadosEvaluacion } from '@/app/components/classroom/ResultadosEvaluacion'

export function VerResultadosPage() {
  const idIntento = useParams().idIntento

  return (
    <div>
      <ResultadosEvaluacion
        idIntento={parseInt(idIntento)}
        onVolver={() => navigate('/app/mis-cursos')}
      />
    </div>
  )
}
```

**Funcionalidades**:
- Visualización de puntaje con gráfico circular
- Estadísticas: correctas, incorrectas, tiempo
- Detalle pregunta por pregunta
- Indicadores de aprobado (>= 60%) / reprobado

---

## 📊 Flujo de Datos Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN: CREAR EVALUACIÓN                      │
│                                                                  │
│  CreadorPreguntas                                               │
│  ├─ useCrearPregunta()                                          │
│  │  └─ POST /pregunta                                           │
│  │     └─ Supabase (con RLS)                                    │
│  │                                                               │
│  └─ useCrearOpcion()                                            │
│     └─ POST /opcion_respuesta                                   │
│        └─ Supabase (con RLS)                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  ESTUDIANTE: RESOLVER EVALUACIÓN                │
│                                                                  │
│  ResolucionEvaluacion                                           │
│  ├─ useIniciarIntento()                                         │
│  │  └─ INSERT /evaluacion_intento                              │
│  │     └─ Estado: en_progreso                                   │
│  │                                                               │
│  ├─ usePreguntasPorEvaluacion()                                 │
│  │  └─ GET /pregunta (con opciones)                             │
│  │                                                               │
│  ├─ useRegistrarRespuesta() [por cada opción seleccionada]      │
│  │  └─ INSERT /respuesta_evaluacion                             │
│  │     └─ Guarda idOpcion + puntos automáticos                  │
│  │                                                               │
│  └─ useFinalizarIntento()                                       │
│     ├─ UPDATE /evaluacion_intento                               │
│     │  └─ Calcula puntaje_total, porcentaje                     │
│     └─ UPDATE /evaluacion                                       │
│        └─ Actualiza calificación y estado                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  VER RESULTADOS                                 │
│                                                                  │
│  ResultadosEvaluacion                                           │
│  ├─ useObtenerResultadoIntento()                                │
│  │  ├─ GET /evaluacion_intento                                  │
│  │  └─ GET /respuesta_evaluacion (todas las respuestas)         │
│  │                                                               │
│  └─ Mostrar:                                                    │
│     ├─ Puntaje final y porcentaje                               │
│     ├─ Aprobado/Reprobado                                       │
│     ├─ Estadísticas (correctas, incorrectas, tiempo)            │
│     └─ Detalle pregunta por pregunta                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Seguridad (RLS Policies)

### **Acceso a Preguntas**
```
✅ PERMITIDO: 
- Estudiantes inscritos en el curso
- Maestro del curso

❌ PROHIBIDO:
- Usuarios no inscritos
- Otros maestros
```

### **Acceso a Respuestas**
```
✅ PERMITIDO:
- Usuario ve solo sus respuestas
- Maestro ve todas las respuestas de sus estudiantes

❌ PROHIBIDO:
- Estudiante ve respuestas de otros
- Usuario no autorizado
```

---

## 💾 Base de Datos - Estructura

### **Tabla: pregunta**
```sql
id_pregunta        BIGSERIAL PK
id_evaluacion      BIGINT FK (evaluacion)
titulo             VARCHAR(500)  -- Enunciado
descripcion        TEXT
tipo               VARCHAR(20)   -- multiple_choice, verdadero_falso, abierta
orden              INT           -- Secuencia
activo             BOOLEAN
creado_en          TIMESTAMPTZ
updated_at         TIMESTAMPTZ
```

### **Tabla: opcion_respuesta**
```sql
id_opcion          BIGSERIAL PK
id_pregunta        BIGINT FK (pregunta)
texto_opcion       VARCHAR(500)  -- Texto de la opción
es_correcta        BOOLEAN       -- Marca correcta
puntos             NUMERIC(5,2)  -- Puntos por seleccionar
orden              INT           -- A=1, B=2, C=3, D=4
creado_en          TIMESTAMPTZ
updated_at         TIMESTAMPTZ
```

### **Tabla: respuesta_evaluacion**
```sql
id_respuesta       BIGSERIAL PK
id_pregunta        BIGINT FK
id_usuario         BIGINT FK
id_evaluacion      BIGINT FK
id_opcion_selected BIGINT FK (opcion_respuesta)
puntos_obtenidos   NUMERIC(5,2)  -- Calculados automáticamente
intento            INT
respondido_en      TIMESTAMPTZ
creado_en          TIMESTAMPTZ
```

### **Tabla: evaluacion_intento**
```sql
id_intento         BIGSERIAL PK
id_evaluacion      BIGINT FK
id_usuario         BIGINT FK
numero_intento     INT
fecha_inicio       TIMESTAMPTZ
fecha_fin          TIMESTAMPTZ
estado             VARCHAR(20)   -- en_progreso, completado, abandonado
puntaje_total      NUMERIC(5,2)  -- Suma de puntos obtenidos
puntaje_maximo     NUMERIC(5,2)  -- Suma de máximos puntos
porcentaje         NUMERIC(5,2)  -- (total/máximo)*100
tiempo_duracion    INT           -- Segundos
creado_en          TIMESTAMPTZ
```

---

## 🧪 Testing (Ejemplo de Flujo)

### **Paso 1: Crear Preguntas**
```typescript
// Componente: CreadorPreguntas
// Entrada: idEvaluacion = 5
// Acciones:
// 1. Click "Nueva Pregunta"
// 2. Llenar: 
//    - Título: "¿Cuál es la capital de Francia?"
//    - Descripción: "Pregunta sobre geografía"
//    - Tipo: "multiple_choice"
// 3. Agregar opciones:
//    - A) París (correcta, 10 puntos)
//    - B) Londres (incorrecta, 0 puntos)
//    - C) Berlín (incorrecta, 0 puntos)
//    - D) Madrid (incorrecta, 0 puntos)

// Esperado: Pregunta guardada en BD con 4 opciones
```

### **Paso 2: Resolver Evaluación**
```typescript
// Componente: ResolucionEvaluacion
// Entrada: idEvaluacion = 5, idIntento = 1
// Acciones:
// 1. Sistema crea intento (estado: en_progreso)
// 2. Seleccionar opción A
// 3. Click "Siguiente" para más preguntas
// 4. En última pregunta: Click "Finalizar Evaluación"

// Esperado: 
// - Respuestas guardadas en respuesta_evaluacion
// - Intento marcado como completado
// - Puntaje calculado
```

### **Paso 3: Ver Resultados**
```typescript
// Componente: ResultadosEvaluacion
// Entrada: idIntento = 1
// Esperado:
// - Puntaje: 10/10 (100%)
// - Estado: APROBADO (badge verde)
// - Detalle: 1 correcta, 0 incorrectas, tiempo: 1m 23s
```

---

## 📱 UI Componentes Incluidos

### **CreadorPreguntas**
```
┌─ Header
│  ├─ Título + contador
│  └─ Botón "Nueva Pregunta"
├─ Lista de Preguntas
│  ├─ Pregunta #1 (expandible)
│  │  ├─ Titulo
│  │  ├─ Descripción
│  │  ├─ Tipo
│  │  ├─ Opciones (A, B, C, D)
│  │  └─ Botones: Agregar, Eliminar
│  └─ Pregunta #2...
└─ Dialogs
   ├─ Dialog: Nueva Pregunta
   └─ Dialog: Nueva Opción
```

### **ResolucionEvaluacion**
```
┌─ Header
│  ├─ Barra de progreso
│  ├─ Pregunta X de N
│  └─ Contador de tiempo
├─ Pregunta
│  ├─ Título
│  ├─ Descripción
│  └─ Opciones (Radio buttons)
├─ Indicador de Respuestas
│  └─ Grid: 1 2 3 4 5... (resaltadas si respondidas)
└─ Botones
   ├─ Anterior
   ├─ Siguiente / Finalizar
   └─ Abandonar
```

### **ResultadosEvaluacion**
```
┌─ Resumen (Gráfico circular)
│  ├─ Porcentaje
│  └─ Aprobado/Reprobado
├─ Estadísticas (Grid 4 columnas)
│  ├─ Total preguntas
│  ├─ Correctas
│  ├─ Incorrectas
│  └─ Tiempo
├─ Detalle Pregunta por Pregunta
│  ├─ Pregunta 1
│  │  ├─ Título
│  │  ├─ Tu respuesta
│  │  └─ ✓ Correcta / ✗ Incorrecta
│  └─ Pregunta 2...
└─ Info del Intento
   ├─ Intento #
   ├─ Estado
   ├─ Fecha
   └─ Calificación final
```

---

## 🔄 Próximas Mejoras (Opcional)

- [ ] Bancos de preguntas reutilizables
- [ ] Diferentes tipos de preguntas (opción múltiple, V/F, abierta)
- [ ] Límite de tiempo por evaluación
- [ ] Mostrar respuesta correcta después de finalizar
- [ ] Exportar resultados a PDF
- [ ] Estadísticas del grupo
- [ ] Reintento automático según reglas
- [ ] Notificaciones de calificaciones

---

## 📞 Soporte

Si encuentras errores:

1. **Verifica que las migraciones se aplicaron**:
   ```bash
   supabase db pull --local
   # Deberías ver: pregunta, opcion_respuesta, respuesta_evaluacion, evaluacion_intento
   ```

2. **Revisa los logs de Supabase**:
   - Dashboard → Logs → Errores de RLS

3. **Valida tipos TypeScript**:
   ```bash
   npm run build
   ```

---

**¡Sistema de Evaluaciones Completo y Listo para Usar! 🎓**
