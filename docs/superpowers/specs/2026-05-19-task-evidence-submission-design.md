# Diseño: Sistema de Envío y Revisión de Evidencia de Tareas

**Fecha:** 2026-05-19  
**Autor:** Brainstorming Session  
**Estado:** En Diseño

## Visión General

Implementar un sistema que permita a los usuarios asignados a tareas adjuntar evidencia (fotos y documentos) cuando marcan una tarea como completa. El creador de la tarea puede entonces revisar la evidencia, dejar comentarios, y aprobar o rechazar el trabajo.

## Requisitos

### Requisitos Funcionales

1. **Envío de Evidencia (Asignado)**
   - Cuando un asignado marca una tarea como "hecha", accede a una pantalla de envío de evidencia
   - Puede adjuntar 0 a 5 archivos (fotos .jpg/.png, documentos .pdf/.doc)
   - Cada archivo máximo 10MB
   - La evidencia es opcional (puede completar sin adjuntar nada)
   - Puede ver un resumen antes de confirmar el envío

2. **Estado de Revisión**
   - Una vez enviada, la tarea entra en estado "en_revision"
   - El asignado no puede editar la tarea en este estado
   - Si vence la fecha límite, la tarea se bloquea completamente

3. **Revisión y Aprobación (Asignador)**
   - El asignador ve la tarea en su vista de detalles
   - Puede ver todos los archivos adjuntos (fotos, documentos)
   - Puede dejar comentarios/feedback
   - Puede aprobar (marca tarea como completa) o rechazar (solicita cambios)

4. **Flujo de Rechazo**
   - Si se rechaza, la tarea vuelve a estado "pendiente"
   - El asignado puede ver los comentarios del asignador
   - Puede adjuntar nueva evidencia y reenvirar
   - Sin límite de reenvíos antes de la fecha límite

5. **Comentarios Bidireccionales**
   - Ambos usuarios (asignador y asignado) ven los comentarios
   - El asignador deja feedback al revisar
   - El asignado puede ver y responder a los comentarios

6. **Bloqueo por Fecha Límite**
   - Cuando vence la fecha límite, la tarea se bloquea
   - No se puede editar ni adjuntar evidencia
   - El asignador aún puede revisar y comentar

### Requisitos No Funcionales

- Los archivos se almacenan en Supabase Storage
- La evidencia es privada (solo asignador + asignado pueden verla)
- Máximo 5 archivos por tarea, máximo 10MB por archivo
- Los comentarios se guardan en orden cronológico

## Modelo de Datos

### Cambios en tabla `tarea`

Agregar columna:
```sql
estado_revision ENUM ('pendiente', 'en_revision', 'aprobada', 'rechazada') DEFAULT 'pendiente'
```

Esta columna rastrea el estado de la revisión de evidencia.

### Nueva tabla `tarea_evidencia`

```sql
CREATE TABLE tarea_evidencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES tarea(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  archivo_url TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  tipo_archivo VARCHAR(50),
  tamaño_bytes INTEGER,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tarea_evidencia_tarea ON tarea_evidencia(tarea_id);
```

### Nueva tabla `tarea_comentario_revision`

```sql
CREATE TABLE tarea_comentario_revision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES tarea(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  contenido TEXT NOT NULL,
  tipo ENUM ('comentario', 'aprobacion', 'rechazo') DEFAULT 'comentario',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comentario_revision_tarea ON tarea_comentario_revision(tarea_id);
```

### Almacenamiento de Archivos

Ruta en Supabase Storage:
```
iglesias/{iglesia_id}/tareas/{tarea_id}/{timestamp}_{nombre_archivo}
```

Ejemplo: `iglesias/uuid-123/tareas/uuid-456/1716200000_reparacion-puerta.jpg`

## Flujo de Usuario

### Asignado: Envío de Evidencia

1. Usuario abre detalle de tarea marcada como "en_progreso"
2. Hace clic en botón "Marcar como Hecha"
3. Se abre modal/página de envío de evidencia
4. Opcionalmente selecciona archivos (drag & drop o file picker)
5. Ve preview de archivos seleccionados
6. Hace clic en "Enviar para Revisión"
7. La tarea pasa a estado "en_revision"
8. Usuario ve confirmación y vuelve a lista de tareas

### Asignador: Revisión de Evidencia

1. Usuario abre su lista de tareas asignadas
2. Filtra o busca tareas en estado "en_revision"
3. Abre detalle de tarea
4. Ve sección de "Evidencia Enviada" con todos los archivos
5. Puede previsualizar o descargar archivos
6. Deja comentarios en el campo dedicado
7. Hace clic en "Aprobar" (tarea → completada) o "Rechazar" (vuelve a pendiente)
8. Si rechaza, debe dejar un comentario explicando por qué

### Reenvío después de Rechazo

1. Asignado ve que tarea fue rechazada
2. Lee los comentarios del asignador
3. Vuelve a adjuntar evidencia (nueva o complementaria)
4. Hace clic en "Reenvilar para Revisión"
5. Ciclo se repite

## Componentes de UI

### Página de Envío de Evidencia (`EvidenceSubmissionPage`)
- Zona de drag & drop para archivos
- Lista de archivos seleccionados con previsualizaciones
- Validación de tipo y tamaño de archivo
- Botones "Enviar" y "Cancelar"
- Mensaje de estado/confirmación después del envío

### Sección de Revisión en Detalle de Tarea (`TaskEvidenceReview`)
- Galería/lista de archivos adjuntos
- Área de comentarios (solo para asignador)
- Botones "Aprobar" / "Rechazar" (solo asignador)
- Feed de comentarios (visible para ambos)

### Feed de Comentarios (`ReviewCommentsFeed`)
- Comentarios ordenados cronológicamente
- Mostrar quién escribió, cuándo
- Diferentes estilos para aprobación/rechazo/comentario regular

## Casos Especiales

### Fecha Límite Vencida
- Si la tarea vence mientras está "en_revision", se bloquea la edición
- El asignador aún puede revisar y comentar
- Se muestra banner indicando que está vencida

### Límite de Archivos Alcanzado
- Si intenta agregar archivo #6, mostrar error: "Máximo 5 archivos por tarea"
- Si archivo excede 10MB, mostrar error específico

### Archivo Corrupto/No Cargable
- Si falla la carga, mostrar error al usuario
- Permitir reintentar
- Log del error en servidor

### Borrado de Tarea
- Si se borra la tarea, se borran todos los archivos y comentarios en cascada
- Los archivos en storage también se deben eliminar

## Flujo de Estados

```
Pendiente → En Progreso (asignado trabaja)
    ↓
    Marca como Hecha → Pantalla de Envío de Evidencia
    ↓
    En Revisión (esperando aprobación)
    ├─ Asignador Aprueba → Completa ✓
    └─ Asignador Rechaza → Vuelve a Pendiente → (Reenvilar)
    
Bloqueo por Fecha Límite: Puede ocurrir en cualquier estado
```

## Consideraciones de Implementación

1. **Almacenamiento de Archivos**
   - Usar Supabase Storage para archivos
   - Implementar validación de tipo y tamaño en cliente y servidor
   - Limpiar archivos si se rechaza/borra la tarea

2. **Autenticación y Permisos**
   - Solo asignador y asignado pueden ver/comentar evidencia
   - Solo asignador puede aprobar/rechazar
   - Validar permisos en RLS (Row Level Security) de Supabase

3. **Notificaciones**
   - Notificar al asignado cuando es rechazada con comentarios
   - Notificar al asignador cuando es reenviada evidencia

4. **Performance**
   - Lazy load de archivos grandes
   - Cachear comentarios
   - Índices en base de datos para búsquedas rápidas

## Testing

### Tests Unitarios
- Validación de tipo y tamaño de archivo
- Generación de rutas de almacenamiento
- Lógica de estados de tarea

### Tests de Integración
- Flujo completo: envío → revisión → aprobación
- Flujo de rechazo y reenvío
- Comentarios bidireccionales
- Bloqueo por fecha límite

### Tests E2E
- Usuario asignado envía evidencia
- Usuario asignador revisa y aprueba
- Usuario asignado revisa feedback y reenvía

## Aceptación

Esta especificación será considerada completa cuando:
1. El asignado puede adjuntar fotos/documentos al marcar una tarea como hecha
2. El asignador puede revisar, comentar, y aprobar/rechazar
3. El flujo de rechazo y reenvío funciona correctamente
4. Los comentarios se ven en ambos lados
5. La tarea se bloquea cuando vence la fecha límite
