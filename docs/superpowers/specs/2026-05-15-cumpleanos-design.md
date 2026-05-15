# Módulo de Cumpleaños — Diseño

**Fecha:** 2026-05-15  
**Estado:** Aprobado para implementación

---

## Resumen

Agregar un módulo de cumpleaños visible para todos los roles (superadmin, admin de iglesias, admin de sedes, líderes). Permite ver qué miembros cumplen años hoy, cuáles tienen cumpleaños próximos (rango configurable), y un listado completo. Adicionalmente, el formulario de invitación de usuarios debe capturar la fecha de nacimiento para tener trazabilidad desde el momento del registro.

---

## Alcance

### Qué incluye este diseño:
1. Página `CumpleanosPage` con tabs: Hoy / Próximos / Todos
2. Rango configurable (7 / 15 / 30 días) guardado en `localStorage`
3. Badge numérico en el ícono del sidebar cuando hay cumpleaños hoy
4. Campo `fechaNacimiento` en el formulario de invitación de usuarios
5. Propagación de `fechaNacimiento` por toda la cadena: frontend → servicio → edge function `invite-user` → `invite_tokens` → edge function `complete-invite` → tabla `usuario`
6. Migración SQL: agregar columna `fecha_nacimiento` a la tabla `invite_tokens`

### Qué NO incluye:
- Envío de correos de felicitación automáticos
- Widget de cumpleaños en el Dashboard (posible extensión futura)
- Notificaciones push

---

## Arquitectura

### Archivos nuevos
| Archivo | Propósito |
|---|---|
| `src/app/components/CumpleanosPage.tsx` | Página principal del módulo |
| `supabase/migrations/YYYYMMDDHHMMSS_add_fecha_nacimiento_to_invite_tokens.sql` | Migración SQL |

### Archivos modificados
| Archivo | Cambio |
|---|---|
| `src/app/routes.ts` | Agregar ruta `/cumpleanos` en tenant-scoped y global |
| `src/app/components/AppLayout.tsx` | Agregar nav item "Cumpleaños" a todos los roles + badge |
| `src/app/components/UsuariosPage.tsx` | Agregar `fechaNacimiento` en estado y UI del formulario de invitación |
| `src/services/usuarios.service.ts` | Agregar `fechaNacimiento?: string \| null` a la firma de `inviteUser` |
| `supabase/functions/invite-user/index.ts` | Leer `fechaNacimiento` del body y guardarlo en `invite_tokens` |
| `supabase/functions/complete-invite/index.ts` | Leer `fecha_nacimiento` del token y escribirlo en `usuario` al crear |

---

## Flujo de datos — Cumpleaños

```
Supabase (tabla usuario.fecha_nacimiento)
  → useUsuariosEnriquecidos (hook ya existente)
  → CumpleanosPage recibe la lista de usuarios
  → filtra por mes/día ignorando el año
  → muestra en tabs: Hoy / Próximos / Todos
```

El rango de "próximos" (7 / 15 / 30 días) se persiste en `localStorage` con la clave `cumpleanos_rango`.

El badge del sidebar se calcula contando usuarios cuyo mes/día coincide con la fecha de hoy.

---

## Flujo de datos — Fecha de nacimiento en invitación

```
UsuariosPage (inviteForm.fechaNacimiento)
  → inviteUser({ ..., fechaNacimiento })   [usuarios.service.ts]
  → invite-user edge function              [body.fechaNacimiento → invite_tokens.fecha_nacimiento]
  → complete-invite edge function          [inviteToken.fecha_nacimiento → usuario.fecha_nacimiento]
```

Para usuarios que ya existen (reconciliación de perfil), el edge function `invite-user` actualiza `fecha_nacimiento` directamente en la tabla `usuario` si se recibe el campo.

---

## CumpleanosPage — Detalle de UI

### Layout
- Header con título "Cumpleaños" e ícono de pastel 🎂
- Selector de rango (7 / 15 / 30 días) — controla la tab "Próximos"
- Tabs: **Hoy** | **Próximos** | **Todos**

### Tab "Hoy"
- Cards de miembros con avatar, nombre completo, edad que cumple, sede/ministerio
- Si no hay cumpleaños hoy: estado vacío con mensaje amigable
- Badge/chip destacado visual (fondo dorado/amarillo) para diferenciarlo

### Tab "Próximos"
- Lista ordenada por proximidad (el más cercano primero)
- Muestra cuántos días faltan ("en 3 días", "en 15 días")
- Filtrada por el rango configurado

### Tab "Todos"
- Lista completa de usuarios con fecha de nacimiento registrada
- Ordenada por mes/día (enero primero)
- Buscador por nombre
- Indicador visual para los que cumplen este mes

### Manejo de datos faltantes
- Usuarios sin `fechaNacimiento` no aparecen en las tabs Hoy/Próximos
- En "Todos" aparecen con "Fecha no registrada" al final de la lista

---

## Sidebar — Badge

En `AppLayout.tsx`, el nav item "Cumpleaños" muestra un badge rojo con el conteo cuando `cumpleanosHoy > 0`. Usa el mismo componente de badge que ya existe para "Notificaciones".

Roles que reciben el nav item:
- `super_admin` → sección "Gestión Global" (ruta `/app/global/cumpleanos`)
- `admin_iglesia` → sección "Mi Iglesia" (ruta `/app/:idIglesia/cumpleanos`)
- `admin_sede` → sección "Operaciones" (ruta `/app/:idIglesia/cumpleanos`)
- `lider` → sección "Operaciones" (ruta `/app/:idIglesia/cumpleanos`)

---

## Migración SQL

```sql
ALTER TABLE invite_tokens
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
```

Sin valor por defecto, nullable — el campo es opcional durante la invitación.

---

## Consideraciones

- **Sin año en la comparación:** Los cumpleaños se calculan comparando solo mes y día (no el año) para que funcionen cada año automáticamente.
- **Zona horaria:** La comparación se hace con la fecha local del navegador usando `new Date()` para evitar desfases UTC.
- **Datos existentes:** Los usuarios ya registrados sin `fechaNacimiento` pueden ser editados desde `UsuariosPage` (la edición ya admite el campo vía `updateUsuario`).
- **Rango fin de año:** El cálculo de "próximos N días" maneja correctamente el cruce de año (ej. cumpleaños del 2 de enero visto desde el 28 de diciembre).
