# Plan de Corrección: Error al Crear Tareas

## Problemas Identificados

### 1. Script de usuario de prueba roto (`20260421_create_test_user.sql`)
- Usa columnas inexistentes: `idUsuario` (UUID) en lugar de `id_usuario` (serial integer)
- Usa `estado` string en lugar de `activo` boolean
- Inserta directamente en `public.usuario` con UUID en lugar de dejar que el trigger `handle_new_user()` lo cree
- El usuario en `public.usuario` no tiene `auth_user_id` vinculado correctamente

### 2. AppContext no maneja mock mode + sesión inválida
- `isAuthenticated` solo verifica `!!session`, no considera `isMockMode`
- Si hay una sesión expirada en localStorage, `session` existe pero el token es inválido → Supabase rechaza con 403
- El mock user se activa solo cuando `!session`, no cuando la sesión es inválida

### 3. Falta manejo de errores explícito en TasksPage
- No hay `onError` en la mutación para mostrar mensajes claros
- El usuario no sabe si el error es de autenticación, validación o RLS

## Plan de Corrección

### Archivos a modificar:

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/20260421_create_test_user.sql` | Corregir esquema de columnas, usar trigger correctamente |
| `src/app/store/AppContext.tsx` | Mejorar `isAuthenticated` para considerar mock mode; manejar sesiones inválidas |
| `src/app/components/TasksPage.tsx` | Agregar `onError` en mutación con mensaje claro |
| `src/services/eventos.service.ts` | Asegurar que `createTarea` use el cliente de Supabase con el token actual |

## Pasos Detallados

### Paso 1: Corregir script de usuario de prueba
- Eliminar INSERT directo en `public.usuario`
- Insertar solo en `auth.users` con `raw_user_meta_data` correcto
- El trigger `handle_new_user()` creará automáticamente el registro en `public.usuario`
- Actualizar el registro creado con datos completos usando `auth_user_id`

### Paso 2: Mejorar AppContext
- Cambiar `isAuthenticated: !!session` a `isAuthenticated: !!session || isMockMode`
- Agregar lógica para detectar sesiones inválidas (cuando `session` existe pero las peticiones fallan con 401/403)
- En caso de sesión inválida, forzar logout o activar mock mode automáticamente

### Paso 3: Agregar manejo de errores en TasksPage
- Agregar `onError` callback en `useCreateTarea()` o en la llamada `mutate()`
- Mostrar toast con mensaje específico según el tipo de error

### Paso 4: Verificar flujo completo
- Ejecutar script corregido en Supabase
- Probar login con credenciales de prueba
- Probar creación de tarea
