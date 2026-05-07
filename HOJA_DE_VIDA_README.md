# Sistema de Hoja de Vida - IGLESIABD

## Descripción General

El sistema de Hoja de Vida es una funcionalidad que permite a cada usuario crear y mantener un perfil profesional completo dentro de IGLESIABD. Este perfil es visible para administradores, líderes de ministerio y Super Administradores.

## Características Principales

### 1. **Perfil Profesional Completo**
- Título profesional
- Resumen profesional
- Experiencia laboral
- Foto de perfil
- Habilidades (con nivel de dominio)
- Formación académica
- Certificados obtenidos en cursos

### 2. **Permisos y Visibilidad**

#### Usuarios pueden:
- Ver su propia hoja de vida
- Editar su propia hoja de vida
- Marcar como completa cuando terminan

#### Administradores y Líderes pueden:
- Ver hojas de vida de usuarios en su iglesia/ministerio
- Ver estadísticas de hojas de vida completas

#### Super Admin puede:
- Ver todas las hojas de vida de todas las iglesias

### 3. **Notificaciones Automáticas**

Cuando se crea un usuario nuevo:
1. Se crea automáticamente una entrada en `hoja_de_vida` (vacía)
2. Se envía una notificación al usuario para que complete su hoja de vida
3. El usuario recibe recordatorios si no completa la hoja de vida en 7 días

## Arquitectura Técnica

### Base de Datos

#### Tabla: `hoja_de_vida`
```sql
- id_hoja_de_vida (BIGSERIAL, PK)
- id_usuario (INTEGER, FK, UNIQUE)
- titulo_profesional (TEXT, nullable)
- experiencia_laboral (TEXT, nullable)
- habilidades (JSONB, array de objetos)
- resumen_profesional (TEXT, nullable)
- foto_perfil_url (TEXT, nullable)
- formacion_academica (JSONB, array de objetos)
- otros_datos (JSONB, para campos adicionales)
- completa (BOOLEAN, default false)
- completada_en (TIMESTAMP, nullable)
- creado_en (TIMESTAMP)
- actualizado_en (TIMESTAMP)
```

#### Estructura de Habilidades (JSONB):
```typescript
interface Habilidad {
  nombre: string;
  nivel: 'basico' | 'intermedio' | 'avanzado';
  años_experiencia?: number;
}
```

#### Estructura de Formación Académica (JSONB):
```typescript
interface FormacionAcademica {
  institucion: string;
  titulo: string;
  campo_estudio: string;
  fecha_graduacion?: string;
  estado: 'en_progreso' | 'completado';
}
```

### Servicios (`src/services/hojaDeVida.service.ts`)

- `getHojaDeVidaActual()` - Obtiene la hoja actual del usuario autenticado
- `getHojaDeVidaPorUsuario(idUsuario)` - Obtiene la hoja de otro usuario (con permisos RLS)
- `crearHojaDeVida()` - Crea una nueva hoja de vida
- `actualizarHojaDeVida()` - Actualiza la hoja de vida
- `marcarComoCompleta()` - Marca como completa
- `agregarHabilidad()` - Agrega una habilidad
- `actualizarHabilidad()` - Actualiza una habilidad específica
- `eliminarHabilidad()` - Elimina una habilidad
- `agregarFormacionAcademica()` - Agrega formación académica
- `getHojasDeVidaIncompletas()` - Para reminders
- `buscarHojasPorHabilidades()` - Búsqueda por habilidades

### Hooks (`src/hooks/useHojaDeVida.ts`)

#### `useHojaDeVida()`
Hook principal para manejar la hoja de vida del usuario actual.

**Retorna:**
```typescript
{
  hoja: HojaDeVidaCompleta | null,
  loading: boolean,
  error: string | null,
  isUpdating: boolean,
  fetchHojaDeVida: () => Promise<void>,
  actualizarHoja: (datos) => Promise<HojaDeVida | null>,
  marcarCompleta: () => Promise<HojaDeVida | null>,
  agregarHabilidad: (habilidad) => Promise<HojaDeVida | null>,
  actualizarHabilidad: (index, habilidad) => Promise<HojaDeVida | null>,
  eliminarHabilidad: (index) => Promise<HojaDeVida | null>,
  agregarFormacion: (formacion) => Promise<HojaDeVida | null>,
}
```

**Características:**
- Suscripción automática a cambios en tiempo real (Supabase Realtime)
- Sincronización automática cuando hay actualizaciones
- Manejo de errores integrado

#### `useHojaDeVidaPorUsuario(idUsuario)`
Hook para obtener la hoja de vida de otro usuario específico.

### Componentes

#### `HojaDeVidaView.tsx`
Componente de solo lectura que muestra la hoja de vida con:
- Información personal del usuario
- Tabs para Habilidades, Formación y Certificados
- Información de certificados completados
- Timestamps de creación y actualización

#### `HojaDeVidaForm.tsx`
Formulario completo para editar la hoja de vida con:
- Inputs para información personal
- Sección de habilidades (CRUD)
- Sección de formación académica (CRUD)
- Dialogs para agregar/editar elementos
- Validaciones y manejo de errores

#### `HojaDeVidaModal.tsx`
Modal para ver la hoja de vida de otro usuario (read-only)

## Flujos de Uso

### 1. Nuevo Usuario
1. Admin/Líder crea usuario nuevo
2. Sistema automáticamente:
   - Crea entrada vacía en `hoja_de_vida`
   - Envía notificación al usuario
3. Usuario accede a su perfil → tab "Hoja de Vida"
4. Usuario llena información
5. Usuario marca como "Completa"
6. Administradores ven la hoja completa

### 2. Editar Hoja de Vida
1. Usuario va a Perfil → Hoja de Vida
2. Hace clic en "Editar"
3. Modifica información deseada
4. Hace clic en "Guardar Cambios"
5. Cambios se sincronizan en tiempo real para otros visualizadores

### 3. Ver Hoja de Vida (Administrador/Líder)
1. Va a la sección de Usuarios
2. Busca el usuario
3. Hace clic en el botón "Hoja de Vida" (ícono de documento)
4. Se abre un modal mostrando la hoja de vida completa
5. Puede cerrar el modal en cualquier momento

## Sincronización en Tiempo Real

### RLS (Row Level Security) Policies

La tabla `hoja_de_vida` tiene políticas RLS que controlan:

1. **Acceso del propietario:**
   - Usuario solo ve su propia hoja
   - Usuario solo puede actualizar/insertar su propia hoja

2. **Acceso de Administradores:**
   - Admin Iglesia y Super Admin ven todas las hojas de su iglesia
   - Se valida mediante `usuario_rol` table

3. **Acceso de Líderes:**
   - Líder ve hojas de usuarios en sus ministerios
   - Se valida mediante `miembro_ministerio` table

### Supabase Realtime

El sistema usa Supabase Realtime subscriptions para sincronización automática:

```typescript
// En useHojaDeVida.ts
const channel = supabase
  .channel('hoja_de_vida_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'hoja_de_vida',
  }, (payload) => {
    // Refetch cuando hay cambios
    fetchHojaDeVida();
  })
  .subscribe();
```

Esto significa que si un usuario está viendo la hoja de vida de otro y ese otro la actualiza, la vista se actualiza automáticamente.

## RPC Functions

### `get_hoja_de_vida_completa(p_id_usuario)`

Retorna la hoja de vida con certificados asociados:

```typescript
{
  id_hoja_de_vida,
  id_usuario,
  titulo_profesional,
  experiencia_laboral,
  habilidades,
  resumen_profesional,
  foto_perfil_url,
  formacion_academica,
  otros_datos,
  completa,
  completada_en,
  usuario_nombres,
  usuario_apellidos,
  usuario_correo,
  certificados: [] // Array con los certificados del usuario
}
```

### `create_missing_hojas_de_vida()`

Utility para crear hojas de vida faltantes para usuarios existentes.

### `send_hoja_de_vida_reminder_notifications()`

Utility para enviar recordatorios a usuarios con hojas incompletas (una vez por semana).

## Triggers Automáticos

### `trigger_create_hoja_vida_on_new_user`

Cuando se inserta un nuevo usuario en la tabla `usuario`:
1. Se crea automáticamente una entrada en `hoja_de_vida`
2. Se envía una notificación

### `trigger_hoja_de_vida_timestamp`

Actualiza automáticamente `actualizado_en` cuando se modifica la hoja.

## Integración en UI

### ProfilePage.tsx
- Nuevo tab "Hoja de Vida"
- Muestra vista o editor según modo
- Botón para cambiar entre ver/editar

### UsuariosPage.tsx
- Nuevo botón en la tabla de acciones: ícono de documento
- Abre modal con la hoja de vida del usuario
- Solo visible para Admin/Líder según RLS

## Próximas Mejoras

- [ ] Búsqueda global por habilidades
- [ ] Exportar hoja de vida como PDF
- [ ] Certificados digitales descargables
- [ ] Recomendaciones de cursos basadas en habilidades
- [ ] Analytics de formación por iglesia/ministerio
- [ ] Integración con LinkedIn (opcional)
- [ ] Historial de cambios en hoja de vida

## Notas de Desarrollo

### Dependencias
- Supabase Client
- React Hook Form
- React DnD (para orden futuro)
- date-fns (para formatos de fecha)

### Estado Global
- No usa contexto global, solo hooks locales
- Sincronización mediante Supabase Realtime
- Caché manejada por React Query

### Performance
- Lazy loading de hojas de vida
- Paginación para búsquedas
- Índices de base de datos en `id_usuario`

### Seguridad
- RLS implementado en todas las operaciones
- SECURITY DEFINER en RPC functions críticas
- Validación de permisos por nivel de rol

## Troubleshooting

### La hoja de vida no se actualiza en tiempo real
- Verificar que Realtime esté habilitado en Supabase
- Revisar conectividad WebSocket
- Forzar refetch manual

### El usuario nuevo no ve la notificación
- Verificar que el trigger se ejecutó
- Revisar la tabla `notificacion`
- Ejecutar `create_missing_hojas_de_vida()` para existentes

### No puedo ver la hoja de vida de otro usuario
- Verificar que soy Admin/Líder/SuperAdmin
- Verificar RLS policies
- Revisar que el usuario está en mi iglesia/ministerio
