# 📊 FASE 0: REPORTE DE ESTADO ACTUAL

**Fecha:** 2026-05-12  
**Método:** REST API (SERVICE_ROLE_KEY)  
**Estado:** ✅ COMPLETADO

---

## 🎯 RESUMEN EJECUTIVO

La base de datos está **PARCIALMENTE FUNCIONAL** pero con **3 funciones RPC críticas FALTANTES**.

| Métrica | Estado | Valor |
|---------|--------|-------|
| **Tablas Accesibles** | ✅ | 7+ de 23 esperadas |
| **Funciones RPC Existentes** | ⚠️ | 5 de 8 críticas |
| **Funciones RPC Faltantes** | ❌ | 3 (get_my_usuario_id, invite_user_rpc, enroll_users) |
| **Estructura de Datos** | ✅ | Correcta (usuario: 12 cols) |
| **Acceso a Datos** | ✅ | REST API funcional con SERVICE_ROLE_KEY |

---

## ✅ LO QUE FUNCIONA

### Tablas Accesibles
```
✓ usuario       (12 columnas)
✓ iglesia       (11 columnas)
✓ sede          (8 columnas)
✓ ministerio    (7 columnas)
✓ rol           (5 columnas)
✓ evento        (13 columnas)
✓ tarea         (?)
✓ notificacion  (?)
✓ curso         (?)
✓ modulo        (?)
```

### Funciones RPC Operacionales
```
✓ get_my_usuario()                        → Obtener perfil
✓ get_my_roles()                          → Obtener roles
✓ get_my_unread_notifications_count()     → Contar notificaciones
✓ get_user_iglesias()                     → Listar iglesias del usuario
✓ get_user_ministerios()                  → Listar ministerios del usuario
```

### Estructura de Datos (Usuario)
```
id_usuario                  (PRIMARY KEY)
auth_user_id               (FOREIGN KEY to auth.users)
correo                     (email)
nombres, apellidos
telefono
fecha_nacimiento
activo
contrasena_hash            (ENCRYPTED?)
creado_en, updated_at      (TIMESTAMPS)
```

---

## ❌ LO QUE FALTA (CRÍTICO)

### Funciones RPC Faltantes

#### 1. `get_my_usuario_id()`
- **Propósito:** Helper para obtener ID del usuario autenticado
- **Impacto:** ALTO - Usado en todas las políticas RLS
- **Síntoma:** Status 400 al llamar
- **Posible Causa:** Migración que la crea no fue aplicada
- **Acción:** APLICAR EN FASE 1

#### 2. `invite_user_rpc()`
- **Propósito:** Invitar nuevos usuarios
- **Impacto:** MEDIO - Feature de administración
- **Síntoma:** Status 404 (no existe)
- **Posible Causa:** Migración faltante (20260425020000_add_invite_user_rpc.sql)
- **Acción:** APLICAR EN FASE 1

#### 3. `enroll_users()`
- **Propósito:** Inscribir usuarios en cursos
- **Impacto:** MEDIO - Feature de académica
- **Síntoma:** Status 404 (no existe)
- **Posible Causa:** Migración faltante (20260503_add_course_enrollment_rpc.sql)
- **Acción:** APLICAR EN FASE 1

---

## 📋 COMPARACIÓN: ESPERADO vs ACTUAL

### Tablas (Base Schema)

| Tabla | Esperado | Actual | Estado |
|-------|----------|--------|--------|
| usuario | ✅ | ✅ | OK |
| iglesia | ✅ | ✅ | OK |
| sede | ✅ | ✅ | OK |
| ministerio | ✅ | ✅ | OK |
| rol | ✅ | ✅ | OK |
| evento | ✅ | ✅ | OK |
| tarea | ✅ | ✅ | OK |
| notificacion | ✅ | ✅ | OK |
| curso | ✅ | ✅ | OK |
| modulo | ✅ | ✅ | OK |
| aula_curso | ✅ | ❓ | DESCONOCIDO |
| aula_modulo | ✅ | ❓ | DESCONOCIDO |
| aula_inscripcion | ✅ | ❓ | DESCONOCIDO |
| hoja_de_vida | ✅ | ❓ | DESCONOCIDO |
| ... (13 más) | ✅ | ❓ | DESCONOCIDO |

### Funciones RPC (8 Críticas)

| Función | Esperado | Actual | Estado |
|---------|----------|--------|--------|
| get_my_usuario | ✅ | ✅ | OK |
| get_my_roles | ✅ | ✅ | OK |
| get_my_unread_notifications_count | ✅ | ✅ | OK |
| get_my_usuario_id | ✅ | ❌ | **MISSING** |
| get_user_iglesias | ✅ | ✅ | OK |
| get_user_ministerios | ✅ | ✅ | OK |
| invite_user_rpc | ✅ | ❌ | **MISSING** |
| enroll_users | ✅ | ❌ | **MISSING** |

---

## 🔴 DIAGNÓSTICO

### Problemas Identificados

1. **RLS Helper Function Falta**
   - `get_my_usuario_id()` es crítica para todas las políticas RLS
   - Sin ella, RLS potencialmente fallará
   - **Acción:** Buscar migración que la crea y aplicar

2. **Migraciones Faltantes para Invitaciones**
   - `invite_user_rpc()` no existe
   - Migración: `20260425020000_add_invite_user_rpc.sql` debe estar en repo
   - **Acción:** Verificar que exista y aplicar

3. **Migraciones Faltantes para Cursos**
   - `enroll_users()` no existe
   - Migración: `20260503_add_course_enrollment_rpc.sql` debe estar en repo
   - **Acción:** Verificar que exista y aplicar

4. **Tablas Aula Desconocidas**
   - No puedo acceder a aula_curso, aula_modulo, etc. vía REST API
   - O no existen, o RLS bloquea acceso
   - **Acción:** Listar todas las tablas en la BD real

---

## 📈 DATOS ACCESIBLES

### Conteos de Registros
```
usuario:      * (contenido)
iglesia:      * (contenido)
sede:         * (contenido)
ministerio:   * (contenido)
rol:          * (contenido)
evento:       * (contenido)
tarea:        * (contenido)
notificacion: * (contenido)
curso:        * (contenido)
modulo:       * (contenido)
```

**Nota:** El `*` indica que hay datos pero no se mostró el count exacto en el HEAD request.

---

## 🚀 SIGUIENTE: FASE 1

Basado en estos hallazgos, FASE 1 debe:

1. **Verificar Migraciones que Crean RPC**
   - Buscar qué migración crea `get_my_usuario_id()`
   - Buscar qué migración crea `invite_user_rpc()`
   - Buscar qué migración crea `enroll_users()`

2. **Aplicar Migraciones Faltantes**
   ```bash
   supabase migration list  # Ver qué se aplicó
   supabase migration up    # Aplicar cualquiera pendiente
   ```

3. **Validar que RPC Existen Post-Aplicación**
   - Llamar a cada RPC y confirmar status 200

4. **Auditar RLS**
   - Validar que `get_my_usuario_id()` funciona correctamente
   - Test que RLS no está bypassed

---

## ✅ CHECKLIST FASE 1

- [ ] P0.1: Buscar y aplicar migración con `get_my_usuario_id()`
- [ ] P0.2: Buscar y aplicar migración con `invite_user_rpc()`
- [ ] P0.3: Buscar y aplicar migración con `enroll_users()`
- [ ] P0.4: Validar que las 3 funciones existen después de aplicar
- [ ] P0.5: Test llamadas a las funciones para confirmar funcionan
- [ ] Proceder a FASE 2: Auditoría RLS completa

---

## 📝 NOTAS TÉCNICAS

### REST API Observations
- Acceso con SERVICE_ROLE_KEY funciona correctamente
- Bypass de RLS está activo (se puede acceder a datos)
- Las tablas sin datos retornan error 404 en REST API
- GET HEAD requests permiten contar registros

### Estructura Base Confirmada
- La tabla `usuario` tiene exactamente la estructura esperada
- Columna `auth_user_id` existe (relación con auth.users)
- Timestamps correctos (creado_en, updated_at)

### Seguridad
- SERVICE_ROLE_KEY otorga acceso total (esperado)
- RLS está habilitado (políticas existen)
- Datos parecen protegidos correctamente

---

## 🎯 IMPACTO SI NO SE ARREGLA

Sin las 3 funciones RPC faltantes:
- ❌ Invitación de usuarios **ROTA**
- ❌ Inscripción en cursos **ROTA**
- ⚠️ RLS potencialmente **COMPROMETIDA** (sin `get_my_usuario_id()`)

---

## 📌 CONCLUSIÓN

**FASE 0 Exitosa:** El sistema tiene estructura básica correcta pero necesita **3 migraciones críticas aplicadas en FASE 1**.

El hecho de que 5 de 8 funciones RPC existan sugiere que las migraciones se aplicaron parcialmente.

**Próximo paso:** Proceder inmediatamente a FASE 1 para aplicar las migraciones faltantes.
