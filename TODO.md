# Plan de Mejoras - Detalles y Búsqueda

## Tareas Pendientes

### 1. ✅ Arreglar buscador de Usuarios
- [x] Robustecer búsqueda en `UsuariosPage.tsx`
- [x] Filtrar por nombre, correo, teléfono, rol e iglesia

### 2. Detalle de Pastor
- [ ] Crear diálogo de detalle en `PastoresPage.tsx`
- [ ] Mostrar: nombre, correo, teléfono, usuario vinculado
- [ ] Mostrar iglesias asignadas con indicador de principal
- [ ] Mostrar fechas y observaciones

### 3. Detalle de Evento
- [ ] Crear diálogo de detalle en `EventsPage.tsx`
- [ ] Mostrar: nombre, tipo, estado, descripción completa
- [ ] Mostrar fecha/hora inicio y fin
- [ ] Mostrar sede, ministerio, cantidad de tareas

### 4. Detalle de Sede
- [ ] Crear diálogo de detalle en `SedesPage.tsx`
- [ ] Mostrar: nombre, dirección, ciudad, estado
- [ ] Mostrar iglesia madre
- [ ] Mostrar pastor líder actual (desde sede_pastor)
- [ ] Mostrar ministerios operativos

### 5. Mejorar formulario de Iglesias
- [ ] Crear migración SQL: agregar `direccion`, `telefono`, `descripcion`, `sitio_web` a tabla `iglesia`
- [ ] Actualizar `app.types.ts` - interfaz Iglesia
- [ ] Actualizar `iglesias.service.ts` - mapear nuevos campos
- [ ] Actualizar `ChurchesPage.tsx` - formulario crear/editar
- [ ] Actualizar `ChurchDetailPage.tsx` - mostrar nuevos campos

### 6. Mejorar formulario de Pastores
- [ ] Crear migración SQL: agregar `direccion`, `fecha_nacimiento`, `biografia` a tabla `pastor`
- [ ] Actualizar `app.types.ts` - interfaz Pastor
- [ ] Actualizar `iglesias.service.ts` - mapear nuevos campos
- [ ] Actualizar `PastoresPage.tsx` - formulario crear/editar

## Archivos a modificar
- `src/app/components/UsuariosPage.tsx`
- `src/app/components/PastoresPage.tsx`
- `src/app/components/EventsPage.tsx`
- `src/app/components/SedesPage.tsx`
- `src/app/components/ChurchesPage.tsx`
- `src/app/components/ChurchDetailPage.tsx`
- `src/services/iglesias.service.ts`
- `src/services/eventos.service.ts`
- `src/types/app.types.ts`
- `supabase/migrations/` (nuevas migraciones)

