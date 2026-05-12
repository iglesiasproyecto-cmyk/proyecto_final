# 🔍 AUDITORÍA: Gestión de Usuarios - IGLESIABD

**Fecha:** 2026-05-12  
**Auditor:** Claude Code  
**Componente:** UsuariosPage & usuarios.service.ts  
**Status:** ⚠️ ISSUES ENCONTRADOS

---

## 📋 RESUMEN EJECUTIVO

Se encontraron **3 problemas críticos** en la gestión de usuarios que afectan la visualización y el manejo de datos:

1. ❌ **getUsuariosEnriquecidos() solo trae usuarios ACTIVOS** → Imposible ver/gestionar usuarios inactivos
2. ❌ **Ministerios muestran "Ministerio #N" en lugar del nombre real** → Falta JOIN a tabla ministerio
3. ⚠️ **RLS policies pueden estar filtrando datos según el usuario logueado** → Necesita verificación de alcance

---

## 🔴 PROBLEMA 1: Solo se traen usuarios ACTIVOS

**Ubicación:** `src/services/usuarios.service.ts:155`

```typescript
export async function getUsuariosEnriquecidos(): Promise<UsuarioEnriquecido[]> {
  const { data, error } = await supabase
    .from('usuario')
    .select(`...`)
    .eq('activo', true)  // ❌ FILTRO PROBLEMÁTICO
    .order('apellidos')
```

**Impacto:**
- ❌ UsuariosPage tiene filtro "Inactivos" pero no hay datos para mostrar
- ❌ Admin no puede ver/recuperar/gestionar usuarios inactivos
- ❌ Imposible auditar cuentas desactivadas
- ❌ Si un usuario es inactivo, desaparece de la vista completamente

**Comportamiento actual:**
- Usuario activa el filtro "Inactivos"
- La página está vacía (no hay datos)
- Usuario no puede ver quién fue desactivado

**Solución:**
Remover el filtro `.eq('activo', true)` para traer TODOS los usuarios, y dejar que el frontend filtre:

```typescript
export async function getUsuariosEnriquecidos(): Promise<UsuarioEnriquecido[]> {
  const { data, error } = await supabase
    .from('usuario')
    .select(`...`)
    // ✅ SIN FILTRO - frontend maneja activo/inactivo
    .order('apellidos')
```

---

## 🔴 PROBLEMA 2: Ministerios mostrando "Ministerio #N"

**Ubicación:** `src/services/usuarios.service.ts:193`

```typescript
minNames: (r.miembro_ministerio || [])
  .filter((mm: any) => mm.fecha_salida === null)
  .map((mm: any) => ({
    nombre: `Ministerio #${mm.id_ministerio}`,  // ❌ FALTA NOMBRE REAL
    rol: mm.rol_en_ministerio ?? '',
  })),
```

**Impacto:**
- ❌ Usuario ve "Ministerio #1, Ministerio #5" en lugar de "Evangelismo, Adoración"
- ❌ Imposible saber a qué ministerios pertenece un usuario
- ❌ Experiencia de usuario confusa

**Solución:**
Agregar JOIN a tabla ministerio en el select:

```typescript
export async function getUsuariosEnriquecidos(): Promise<UsuarioEnriquecido[]> {
  const { data, error } = await supabase
    .from('usuario')
    .select(`
      *,
      usuario_rol(...),
      usuario_rol_sede(...),
      miembro_ministerio(
        rol_en_ministerio,
        fecha_salida,
        id_ministerio,
        ministerio(nombre)  // ✅ AGREGAR ESTO
      )
    `)
    .order('apellidos')
  
  // Luego en el mapeo:
  minNames: (r.miembro_ministerio || [])
    .filter((mm: any) => mm.fecha_salida === null)
    .map((mm: any) => ({
      nombre: mm.ministerio?.nombre ?? `Ministerio #${mm.id_ministerio}`,
      rol: mm.rol_en_ministerio ?? '',
    })),
```

---

## 🟡 PROBLEMA 3: RLS Policies limitando visibilidad

**Ubicación:** Base de datos RLS policies

**Riesgo:**
- Si hay RLS policy en tabla usuario, un usuario no-admin solo vería usuarios de su iglesia
- Pero UsuariosPage en `/app/global/usuarios` debería ser **SUPER ADMIN ONLY**
- Necesita verificación de que RLS no está interfiriendo

**Verificación requerida:**
```sql
-- Verificar que super_admin puede ver TODOS los usuarios
SELECT * FROM usuario;  -- Debería devolver N usuarios

-- Verificar RLS policy
SELECT * FROM pg_policies WHERE tablename = 'usuario';
```

---

## ✅ PROBLEMAS QUE NO HAY

### ✓ Campos completos del usuario
Los campos que SÍ se traen correctamente:
- ✅ ID, nombres, apellidos, correo
- ✅ Teléfono, fecha nacimiento
- ✅ activo (estado)
- ✅ último acceso
- ✅ Roles (usuario_rol + usuario_rol_sede)
- ✅ Ministerios (aunque con el problema #2)

### ✓ Operaciones CRUD
- ✅ Crear usuario (inviteUser)
- ✅ Leer usuarios (getUsuarios)
- ✅ Actualizar (updateUsuario - nombres, apellidos, teléfono)
- ✅ Eliminar (deleteUsuarioAsSuperAdmin - con validación)
- ✅ Toggle activo/inactivo (toggleUsuarioActivo)

### ✓ Asignación de roles
- ✅ assignRol - asigna usuario_rol
- ✅ removeRol - elimina usuario_rol o usuario_rol_sede
- ✅ Admin Sede management (assignAdminSede, removeAdminSede)

---

## 📊 TABLA DE CONTENIDOS MOSTRADOS

| Campo | Mostrado | Completo |
|-------|----------|----------|
| Usuario (Nombres) | ✅ Sí | ✅ Completo |
| Correo | ✅ Sí | ✅ Completo |
| Roles | ✅ Sí | ✅ Con sede si aplica |
| Ministerios | ✅ Sí | ❌ ID en lugar de nombre |
| Último Acceso | ✅ Sí | ✅ Formateado |
| Estado | ✅ Sí | ✅ Activo/Inactivo |
| Teléfono | ✅ Busca | ✅ Disponible |

---

## 🔧 PLAN DE CORRECCIÓN

### Tarea 1: Remover filtro de activos
**Archivo:** `src/services/usuarios.service.ts:155`
**Cambio:** Remover `.eq('activo', true)`
**Tiempo:** 2 minutos

### Tarea 2: Agregar JOIN a ministerio
**Archivo:** `src/services/usuarios.service.ts:149-153` y `193`
**Cambio:** Agregar `ministerio(nombre)` al select y mapear nombre real
**Tiempo:** 5 minutos

### Tarea 3: Verificar RLS policies
**Verificar:** Que super_admin puede ver todos los usuarios
**Tiempo:** 5 minutos

---

## 📝 RECOMENDACIONES ADICIONALES

### 1. Agregar más filtros
- [ ] Filtrar por fecha de creación (últimos 30 días)
- [ ] Filtrar por último acceso (usuarios inactivos hace X días)
- [ ] Filtrar por iglesia (solo super_admin)

### 2. Mejorar visualización
- [ ] Mostrar foto de perfil (si existe)
- [ ] Mostrar nombre de iglesia junto a rol
- [ ] Agregar columna "Confirmar email" (para usuarios sin email verificado)

### 3. Auditoría
- [ ] Log de quién cambió el estado de activo/inactivo
- [ ] Log de quién asignó/removió roles
- [ ] Tabla de audit para eliminaciones

---

**Status:** 🔴 **REQUIERE CORRECCIÓN**  
**Prioridad:** Alta (Problema 1 y 2)  
**Esfuerzo:** Bajo (10-15 minutos total)
