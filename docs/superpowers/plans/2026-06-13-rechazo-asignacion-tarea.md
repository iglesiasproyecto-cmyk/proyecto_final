# Rechazo de Asignación de Tarea — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un asignado rechace su asignación de tarea (con nota obligatoria) dentro de una ventana de tiempo configurable por tarea, notificando al líder/creador para que reasigne.

**Architecture:** Estado de rechazo como columnas consultables en `tarea_asignada` + bitácora en `tarea_aprobacion`. La mutación corre por un RPC `SECURITY DEFINER` que valida ventana, autoría y nota, actualiza la asignación, audita, y notifica al creador respetando RLS (mismo patrón que `rpc_notificar_contenido_curso`). UI: botón de rechazo en la vista del servidor, badge de rechazo en la vista del líder, y campo de margen en el formulario de crear tarea.

**Tech Stack:** React 18 + Vite + TypeScript, TanStack Query, Supabase (Postgres + RLS + RPC), Tailwind v4, shadcn/ui. Migraciones vía Supabase MCP `apply_migration` (no CLI). Sin test runner: la verificación es `npm run build` (typecheck) + comprobaciones SQL vía MCP `execute_sql` + verificación manual en la UI.

**Spec:** `docs/superpowers/specs/2026-06-13-rechazo-asignacion-tarea-design.md`

---

## Convenciones de verificación (sin test runner)

Este proyecto no tiene `test`/`lint` (ver CLAUDE.md). Por tanto:
- **Typecheck/compilación:** `npm run build` debe terminar sin errores de TypeScript.
- **DB:** las aserciones se hacen con consultas SQL vía Supabase MCP `execute_sql`.
- **UI:** verificación manual descrita por escenario en cada tarea de UI.

Commits frecuentes: uno por tarea.

---

## Task 1: Migración — enum `estado_asignacion_tarea` + columnas

**Files:**
- DB migration vía Supabase MCP `apply_migration`, nombre: `rechazo_asignacion_tarea_schema`

- [ ] **Step 1: Inspeccionar el esquema actual**

Usar MCP `list_tables` (schemas: `["public"]`) y confirmar que `tarea` y `tarea_asignada` existen y que NO tienen aún las columnas nuevas. Confirmar que el enum `estado_asignacion_tarea` no existe con:

```sql
select 1 from pg_type where typname = 'estado_asignacion_tarea';
```

Esperado: 0 filas.

- [ ] **Step 2: Aplicar la migración**

MCP `apply_migration` con `name: "rechazo_asignacion_tarea_schema"` y query:

```sql
create type estado_asignacion_tarea as enum ('activa', 'rechazada');

alter table public.tarea
  add column horas_margen_rechazo int not null default 12;

alter table public.tarea_asignada
  add column estado_asignacion public.estado_asignacion_tarea not null default 'activa',
  add column motivo_rechazo text,
  add column fecha_rechazo timestamptz;
```

- [ ] **Step 3: Verificar columnas y enum**

MCP `execute_sql`:

```sql
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_name in ('tarea','tarea_asignada')
  and column_name in ('horas_margen_rechazo','estado_asignacion','motivo_rechazo','fecha_rechazo')
order by table_name, column_name;
```

Esperado: 4 filas. `horas_margen_rechazo` con default `12` y `is_nullable = NO`; `estado_asignacion` con default `'activa'::estado_asignacion_tarea` y `is_nullable = NO`; `motivo_rechazo` y `fecha_rechazo` nullable.

- [ ] **Step 4: Verificar enum**

```sql
select enumlabel from pg_enum e
join pg_type t on t.oid = e.enumtypid
where t.typname = 'estado_asignacion_tarea' order by e.enumsortorder;
```

Esperado: dos filas — `activa`, `rechazada`.

- [ ] **Step 5: Regenerar tipos de TypeScript**

MCP `generate_typescript_types` y reemplazar el contenido de `src/types/database.types.ts` con el resultado. Confirmar que aparece `estado_asignacion_tarea` en `Enums` y las nuevas columnas en `tarea` y `tarea_asignada`.

- [ ] **Step 6: Verificar que compila**

Run: `npm run build`
Expected: build OK, sin errores de TypeScript.

- [ ] **Step 7: Commit**

```bash
git add src/types/database.types.ts
git commit -m "feat(tareas): esquema de rechazo de asignacion (enum + columnas)"
```

---

## Task 2: Migración — RPC `rpc_rechazar_asignacion_tarea`

**Files:**
- DB migration vía MCP `apply_migration`, nombre: `rpc_rechazar_asignacion_tarea`

**Contexto de resolución de usuario:** El proyecto resuelve el `id_usuario` a partir de `auth.uid()`. Antes de escribir el RPC, confirmar la columna de enlace.

- [ ] **Step 1: Confirmar cómo se enlaza `auth.uid()` con `usuario`**

MCP `execute_sql`:

```sql
select column_name from information_schema.columns
where table_name = 'usuario'
  and column_name in ('auth_user_id','auth_id','user_id','id_auth');
```

Y revisar una RPC existente que ya resuelva el usuario actual, p. ej.:

```sql
select pg_get_functiondef('public.rpc_notificar_contenido_curso'::regprocedure);
```

Usar en el RPC nuevo **el mismo mecanismo** de resolución que use esa función (la columna real, p. ej. `usuario.auth_user_id = auth.uid()`). En los pasos siguientes se asume `usuario.auth_user_id`; **sustituir por la columna confirmada** si difiere.

- [ ] **Step 2: Aplicar la migración del RPC**

MCP `apply_migration` con `name: "rpc_rechazar_asignacion_tarea"` y query (ajustar `auth_user_id` si el Step 1 reveló otra columna):

```sql
create or replace function public.rpc_rechazar_asignacion_tarea(
  p_id_tarea_asignada bigint,
  p_motivo text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller    bigint;
  v_asig      tarea_asignada%rowtype;
  v_tarea     tarea%rowtype;
  v_nombre    text;
  v_limite_ok boolean;
begin
  -- 1. Resolver usuario actual
  select id_usuario into v_caller
  from usuario where auth_user_id = auth.uid();
  if v_caller is null then
    raise exception 'no_autorizado' using errcode = 'P0001';
  end if;

  -- 2. Cargar asignación y tarea
  select * into v_asig from tarea_asignada where id_tarea_asignada = p_id_tarea_asignada;
  if not found then
    raise exception 'asignacion_inexistente' using errcode = 'P0001';
  end if;
  if v_asig.id_usuario <> v_caller then
    raise exception 'no_autorizado' using errcode = 'P0001';
  end if;

  select * into v_tarea from tarea where id_tarea = v_asig.id_tarea;

  -- 3. Nota obligatoria
  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception 'motivo_requerido' using errcode = 'P0001';
  end if;

  -- 4a. Ya rechazada
  if v_asig.estado_asignacion = 'rechazada' then
    raise exception 'ya_rechazada' using errcode = 'P0001';
  end if;

  -- 4b. Tarea ya iniciada
  if v_tarea.estado <> 'pendiente' then
    raise exception 'fuera_de_ventana' using errcode = 'P0001';
  end if;

  -- 4c. Ventana temporal (si hay fecha límite)
  v_limite_ok := v_tarea.fecha_limite is null
    or now() <= v_tarea.fecha_limite - make_interval(hours => v_tarea.horas_margen_rechazo);
  if not v_limite_ok then
    raise exception 'fuera_de_ventana' using errcode = 'P0001';
  end if;

  -- 5. Marcar rechazada
  update tarea_asignada
  set estado_asignacion = 'rechazada',
      motivo_rechazo = p_motivo,
      fecha_rechazo = now()
  where id_tarea_asignada = p_id_tarea_asignada;

  -- 6. Bitácora
  insert into tarea_aprobacion (id_tarea, id_usuario, accion, observaciones)
  values (v_tarea.id_tarea, v_caller, 'rechazo_asignacion', p_motivo);

  -- 7. Notificar al creador
  select btrim(coalesce(nombres,'') || ' ' || coalesce(apellidos,''))
  into v_nombre from usuario where id_usuario = v_caller;

  insert into notificacion (id_usuario, titulo, mensaje, tipo)
  values (
    v_tarea.id_usuario_creador,
    'Tarea rechazada',
    v_nombre || ' rechazó la tarea "' || v_tarea.titulo || '": ' || p_motivo
      || ' [TASK_ID:' || v_tarea.id_tarea || ']',
    'tarea'
  );
end;
$$;

grant execute on function public.rpc_rechazar_asignacion_tarea(bigint, text) to authenticated;
```

- [ ] **Step 3: Verificar que la función existe**

MCP `execute_sql`:

```sql
select proname, prosecdef from pg_proc
where proname = 'rpc_rechazar_asignacion_tarea';
```

Esperado: 1 fila, `prosecdef = true` (SECURITY DEFINER).

- [ ] **Step 4: Verificar advisors de seguridad**

MCP `get_advisors` con `type: "security"`. Confirmar que no introduce hallazgos nuevos críticos sobre la función (search_path está fijado, lo cual es correcto).

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "feat(tareas): RPC rpc_rechazar_asignacion_tarea (security definer)"
```

(La función vive en la base de datos; el commit deja constancia del paso. Si el flujo del repo versiona migraciones SQL en archivos, añadir también ese archivo al commit.)

---

## Task 3: Migración — extender `create_tarea` con `p_horas_margen_rechazo`

**Files:**
- DB migration vía MCP `apply_migration`, nombre: `create_tarea_horas_margen`

El servicio `createTarea` llama al RPC `create_tarea`. Para que el líder pueda fijar el margen al crear, el RPC debe aceptar el nuevo parámetro **opcional** (default 12) sin romper llamadas existentes.

- [ ] **Step 1: Obtener la definición actual del RPC**

MCP `execute_sql`:

```sql
select pg_get_functiondef('public.create_tarea'::regprocedure);
```

Copiar el cuerpo actual. Identificar el `insert into tarea (...)` para añadir la columna nueva.

- [ ] **Step 2: Recrear el RPC añadiendo el parámetro**

MCP `apply_migration` con `name: "create_tarea_horas_margen"`. Reusar el cuerpo del Step 1, añadiendo **al final** de la lista de parámetros:

```
p_horas_margen_rechazo int default 12
```

y en el `insert into tarea (...)` añadir la columna `horas_margen_rechazo` con valor `coalesce(p_horas_margen_rechazo, 12)`. Mantener intactos el resto de parámetros, el orden de los previos, y el `returns` original.

> Importante: añadir el parámetro **al final con default** preserva la firma para los llamadores actuales. Si Postgres se queja por sobrecarga ambigua, hacer `drop function public.create_tarea(<firma vieja>)` antes del `create` (incluir el drop en la misma migración).

- [ ] **Step 3: Verificar la nueva firma**

MCP `execute_sql`:

```sql
select pg_get_function_arguments(p.oid)
from pg_proc p where p.proname = 'create_tarea';
```

Esperado: la lista de argumentos incluye `p_horas_margen_rechazo integer DEFAULT 12`.

- [ ] **Step 4: Prueba funcional del default**

Crear una tarea de prueba vía SQL (con un `id_ministerio` e `id_usuario_creador` válidos existentes; consultarlos antes) y confirmar `horas_margen_rechazo = 12`. Luego **borrarla**:

```sql
-- sustituir IDs por unos válidos consultados antes
select * from create_tarea('Prueba margen', null, null, 'media', <id_creador>, <id_min>, null);
select id_tarea, horas_margen_rechazo from tarea where titulo = 'Prueba margen';
delete from tarea where titulo = 'Prueba margen';
```

Esperado: la fila intermedia muestra `horas_margen_rechazo = 12`.

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "feat(tareas): create_tarea acepta p_horas_margen_rechazo (default 12)"
```

---

## Task 4: Tipos de aplicación

**Files:**
- Modify: `src/types/app.types.ts:217-244`

- [ ] **Step 1: Añadir campos a `Tarea` y `TareaAsignada`**

En `src/types/app.types.ts`, dentro de `interface Tarea` (tras `archivedAt?`):

```typescript
  horasMargenRechazo: number
```

Dentro de `interface TareaAsignada` (tras `nombreCompleto?`):

```typescript
  estadoAsignacion: 'activa' | 'rechazada'
  motivoRechazo: string | null
  fechaRechazo: string | null
```

- [ ] **Step 2: Verificar compilación**

Run: `npm run build`
Expected: aparecerán errores en `eventos.service.ts` (los mappers aún no setean los campos nuevos). Esto es esperado y se resuelve en Task 5. Si no aparece ningún error nuevo relacionado, revisar que los campos se añadieron como **requeridos** (sin `?`) para forzar el mapeo.

- [ ] **Step 3: Commit**

```bash
git add src/types/app.types.ts
git commit -m "feat(tareas): campos de rechazo en tipos Tarea/TareaAsignada"
```

---

## Task 5: Capa de servicio — mappers, createTarea, rechazarAsignacionTarea

**Files:**
- Modify: `src/services/eventos.service.ts:29-58` (mappers)
- Modify: `src/services/eventos.service.ts:139-164` (createTarea)
- Modify: `src/services/eventos.service.ts` (nueva función al final de la sección TareaAsignada CRUD)

- [ ] **Step 1: Mapear `horasMargenRechazo` en `mapTarea`**

En `mapTarea` (línea ~43, tras `archivedAt`):

```typescript
    archivedAt: (r as any).archived_at ?? null,
    horasMargenRechazo: (r as any).horas_margen_rechazo ?? 12,
```

- [ ] **Step 2: Mapear campos de rechazo en `mapTareaAsignada`**

En `mapTareaAsignada` (tras `actualizadoEn`):

```typescript
    actualizadoEn: r.updated_at,
    estadoAsignacion: ((r as any).estado_asignacion ?? 'activa') as 'activa' | 'rechazada',
    motivoRechazo: (r as any).motivo_rechazo ?? null,
    fechaRechazo: (r as any).fecha_rechazo ?? null,
```

- [ ] **Step 3: Pasar `horasMargenRechazo` en `createTarea`**

En la firma del objeto `data` de `createTarea` añadir:

```typescript
    idEvento?: number | null
    horasMargenRechazo?: number
```

Y en la llamada `supabase.rpc('create_tarea', {...})` añadir:

```typescript
    p_id_evento: data.idEvento ?? null,
    p_horas_margen_rechazo: data.horasMargenRechazo ?? 12,
```

- [ ] **Step 4: Añadir la función `rechazarAsignacionTarea`**

Tras `updateTareaAsignada` (línea ~534), añadir:

```typescript
export async function rechazarAsignacionTarea(
  idTareaAsignada: number,
  motivo: string
): Promise<void> {
  const { error } = await supabase.rpc('rpc_rechazar_asignacion_tarea', {
    p_id_tarea_asignada: idTareaAsignada,
    p_motivo: motivo,
  })
  if (error) throw error
}
```

- [ ] **Step 5: Verificar compilación**

Run: `npm run build`
Expected: build OK (los errores de Task 4 desaparecen).

- [ ] **Step 6: Commit**

```bash
git add src/services/eventos.service.ts
git commit -m "feat(tareas): servicio de rechazo + mapeo de campos nuevos"
```

---

## Task 6: Hook `useRechazarAsignacion`

**Files:**
- Modify: `src/hooks/useEventos.ts:4-14` (import) y tras `useUpdateTareaEstado` (línea ~79)

- [ ] **Step 1: Importar la función de servicio**

En el bloque de import desde `@/services/eventos.service` (líneas 4-14), añadir `rechazarAsignacionTarea` a la lista:

```typescript
  getTareaEvidencias, createTareaEvidencia,
  getEventosPorMinisterio,
  rechazarAsignacionTarea,
```

- [ ] **Step 2: Añadir el hook**

Tras `useUpdateTareaEstado` (línea ~79):

```typescript
export function useRechazarAsignacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idTareaAsignada, motivo }: { idTareaAsignada: number; motivo: string }) =>
      rechazarAsignacionTarea(idTareaAsignada, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas'] })
      qc.invalidateQueries({ queryKey: ['tareas-enriquecidas'] })
      qc.invalidateQueries({ queryKey: ['tareas-asignadas'] })
      qc.invalidateQueries({ queryKey: ['notificaciones'] })
    },
  })
}
```

- [ ] **Step 3: Verificar compilación**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useEventos.ts
git commit -m "feat(tareas): hook useRechazarAsignacion"
```

---

## Task 7: UI Servidor — botón rechazar, diálogo de motivo, badge y filtro

**Files:**
- Modify: `src/app/components/tareas/ServidorTareasView.tsx`

- [ ] **Step 1: Imports y hook**

En el import de hooks (líneas 2-6) añadir `useRechazarAsignacion`:

```typescript
import {
  useTareasEnriquecidas, useUpdateTareaEstado,
  useTareaEvidencias, useCreateTareaEvidencia,
  useRechazarAsignacion,
} from "@/hooks/useEventos"
```

Añadir iconos `XCircle` y `Ban` al import de `lucide-react` (línea 14-17):

```typescript
  ListTodo, CheckCircle2, Clock, AlertCircle,
  Calendar, Paperclip, Inbox, ChevronRight, XCircle, Ban,
```

Añadir el componente `Textarea`:

```typescript
import { Textarea } from "@/app/components/ui/textarea"
```

(Si no existe `textarea.tsx` en `src/app/components/ui/`, usar un `<textarea>` nativo con clases Tailwind equivalentes a los inputs del diálogo.)

- [ ] **Step 2: Helper de ventana de rechazo**

Tras `prioridadConfig` (línea ~34), añadir:

```typescript
function puedeRechazar(
  estadoTarea: string,
  fechaLimite: string | null,
  horasMargen: number,
  estadoAsignacion: 'activa' | 'rechazada' | undefined
): boolean {
  if (estadoAsignacion !== 'activa') return false
  if (estadoTarea !== 'pendiente') return false
  if (!fechaLimite) return true
  const limite = new Date(fechaLimite).getTime()
  const corte = limite - horasMargen * 60 * 60 * 1000
  return Date.now() <= corte
}
```

- [ ] **Step 3: Estado del diálogo de rechazo y mutation**

Dentro de `ServidorTareasView`, junto a los demás `useState` (línea ~64-66):

```typescript
  const rechazar = useRechazarAsignacion()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectMotivo, setRejectMotivo] = useState("")
```

- [ ] **Step 4: Handler de rechazo**

Tras `handleUploadEvidence` (línea ~99):

```typescript
  const handleRechazar = () => {
    if (!myAssignment || !rejectMotivo.trim()) return
    rechazar.mutate(
      { idTareaAsignada: myAssignment.idTareaAsignada, motivo: rejectMotivo.trim() },
      {
        onSuccess: () => {
          toast.success("Tarea rechazada. Se notificó al líder.")
          setRejectOpen(false); setRejectMotivo(""); setSelectedTaskId(null)
        },
        onError: (e: any) => {
          const code = e?.message || ""
          const msg =
            code.includes("fuera_de_ventana") ? "Ya pasó el plazo para rechazar esta tarea." :
            code.includes("ya_rechazada")     ? "Esta asignación ya fue rechazada." :
            code.includes("motivo_requerido") ? "Debes escribir un motivo." :
            code.includes("no_autorizado")    ? "No puedes rechazar esta asignación." :
            "No se pudo rechazar la tarea."
          toast.error(msg)
        },
      }
    )
  }
```

- [ ] **Step 5: Añadir pestaña "Rechazadas"**

En `STATUS_TABS` (líneas 36-42), añadir al final:

```typescript
  { key: "rechazada",   label: "Rechazadas" },
```

El filtrado por esta pestaña es por estado de **asignación**, no de tarea. Localizar `filteredTareas` (líneas 70-73) y reemplazarlo por:

```typescript
  const myId = usuarioActual?.idUsuario
  const miAsignacion = (t: typeof misTareas[number]) =>
    t.asignados?.find(a => a.idUsuario === myId)

  const filteredTareas = useMemo(() => {
    if (activeTab === "todas") return misTareas
    if (activeTab === "rechazada")
      return misTareas.filter(t => miAsignacion(t)?.estadoAsignacion === "rechazada")
    return misTareas.filter(t =>
      t.estado === activeTab && miAsignacion(t)?.estadoAsignacion !== "rechazada")
  }, [misTareas, activeTab, myId])
```

Y el contador de la pestaña (línea ~141) — reemplazar la expresión `count` por una que contemple el caso `rechazada`:

```typescript
          const count =
            tab.key === "todas" ? misTareas.length :
            tab.key === "rechazada" ? misTareas.filter(t => miAsignacion(t)?.estadoAsignacion === "rechazada").length :
            misTareas.filter(t => t.estado === tab.key && miAsignacion(t)?.estadoAsignacion !== "rechazada").length
```

- [ ] **Step 6: Botón "Rechazar" en el footer del diálogo de detalle**

En el `DialogFooter` del detalle (líneas 293-304), antes del `Button` de la acción siguiente, añadir el botón de rechazo condicional:

```typescript
                {puedeRechazar(task.estado, task.fechaLimite, task.horasMargenRechazo, myAssignment?.estadoAsignacion) && (
                  <Button
                    variant="ghost"
                    className="rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    onClick={() => setRejectOpen(true)}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />Rechazar
                  </Button>
                )}
```

- [ ] **Step 7: Mostrar estado rechazado en el cuerpo del diálogo**

Dentro del bloque `{task && (...)}` del detalle, tras la grilla de Estado/Fecha Límite (línea ~255), añadir:

```typescript
                {myAssignment?.estadoAsignacion === "rechazada" && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                    <div className="flex items-center gap-1.5 text-rose-400 text-[11px] font-black uppercase tracking-wider mb-1">
                      <Ban className="w-3.5 h-3.5" />Rechazaste esta tarea
                    </div>
                    {myAssignment.motivoRechazo && (
                      <p className="text-xs text-foreground/70">{myAssignment.motivoRechazo}</p>
                    )}
                  </div>
                )}
```

- [ ] **Step 8: Sub-diálogo de motivo de rechazo**

Tras el `Dialog` de detalle (antes del cierre del componente, línea ~308), añadir:

```typescript
      <Dialog open={rejectOpen} onOpenChange={(o) => { setRejectOpen(o); if (!o) setRejectMotivo("") }}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Rechazar tarea</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <FieldLabel>Motivo (obligatorio)</FieldLabel>
            <Textarea
              value={rejectMotivo}
              onChange={(e) => setRejectMotivo(e.target.value)}
              placeholder="Explica por qué no puedes asumir esta tarea…"
              className="min-h-[96px] rounded-xl bg-background/40"
            />
          </div>
          <DialogFooter className="border-t border-border/50 pt-4 gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => { setRejectOpen(false); setRejectMotivo("") }}>Cancelar</Button>
            <Button
              className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white"
              disabled={!rejectMotivo.trim() || rechazar.isPending}
              onClick={handleRechazar}
            >
              {rechazar.isPending ? "Rechazando…" : "Confirmar rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 9: Verificar compilación**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 10: Verificación manual (servidor)**

`npm run dev`, entrar como un usuario servidor con una tarea `pendiente` con fecha límite lejana:
- El detalle muestra el botón **Rechazar**.
- Al confirmar con motivo, aparece toast de éxito, la tarea pasa a la pestaña **Rechazadas** con el motivo visible, y desaparecen los botones de acción.
- Para una tarea sin fecha límite pero `pendiente`: el botón aparece.
- Para una tarea ya `en_progreso`: el botón NO aparece.

- [ ] **Step 11: Commit**

```bash
git add src/app/components/tareas/ServidorTareasView.tsx
git commit -m "feat(tareas): UI de rechazo en vista del servidor"
```

---

## Task 8: UI Líder — badge de rechazo y motivo

**Files:**
- Modify: `src/app/components/tareas/LiderTareasView.tsx:334-348` (lista de asignados en el diálogo de detalle)

- [ ] **Step 1: Mostrar estado rechazado por asignado**

En el diálogo de detalle del líder, la lista de asignados está en líneas ~338-346. Reemplazar el `map` de asignados para incluir el estado de rechazo:

```typescript
                      {task.asignados.map(a => (
                        <div key={a.idTareaAsignada} className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-[10px] text-white font-black">
                            {(a.nombreCompleto || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium">{a.nombreCompleto}</span>
                            {a.estadoAsignacion === "rechazada" && (
                              <div className="mt-0.5">
                                <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px] uppercase font-black tracking-wider">Rechazada</Badge>
                                {a.motivoRechazo && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5 italic">"{a.motivoRechazo}"</p>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setConfirmRemoveAssign({ open: true, id: a.idTareaAsignada, nombre: a.nombreCompleto || "" })}
                            className="text-muted-foreground hover:text-rose-400 transition-colors shrink-0"
                            title="Quitar asignación"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
```

> Nota: conservar el `onClick` de quitar asignación tal como esté en el código actual (línea ~346). El icono/markup del botón de quitar debe replicar el existente; ajustar si el actual usa otro icono.

- [ ] **Step 2: Verificar compilación**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Verificación manual (líder)**

Como líder, abrir el detalle de la tarea rechazada en Task 7: el asignado que rechazó muestra el badge **Rechazada** y su motivo. La campana de notificaciones del líder muestra "Tarea rechazada …" y al hacer clic enlaza a la tarea (vía `[TASK_ID]`).

- [ ] **Step 4: Commit**

```bash
git add src/app/components/tareas/LiderTareasView.tsx
git commit -m "feat(tareas): badge y motivo de rechazo en vista del lider"
```

---

## Task 9: UI — campo "Margen para rechazar (horas)" en crear tarea

**Files:**
- Modify: `src/app/components/tareas/CrearTareaDialog.tsx`

- [ ] **Step 1: Añadir el campo al estado del formulario**

Localizar el `setForm` inicial (líneas ~43 y ~59) y añadir `horasMargenRechazo: 12` al objeto de estado en ambos sitios (estado inicial y reset). El tipo del estado es inferido; al añadirlo a ambos objetos queda consistente.

- [ ] **Step 2: Renderizar el input numérico**

Junto al campo de Fecha Límite (input en líneas ~192-193), añadir un campo numérico:

```typescript
            <div>
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">
                Margen para rechazar (horas)
              </label>
              <input
                type="number"
                min={0}
                value={form.horasMargenRechazo}
                onChange={e => setForm(p => ({ ...p, horasMargenRechazo: Number(e.target.value) || 0 }))}
                className="w-full rounded-xl bg-background/40 border border-white/10 px-3 py-2 text-sm"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1">El asignado podrá rechazar hasta esta cantidad de horas antes de la fecha límite. Default 12.</p>
            </div>
```

> Replicar las clases de los demás inputs del formulario para mantener el estilo. Si los inputs usan un componente `Input` de shadcn en vez de `<input>` nativo, usar ese componente.

- [ ] **Step 3: Pasar el valor a `createTarea.mutateAsync`**

En la llamada `createTarea.mutateAsync({...})` (líneas ~71-76), añadir:

```typescript
        prioridad: form.prioridad,
        horasMargenRechazo: form.horasMargenRechazo,
```

- [ ] **Step 4: Verificar compilación**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 5: Verificación manual**

Crear una tarea con margen 24h y fecha límite. Confirmar vía SQL:

```sql
select titulo, horas_margen_rechazo from tarea order by creado_en desc limit 1;
```

Esperado: `horas_margen_rechazo = 24`. Confirmar también que crear una tarea sin tocar el campo deja 12.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/tareas/CrearTareaDialog.tsx
git commit -m "feat(tareas): campo de margen de rechazo en crear tarea"
```

---

## Verificación final (end-to-end)

- [ ] **Escenario completo:** Líder crea tarea (margen 12h, fecha límite a 3 días) y la asigna a un servidor → servidor la rechaza con motivo → líder recibe notificación, ve el badge "Rechazada" + motivo → líder reasigna a otro servidor (mecanismo existente) → la nueva asignación nace `activa`.
- [ ] **Ventana cerrada:** Para una tarea con fecha límite dentro de menos de 12h, el servidor NO ve el botón Rechazar; forzar el RPC vía SQL devuelve `fuera_de_ventana`.
- [ ] `npm run build` final sin errores.

---

## Notas de implementación

- **Migraciones vía MCP `apply_migration`** (no CLI), conforme a la preferencia del proyecto.
- **Modelo de roles RLS:** el RPC es `SECURITY DEFINER` precisamente para que un servidor (solo lectura sobre datos ajenos) pueda escribir su rechazo y notificar al líder. La validación de autoría dentro del RPC (`v_asig.id_usuario = v_caller`) impide que un usuario rechace asignaciones ajenas.
- **Columna `auth_user_id`:** confirmada en Task 2 Step 1; sustituir en el RPC si el nombre real difiere.
- **`create_tarea`:** se extiende con parámetro opcional al final para no romper llamadas existentes.
```
