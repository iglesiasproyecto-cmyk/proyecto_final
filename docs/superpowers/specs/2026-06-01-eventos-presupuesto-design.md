# Presupuesto de Eventos — Design Spec

**Date:** 2026-06-01  
**Author:** Juan David Aguilar  
**Status:** Approved for implementation

---

## Overview

Agregar un módulo de presupuesto financiero a los eventos: ingresos y egresos por categoría, con monto planeado y monto real, para comparar lo presupuestado contra lo ejecutado. Incluye una pestaña "Finanzas" en EventsPage con resumen global por iglesia.

---

## Funcionalidad

- Registrar ítems de **ingreso** y **egreso** por evento, cada uno con categoría, descripción opcional, monto planeado y monto real.
- Ver **planeado vs. real** por ítem, con diferencia calculada.
- Ver **balance neto** por evento (ingresos − egresos).
- Pestaña **Finanzas** en EventsPage: KPIs globales + lista de eventos con sus balances, filtrable por ministerio y mes.
- Drawer de detalle de presupuesto por evento, accesible desde la pestaña Finanzas.

---

## Roles con acceso

Todos los roles excepto `servidor`:
- `super_admin`, `admin_iglesia`, `admin_sede`, `lider`

Los usuarios con rol `servidor` no ven ni gestionan presupuestos.

---

## Data Model

### Nueva tabla: `evento_presupuesto_item`

```sql
CREATE TABLE public.evento_presupuesto_item (
  id                    bigserial PRIMARY KEY,
  id_evento             bigint NOT NULL REFERENCES public.evento(id_evento) ON DELETE CASCADE,
  tipo                  text NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  categoria             text NOT NULL,
  descripcion           text,
  monto_planeado        numeric(12,2) NOT NULL DEFAULT 0,
  monto_real            numeric(12,2),
  created_by            bigint REFERENCES public.usuario(id_usuario) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evento_presupuesto_item_evento ON public.evento_presupuesto_item(id_evento);
CREATE INDEX idx_evento_presupuesto_item_tipo   ON public.evento_presupuesto_item(tipo);
```

### Categorías predefinidas

**Ingresos:** Ofrenda, Aporte voluntario, Venta de entradas, Patrocinio, Otro  
**Egresos:** Sonido, Decoración, Comida/Refrigerio, Transporte, Material, Publicidad, Otro

La categoría se almacena como texto libre. El formulario muestra un Select con las opciones predefinidas más una opción "Otro (especificar)"; al elegir esta última, aparece un input de texto donde el usuario escribe su propia categoría, que se guarda directamente en el campo `categoria`.

### RLS

- Lectura: cualquier usuario autenticado que pertenezca a la iglesia del evento.
- Escritura (INSERT/UPDATE/DELETE): usuarios con rol `lider`, `admin_sede`, `admin_iglesia` o `super_admin` en esa iglesia. Rol `servidor` excluido.

---

## UI / Componentes

### 1. Pestaña "Finanzas" en EventsPage

EventsPage pasa a tener dos pestañas superiores: **Eventos** (comportamiento actual) y **Finanzas** (nueva).

La pestaña Finanzas muestra:

**KPIs (4 tarjetas):**
- Ingresos planeados + real
- Egresos planeados + real
- Balance neto (real)
- Eventos con presupuesto / total eventos

**Filtros:**
- Ministerio (dropdown, default "Todos")
- Mes (dropdown, default mes actual)

**Lista de eventos:**
- Cada fila: nombre del evento, ministerio, fecha, total ingresos, total egresos, balance neto, barra de ejecución (% real/planeado).
- Eventos sin presupuesto muestran "Sin presupuesto asignado" + botón "+ Agregar".
- Clic en fila → abre drawer de detalle.

### 2. Drawer de detalle: `EventoPresupuestoDrawer`

Nuevo componente `src/app/components/EventoPresupuestoDrawer.tsx`.

**Header:** nombre del evento + balance neto resaltado.

**Sub-pestañas:** Ingresos | Egresos (misma estructura para ambas).

**Sección de ítems:**
- Lista de ítems: categoría, descripción, monto planeado, monto real, diferencia.
- Botón editar y eliminar por ítem.
- Botón "+ Agregar ítem" al final de la lista (abre mini-formulario inline o un modal pequeño).

**Formulario de ítem** (modal pequeño):
- `categoria`: Select con opciones predefinidas
- `descripcion`: Input de texto (opcional)
- `monto_planeado`: Input numérico
- `monto_real`: Input numérico (opcional — se puede completar después del evento)

**Resumen al pie:**
- Total planeado, total real, % ejecución.

### 3. Hook: `useEventoPresupuesto`

```ts
// src/hooks/useEventoPresupuesto.ts
useEventoPresupuestoItems(idEvento)         // query items
useCreatePresupuestoItem()                   // mutation
useUpdatePresupuestoItem()                   // mutation
useDeletePresupuestoItem()                   // mutation
usePresupuestoResumenIglesia(idIglesia, filters) // query agregado para KPIs + lista
```

### 4. Servicio: `evento-presupuesto.service.ts`

```ts
// src/services/evento-presupuesto.service.ts
getItemsByEvento(idEvento)
createItem(payload)
updateItem(id, payload)
deleteItem(id)
getResumenByIglesia(idIglesia, { idMinisterio?, mes?, anio? })
```

`getResumenByIglesia` ejecuta una query agregada con `SUM(monto_planeado)` y `SUM(monto_real)` agrupada por evento, con joins a `ministerio` y `sede`.

---

## Métricas calculadas en frontend

| Métrica | Cálculo |
|---|---|
| Balance neto real | `Σ ingresos reales − Σ egresos reales` |
| Balance neto planeado | `Σ ingresos planeados − Σ egresos planeados` |
| % Ejecución ingresos | `(Σ ingresos reales / Σ ingresos planeados) × 100` |
| % Ejecución egresos | `(Σ egresos reales / Σ egresos planeados) × 100` |
| Diferencia por ítem | `monto_real − monto_planeado` (negativo = por debajo de plan) |

---

## Archivos a crear / modificar

| Archivo | Acción |
|---|---|
| `supabase/migrations/20260601120000_evento_presupuesto.sql` | Nueva migración (tabla + índices + RLS) |
| `src/services/evento-presupuesto.service.ts` | Nuevo |
| `src/hooks/useEventoPresupuesto.ts` | Nuevo |
| `src/app/components/EventoPresupuestoDrawer.tsx` | Nuevo |
| `src/app/components/EventsPage.tsx` | Agregar pestaña Finanzas + integrar drawer |

---

## Fuera de alcance (v1)

- Exportar presupuesto a PDF/Excel
- Adjuntar comprobantes o facturas a ítems
- Aprobación de presupuesto por parte de admin
- Presupuesto anual consolidado (fuera de eventos individuales)
