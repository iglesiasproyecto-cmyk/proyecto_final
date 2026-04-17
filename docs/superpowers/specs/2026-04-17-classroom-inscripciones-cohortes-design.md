# Classroom — Sub-proyecto A: Inscripciones + Ciclos Lectivos

**Fecha:** 2026-04-17
**Alcance:** Primer sub-proyecto del plan "Formación → Classroom completo". Convierte el aula actual (admin-only CRUD de cursos) en un sistema donde los estudiantes pueden estar inscritos en cohortes y ver sus cursos.

## Contexto

Hoy `ClassroomPage.tsx` permite a `super_admin` y `admin_iglesia` crear cursos, módulos y recursos. `CiclosLectivosPage.tsx` muestra cohortes (`proceso_asignado_curso`) y participantes (`detalle_proceso_curso`), pero **el formulario de "Nuevo Ciclo" no está cableado** (el botón Crear solo cierra el diálogo) y **no existe ningún flujo para añadir participantes**. Los roles `lider` y `servidor` no tienen una vista de "Mis Cursos".

El plan general está descompuesto en cuatro sub-proyectos:

| # | Sub-proyecto | Estado |
|---|---|---|
| **A** | **Inscripciones + cohortes** (este spec) | En diseño |
| B | Módulo enriquecido (contenido, entregas, eval inline) | Pendiente |
| C | Dashboards (estudiante + instructor) | Pendiente |
| D | Completación + certificados | Pendiente |

Cada sub-proyecto tendrá su propio ciclo spec → plan → implementación.

## Decisiones (9)

1. **Quién inscribe:** `super_admin`, `admin_iglesia` y el `lider` del ministerio dueño del curso. El estudiante es pasivo (no se autoinscribe en A).
2. **Pool de candidatos:** por defecto miembros del ministerio dueño del curso. `super_admin`/`admin_iglesia` pueden hacer *override* para inscribir a cualquier usuario de la iglesia del ciclo.
3. **Entry points:** botón "+ Inscribir" en `CiclosLectivosPage` (detalle del ciclo) y en `ClassroomPage` (detalle del curso, bloque "Ciclos activos"). Ambos abren el mismo modal.
4. **Modo del picker:** multi-select con search. Sin chips ni filtros rápidos (YAGNI).
5. **Vista del estudiante:** nueva página `MisCursosPage` con tabs `Activos` / `Finalizados`. Cards por inscripción (`detalle_proceso_curso`), no por curso.
6. **Estados manejables en A:** solo `inscrito` y `retirado`. `en_progreso` y `completado` existen en la DB pero se muestran como badges read-only — la automatización llega en Sub-proyecto B.
7. **Retiro blando:** `UPDATE detalle_proceso_curso SET estado='retirado'`. Sin DELETE. Reversible via re-inscripción.
8. **Unicidad:** un usuario no puede tener dos inscripciones activas (`inscrito` o `en_progreso`) del mismo `id_curso`, aunque sean en ciclos distintos. Se valida en el RPC; además hay un partial unique index a nivel (`id_usuario`, `id_proceso_asignado_curso`) para cubrir el doble envío del mismo lote.
9. **Privacidad de compañeros:** los estudiantes ven los nombres (no los correos) de sus compañeros del ciclo. Admin/líder ven todo.

## No-alcance

- Tracking de progreso por módulo (→ Sub-proyecto B).
- Transiciones automáticas `inscrito → en_progreso → completado` (→ B).
- Editor de contenido enriquecido, entregas, evaluaciones inline (→ B).
- Dashboards de instructor con calificación en batch y estadísticas (→ C).
- Certificados y completación automática (→ D).
- Auto-inscripción por parte del estudiante / códigos de invitación al estilo Google Classroom.

## Arquitectura

### Capa de datos

**Nueva función helper** (porque aún no existe):

```sql
CREATE FUNCTION public.current_usuario_id() RETURNS bigint
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id_usuario FROM public.usuario WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE FUNCTION public.is_lider_of_ministerio(target_ministerio_id bigint) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT target_ministerio_id IN (SELECT public.get_user_ministerios());
$$;
-- Nota: get_user_ministerios() ya existe (migración 20260416140000).
```

**Helper de autorización para inscripción:**

```sql
CREATE FUNCTION public.can_enroll_in_ciclo(target_ciclo_id bigint) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proceso_asignado_curso pac
    JOIN public.curso c ON c.id_curso = pac.id_curso
    WHERE pac.id_proceso_asignado_curso = target_ciclo_id
      AND (
        public.is_super_admin()
        OR public.is_admin_of_iglesia(pac.id_iglesia)
        OR public.is_lider_of_ministerio(c.id_ministerio)
      )
  );
$$;
```

**Partial unique index** sobre `detalle_proceso_curso`:

```sql
CREATE UNIQUE INDEX detalle_proceso_curso_activo_por_ciclo
  ON public.detalle_proceso_curso (id_usuario, id_proceso_asignado_curso)
  WHERE estado IN ('inscrito','en_progreso');
```

La unicidad por `id_curso` (cubre la regla de Decisión 8) se valida dentro del RPC `enroll_users`, no con un índice, para no bloquear histórico de re-inscripciones legítimas.

**CHECK constraint** sobre `proceso_asignado_curso` (añadir si no existe):

```sql
ALTER TABLE public.proceso_asignado_curso
  ADD CONSTRAINT proceso_asignado_curso_fechas_ok
  CHECK (fecha_inicio <= fecha_fin);
```

**Políticas RLS de `detalle_proceso_curso`:** se reemplazan las de Fase B (que solo admitían admin) por un conjunto nuevo.

```sql
DROP POLICY IF EXISTS "Scoped insert detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Scoped update detalle_proceso_curso" ON public.detalle_proceso_curso;
DROP POLICY IF EXISTS "Scoped delete detalle_proceso_curso" ON public.detalle_proceso_curso;

CREATE POLICY "Enroll insert detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR INSERT TO authenticated
  WITH CHECK (public.can_enroll_in_ciclo(id_proceso_asignado_curso));

CREATE POLICY "Enroll update detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR UPDATE TO authenticated
  USING (public.can_enroll_in_ciclo(id_proceso_asignado_curso))
  WITH CHECK (public.can_enroll_in_ciclo(id_proceso_asignado_curso));

CREATE POLICY "Enroll delete detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR DELETE TO authenticated
  USING (public.can_enroll_in_ciclo(id_proceso_asignado_curso));

CREATE POLICY "Select own or manageable detalle_proceso_curso"
  ON public.detalle_proceso_curso FOR SELECT TO authenticated
  USING (
    id_usuario = public.current_usuario_id()
    OR public.can_enroll_in_ciclo(id_proceso_asignado_curso)
    OR EXISTS (
      SELECT 1 FROM public.detalle_proceso_curso self
      WHERE self.id_proceso_asignado_curso = detalle_proceso_curso.id_proceso_asignado_curso
        AND self.id_usuario = public.current_usuario_id()
        AND self.estado IN ('inscrito','en_progreso','completado')
    )
  );
```

**Vista `v_companeros_ciclo`** (solo datos no sensibles):

```sql
CREATE OR REPLACE VIEW public.v_companeros_ciclo
WITH (security_invoker = true) AS
SELECT
  dpc.id_detalle_proceso_curso,
  dpc.id_proceso_asignado_curso,
  dpc.id_usuario,
  dpc.estado,
  u.nombres,
  u.apellidos
FROM public.detalle_proceso_curso dpc
JOIN public.usuario u ON u.id_usuario = dpc.id_usuario
WHERE dpc.estado IN ('inscrito','en_progreso','completado');

-- security_invoker = true hace que la vista corra con la RLS del usuario que consulta,
-- no con la del owner (postgres). Así respeta tanto la SELECT policy de detalle_proceso_curso
-- como la de usuario (Fase 6). Sin esto, la vista bypassa RLS y filtra datos.
GRANT SELECT ON public.v_companeros_ciclo TO authenticated;
```

### RPC `enroll_users`

```sql
CREATE FUNCTION public.enroll_users(
  p_ciclo_id bigint,
  p_user_ids bigint[],
  p_override_ministerio boolean DEFAULT false
)
RETURNS TABLE (
  id_usuario bigint,
  estado text,       -- 'inscrito' | 'reactivado' | 'skipped_duplicate' | 'skipped_not_eligible' | 'skipped_ciclo_cerrado'
  id_detalle bigint  -- NULL si skipped
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
...
$$;
```

**Validaciones globales (lanzan EXCEPTION, abortan el lote):**

1. `can_enroll_in_ciclo(p_ciclo_id)` debe ser true.
2. Si `p_override_ministerio = true`, el caller debe ser `super_admin` o `is_admin_of_iglesia(iglesia_del_ciclo)`. Líder nunca puede hacer override.
3. El ciclo debe estar en estado `programado` o `en_curso`.

**Procesamiento por usuario (sin abortar el lote):**

- **Elegibilidad:**
  - `p_override_ministerio = false`: el usuario debe estar activo en `miembro_ministerio` del ministerio dueño del curso. Si no → `skipped_not_eligible`.
  - `p_override_ministerio = true`: el usuario debe pertenecer a la iglesia del ciclo (hay fila en `usuario_rol` con `id_iglesia` = iglesia del ciclo). Si no → `skipped_not_eligible`.
- **Duplicado activo por curso:** si ya existe fila con ese `id_usuario` y el mismo `id_curso` (vía join al ciclo) con estado `inscrito`/`en_progreso`, incluso en otro ciclo → `skipped_duplicate`.
- **Re-inscripción en el mismo ciclo:** si existe fila en ese ciclo con estado `retirado`, `UPDATE` a `inscrito` con `fecha_inscripcion = now()`. Resultado: `reactivado`.
- **Inscripción nueva:** `INSERT` con `estado = 'inscrito'`. Resultado: `inscrito`.

**Atomicidad:** toda la función corre en una transacción. Excepciones globales revierten todo; clasificaciones individuales se reportan en el result set. El cliente arma un resumen tipo `"5 inscritos, 1 reactivado, 2 omitidos (ya activos)"`.

**Grants:** `GRANT EXECUTE ON FUNCTION public.enroll_users(bigint, bigint[], boolean) TO authenticated;`.

### RPC `get_enrollment_candidates`

```sql
CREATE FUNCTION public.get_enrollment_candidates(
  p_ciclo_id bigint,
  p_override_ministerio boolean DEFAULT false
)
RETURNS TABLE (
  id_usuario bigint,
  nombres text,
  apellidos text,
  correo text,               -- solo visible para admin/líder
  ministerio_principal text,
  ya_inscrito_activo_en_curso boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ ... $$;
```

Valida `can_enroll_in_ciclo(p_ciclo_id)` al entrar. Aplica las mismas reglas de elegibilidad que `enroll_users`. Devuelve la lista ordenada por apellido, marcando con `ya_inscrito_activo_en_curso = true` a quienes están bloqueados por la regla de unicidad (se mostrarán deshabilitados en el picker).

### Retiro / reactivación individual

No requieren RPC. Se hacen con `UPDATE` directo contra la RLS:

- **Retirar:** `UPDATE detalle_proceso_curso SET estado='retirado' WHERE id_detalle_proceso_curso = $1`.
- **Reactivar:** `UPDATE detalle_proceso_curso SET estado='inscrito' WHERE id_detalle_proceso_curso = $1` (solo si hoy está `retirado`). La regla de unicidad por curso se verifica en el backend con un trigger `BEFORE UPDATE` que lanza EXCEPTION si el usuario tiene otra inscripción activa del mismo curso; de esa forma la acción "Reactivar" falla limpia en vez de crear inconsistencia.

### Capa frontend

**Hooks nuevos** (`src/hooks/useCursos.ts` o nuevo `src/hooks/useInscripciones.ts`):

- `useEnrollmentCandidates(cicloId, overrideMinisterio)` — React Query sobre `get_enrollment_candidates`.
- `useEnrollUsers()` — mutation que llama a `enroll_users`, retorna el result set tipado e invalida `['detalles-proceso-curso', cicloId]`, `['mis-inscripciones']`.
- `useRetirarInscripcion()` — mutation UPDATE individual.
- `useReactivarInscripcion()` — mutation UPDATE individual.
- `useMisInscripciones()` — query que trae las inscripciones del usuario actual con joins al curso y al ciclo.
- `useCreateProcesoAsignadoCurso()` — ya debería existir en `cursos.service.ts`; si no, se añade (mutation INSERT con invalidación del listado).

**Servicios nuevos** (`src/services/inscripciones.service.ts`): thin wrappers sobre `supabase.rpc(...)` / `from(...).update(...)`.

**Componentes nuevos:**

- `src/app/components/classroom/EnrollmentPickerModal.tsx` — modal compartido. Props: `{ ciclo, onClose, onEnrolled }`. Internamente:
  - Header con título "Inscribir a {curso}" y badge de estado del ciclo.
  - Toggle `Solo miembros del ministerio ↔ Cualquier usuario de la iglesia`, visible solo si el caller es admin; líder ve el toggle deshabilitado en "solo miembros".
  - `Input` de búsqueda (filtra client-side sobre la lista ya traída).
  - Lista con checkbox por fila (avatar inicial + nombres + ministerio). Usuarios con `ya_inscrito_activo_en_curso = true` aparecen deshabilitados con tooltip.
  - Footer con contador "N seleccionados" y botones Cancelar / Inscribir.
  - Al confirmar: llama a `useEnrollUsers` y muestra un toast con el resumen. Cierra el modal y llama a `onEnrolled(result)`.
- `src/app/components/classroom/EstadoInscripcionBadge.tsx` — badge read-only; reutiliza los estilos de `estadoInscripcionConfig` que hoy están inline en `CiclosLectivosPage`.
- `src/app/components/classroom/CompanerosDrawer.tsx` — drawer lateral con la lista de compañeros (consumido por la card de `MisCursosPage`).

**Cambios en componentes existentes:**

- `src/app/components/CiclosLectivosPage.tsx`:
  - Cablear el form "Nuevo Ciclo": state para `idCursoSel`, `fechaInicio`, `fechaFin`, `estadoInicial`, validación (curso requerido, `fechaInicio <= fechaFin`, estado en `['programado','en_curso']`), invocación de `useCreateProcesoAsignadoCurso`.
  - En `CicloDetail`: botón "+ Inscribir" junto al encabezado "Participantes inscritos", visible si el usuario puede inscribir (se deriva client-side de `rolActual` + `iglesiaActual` + ministerio del curso, espejando `can_enroll_in_ciclo`). Abre `EnrollmentPickerModal`.
  - En cada fila de participante: botón `Retirar` (icon) con confirm dialog; si el estado es `retirado`, reemplazar por `Reactivar`. Ambos disparan las mutations individuales.
- `src/app/components/ClassroomPage.tsx`:
  - En la vista de detalle de curso (`selectedCurso`), añadir bloque "Ciclos activos" que lista `proceso_asignado_curso` filtrados por `id_curso` con estado `programado`/`en_curso`. Cada fila tiene "+ Inscribir" que abre el mismo modal preseleccionando el ciclo. Ciclos históricos colapsados en un toggle "Ver histórico".
- `src/app/routes.ts` y `src/app/components/AppLayout.tsx`:
  - Añadir ruta `/app/mis-cursos` y entrada al sidebar visible para todos los roles.

**Página nueva `src/app/components/MisCursosPage.tsx`:**

- Header con stats mínimas (activos / finalizados) y título.
- Tabs `Activos` (estados `inscrito`, `en_progreso`) y `Finalizados` (`completado`, `retirado`).
- Grid de cards (2–3 columnas). Cada card: nombre del curso, ministerio + iglesia, badge de estado, rango de fechas del ciclo, barra de progreso al 0% con tooltip "El progreso se activará cuando el instructor añada contenido de módulos" (placeholder de cara a Sub-proyecto B), botón "Ver aula" que lleva al detalle de curso (en A solo muestra módulos read-only), botón secundario "Compañeros" que abre `CompanerosDrawer`.
- Sin empty state negativo agresivo: si no hay inscripciones, mostrar copy amable "Aún no estás inscrito en ningún curso. Tu líder o admin te inscribirá".

## Reglas de negocio (tabla de verdad)

| Caso | Comportamiento |
|---|---|
| Ciclo `finalizado`/`cancelado`: tentativa de inscribir | UI oculta el botón; RPC lanza EXCEPTION. |
| Usuario ya activo en otro ciclo del mismo curso | `skipped_duplicate`; fila deshabilitada en el picker con tooltip del ciclo que ocupa. |
| Usuario no elegible (no está en ministerio y no hay override) | `skipped_not_eligible`; fila no aparece en el picker. |
| Líder envía `override=true` por bypass | RPC lanza EXCEPTION (solo admin puede override). |
| Retirar a usuario en ciclo `finalizado` | Permitido (corrección histórica). |
| Re-inscribir en mismo ciclo a un retirado | UPDATE a `inscrito`, `fecha_inscripcion = now()`. Reportado como `reactivado`. |
| Crear ciclo con fechas inválidas | Bloqueo en UI + CHECK constraint a nivel DB. |
| Crear ciclo con estado `finalizado`/`cancelado` directo | UI solo ofrece `programado`/`en_curso`. |
| Estudiante lee inscripciones de otro ciclo al que no pertenece | Bloqueado por SELECT policy. |

## Migraciones

En orden, con timestamps consecutivos posteriores a los existentes:

1. `20260417120000_enrollment_helpers_and_constraints.sql`
   - `current_usuario_id()`, `is_lider_of_ministerio()`, `can_enroll_in_ciclo()`.
   - Partial unique index `detalle_proceso_curso_activo_por_ciclo`.
   - CHECK constraint de fechas en `proceso_asignado_curso` (si no existe).
   - Trigger `BEFORE UPDATE` que bloquea reactivar a `inscrito` si existe otra inscripción activa del mismo curso.
2. `20260417120100_enrollment_rls_and_view.sql`
   - Drop + recreate de las policies de `detalle_proceso_curso` (INSERT/UPDATE/DELETE/SELECT).
   - Creación de la vista `v_companeros_ciclo` con `GRANT SELECT`.
3. `20260417120200_rpc_enrollment.sql`
   - `get_enrollment_candidates(bigint, boolean)`.
   - `enroll_users(bigint, bigint[], boolean)`.
   - Grants `EXECUTE ... TO authenticated`.

Cada migración es idempotente (`CREATE OR REPLACE`, `DROP ... IF EXISTS`, `CREATE INDEX IF NOT EXISTS` donde aplique).

Post-migración: regenerar tipos (`supabase gen types typescript --project-id ... > src/types/database.types.ts`) antes del merge del frontend.

## Testing

No hay framework de tests en el proyecto. Verificación:

- **SQL ad-hoc:** script `scripts/test-enrollment.sql` que siembra un caso pequeño (1 iglesia, 1 ministerio, 1 curso, 1 ciclo, 3 usuarios) y ejecuta el RPC con varios escenarios (duplicado, override, ciclo cerrado, líder sin permiso), validando con `ASSERT`. Se corre manualmente contra un branch de Supabase.
- **Manual por rol:** checklist al final del plan para `super_admin`, `admin_iglesia`, `lider`, `servidor` validando qué ve y qué puede hacer en CiclosLectivos, ClassroomPage y MisCursos.
- **Tipado:** `npm run build` sin errores TypeScript tras regenerar los tipos.

## Observabilidad

Para A se parte simple: el RPC loguea con `RAISE NOTICE 'enrollment: caller=% ciclo=% result=%'` el resumen por invocación. Si en operación real se necesita auditoría persistente, añadir tabla `audit_enrollment (id, caller_id, ciclo_id, payload jsonb, resultado jsonb, creado_en)` en un spec posterior — se deja como opción, no se incluye en la primera entrega (YAGNI).

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El trigger de "no reactivar si hay otra activa" falla en silencio y deja la UI confundida | La mutation captura la EXCEPTION y muestra toast explícito; el backend debe usar `RAISE EXCEPTION USING HINT = ...`. |
| La vista `v_companeros_ciclo` expone demasiado en un futuro join con `usuario` | Solo proyecta `nombres`, `apellidos`. Cualquier join nuevo que la amplíe requiere revisión de la SELECT policy. |
| El partial unique index choca con re-inscripciones legítimas tras retirar | No: el retiro cambia el estado a `retirado`, que está fuera del `WHERE` del índice, así que la re-inscripción pasa. |
| El override de admin se presta a abuso operativo | Toast de confirmación antes de llamar al RPC cuando `override=true`, con copy "Inscribirás a personas fuera del ministerio del curso". |

## Siguiente paso

Este spec precede al plan de implementación. El plan desglosará estas migraciones + componentes en tareas ejecutables con checkpoints.
