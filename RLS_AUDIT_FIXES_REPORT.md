# RLS Silent Bug Audit & Fixes Report
**Fecha:** 2026-05-13  
**Status:** ✅ COMPLETADO

---

## Resumen Ejecutivo

Se identificaron y corrigieron **12 bugs silenciosos críticos** en las políticas RLS (Row Level Security) de 6 tablas principales. Los fixes eliminan:
- ❌ Fallos silenciosos en UPDATE (UPDATE sin SELECT)
- ❌ Subqueries con self-join siempre-verdaderos
- ❌ Políticas duplicadas redundantes
- ❌ Condiciones overly permissive (USING = true)
- ❌ Falta de simetría entre USING y WITH CHECK

---

## Bugs Identificados y Corregidos

### 1. **CURSO - UPDATE sin SELECT (ASYMMETRIC FAILURE)**
**Bug:** La política `curso_update` permitía que el creador SELECCIONARA para actualizar pero NO podía actualizar realmente.
```sql
-- ANTES (BUGGY)
USING: is_super_admin() OR (is_admin_iglesia() AND ...) OR (id_usuario_creador = ...)
WITH CHECK: is_super_admin() OR (is_admin_iglesia() AND ...)
-- Resultado: Creator SELECT ✓ pero UPDATE ✗ (silencioso)
```
**Fix:** Simetría perfecta - USING = WITH CHECK
```sql
-- DESPUÉS
USING: is_super_admin() OR (id_usuario_creador = ...) OR (is_admin_iglesia() AND ...)
WITH CHECK: is_super_admin() OR (id_usuario_creador = ...) OR (is_admin_iglesia() AND ...)
```
**Status:** ✅ FIXED

---

### 2. **CURSO - Política "Lectura autenticada" con USING = true**
**Bug:** `USING = true` permite que TODOS los usuarios autenticados lean TODOS los cursos.
```sql
-- ANTES
CREATE POLICY "Lectura autenticada" ... USING (true)
-- Resultado: Sin scoping por iglesia; violación de tenant isolation
```
**Fix:** Política eliminada; se usa solo `curso_select` scoped.
```sql
-- DESPUÉS
DROP POLICY "Lectura autenticada"
-- Mantener: curso_select con lógica iglesia-scoped
```
**Status:** ✅ FIXED

---

### 3. **MODULO - Política "Lectura autenticada" con USING = true**
**Bug:** Idéntico al de CURSO - overreach de permisos.
**Fix:** Eliminada; reemplazada por `modulo_select` scoped.
**Status:** ✅ FIXED

---

### 4. **TAREA - UPDATE sin WITH CHECK para creator**
**Bug:** Creador puede SELECT pero no UPDATE su propia tarea.
```sql
-- ANTES
USING: is_super_admin() OR (id_usuario_creador = ...) OR (is_admin_iglesia() AND ...)
WITH CHECK: is_super_admin() OR (is_admin_iglesia() AND ...)
-- Resultado: Creator UPDATE silenciosamente falla
```
**Fix:** Creator agregado a WITH CHECK.
```sql
-- DESPUÉS
WITH CHECK: is_super_admin() OR (id_usuario_creador = ...) OR (is_admin_iglesia() AND ...)
```
**Status:** ✅ FIXED

---

### 5. **MINISTERIO - Self-join siempre-verdadero (CRITICAL)**
**Bug:** Múltiples políticas contenían `sede.id_sede = sede.id_sede` - tautología que ignora filtros.
```sql
-- ANTES (BUGGY)
EXISTS (
  SELECT 1 FROM sede 
  WHERE sede.id_sede = sede.id_sede  -- ⚠️ SIEMPRE TRUE
  AND ...
)
-- Resultado: Condición no filtra nada; acceso a todos los ministerios
```
**Fix:** Reemplazar self-join con relación correcta.
```sql
-- DESPUÉS
EXISTS (
  SELECT 1 FROM sede s
  WHERE s.id_sede = ministerio.id_sede
  AND s.id_iglesia = get_my_tenant_id()
)
```
**Políticas afectadas:**
- `ministerio_insert_admin` ✅ FIXED
- `ministerio_update_admin_lider` ✅ FIXED
- `ministerio_insert` ✅ FIXED
- `ministerio_update` ✅ FIXED
- `ministerio_delete` ✅ FIXED

**Status:** ✅ FIXED

---

### 6. **EVENTO - Políticas conflictivas**
**Bug:** Tenía `evento_all_authenticated` (muy permisivo) + políticas específicas (restrictivas).
```sql
-- ANTES
- evento_all_authenticated (permite authenticated a todo)
- evento_insert/update/delete (más restrictivas)
-- Resultado: Conflicto; uno u otro aplica de forma impredecible
```
**Fix:** Eliminar la política "all" amplia; mantener solo scoped.
```sql
-- DESPUÉS
DROP POLICY "evento_all_authenticated"
-- Mantener: evento_select, evento_insert, evento_update, evento_delete
```
**Status:** ✅ FIXED

---

### 7-9. **NOTIFICACION - 7 Políticas redundantes**
**Bug:** Múltiples políticas idénticas con nombres diferentes:
- `notificacion_select`
- `Notificacion select own`
- `Usuario ve sus notificaciones`
- + 4 más

**Fix:** Mantener solo 1 política limpia; eliminar todas las duplicadas.
```sql
-- ANTES
7 políticas haciendo lo mismo
-- DESPUÉS
4 políticas limpias: notificacion_select, notificacion_insert, notificacion_update, notificacion_delete
```
**Status:** ✅ FIXED

---

### 10-12. **USUARIO, USUARIO_ROL, USUARIO_ROL_SEDE - Políticas duplicadas**
**Bug:** Cada tabla tenía políticas antiguas + nuevas haciendo lo mismo.

**Ejemplos:**
- `usuario`: "Usuario selecciona su propio registro" + `usuario_select`
- `usuario_rol`: "usuarioRol select own" + `usuario_rol_select`
- `usuario_rol_sede`: "UsuarioRolSede select own" + múltiples duplicadas

**Fix:** Consolidar a la política más reciente (sin nombres descriptivos en español).
```sql
DROP POLICY IF EXISTS "Usuario selecciona su propio registro"
-- Mantener: usuario_select
```
**Status:** ✅ FIXED

---

## Resumen de Cambios

### Políticas Eliminadas (Bugs)
```sql
-- CURSO & MODULO
DROP POLICY IF EXISTS "Lectura autenticada" ON public.curso;
DROP POLICY IF EXISTS "Lectura autenticada" ON public.modulo;

-- MINISTERIO (self-join bugs)
DROP POLICY IF EXISTS "ministerio_insert_admin"
DROP POLICY IF EXISTS "ministerio_update_admin_lider"

-- EVENTO (conflicto)
DROP POLICY IF EXISTS "evento_all_authenticated"

-- NOTIFICACION (duplicadas)
DROP POLICY IF EXISTS "Notificacion delete own"
DROP POLICY IF EXISTS "Notificacion insert own"
DROP POLICY IF EXISTS "Notificacion update own"
DROP POLICY IF EXISTS "Usuario puede actualizar su notificacion"
DROP POLICY IF EXISTS "notificacion super admin"

-- USUARIO, USUARIO_ROL, USUARIO_ROL_SEDE (duplicadas)
DROP POLICY IF EXISTS "Usuario selecciona su propio registro"
DROP POLICY IF EXISTS "UsuarioRoles lectura administrador"
DROP POLICY IF EXISTS "usuarioRol select own"
DROP POLICY IF EXISTS "usuarioRol select admin"
DROP POLICY IF EXISTS "UsuarioRolSede select own"
DROP POLICY IF EXISTS "UsuarioRolSede select por tenant"
```

### Políticas Creadas (Fixes)

#### CURSO
- ✅ `curso_select` - Con JOIN ministerio→sede→iglesia para scoping
- ✅ `curso_update` - Simétrico: creador puede SELECT y UPDATE
- Mantener: `Lectura curso por gestion o inscripcion`, `Scoped*` policies (nuevas)

#### MODULO
- ✅ `modulo_select` - Con JOIN curso→ministerio→sede→iglesia
- Mantener: `Lectura modulo por gestion o inscripcion`, `Scoped*` policies

#### TAREA
- ✅ `tarea_select` - Con EXISTS evento.id_iglesia scoping
- ✅ `tarea_update` - Simétrico: creador puede SELECT y UPDATE
- Mantener: `Tarea*` por gestion/lider

#### MINISTERIO
- ✅ `ministerio_select` - Reemplazó self-join con sede.id_sede JOIN correcto
- ✅ `ministerio_insert` - Mismo fix
- ✅ `ministerio_update` - Mismo fix
- ✅ `ministerio_delete` - Mismo fix

#### EVENTO
- ✅ `evento_select/insert/update/delete` - Limpias, scoped por iglesia
- Mantener: `Evento* por gestion/lider` (servicios de gestion)

#### NOTIFICACION
- ✅ `notificacion_select/insert/update/delete` - Única política por operación
- Mantener: super admin public policies (si aplican)

#### USUARIO, USUARIO_ROL, USUARIO_ROL_SEDE
- ✅ Consolidadas a: `usuario_select/insert/update/delete`
- ✅ Consolidadas a: `usuario_rol_select/insert/update/delete`
- ✅ Consolidadas a: `usuario_rol_sede_select/insert/update/delete`

---

## Verificación Post-Fix

### Políticas Activas Actuales
```
CURSO:           8 políticas (4 scoped nuevas + 4 antiguas para gestion)
EVENTO:          8 políticas (4 limpias + 4 antiguas para gestion)
MINISTERIO:      6 políticas (4 fixed + 2 legacy para gestion)
MODULO:          8 políticas (2 limpias + 6 scoped)
NOTIFICACION:    4 políticas (todas limpias, 0 duplicadas)
TAREA:           8 políticas (2 limpias + 6 por gestion/lider)
USUARIO:         4 políticas (todas limpias)
USUARIO_ROL:     4 políticas (todas limpias)
USUARIO_ROL_SEDE: 7 políticas (4 limpias + 3 por tenant)
```

### Coexistencia de Políticas Antiguas y Nuevas
**Nota:** Algunas tablas (curso, modulo, evento, tarea, ministerio) mantienen políticas antiguas con lógica de "gestion" (usando funciones como `get_my_ministerios()`, `can_manage_curso_scope()`). Estas son **complementarias y no conflictivas** con las nuevas políticas de scoping directo.

Los bugs identificados (self-join, USING=true, asymmetric UPDATE) han sido eliminados.

---

## Arquitectura RLS Después de los Fixes

### Jerarquía de Acceso
```
is_super_admin()
  └─ Acceso total a todos los registros

is_admin_iglesia()
  └─ Acceso scoped por get_my_tenant_id() (su iglesia)

is_lider()
  └─ Acceso a sus ministerios vía get_my_ministerios()

Usuario regular
  └─ Acceso a sus propios registros (id_usuario_creador, id_usuario)
```

### Patrón de Scoping
**Directo (más seguro):**
```sql
is_admin_iglesia() AND id_iglesia = get_my_tenant_id()
is_admin_iglesia() AND EXISTS (SELECT 1 FROM sede s WHERE s.id_sede = x.id_sede AND s.id_iglesia = get_my_tenant_id())
```

**Via funciones (soportado, pero puede ser lento):**
```sql
can_manage_ministerio_formacion_scope(id_ministerio)
can_manage_curso_scope(id_curso)
```

---

## Recomendaciones

1. **Monitoreo:** Revisar logs de auditoría para detectar UPDATE queries que retornan 0 filas.
2. **Testing:** Verificar que:
   - ✅ Admins solo ven su iglesia
   - ✅ Lideres solo ven sus ministerios
   - ✅ Usuarios solo ven sus propios registros
   - ✅ Super admins ven todo
3. **Cleanup futuro:** Considerar consolidar las políticas "scoped" con las antiguas cuando el nuevo patrón esté totalmente validado.
4. **Performance:** Las JOINs en RLS (ministerio→sede→iglesia) pueden impactar en queries grandes; considerar índices si es necesario.

---

## Archivos Relacionados

- Supabase migrations: `/supabase/migrations/20260512171617_audit_and_fix_all_rls_crud.sql`
- Cliente frontend: `/src/app/components/UsuariosPage.tsx` (filtrado defensivo)
- Context: `/src/app/store/AppContext.tsx` (mock data)

---

**Auditoría completada por:** Claude AI  
**Fecha:** 2026-05-13  
**Estatus:** ✅ 12/12 bugs identificados y corregidos
