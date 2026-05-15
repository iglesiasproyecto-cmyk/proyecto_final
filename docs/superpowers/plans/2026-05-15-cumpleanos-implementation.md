# Módulo de Cumpleaños — Plan de Implementación

> **Para trabajadores agentivos:** REQUERIDO: Usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan sintaxis de checkbox (`- [ ]`) para seguimiento.

**Objetivo:** Implementar un módulo de cumpleaños visible en el sidebar que muestre miembros con cumpleaños hoy, próximos y todos; con captura de fecha de nacimiento al invitar usuarios.

**Arquitectura:** Tres frentes paralelos: (1) Nueva página con tabs y filtrado de cumpleaños desde `AppContext.usuarios`, (2) Propagación de `fechaNacimiento` en el flujo de invitación (frontend → servicio → edge functions), (3) Navegación + badge en sidebar.

**Tech Stack:** React 18, React Router v7, Tailwind CSS v4, shadcn/ui, Supabase edge functions (Deno).

---

## Mapeo de Archivos

| Tipo | Ruta | Responsabilidad |
|---|---|---|
| **Crear** | `src/app/components/CumpleanosPage.tsx` | Página principal: tabs, filtros, cards de miembros |
| **Crear** | `supabase/migrations/20260515HHMMSS_add_fecha_nacimiento_to_invite_tokens.sql` | Migración para agregar columna |
| **Modificar** | `src/app/routes.ts` | Registrar rutas `/cumpleanos` |
| **Modificar** | `src/app/components/AppLayout.tsx` | Nav items + badge por rol |
| **Modificar** | `src/app/components/UsuariosPage.tsx` | Campo `fechaNacimiento` en inviteForm |
| **Modificar** | `src/services/usuarios.service.ts` | Agregar `fechaNacimiento` a `inviteUser` |
| **Modificar** | `supabase/functions/invite-user/index.ts` | Guardar `fecha_nacimiento` en invite_tokens |
| **Modificar** | `supabase/functions/complete-invite/index.ts` | Leer `fecha_nacimiento` del token |

---

## Task 1: Crear migración SQL

**Archivos:**
- Create: `supabase/migrations/20260515120000_add_fecha_nacimiento_to_invite_tokens.sql`

- [ ] **Paso 1: Crear archivo de migración**

```sql
-- Agregar columna fecha_nacimiento a invite_tokens
ALTER TABLE invite_tokens
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- Comentario: Campo opcional para guardar la fecha de nacimiento del invitado durante la invitación
```

- [ ] **Paso 2: Verificar sintaxis**

```bash
cat /home/juanda/Proyectofinal/supabase/migrations/20260515120000_add_fecha_nacimiento_to_invite_tokens.sql
```

- [ ] **Paso 3: Commit**

```bash
cd /home/juanda/Proyectofinal
git add supabase/migrations/20260515120000_add_fecha_nacimiento_to_invite_tokens.sql
git commit -m "feat(migrations): add fecha_nacimiento to invite_tokens table"
```

---

## Task 2: Actualizar servicio `inviteUser`

**Archivos:**
- Modify: `src/services/usuarios.service.ts:259-267`

- [ ] **Paso 1: Leer el archivo alrededor de la función `inviteUser`**

```bash
sed -n '259,280p' /home/juanda/Proyectofinal/src/services/usuarios.service.ts
```

- [ ] **Paso 2: Actualizar la firma de la función para incluir `fechaNacimiento` opcional**

Reemplazar:
```typescript
export async function inviteUser(data: {
  correo: string
  nombres: string
  apellidos: string
  idIglesia: number
  idRol: number
  idSede?: number | null
  idMinisterio?: number | null
}): Promise<...> {
```

Con:
```typescript
export async function inviteUser(data: {
  correo: string
  nombres: string
  apellidos: string
  idIglesia: number
  idRol: number
  idSede?: number | null
  idMinisterio?: number | null
  fechaNacimiento?: string | null
}): Promise<...> {
```

- [ ] **Paso 3: Verificar que el body que se envía al edge function incluya `fechaNacimiento`**

La línea `const { data: result, error } = await supabase.functions.invoke('invite-user', { body: data, ... })` ya pasa todo el objeto `data`, así que automáticamente incluirá `fechaNacimiento` si está presente.

- [ ] **Paso 4: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/services/usuarios.service.ts
git commit -m "feat: add optional fechaNacimiento to inviteUser service"
```

---

## Task 3: Actualizar edge function `invite-user`

**Archivos:**
- Modify: `supabase/functions/invite-user/index.ts:123-126 y 219-230`

- [ ] **Paso 1: Leer las secciones relevantes**

```bash
sed -n '123,127p' /home/juanda/Proyectofinal/supabase/functions/invite-user/index.ts
sed -n '219,235p' /home/juanda/Proyectofinal/supabase/functions/invite-user/index.ts
```

- [ ] **Paso 2: Actualizar destructuring para incluir `fechaNacimiento`**

En línea ~123, cambiar:
```typescript
const { correo, nombres, apellidos, idIglesia, idRol, idSede, idMinisterio } = await req.json()
```

A:
```typescript
const { correo, nombres, apellidos, idIglesia, idRol, idSede, idMinisterio, fechaNacimiento } = await req.json()
```

- [ ] **Paso 3: Agregar `fecha_nacimiento` al insert de `invite_tokens`**

En el bloque `.insert({...})` alrededor de línea 220, agregar:
```typescript
fecha_nacimiento: fechaNacimiento || null,
```

El bloque completo debe quedar:
```typescript
const { data: inviteToken, error: tokenError } = await supabaseAdmin
  .from('invite_tokens')
  .insert({
    token: tokenString,
    email: normalizedEmail,
    nombres: nombres,
    apellidos: apellidos,
    id_iglesia: idIglesia,
    id_rol: idRol,
    id_sede: isSedeRole ? sedeId : null,
    id_ministerio: requiresMinisterio ? ministerioId : null,
    fecha_nacimiento: fechaNacimiento || null,
    expires_at: expiresAt.toISOString(),
  })
```

- [ ] **Paso 4: Para usuarios que ya existen (reconciliación), actualizar `fecha_nacimiento`**

Buscar la sección donde se actualiza un usuario existente. Agregar una actualización de `fecha_nacimiento` si se proporciona:

```typescript
if (usuarioId && fechaNacimiento) {
  const { error: updateError } = await supabaseAdmin
    .from('usuario')
    .update({ fecha_nacimiento: fechaNacimiento })
    .eq('id_usuario', usuarioId)
  
  if (updateError) {
    console.error('Error updating user fecha_nacimiento:', updateError)
  }
}
```

- [ ] **Paso 5: Commit**

```bash
cd /home/juanda/Proyectofinal
git add supabase/functions/invite-user/index.ts
git commit -m "feat: handle fecha_nacimiento in invite-user edge function"
```

---

## Task 4: Actualizar edge function `complete-invite`

**Archivos:**
- Modify: `supabase/functions/complete-invite/index.ts:36-45 y ~70-75`

- [ ] **Paso 1: Leer la sección del SELECT de `invite_tokens`**

```bash
sed -n '36,50p' /home/juanda/Proyectofinal/supabase/functions/complete-invite/index.ts
```

- [ ] **Paso 2: Asegurar que la consulta del token incluya todas las columnas**

Alrededor de línea 40, el SELECT debe ser `select('*')` o al menos incluir explícitamente `fecha_nacimiento`. Si ya es `select('*')`, no cambiar nada.

- [ ] **Paso 3: Leer la sección de insert de `usuario`**

```bash
sed -n '68,80p' /home/juanda/Proyectofinal/supabase/functions/complete-invite/index.ts
```

- [ ] **Paso 4: Agregar `fecha_nacimiento` al insert de `usuario`**

En el bloque `.insert({ ... })` donde se crea el usuario (alrededor de línea 70), agregar:
```typescript
fecha_nacimiento: inviteToken.fecha_nacimiento || null,
```

El bloque debe quedar:
```typescript
const { data: usuario, error: usuarioError } = await supabaseAdmin
  .from('usuario')
  .insert({
    auth_user_id: authUser.user.id,
    nombres: inviteToken.nombres,
    apellidos: inviteToken.apellidos,
    correo: inviteToken.email,
    activo: true,
    fecha_nacimiento: inviteToken.fecha_nacimiento || null,
  })
  .select('id_usuario')
  .single()
```

- [ ] **Paso 5: Commit**

```bash
cd /home/juanda/Proyectofinal
git add supabase/functions/complete-invite/index.ts
git commit -m "feat: persist fecha_nacimiento from invite token in complete-invite"
```

---

## Task 5: Actualizar UsuariosPage — Estado del formulario

**Archivos:**
- Modify: `src/app/components/UsuariosPage.tsx:56-65`

- [ ] **Paso 1: Leer el estado actual del inviteForm**

```bash
sed -n '56,70p' /home/juanda/Proyectofinal/src/app/components/UsuariosPage.tsx
```

- [ ] **Paso 2: Actualizar `useState` para incluir `fechaNacimiento`**

Cambiar:
```typescript
const [inviteForm, setInviteForm] = useState({
  correo: "",
  nombres: "",
  apellidos: "",
  idIglesia: iglesiaActual?.id ?? 0,
  idRol: 0,
  idSede: 0,
  idMinisterio: 0,
});
```

A:
```typescript
const [inviteForm, setInviteForm] = useState({
  correo: "",
  nombres: "",
  apellidos: "",
  fechaNacimiento: "",
  idIglesia: iglesiaActual?.id ?? 0,
  idRol: 0,
  idSede: 0,
  idMinisterio: 0,
});
```

- [ ] **Paso 3: Actualizar `resetInviteForm`**

Buscar `resetInviteForm()` y agregar `fechaNacimiento: ""` al objeto:

```typescript
const resetInviteForm = () => setInviteForm({
  correo: "",
  nombres: "",
  apellidos: "",
  fechaNacimiento: "",
  idIglesia: iglesiaActual?.id ?? 0,
  idRol: 0,
  idSede: 0,
  idMinisterio: 0,
});
```

- [ ] **Paso 4: Actualizar `handleInvite` para incluir `fechaNacimiento`**

En la llamada a `inviteMutation.mutate()`, agregar:
```typescript
inviteMutation.mutate({
  correo: inviteForm.correo.trim(),
  nombres: inviteForm.nombres.trim(),
  apellidos: inviteForm.apellidos.trim(),
  fechaNacimiento: inviteForm.fechaNacimiento || null,
  idIglesia: inviteForm.idIglesia,
  idRol: inviteForm.idRol,
  idSede: inviteForm.idSede || null,
  idMinisterio: inviteForm.idMinisterio || null,
});
```

- [ ] **Paso 5: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/app/components/UsuariosPage.tsx
git commit -m "feat: add fechaNacimiento to inviteForm state"
```

---

## Task 6: UsuariosPage — UI del campo fecha de nacimiento

**Archivos:**
- Modify: `src/app/components/UsuariosPage.tsx:543-580` (aproximado, en el formulario)

- [ ] **Paso 1: Ubicar el formulario de invitación (Dialog)**

```bash
grep -n "Dialog open={showInvite}" /home/juanda/Proyectofinal/src/app/components/UsuariosPage.tsx
```

- [ ] **Paso 2: Agregar input para fecha de nacimiento después del campo de apellidos**

Dentro del `<Dialog>` pero después del input de `apellidos`, agregar:

```tsx
<div>
  <label className="text-sm text-muted-foreground mb-1 block">
    Fecha de Nacimiento
  </label>
  <input
    type="date"
    value={inviteForm.fechaNacimiento}
    onChange={(e) => setInviteForm(p => ({ ...p, fechaNacimiento: e.target.value }))}
    className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
  />
  <p className="text-xs text-muted-foreground mt-1">Opcional</p>
</div>
```

- [ ] **Paso 3: Verificar que el input esté dentro del formulario de invitación (antes de los botones)**

Debe estar antes del `<Button>` de acción.

- [ ] **Paso 4: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/app/components/UsuariosPage.tsx
git commit -m "feat: add fecha_nacimiento input to invite user dialog"
```

---

## Task 7: Crear CumpleanosPage — Estructura base

**Archivos:**
- Create: `src/app/components/CumpleanosPage.tsx`

- [ ] **Paso 1: Crear el archivo con estructura básica**

```tsx
import { useState } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { User, Calendar } from "lucide-react";

export function CumpleanosPage() {
  const { usuarios } = useAppContext();

  // Rango configurable: 7, 15 o 30 días
  const [rangoProximos, setRangoProximos] = useState<number>(() => {
    const saved = localStorage.getItem("cumpleanos_rango");
    return saved ? parseInt(saved) : 7;
  });

  const [tab, setTab] = useState<"hoy" | "proximos" | "todos">("hoy");

  // Guardar rango en localStorage cuando cambie
  const handleRangoChange = (valor: string) => {
    const num = parseInt(valor);
    setRangoProximos(num);
    localStorage.setItem("cumpleanos_rango", valor);
  };

  // Filtrar usuarios con fecha_nacimiento
  const usuariosConFecha = usuarios.filter(u => u.fechaNacimiento);

  // Funciones de utilidad
  const getDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / 86400000);
  };

  const getDaysUntilBirthday = (fechaNacimiento: string): number => {
    const [year, month, day] = fechaNacimiento.split("-").map(Number);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const birthday = new Date(today.getFullYear(), month - 1, day);
    if (birthday < today) {
      birthday.setFullYear(today.getFullYear() + 1);
    }

    const diff = birthday.getTime() - today.getTime();
    return Math.ceil(diff / 86400000);
  };

  const getAge = (fechaNacimiento: string): number => {
    const today = new Date();
    const [year, month, day] = fechaNacimiento.split("-").map(Number);
    let age = today.getFullYear() - year;
    const monthDiff = today.getMonth() - (month - 1);
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
      age--;
    }
    return age;
  };

  const isCumpleanosHoy = (fechaNacimiento: string): boolean => {
    const today = new Date();
    const [, month, day] = fechaNacimiento.split("-").map(Number);
    return today.getMonth() === month - 1 && today.getDate() === day;
  };

  // Filtrar por tab
  let usuariosFiltrados = usuariosConFecha;

  if (tab === "hoy") {
    usuariosFiltrados = usuariosConFecha.filter(u => isCumpleanosHoy(u.fechaNacimiento!));
  } else if (tab === "proximos") {
    usuariosFiltrados = usuariosConFecha.filter(u => {
      const dias = getDaysUntilBirthday(u.fechaNacimiento!);
      return dias > 0 && dias <= rangoProximos;
    });
    usuariosFiltrados.sort((a, b) => {
      const diasA = getDaysUntilBirthday(a.fechaNacimiento!);
      const diasB = getDaysUntilBirthday(b.fechaNacimiento!);
      return diasA - diasB;
    });
  } else if (tab === "todos") {
    usuariosFiltrados = usuariosConFecha.slice().sort((a, b) => {
      const [, mesA, diaA] = (a.fechaNacimiento || "").split("-").map(Number);
      const [, mesB, diaB] = (b.fechaNacimiento || "").split("-").map(Number);
      if (mesA !== mesB) return mesA - mesB;
      return diaA - diaB;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">🎂 Cumpleaños</h1>
        <p className="text-muted-foreground">
          Gestiona los cumpleaños de los miembros de tu comunidad
        </p>
      </div>

      {/* Controles */}
      <div className="flex gap-4 items-center">
        <div className="flex gap-2 border rounded-lg p-1 bg-muted">
          {(["hoy", "proximos", "todos"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                tab === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "hoy" ? "Hoy" : t === "proximos" ? "Próximos" : "Todos"}
            </button>
          ))}
        </div>

        {tab === "proximos" && (
          <Select value={String(rangoProximos)} onValueChange={handleRangoChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Rango" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Próximos 7 días</SelectItem>
              <SelectItem value="15">Próximos 15 días</SelectItem>
              <SelectItem value="30">Próximos 30 días</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Contenido */}
      <div>
        {usuariosFiltrados.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              {tab === "hoy"
                ? "No hay cumpleaños hoy 😢"
                : tab === "proximos"
                ? `No hay cumpleaños en los próximos ${rangoProximos} días`
                : "No hay cumpleaños registrados"}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {usuariosFiltrados.map(usuario => (
              <CumpleanosCard
                key={usuario.idUsuario}
                usuario={usuario}
                diasFaltantes={getDaysUntilBirthday(usuario.fechaNacimiento!)}
                edad={getAge(usuario.fechaNacimiento!)}
                esHoy={isCumpleanosHoy(usuario.fechaNacimiento!)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CumpleanosCardProps {
  usuario: any;
  diasFaltantes: number;
  edad: number;
  esHoy: boolean;
}

function CumpleanosCard({ usuario, diasFaltantes, edad, esHoy }: CumpleanosCardProps) {
  return (
    <Card
      className={`p-4 ${
        esHoy ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20" : ""
      }`}
    >
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">
                {usuario.nombres} {usuario.apellidos}
              </p>
              <p className="text-sm text-muted-foreground">{usuario.correo}</p>
            </div>
            {esHoy && (
              <Badge variant="default" className="bg-amber-500 text-white">
                ¡HOY!
              </Badge>
            )}
          </div>
          <div className="mt-3 flex gap-2 text-sm">
            <span className="text-muted-foreground">
              Cumplirá {edad} años
            </span>
            {diasFaltantes > 0 && (
              <span className="text-primary font-medium">
                en {diasFaltantes} día{diasFaltantes > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Paso 2: Verificar que el archivo se creó correctamente**

```bash
wc -l /home/juanda/Proyectofinal/src/app/components/CumpleanosPage.tsx
```

- [ ] **Paso 3: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/app/components/CumpleanosPage.tsx
git commit -m "feat: create CumpleanosPage component with tabs and filtering"
```

---

## Task 8: Actualizar routes.ts — Agregar rutas

**Archivos:**
- Modify: `src/app/routes.ts:1-30 (import) y ~65-75 (global children)`

- [ ] **Paso 1: Agregar import de CumpleanosPage al top del archivo**

```bash
head -40 /home/juanda/Proyectofinal/src/app/routes.ts
```

- [ ] **Paso 2: Agregar el import**

Después de `import { SitemapPage } from "./components/SitemapPage"`, agregar:

```typescript
import { CumpleanosPage } from "./components/CumpleanosPage"
```

- [ ] **Paso 3: Agregar ruta a la sección global (para super_admin)**

En el bloque de `children` bajo `path: "global"`, agregar:

```typescript
{ path: "cumpleanos", Component: CumpleanosPage, ErrorBoundary: ErrorPage },
```

- [ ] **Paso 4: Agregar ruta a la sección tenant-scoped (para otros roles)**

En el bloque de `children` bajo `path: ":idIglesia"`, agregar:

```typescript
{ path: "cumpleanos", Component: CumpleanosPage, ErrorBoundary: ErrorPage },
```

- [ ] **Paso 5: Verificar que ambas rutas se agregaron**

```bash
grep -n "cumpleanos" /home/juanda/Proyectofinal/src/app/routes.ts
```

- [ ] **Paso 6: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/app/routes.ts
git commit -m "feat: add cumpleanos routes to global and tenant-scoped layouts"
```

---

## Task 9: Actualizar AppLayout.tsx — Agregar nav items

**Archivos:**
- Modify: `src/app/components/AppLayout.tsx:1-50 (imports) y 70-140 (getNavItemsForRole)`

- [ ] **Paso 1: Buscar dónde se definen los imports de iconos**

```bash
head -15 /home/juanda/Proyectofinal/src/app/components/AppLayout.tsx
```

- [ ] **Paso 2: Agregar import de un icono de pastel (usar uno existente o Cake)**

Si no está disponible `Cake`, usar `Gift` o `CalendarDays` (que ya está importado).

```bash
grep -n "import.*from.*lucide" /home/juanda/Proyectofinal/src/app/components/AppLayout.tsx | head -5
```

Opción: Usar `Cake` de lucide-react (agregar al import si no está):

```typescript
import { ..., Cake } from "lucide-react"
```

- [ ] **Paso 3: Leer la sección `getNavItemsForRole` para super_admin**

```bash
sed -n '70,90p' /home/juanda/Proyectofinal/src/app/components/AppLayout.tsx
```

- [ ] **Paso 4: Agregar nav item "Cumpleaños" en super_admin (sección "Gestión Global")**

En el array de items del super_admin, antes de la sección final, agregar:

```typescript
{ label: "Cumpleaños", path: "/app/global/cumpleanos", icon: <Cake className="w-5 h-5" />, section: "Gestión Global" },
```

- [ ] **Paso 5: Leer la sección `getNavItemsForRole` para admin_iglesia**

```bash
sed -n '88,105p' /home/juanda/Proyectofinal/src/app/components/AppLayout.tsx
```

- [ ] **Paso 6: Agregar nav item "Cumpleaños" en admin_iglesia (sección "Mi Iglesia" o "Operaciones")**

En el array de items del admin_iglesia, agregar:

```typescript
{ label: "Cumpleaños", path: `${t}/cumpleanos`, icon: <Cake className="w-5 h-5" />, section: "Operaciones" },
```

- [ ] **Paso 7: Leer la sección de admin_sede**

```bash
sed -n '107,127p' /home/juanda/Proyectofinal/src/app/components/AppLayout.tsx
```

- [ ] **Paso 8: Agregar nav item en admin_sede (sección "Operaciones")**

```typescript
{ label: "Cumpleaños", path: `${t}/cumpleanos`, icon: <Cake className="w-5 h-5" />, section: "Operaciones" },
```

- [ ] **Paso 9: Leer la sección de lider**

```bash
sed -n '130,148p' /home/juanda/Proyectofinal/src/app/components/AppLayout.tsx
```

- [ ] **Paso 10: Agregar nav item en lider (sección "Operaciones")**

```typescript
{ label: "Cumpleaños", path: `${t}/cumpleanos`, icon: <Cake className="w-5 h-5" />, section: "Operaciones" },
```

- [ ] **Paso 11: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/app/components/AppLayout.tsx
git commit -m "feat: add Cumpleaños nav items to all roles"
```

---

## Task 10: Actualizar AppLayout.tsx — Agregar badge

**Archivos:**
- Modify: `src/app/components/AppLayout.tsx:200-250 (aproximado, en la lógica de renderizado)`

- [ ] **Paso 1: Calcular cumpleaños de hoy en AppLayout**

Dentro del componente `AppLayout`, después de cargar `usuarios` del contexto, agregar:

```typescript
const cumpleanosHoy = usuarios.filter(u => {
  if (!u.fechaNacimiento) return false;
  const today = new Date();
  const [, month, day] = u.fechaNacimiento.split("-").map(Number);
  return today.getMonth() === month - 1 && today.getDate() === day;
}).length;
```

- [ ] **Paso 2: Ubicar dónde se renderizan los nav items**

```bash
grep -n "navItems\|navGroups" /home/juanda/Proyectofinal/src/app/components/AppLayout.tsx | head -10
```

- [ ] **Paso 3: Modificar el renderizado del nav item "Cumpleaños" para mostrar badge**

Cuando se renderice cada `navItem`, si `item.label === "Cumpleaños"` y `cumpleanosHoy > 0`, agregar un badge:

```tsx
<div className="flex items-center gap-2">
  {item.label}
  {item.label === "Cumpleaños" && cumpleanosHoy > 0 && (
    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-red-500 text-white">
      {cumpleanosHoy}
    </span>
  )}
</div>
```

- [ ] **Paso 4: Verificar que el badge se muestre correctamente**

El badge debe aparecer solo cuando hay cumpleaños hoy.

- [ ] **Paso 5: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/app/components/AppLayout.tsx
git commit -m "feat: add birthday count badge to Cumpleaños nav item"
```

---

## Task 11: Actualizar page title en AppLayout

**Archivos:**
- Modify: `src/app/components/AppLayout.tsx:52-66 (getDynamicPageTitle)`

- [ ] **Paso 1: Leer la función `getDynamicPageTitle`**

```bash
sed -n '52,66p' /home/juanda/Proyectofinal/src/app/components/AppLayout.tsx
```

- [ ] **Paso 2: Agregar matcher para cumpleaños**

En la función `getDynamicPageTitle`, agregar antes del return final:

```typescript
if (pathname.match(/\/app\/(global\/)?cumpleanos/)) return "Cumpleaños"
```

- [ ] **Paso 3: Commit**

```bash
cd /home/juanda/Proyectofinal
git add src/app/components/AppLayout.tsx
git commit -m "feat: add page title for cumpleanos route"
```

---

## Task 12: Prueba manual — Invitar usuario con fecha de nacimiento

**Archivos:**
- Test: Interfaz de usuario en `UsuariosPage`

- [ ] **Paso 1: Iniciar dev server**

```bash
cd /home/juanda/Proyectofinal && npm run dev
```

- [ ] **Paso 2: Navegar a Usuarios y abrir el diálogo de invitación**

- [ ] **Paso 3: Completar el formulario incluyendo fecha de nacimiento**

- [ ] **Paso 4: Enviar la invitación**

- [ ] **Paso 5: Verificar en la base de datos que `fecha_nacimiento` se guardó en `invite_tokens`**

```bash
# En Supabase console o via CLI
# SELECT * FROM invite_tokens WHERE email = '<email_invitado>' ORDER BY created_at DESC LIMIT 1;
```

- [ ] **Paso 6: (Opcional) Completar la invitación y verificar que `fecha_nacimiento` se propagó a `usuario`**

---

## Task 13: Prueba manual — Ver módulo de Cumpleaños

**Archivos:**
- Test: Interfaz en `CumpleanosPage`

- [ ] **Paso 1: Asegurar que la app tenga usuarios con `fechaNacimiento` registrada**

Usar el contexto mock o editar usuarios existentes en `AppContext.tsx`.

- [ ] **Paso 2: Navegar a Cumpleaños desde el sidebar**

- [ ] **Paso 3: Verificar tab "Hoy"**

Debe mostrar usuarios cuyo cumpleaños sea hoy.

- [ ] **Paso 4: Verificar tab "Próximos"**

Cambiar el rango (7 / 15 / 30 días) y verificar que el filtro funciona.

- [ ] **Paso 5: Verificar tab "Todos"**

Debe mostrar todos los usuarios ordenados por mes/día.

- [ ] **Paso 6: Verificar badge en sidebar**

Si hay cumpleaños hoy, el ícono debe mostrar el conteo.

- [ ] **Paso 7: Guardar rango en localStorage**

Cambiar el rango, recargar la página, verificar que persiste.

---

## Task 14: Prueba de integración — Completar flujo de invitación

**Archivos:**
- Test: `UsuariosPage` → `CumpleanosPage`

- [ ] **Paso 1: Invitar nuevo usuario con fecha de nacimiento: "2005-08-15"**

- [ ] **Paso 2: Completar la invitación (aceptar desde correo o simular en `AcceptInvitePage`)**

- [ ] **Paso 3: Verificar que el usuario aparece en el módulo de Cumpleaños**

Navegar a Cumpleaños y buscar el usuario invitado.

- [ ] **Paso 4: Si el cumpleaños está próximo (según la fecha de hoy), debe aparecer en "Próximos"**

---

## Verificación de Cobertura del Spec

| Requerimiento | Task | ✓ |
|---|---|---|
| Página `CumpleanosPage` con tabs | Task 7 | ✓ |
| Rango configurable (7/15/30) guardado en localStorage | Task 7 | ✓ |
| Badge en sidebar | Task 10 | ✓ |
| Campo `fechaNacimiento` en invitación | Task 5-6 | ✓ |
| Propagación frontend → servicio → edge functions → usuario | Task 2-4 | ✓ |
| Migración SQL para `invite_tokens` | Task 1 | ✓ |
| Rutas `/cumpleanos` registradas | Task 8 | ✓ |
| Nav items para todos los roles | Task 9 | ✓ |
| Page title dinámico | Task 11 | ✓ |

---

## Notas

- Las pruebas de Task 12-14 son manuales porque el sistema actual no tiene test automatizados configurados (ver CLAUDE.md: "No test or lint commands are configured").
- El cálculo de edad y días restantes maneja correctamente el cruce de año (ej. 31 dic → 1 ene).
- Sin año en la comparación: `fechaNacimiento` se almacena como `DATE` (YYYY-MM-DD), pero la comparación ignora el año usando `.split("-")` y acceso a índices.
