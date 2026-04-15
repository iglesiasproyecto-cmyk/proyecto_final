# SUPABASE_AGENT.md
# Instrucciones para el Agente de IA con acceso al MCP de Supabase
# Proyecto: IGLESIABD — Sistema de gestión eclesiástica
# Supabase Project Ref: heibyjbvfiokmduwwawm

---

## CONTEXTO DEL PROYECTO

IGLESIABD es un SPA de gestión de iglesias construido con React 18 + Vite + TailwindCSS + Supabase.
El backend vive enteramente en Supabase (PostgreSQL + Auth + Edge Functions).

**Stack:**
- Frontend: React 18, Vite, TypeScript, React Query, shadcn/ui
- Backend: Supabase (PostgreSQL, RLS, Edge Functions, Auth Email invites)
- Deployment: Vercel (frontend), Supabase Cloud (backend)

---

## TU ROL

Eres el **agente de backend responsable de Supabase**. Tu trabajo es:
1. Verificar el estado actual de la base de datos (tablas, columnas, RLS, funciones, triggers)
2. Aplicar migraciones SQL de forma segura y ordenada
3. Confirmar que cada cambio fue aplicado correctamente
4. Reportar cualquier discrepancia entre el schema esperado y el real

**NUNCA ejecutes una migración sin primero verificar el estado actual.**
**SIEMPRE usa nombres descriptivos para las políticas y funciones.**
**NUNCA borres datos de producción sin instrucción explícita.**

---

## SCHEMA ACTUAL DE LA BASE DE DATOS

### Dominio: Geografía
```
pais          (id_pais, nombre, creado_en, updated_at)
departamento  (id_departamento, nombre, id_pais, creado_en, updated_at)
ciudad        (id_ciudad, nombre, id_departamento, creado_en, updated_at)
```

### Dominio: Iglesias y Liderazgo
```
iglesia        (id_iglesia, nombre, fecha_fundacion, estado[activa/inactiva/fusionada/cerrada], id_ciudad, creado_en, updated_at)
pastor         (id_pastor, nombres, apellidos, correo, telefono, id_usuario, creado_en, updated_at)
iglesia_pastor (id_iglesia_pastor, id_iglesia, id_pastor, es_principal, fecha_inicio, fecha_fin, observaciones, creado_en, updated_at)
sede           (id_sede, nombre, direccion, estado[activa/inactiva/en_construccion], id_ciudad, id_iglesia, creado_en, updated_at)
sede_pastor    (id_sede_pastor, id_sede, id_pastor, es_principal, fecha_inicio, fecha_fin, observaciones, creado_en, updated_at)
```

### Dominio: Ministerios
```
ministerio        (id_ministerio, nombre, descripcion, estado[activo/inactivo/suspendido], id_sede, creado_en, updated_at)
miembro_ministerio (id_miembro_ministerio, id_usuario, id_ministerio, rol_en_ministerio, fecha_ingreso, fecha_salida, creado_en, updated_at)
```

### Dominio: Usuarios y Roles
```
usuario     (id_usuario, nombres, apellidos, correo, contrasena_hash, telefono, activo, ultimo_acceso, auth_user_id[UUID→auth.users], creado_en, updated_at)
rol         (id_rol, nombre, descripcion, creado_en, updated_at)
usuario_rol (id_usuario_rol, id_usuario, id_rol, id_iglesia, id_sede, fecha_inicio, fecha_fin, creado_en, updated_at)
notificacion (id_notificacion, id_usuario, titulo, mensaje, leida, fecha_lectura, tipo[informacion/alerta/tarea/evento/curso], creado_en, updated_at)
```

**Roles del sistema** (seeded):
- `Super Administrador` — gestión global
- `Administrador de Iglesia` — gestión de su iglesia
- `Líder` — gestión de su ministerio
- `Servidor` — solo lectura y sus tareas

### Dominio: Eventos y Tareas
```
tipo_evento   (id_tipo_evento, nombre, descripcion, creado_en, updated_at)
evento        (id_evento, nombre, descripcion, id_tipo_evento, fecha_inicio, fecha_fin, estado[programado/en_curso/finalizado/cancelado], id_iglesia, id_sede, id_ministerio, creado_en, updated_at)
tarea         (id_tarea, titulo, descripcion, fecha_limite, estado[pendiente/en_progreso/completada/cancelada], prioridad[baja/media/alta/urgente], id_evento, id_usuario_creador, creado_en, updated_at)
tarea_asignada (id_tarea_asignada, id_tarea, id_usuario, fecha_asignacion, fecha_completado, observaciones, creado_en, updated_at)
```

### Dominio: Formación Académica
```
curso                  (id_curso, nombre, descripcion, duracion_horas, estado[borrador/activo/inactivo/archivado], id_ministerio, id_usuario_creador, creado_en, updated_at)
modulo                 (id_modulo, titulo, descripcion, orden, estado[borrador/publicado/archivado], id_curso, creado_en, updated_at)
recurso                (id_recurso, nombre, tipo[archivo/enlace], url, id_modulo, creado_en, updated_at)
evaluacion             (id_evaluacion, id_modulo, id_usuario, calificacion, estado[pendiente/aprobado/reprobado/en_revision], observaciones, fecha_evaluacion, creado_en, updated_at)
proceso_asignado_curso (id_proceso_asignado_curso, id_curso, id_iglesia, fecha_inicio, fecha_fin, estado[programado/en_curso/finalizado/cancelado], creado_en, updated_at)
detalle_proceso_curso  (id_detalle_proceso_curso, id_proceso_asignado_curso, id_usuario, fecha_inscripcion, estado[inscrito/en_progreso/completado/retirado], creado_en, updated_at)
```

**TOTAL: 24 tablas**

---

## FUNCIONES SECURITY DEFINER EXISTENTES (ya aplicadas)

Estas funciones ya existen. Verifica que estén activas antes de crear nuevas:

```sql
-- Verifica con:
SELECT proname, prosecdef FROM pg_proc
WHERE proname IN ('get_my_usuario', 'get_my_roles', 'get_my_unread_notifications_count', 'handle_new_user', 'get_my_highest_role');
```

1. `public.get_my_usuario()` — retorna el registro `usuario` del usuario autenticado
2. `public.get_my_roles()` — retorna roles activos del usuario con iglesia y nombre
3. `public.get_my_unread_notifications_count()` — cuenta notificaciones no leídas
4. `public.handle_new_user()` — trigger que crea `usuario` al registrarse en auth

---

## TRIGGERS EXISTENTES

```sql
-- Verifica con:
SELECT trigger_name, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

- `on_auth_user_created` — AFTER INSERT ON auth.users → llama `handle_new_user()`

---

## ÍNDICES EXISTENTES

```sql
idx_usuario_auth_user_id     -- UNIQUE en usuario(auth_user_id) WHERE NOT NULL
idx_sede_id_iglesia          -- sede(id_iglesia)
idx_ministerio_id_sede       -- ministerio(id_sede)
idx_evento_id_iglesia        -- evento(id_iglesia)
idx_tarea_id_evento          -- tarea(id_evento)
idx_notificacion_id_usuario  -- notificacion(id_usuario)
idx_tarea_asignada_id_usuario -- tarea_asignada(id_usuario)
idx_evaluacion_id_usuario    -- evaluacion(id_usuario)
idx_usuario_rol_id_usuario   -- usuario_rol(id_usuario)
```

---

## ESTADO ACTUAL DE RLS

### Políticas SELECT (ya aplicadas):
- **Catálogos**: `iglesia, sede, pastor, ministerio, evento, tarea, curso, modulo, recurso, iglesia_pastor, sede_pastor, miembro_ministerio, proceso_asignado_curso, detalle_proceso_curso` — SELECT para `authenticated` con `USING (true)`
- **usuario**: solo ve su propio perfil (`auth_user_id = auth.uid()`)
- **usuario_rol**: solo ve sus propios roles
- **notificacion**: solo ve sus propias notificaciones
- **tarea_asignada**: solo ve sus propias asignaciones
- **evaluacion**: solo ve sus propias evaluaciones

### Políticas INSERT/UPDATE/DELETE (PERMISIVAS — deben endurecerse):
Las mutaciones para **todos** los dominios usan `USING (true)` / `WITH CHECK (true)`.
Cualquier usuario autenticado puede modificar cualquier registro. **ESTO DEBE CAMBIAR.**

### Tablas SIN políticas de mutación (faltantes):
- `usuario` — sin INSERT/UPDATE/DELETE (el INSERT lo hace el trigger)
- `notificacion` — sin INSERT (solo el sistema debería crear notificaciones)
- `pais`, `departamento`, `ciudad` — sin mutación (catálogos geográficos)
- `rol` — sin mutación (solo super_admin)
- `tipo_evento` — sin mutación explícita

---

## MIGRACIONES A APLICAR

Aplica en este orden exacto, una por una. Verifica éxito antes de continuar.

---

### MIGRACIÓN 1: `20260414_get_my_highest_role_function`

**Propósito**: Crear función helper que retorna el rol más alto del usuario actual. Esta función es la base de todas las políticas RLS por rol.

**PRIMERO VERIFICA** si ya existe:
```sql
SELECT proname FROM pg_proc WHERE proname = 'get_my_highest_role';
```

**Si NO existe**, aplica:
```sql
-- Función para obtener el rol con mayor jerarquía del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_my_highest_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT r.nombre
  FROM public.usuario_rol ur
  JOIN public.rol r ON r.id_rol = ur.id_rol
  WHERE ur.id_usuario = (
    SELECT id_usuario FROM public.usuario
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  )
  AND ur.fecha_fin IS NULL
  ORDER BY CASE r.nombre
    WHEN 'Super Administrador'     THEN 1
    WHEN 'Administrador de Iglesia' THEN 2
    WHEN 'Líder'                    THEN 3
    ELSE 4
  END
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_highest_role() TO authenticated;
```

---

### MIGRACIÓN 2: `20260414_rls_drop_permissive_mutations`

**Propósito**: Eliminar las políticas permisivas `WITH CHECK (true)` que existen actualmente para reemplazarlas con unas basadas en roles.

**PRIMERO LISTA las políticas actuales**:
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

**Luego elimina solo las políticas de mutación permisivas**:
```sql
-- Iglesias / Sedes / Pastores
DROP POLICY IF EXISTS "Authenticated insert iglesia" ON public.iglesia;
DROP POLICY IF EXISTS "Authenticated update iglesia" ON public.iglesia;
DROP POLICY IF EXISTS "Authenticated delete iglesia" ON public.iglesia;
DROP POLICY IF EXISTS "Authenticated insert sede" ON public.sede;
DROP POLICY IF EXISTS "Authenticated update sede" ON public.sede;
DROP POLICY IF EXISTS "Authenticated delete sede" ON public.sede;
DROP POLICY IF EXISTS "Authenticated insert pastor" ON public.pastor;
DROP POLICY IF EXISTS "Authenticated update pastor" ON public.pastor;
DROP POLICY IF EXISTS "Authenticated delete pastor" ON public.pastor;
DROP POLICY IF EXISTS "Authenticated insert iglesia_pastor" ON public.iglesia_pastor;
DROP POLICY IF EXISTS "Authenticated update iglesia_pastor" ON public.iglesia_pastor;

-- Ministerios
DROP POLICY IF EXISTS "Authenticated insert ministerio" ON public.ministerio;
DROP POLICY IF EXISTS "Authenticated update ministerio" ON public.ministerio;
DROP POLICY IF EXISTS "Authenticated delete ministerio" ON public.ministerio;
DROP POLICY IF EXISTS "Authenticated insert miembro_ministerio" ON public.miembro_ministerio;
DROP POLICY IF EXISTS "Authenticated update miembro_ministerio" ON public.miembro_ministerio;
DROP POLICY IF EXISTS "Authenticated delete miembro_ministerio" ON public.miembro_ministerio;

-- Eventos / Tareas
DROP POLICY IF EXISTS "Authenticated insert evento" ON public.evento;
DROP POLICY IF EXISTS "Authenticated update evento" ON public.evento;
DROP POLICY IF EXISTS "Authenticated delete evento" ON public.evento;
DROP POLICY IF EXISTS "Authenticated insert tarea" ON public.tarea;
DROP POLICY IF EXISTS "Authenticated update tarea" ON public.tarea;
DROP POLICY IF EXISTS "Authenticated delete tarea" ON public.tarea;
DROP POLICY IF EXISTS "Authenticated insert tarea_asignada" ON public.tarea_asignada;
DROP POLICY IF EXISTS "Authenticated update tarea_asignada" ON public.tarea_asignada;
DROP POLICY IF EXISTS "Authenticated delete tarea_asignada" ON public.tarea_asignada;

-- Cursos
DROP POLICY IF EXISTS "Authenticated insert curso" ON public.curso;
DROP POLICY IF EXISTS "Authenticated update curso" ON public.curso;
DROP POLICY IF EXISTS "Authenticated delete curso" ON public.curso;
DROP POLICY IF EXISTS "Authenticated insert modulo" ON public.modulo;
DROP POLICY IF EXISTS "Authenticated update modulo" ON public.modulo;
DROP POLICY IF EXISTS "Authenticated delete modulo" ON public.modulo;
DROP POLICY IF EXISTS "Authenticated insert evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Authenticated update evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Authenticated delete evaluacion" ON public.evaluacion;
DROP POLICY IF EXISTS "Authenticated insert recurso" ON public.recurso;
DROP POLICY IF EXISTS "Authenticated update recurso" ON public.recurso;
DROP POLICY IF EXISTS "Authenticated delete recurso" ON public.recurso;
DROP POLICY IF EXISTS "Authenticated update proceso_asignado_curso" ON public.proceso_asignado_curso;
```

---

### MIGRACIÓN 3: `20260414_rls_iglesias_role_based`

**Propósito**: Políticas de mutación basadas en rol para el dominio de iglesias, sedes y pastores.

```sql
-- ── IGLESIA ──
-- Solo Super Admin puede crear/borrar iglesias
CREATE POLICY "SuperAdmin puede insertar iglesia"
  ON public.iglesia FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador'));

CREATE POLICY "Admin puede actualizar iglesia"
  ON public.iglesia FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

CREATE POLICY "SuperAdmin puede borrar iglesia"
  ON public.iglesia FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador'));

-- ── SEDE ──
CREATE POLICY "Admin puede insertar sede"
  ON public.sede FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

CREATE POLICY "Admin puede actualizar sede"
  ON public.sede FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

CREATE POLICY "Admin puede borrar sede"
  ON public.sede FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

-- ── PASTOR ──
CREATE POLICY "Admin puede insertar pastor"
  ON public.pastor FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

CREATE POLICY "Admin puede actualizar pastor"
  ON public.pastor FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

CREATE POLICY "Admin puede borrar pastor"
  ON public.pastor FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

-- ── IGLESIA_PASTOR ──
CREATE POLICY "Admin puede insertar iglesia_pastor"
  ON public.iglesia_pastor FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

CREATE POLICY "Admin puede actualizar iglesia_pastor"
  ON public.iglesia_pastor FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));
```

---

### MIGRACIÓN 4: `20260414_rls_ministerios_role_based`

```sql
-- ── MINISTERIO ──
CREATE POLICY "Admin o Lider puede insertar ministerio"
  ON public.ministerio FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Admin o Lider puede actualizar ministerio"
  ON public.ministerio FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Admin puede borrar ministerio"
  ON public.ministerio FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

-- ── MIEMBRO_MINISTERIO ──
CREATE POLICY "Lider puede insertar miembro"
  ON public.miembro_ministerio FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Lider puede actualizar miembro"
  ON public.miembro_ministerio FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Admin puede borrar miembro"
  ON public.miembro_ministerio FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));
```

---

### MIGRACIÓN 5: `20260414_rls_eventos_role_based`

```sql
-- ── EVENTO ──
CREATE POLICY "Lider puede insertar evento"
  ON public.evento FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Lider puede actualizar evento"
  ON public.evento FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Admin puede borrar evento"
  ON public.evento FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

-- ── TAREA ──
CREATE POLICY "Lider puede insertar tarea"
  ON public.tarea FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Lider puede actualizar tarea"
  ON public.tarea FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Admin puede borrar tarea"
  ON public.tarea FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

-- ── TAREA_ASIGNADA ──
-- Líderes asignan, el propio servidor puede marcar completado
CREATE POLICY "Lider puede insertar tarea_asignada"
  ON public.tarea_asignada FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Usuario puede actualizar su propia tarea_asignada"
  ON public.tarea_asignada FOR UPDATE TO authenticated
  USING (
    id_usuario = (SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1)
    OR public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder')
  )
  WITH CHECK (
    id_usuario = (SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1)
    OR public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder')
  );

CREATE POLICY "Admin puede borrar tarea_asignada"
  ON public.tarea_asignada FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));
```

---

### MIGRACIÓN 6: `20260414_rls_cursos_role_based`

```sql
-- ── CURSO ──
CREATE POLICY "Lider puede insertar curso"
  ON public.curso FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Lider puede actualizar curso"
  ON public.curso FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Admin puede borrar curso"
  ON public.curso FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

-- ── MODULO ──
CREATE POLICY "Lider puede insertar modulo"
  ON public.modulo FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Lider puede actualizar modulo"
  ON public.modulo FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Admin puede borrar modulo"
  ON public.modulo FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

-- ── RECURSO ──
CREATE POLICY "Lider puede insertar recurso"
  ON public.recurso FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Lider puede actualizar recurso"
  ON public.recurso FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Admin puede borrar recurso"
  ON public.recurso FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

-- ── EVALUACION ──
CREATE POLICY "Lider puede insertar evaluacion"
  ON public.evaluacion FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Lider puede actualizar evaluacion"
  ON public.evaluacion FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Admin puede borrar evaluacion"
  ON public.evaluacion FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

-- ── PROCESO_ASIGNADO_CURSO ──
CREATE POLICY "Admin puede insertar proceso_asignado_curso"
  ON public.proceso_asignado_curso FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

CREATE POLICY "Admin puede actualizar proceso_asignado_curso"
  ON public.proceso_asignado_curso FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Admin puede borrar proceso_asignado_curso"
  ON public.proceso_asignado_curso FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

-- ── DETALLE_PROCESO_CURSO ──
CREATE POLICY "Admin puede gestionar detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));

CREATE POLICY "Admin puede actualizar detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia', 'Líder'));
```

---

### MIGRACIÓN 7: `20260414_rls_usuarios_role_based`

```sql
-- ── USUARIO ── (el INSERT lo hace el trigger handle_new_user, no el cliente)
-- El UPDATE del propio perfil debe estar permitido
CREATE POLICY "Usuario puede actualizar su propio perfil"
  ON public.usuario FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Admin puede actualizar cualquier usuario"
  ON public.usuario FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

-- ── USUARIO_ROL ──
CREATE POLICY "Admin puede insertar usuario_rol"
  ON public.usuario_rol FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

CREATE POLICY "Admin puede actualizar usuario_rol"
  ON public.usuario_rol FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

-- ── NOTIFICACION ── (solo el sistema puede crear, el usuario puede marcarla como leída)
CREATE POLICY "Usuario puede actualizar su notificacion"
  ON public.notificacion FOR UPDATE TO authenticated
  USING (
    id_usuario = (SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    id_usuario = (SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1)
  );

-- ── CATALOGOS (solo Super Admin) ──
-- pais
CREATE POLICY "SuperAdmin puede insertar pais"
  ON public.pais FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() = 'Super Administrador');

CREATE POLICY "SuperAdmin puede actualizar pais"
  ON public.pais FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() = 'Super Administrador')
  WITH CHECK (public.get_my_highest_role() = 'Super Administrador');

CREATE POLICY "SuperAdmin puede borrar pais"
  ON public.pais FOR DELETE TO authenticated
  USING (public.get_my_highest_role() = 'Super Administrador');

-- departamento
CREATE POLICY "SuperAdmin puede insertar departamento"
  ON public.departamento FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() = 'Super Administrador');

CREATE POLICY "SuperAdmin puede actualizar departamento"
  ON public.departamento FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() = 'Super Administrador')
  WITH CHECK (public.get_my_highest_role() = 'Super Administrador');

CREATE POLICY "SuperAdmin puede borrar departamento"
  ON public.departamento FOR DELETE TO authenticated
  USING (public.get_my_highest_role() = 'Super Administrador');

-- ciudad
CREATE POLICY "SuperAdmin puede insertar ciudad"
  ON public.ciudad FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() = 'Super Administrador');

CREATE POLICY "SuperAdmin puede actualizar ciudad"
  ON public.ciudad FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() = 'Super Administrador')
  WITH CHECK (public.get_my_highest_role() = 'Super Administrador');

CREATE POLICY "SuperAdmin puede borrar ciudad"
  ON public.ciudad FOR DELETE TO authenticated
  USING (public.get_my_highest_role() = 'Super Administrador');

-- tipo_evento (Admin puede gestionar)
CREATE POLICY "Admin puede insertar tipo_evento"
  ON public.tipo_evento FOR INSERT TO authenticated
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

CREATE POLICY "Admin puede actualizar tipo_evento"
  ON public.tipo_evento FOR UPDATE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'))
  WITH CHECK (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));

CREATE POLICY "Admin puede borrar tipo_evento"
  ON public.tipo_evento FOR DELETE TO authenticated
  USING (public.get_my_highest_role() IN ('Super Administrador', 'Administrador de Iglesia'));
```

---

## VERIFICACIONES POST-MIGRACIÓN

Después de aplicar TODAS las migraciones, ejecuta estas queries para confirmar el estado:

```sql
-- 1. Listar todas las políticas activas por tabla
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 2. Verificar que las funciones existen
SELECT proname, prosecdef AS is_security_definer
FROM pg_proc
WHERE proname IN (
  'get_my_usuario',
  'get_my_roles',
  'get_my_unread_notifications_count',
  'handle_new_user',
  'get_my_highest_role'
)
ORDER BY proname;

-- 3. Verificar que el trigger existe
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 4. Confirmar RLS habilitado en todas las tablas
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 5. Verificar columnas reales de evaluacion (para confirmar bug fix)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'evaluacion'
ORDER BY ordinal_position;

-- 6. Verificar columnas reales de recurso
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'recurso'
ORDER BY ordinal_position;
```

---

## REGLAS Y MEJORES PRÁCTICAS PARA ESTE AGENTE

1. **Siempre verifica antes de crear**: usa `SELECT` para confirmar que una política, función o índice no exista antes de intentar crearlo.
2. **Usa `IF NOT EXISTS` y bloques `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`** para hacer las migraciones idempotentes.
3. **Nunca uses `DROP TABLE`** ni modifiques datos de producción sin instrucción explícita.
4. **Los nombres de columnas de timestamps son `creado_en` y `updated_at`** — NO `created_at`.
5. **Las PKs son numéricas (`BIGINT` generadas por secuencia)**: `id_iglesia`, `id_usuario`, etc. — NO UUIDs.
6. **El campo de vinculación Auth → usuario es `auth_user_id UUID`** en la tabla `usuario`.
7. **Reporta** siempre el resultado de cada migración: éxito, error, o "ya existía".
8. **Si una migración falla**, no continúes con las siguientes hasta resolver el error.
9. **No alteres el schema de `auth.*`** — ese es territorio de Supabase interno.

---

## EDGE FUNCTIONS EXISTENTES

| Función | Ruta | Estado |
|---|---|---|
| `invite-user` | `supabase/functions/invite-user/index.ts` | Desplegada |

**NOTA IMPORTANTE sobre `invite-user`**: Existe un bug de duplicación. El edge function crea manualmente un registro en `usuario` Y el trigger `handle_new_user` también lo crea. El fix en el código TypeScript ya fue aplicado por Antigravity (eliminando el INSERT manual). No apliques ninguna migración que modifique este comportamiento.

---

## ESTADO FINAL ESPERADO (checklist)

Al terminar, el sistema debe cumplir:

- [ ] `get_my_highest_role()` función existe y retorna correctamente
- [ ] Políticas de mutación basadas en rol aplicadas en los 24+ tablas
- [ ] Políticas permisivas `WITH CHECK (true)` eliminadas
- [ ] RLS habilitado en TODAS las tablas públicas
- [ ] Trigger `on_auth_user_created` activo
- [ ] Las 5 funciones SECURITY DEFINER existen y tienen GRANT para `authenticated`
- [ ] Columnas de `evaluacion` y `recurso` verificadas y documentadas

---
*Generado por Antigravity para el proyecto IGLESIABD*
*Proyecto Supabase: heibyjbvfiokmduwwawm*
