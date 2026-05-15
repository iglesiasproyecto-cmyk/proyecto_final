# Diseño: Gestión de Usuarios Basada en Roles (Role-Based User Management)

**Fecha:** 2026-05-15  
**Objetivo:** Extender capacidades de gestión de usuarios a roles `admin_sede` y `lider`, manteniendo seguridad y escalabilidad.

---

## 1. Contexto Actual

Hoy, solo dos roles pueden gestionar usuarios:
- `super_admin`: gestiona todos los usuarios del sistema
- `admin_iglesia`: gestiona usuarios de su iglesia

Los siguientes roles NO tienen acceso a gestión:
- `admin_sede`
- `lider`
- `servidor`

Esto limita la operatividad en iglesias grandes donde líderes de ministerios necesitan agregar miembros, asignar roles básicos, y mantener su grupo.

---

## 2. Requisitos Funcionales

### 2.1 Matriz de Autorización

| Rol | Alcance | Operaciones | Roles que puede asignar |
|-----|---------|-------------|------------------------|
| `super_admin` | Todos los usuarios | Ver, invitar, editar, asignar roles, eliminar | Todos |
| `admin_iglesia` | Usuarios de su iglesia (excluye super_admin) | Ver, invitar, editar, asignar roles, eliminar | Todos excepto super_admin |
| `admin_sede` | Usuarios de su sede | Ver, invitar, editar, asignar roles, eliminar | Todos excepto super_admin y admin_iglesia |
| `lider` | Usuarios de su ministerio(s) | Ver, invitar, editar, asignar roles, eliminar | Solo `servidor` |
| `servidor` | Sin acceso | — | — |

### 2.2 Flujos Principales

#### A. Invitar Usuario
**Actores:** super_admin, admin_iglesia, admin_sede, lider

1. Usuario abre diálogo de invitación
2. Sistema pre-selecciona contexto (iglesia/sede/ministerio) según rol
3. Contexto no es editable para roles restringidos (líder no puede cambiar ministerio)
4. Sistema presenta solo roles disponibles para asignar
5. Invitación se envía con validación de permisos

#### B. Asignar/Cambiar Rol
**Actores:** super_admin, admin_iglesia, admin_sede, lider

1. Usuario selecciona un usuario existente
2. Sistema valida: ¿está este usuario en mi ámbito?
3. Sistema valida: ¿puedo asignar este rol?
4. Si ambas son verdaderas, procede; si no, muestra error
5. Cambio se registra y aplica inmediatamente

#### C. Eliminar Usuario
**Actores:** super_admin, admin_iglesia, admin_sede, lider

1. Usuario intenta eliminar otro usuario
2. Sistema valida: ¿está este usuario en mi ámbito?
3. Si el usuario está en múltiples contextos (ej: múltiples ministerios):
   - Solo se remueve del ministerio actual (no eliminación completa)
4. Si el usuario está SOLO en el contexto del actual rol:
   - Se elimina completamente de la base de datos
5. Confirmación con dos pasos (diálogo + confirmación de texto)

---

## 3. Diseño Técnico

### 3.1 Cambios en AppContext

**Agregar a AppState:**
```typescript
interface AppState {
  // ... (existente)
  ministeriosDelUsuario: { id: number; nombre: string; idSede: number }[]
  // ^ Lista de ministerios donde el usuario actual tiene rol de líder
}
```

**Lógica de obtención:**
- En `initializeClaims()`, junto con `iglesiasDelUsuario` y `sedesDelUsuario`, obtener ministerios
- Usar RPC similar: `get_my_ministerios()` que retorne solo los ministerios donde el usuario es líder

### 3.2 Cambios en UsuariosPage.tsx

**Línea 23-27 (actualizar lógica de permisos):**
```typescript
const isSuperAdmin = rolActual === "super_admin";
const isAdminIglesia = rolActual === "admin_iglesia";
const isAdminSede = rolActual === "admin_sede";      // NUEVO
const isLider = rolActual === "lider";               // NUEVO
const canManageUsers = isSuperAdmin || isAdminIglesia || isAdminSede || isLider;
```

**Línea 81-84 (ajustar restricciones de roles):**
```typescript
const roleNeedsSede = (idRol: number) => 
  ([ROLE_IDS.ADMIN_SEDE, ROLE_IDS.LIDER, ROLE_IDS.SERVIDOR] as number[]).includes(idRol);

const roleNeedsMinisterio = (idRol: number) => 
  ([ROLE_IDS.LIDER, ROLE_IDS.SERVIDOR] as number[]).includes(idRol);

// NUEVO: validar qué roles el usuario actual PUEDE asignar
const canAssignRole = (idRol: number): boolean => {
  if (isSuperAdmin) return true;
  if (isAdminIglesia) return idRol !== ROLE_IDS.SUPER_ADMIN;
  if (isAdminSede) return ![ROLE_IDS.SUPER_ADMIN, ROLE_IDS.ADMIN_IGLESIA].includes(idRol);
  if (isLider) return idRol === ROLE_IDS.SERVIDOR; // Solo servidor
  return false;
};
```

**Línea 108-131 (agregar filtro por ministerio/sede):**
```typescript
const filtered = usersForTable.filter(u => {
  // Validar acceso según rol
  if (isAdminIglesia) {
    const hasRoleInMyIglesia = u.roleNames.some(rn => 
      rn.idIglesia === iglesiaActual?.id && rn.rolNombre !== 'Super Administrador'
    );
    if (!hasRoleInMyIglesia) return false;
  }
  
  if (isAdminSede) {
    // NUEVO: solo usuarios de mi sede
    const hasRoleInMySede = u.roleNames.some(rn => rn.idSede === miSede?.id);
    if (!hasRoleInMySede) return false;
  }
  
  if (isLider) {
    // NUEVO: solo usuarios de mis ministerios
    const inMyMinisterios = u.minNames.some(mn => 
      ministeriosDelUsuario.some(m => m.id === mn.idMinisterio)
    );
    if (!inMyMinisterios) return false;
  }

  // ... (resto de filtros de búsqueda/estado/rol/iglesia)
  return true;
});
```

**En diálogos de invitación y asignación:**
- Para `lider`: pre-seleccionar ministerio, ocultar selector, solo mostrar "servidor" en rol
- Para `admin_sede`: pre-seleccionar sede, ocultar selector
- Para `admin_iglesia`: pre-seleccionar iglesia (si en vista tenant)

### 3.3 Cambios en useUsuarios.ts

**En `useUsuariosEnriquecidos()`:**
```typescript
export function useUsuariosEnriquecidos() {
  const { rolActual, iglesiaActual, ministeriosDelUsuario } = useApp();
  
  // Queries existentes + filtrado por rol
  const query = supabase
    .from('usuario')
    .select('...')
    .eq('activo', true); // ejemplo existente
  
  // NUEVO: aplicar filtros según rol
  if (rolActual === 'lider') {
    // Solo usuarios que tengan rol en mis ministerios
    query = query.in('idMinisterio', ministeriosDelUsuario.map(m => m.id));
  }
  if (rolActual === 'admin_sede') {
    // Solo usuarios de mi sede
    query = query.eq('idSede', miSede.id);
  }
  // super_admin y admin_iglesia usan filtros existentes
  
  return useQuery(/* ... */);
}
```

### 3.4 Validaciones de Seguridad

**En cada operación (invitar, asignar, eliminar):**

1. **Antes de invitar:**
   - ¿El usuario actual tiene permiso de gestión en este contexto?
   - ¿El rol a asignar es válido para este usuario?

2. **Antes de cambiar rol:**
   - ¿El usuario destino está en mi ámbito?
   - ¿Puedo asignar el nuevo rol?

3. **Antes de eliminar:**
   - ¿El usuario destino está en mi ámbito?
   - ¿Lo elimino solo del contexto actual o completamente?

---

## 4. Cambios Arquitectónicos Menores

- **AppContext.tsx:** agregar `ministeriosDelUsuario` a AppState
- **useUsuarios.ts:** parámetro opcional de contexto en hooks
- **constants/roles.ts:** asegurar `ROLE_IDS.SERVIDOR` está definido
- **types/app.types.ts:** asegurar tipos de Usuario y Ministerio están completos

No hay cambios de base de datos; todo se basa en datos existentes.

---

## 5. Flujo de Datos (Ejemplo: Líder invita usuario)

```
LiderPage → Click "Invitar"
  ↓
UsuariosPage abre InviteDialog
  ↓
InviteDialog pre-carga ministerios del líder
  ↓
Líder completa: correo, nombres, apellidos (ministerio ya pre-seleccionado)
  ↓
inviteMutation llamada con validación:
  - ¿Soy líder? ✓
  - ¿Puedo asignar 'servidor'? ✓
  - ¿El ministerio es mío? ✓
  ↓
Supabase RPC invita usuario + asigna rol
  ↓
Toast éxito, formulario limpia
```

---

## 6. Consideraciones de Seguridad

### Presente (Frontend)
- Validaciones en UI para prevenir errores de UX
- Filtros en hooks para no exponer datos
- Función `canAssignRole()` centralizada

### Futura (Backend/RLS - No en este PR)
- RLS en Supabase debe replicated estas reglas
- RPCs deben validar permisos del usuario autenticado
- Auditoría de cambios (quién invitó/modificó/eliminó a quién)

### No es Riesgo en Este Diseño
- Un líder NO puede ver/modificar admins (filtros lo previenen)
- Un líder NO puede crear otros líderes (solo "servidor")
- Jerarquía respetada automáticamente por construcción

---

## 7. Alcance Explícitamente EXCLUIDO

- **RLS en Supabase:** cambios de backend, hecho en PR separado
- **Auditoría:** tabla de logs, considerado pero no en este PR
- **Notificaciones:** alertar al admin si un líder invita alguien, futura
- **Permisos granulares:** control por acción específica, arquitectura futura

---

## 8. Testing (Manual + Automatizado)

### Casos Manuales
1. Líder invita usuario → solo ve su ministerio, solo "servidor" disponible
2. Admin sede invita usuario → solo ve su sede, múltiples roles disponibles
3. Filtros: líder ve solo usuarios de su ministerio en tabla
4. Eliminación: líder elimina usuario solo de su ministerio, no completamente

### Automatizado (E2E)
- `12-lider-manage-usuarios.spec.ts` (nuevo)
  - Login como líder
  - Invitar usuario
  - Asignar rol
  - Eliminar usuario
  - Validar filtros

---

## 9. Métricas de Éxito

- ✅ Líder puede invitar usuarios a su ministerio
- ✅ Líder solo ve usuarios de su ministerio
- ✅ Líder solo puede asignar rol "servidor"
- ✅ Admin sede solo ve usuarios de su sede
- ✅ Filtros funcionan correctamente
- ✅ Seguridad: un líder no puede acceder a datos fuera de su ámbito

---

## 10. Cronograma Estimado

- **Fase 1:** Cambios en AppContext + hooks (30 min)
- **Fase 2:** Cambios en UsuariosPage + validaciones (45 min)
- **Fase 3:** Testing manual + E2E (30 min)
- **Total:** ~2 horas

---

## 11. Notas Finales

- Diseño mantiene simetría: cada rol ve/gestiona solo su ámbito
- Extensible: agregar nuevo rol es agregar un caso más en las condiciones
- Frontend primero: backend (RLS) viene después en PR separado
- Aprovecha datos existentes en AppContext (`ministeriosDelUsuario` por agregar)
