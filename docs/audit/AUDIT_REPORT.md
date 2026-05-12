# 🔍 AUDITORÍA CRÍTICA - IGLESIABD POST-DESASTRE

**Fecha:** 2026-05-12  
**Estado:** ANÁLISIS PRELIMINAR SIN MODIFICACIONES  
**Proyecto:** heibyjbvfiokmduwwawm (Supabase)

---

## 📋 RESUMEN EJECUTIVO

### Estado General: ⚠️ PARCIALMENTE COMPROMETIDO

El sistema ha sido reconstruido parcialmente usando migraciones locales después de una pérdida crítica de datos. Análisis de código fuente revela:

✅ **FUNCIONA:**
- 23 tablas base creadas correctamente
- 92 migraciones secuenciales en repositorio
- ~55+ funciones RPC críticas definidas
- ~190+ políticas RLS implementadas
- Estructura TypeScript completa y consistente
- Triggers y constraints documentados

⚠️ **EN RIESGO:**
- 2 migraciones SKIPPED (sp6, sp7) - NUNCA APLICADAS
- Migraciones incompletas o parciales en algunas tablas
- Posibles gaps en RLS después de desastre
- Sincronización auth.users ↔ usuario ROTA
- Datos inconsistentes en tablas críticas

❌ **CRÍTICO:**
- Estado real de Supabase DESCONOCIDO (no acceso directo psql)
- NO SABEMOS si migraciones se ejecutaron en orden correcto
- NO SABEMOS si datos fueron eliminados completamente o parcialmente
- NO SABEMOS si triggers de creación de usuarios existen
- Usuario orphaned posible después del desastre

---

## 🏗️ ESTRUCTURA DE BASE DE DATOS

### Tablas Creadas (Base Schema)
```
Geografía (3):         pais, departamento, ciudad
Iglesias (5):          iglesia, pastor, iglesia_pastor, sede, sede_pastor
Usuarios (3):          usuario, rol, usuario_rol
Ministerios (2):       ministerio, miembro_ministerio
Eventos & Tareas (3):  tipo_evento, evento, tarea, tarea_asignada
Cursos (6):            curso, modulo, evaluacion, proceso_asignado_curso,
                       detalle_proceso_curso, (tabla aula?)
Otros (1):             notificacion
---
Total: 23 tablas
```

### Tipos TypeScript Esperados

Frontend espera los siguientes tipos (en `src/types/app.types.ts`):
- ✅ Pais, DepartamentoGeo, Ciudad
- ✅ Iglesia, Pastor, IglesiaPastor, SedePastor, Sede
- ✅ Ministerio, MiembroMinisterio
- ✅ Rol, Usuario, UsuarioRol, AdminSedeAsignacion
- ✅ Notificacion
- ✅ Evento, Tarea, TareaAsignada, TareaEvidencia
- ⚠️ **AulaCurso** (incompleto - falta schema Aula)
- ❓ AulaModulo, AulaContenido, AulaRecursos, AulaInscripcion, AulaProgresoActividad, HojaDeVida (NO VERIFICADO EN SCHEMA)

### Nombre de Campos: snake_case vs camelCase

**⚠️ DISCREPANCIA ENCONTRADA:**

Base de datos (SQL):
```sql
id_usuario, nombres, apellidos, auth_user_id, creado_en, updated_at
```

TypeScript:
```typescript
idUsuario, nombres, apellidos, authUserId, creadoEn, actualizadoEn
```

**IMPACTO:** Hay una capa de serialización/conversión que debe existir. Si no existe, todas las queries fallarán.

---

## 🔐 ANÁLISIS DE RLS (MUY CRÍTICO)

### Estado RLS

- ✅ RLS habilitado en múltiples tablas
- ✅ ~190+ políticas definidas en 80+ migraciones RLS
- ⚠️ 2 migraciones RLS SKIPPED sin aplicar
- ⚠️ Múltiples migraciones de "fix" y "hardening" indican evolución / bugs anteriores

### Fases de RLS (Histórico)

1. **Fase 0** (20260407031130): RLS básico - autenticados pueden leer
2. **Fase 1** (20260407141016): Mutaciones - crear/actualizar/eliminar
3. **Fase 2** (20260407204753): Ministerios
4. **Fase 3** (20260407205720): Eventos
5. **Fase 4** (20260407211744): Cursos
6. **Fase 6** (20260416120000): Geografía
7. **phaseA** (20260416183000): Admin Iglesia scope
8. **phaseB** (20260417110000): Aula + Evaluaciones
9. **phaseA** (20260416140000): FIX - Líderes ministerio
10. **sp1-sp9**: Múltiples fixes de recursion, gaps, hardening

**⚠️ SEÑAL DE ALERTA:** Tanta evolución (9 fases + N fixes) sugiere:
- RLS fue evolucionando conforme se descubrían problemas
- Posible que fixes recientes NO se hayan aplicado si se perdieron datos
- SKIPPED migrations (sp6, sp7) nunca fueron aplicadas

### Políticas RLS Críticas por Tabla

#### `usuario`
- SELECT: ¿Quién puede ver a otros usuarios?
- RISK: Sin RLS correcto → exposición de emails, datos personales
- POLÍTICA ESPERADA: Super admin ve todos, admin_iglesia ve su iglesia, lider ve sus ministerios, servidor ve solo él mismo

#### `iglesia`
- SELECT: Admin solo su iglesia
- RISK: Multi-tenant bypass → ver iglesias ajenas
- POLÍTICA ESPERADA: Super admin ve todas, admin_iglesia ve su iglesia

#### `ministerio`
- SELECT: Líderes ven sus ministerios
- RISK: Acceso cruzado entre ministerios
- POLÍTICA ESPERADA: Líder ve solo su ministerio, admin ve todos en su iglesia

#### `aula_inscripcion`, `aula_progreso_actividad`
- NUEVAS tablas (posibles)
- RISK: Si RLS está incompleta, toda la funcionalidad de aula está expuesta

### Problemas Potenciales de RLS

1. **Recursion Errors**: Migraciones sp8 y posteriores EXPLÍCITAMENTE arreglan esto
   - Si sp8+ no fue aplicada → RIESGO DE RECURSION
   - Puede causar queries lentas o DENIED errors

2. **CTEs y Window Functions**: Pueden eludir RLS
   - NECESITA VALIDACIÓN MANUAL

3. **Service Role Bypass**: Si alguien accede con service_role key
   - Vulnerable si key está expuesta

4. **Cross-Tenant Attacks**: Un admin_iglesia podría ver otra iglesia
   - CRÍTICO para SaaS multi-tenant

---

## 🔑 FUNCIONES RPC

### Funciones Críticas Esperadas por Frontend

```
✅ get_my_usuario()                          - Obtener perfil del usuario
✅ get_my_roles()                            - Obtener roles del usuario
✅ get_my_unread_notifications_count()       - Contar notificaciones
✅ get_my_usuario_id()                       - Helper para RLS
✅ get_my_tenant_id()                        - ¿Tenant/Iglesia del usuario?
❓ get_my_ministerios()                      - Ministerios del usuario (VERIFICAR)
❓ invite_user_rpc()                         - Invitar usuario (VERIFICAR)
❓ enroll_users()                            - Inscribir en curso (VERIFICAR)
```

### Todas las Funciones Encontradas

**Total: 55+ funciones RPC y helpers**

Incluyen:
- Getters: `get_my_*`, `get_user_*`, `get_all_usuarios_*`
- Checkers: `is_admin_iglesia()`, `is_lider()`, `is_super_admin()`, `can_*`
- Mutators: `create_tarea()`, `invite_user_rpc()`, `enroll_users()`, `delete_usuario_super_admin()`
- Helpers: `trigger_set_updated_at()`, `current_usuario_id()`, `get_iglesia_for_*`

**⚠️ RIESGO:** Si alguna de estas no existe → Features completamente rotas

---

## 🔔 AUTENTICACIÓN

### Estado de Auth

**Trigger de Creación de Usuario:**
- ✅ Trigger `on_auth_user_created` definido en `20260407031108_auth_user_id_and_trigger.sql`
- ✅ Función `handle_new_user()` definida en múltiples versiones
- ⚠️ **SIN ACCESO DIRECTO** no puedo confirmar que está en Supabase actual

**Posibles Problemas:**

1. **Usuarios Orphaned**: auth.users sin registro en tabla `usuario`
   - Después del desastre, es PROBABLE
   - IMPACTO: Usuarios no pueden loguearse

2. **Usuarios Duplicados**: Registros múltiples en tabla `usuario` para mismo auth.user
   - IMPACTO: Conflictos de FK, datos corruptos

3. **Metadata Sincronización**: JWT claims vs permisos en BD
   - IMPACTO: Usuario ve roles incorrectos, acceso bloqueado

4. **Session Tokens**: JWT expirados sin refresh
   - IMPACTO: Logouts forzados después del desastre

---

## 📊 MIGRACIONES

### Análisis de Migraciones

**Total: 92 archivos**

Orden cronológico:
1. `20260401000000` - Base schema (23 tablas)
2. `20260401000001` - Helper functions
3. `20260407*` - Auth + RLS Fase 0-4
4. `20260416*` - RLS fixes (geografía, admin scope)
5. `20260417*` - RLS aula, enrollment, fixes
6. `20260418*` - Modulo contenido, RLS hardening
7. `202604[21-28]*` - Storage, tareas, evaluaciones, hoja_de_vida
8. `202605*` - SP phases (fixes de recursion, JWT, etc.)

### Migraciones SKIPPED (CRÍTICO)

```
❌ .skip_sp6_rls_security_hardening.sql        (6.2 KB, 20260511)
❌ .skip_sp7_rls_complete_gaps.sql             (7.8 KB, 20260511)
```

**IMPACTO:** Las últimas 2 migraciones RLS NUNCA fueron aplicadas
- sp6: Security hardening para RLS
- sp7: Completar gaps en RLS

**RIESGO:** Si sp7 cierra security holes, sistema está VULNERABLE

### Migraciones Incompletas Detectadas

Archivos que NO están en status de git (en .gitkeep o eliminados):
```
D supabase/migrations/.gitkeep                  (eliminado)
D supabase/migrations/20260415100000_phase5_rls_usuarios.sql      (eliminado)
D supabase/migrations/20260421_auto_confirm_emails.sql            (eliminado)
D supabase/migrations/20260421_confirm_existing_users.sql         (eliminado)
```

**IMPACTO:** Tablas que dependían de estas migraciones podrían estar incompletas

---

## 🎯 INCONSISTENCIAS ENCONTRADAS

### 1. **TypeScript ↔ Base de Datos Mismatch**

| Aspecto | TypeScript | Base de Datos | Status |
|---------|-----------|---------------|--------|
| Nombres camelCase | ✅ idUsuario | snake_case id_usuario | ⚠️ CONVERSION LAYER? |
| Usuario.idUsuario | ✅ number | BIGSERIAL (bigint) | ✅ Compatible |
| Usuario.authUserId | ✅ string | uuid | ✅ Compatible |
| Iglesia.idIglesia | ✅ number | BIGSERIAL | ✅ Compatible |
| AulaCurso | ✅ Existe interface | ❓ Table nombre? | ❓ VERIFICAR |
| HojaDeVida | ❌ NO en types | ✅ Tabla creada | ⚠️ Frontend desconoce |

### 2. **Migraciones Eliminadas vs Frontend Expectations**

```
Migración Eliminada                     Tabla Afectada          Status
─────────────────────────────────────────────────────────────────────
20260415100000_phase5_rls_usuarios.sql  usuario (RLS)          ❌ RLS INCOMPLETO?
20260421_auto_confirm_emails.sql        auth.users hooks       ❌ FALTA SETUP
20260421_confirm_existing_users.sql     (batch process)        ⚠️ FALTA SETUP
```

### 3. **Columnas Potencialmente Faltantes**

Frontend usa en AppContext:
```typescript
iglesiasDelUsuario: { id: number; nombre: string }[]
```

Pero table `usuario` solo tiene:
- id, email, nombres, apellidos, telefono, fecha_nacimiento, activo, ultimo_acceso, auth_user_id

**RIESGO:** No hay relación directa usuario → iglesia en tabla. Debe venir de:
- `usuario_rol` (via FK)
- `miembro_ministerio` (via FK)
- RPC `get_user_iglesias()`

**IMPACTO:** Si RPC no existe o está roto → iglesiasDelUsuario vacío

### 4. **Enums Potencialmente Desincronizados**

Base crea ENUMs:
```sql
estado_iglesia    AS ENUM ('activa', 'inactiva', 'fusionada', 'cerrada');
estado_sede       AS ENUM ('activa', 'inactiva', 'en_construccion');
estado_ministerio AS ENUM ('activo', 'inactivo', 'suspendido');
estado_curso      AS ENUM ('borrador', 'activo', 'inactivo', 'archivado');
```

TypeScript espera exactamente los mismos valores. **RIESGO:** Si ENUM cambió → insert fallarán

---

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### P0 - CRÍTICO (Implementar hoy)

1. **❌ Migraciones SKIPPED nunca aplicadas**
   - sp6 (security hardening) y sp7 (complete gaps) están sin aplicar
   - IMPACTO: RLS incompleto, posible bypass
   - ACCIÓN: Validar si sp7 soluciona vulns, luego aplicar

2. **❌ Migraciones eliminadas de git**
   - 4 migraciones borradas (usuarios, email confirmation)
   - IMPACTO: Usuarios orphaned, confirmación de emails rota
   - ACCIÓN: Reconstruir desde backup o desde descripción en CLAUDE.md

3. **❌ Estado de Supabase desconocido**
   - Sin acceso directo psql, no puedo confirmar:
     - ¿Migraciones se ejecutaron correctamente?
     - ¿Datos fueron eliminados completamente?
     - ¿Triggers existen?
     - ¿RLS está habilitado?
   - ACCIÓN: Obtener credenciales psql, hacer dump, comparar

4. **❌ Sincronización auth.users ↔ usuario potencialmente rota**
   - Trigger `on_auth_user_created` pudo no haber ejecutado para usuarios existentes
   - IMPACTO: Usuarios sin perfil en tabla usuario
   - ACCIÓN: Validar, sincronizar, ejecutar batch fix

5. **❌ Frontend espera columnas/funciones que podrían no existir**
   - get_user_iglesias(), get_user_ministerios()
   - iglesiasDelUsuario, sedesDelUsuario
   - ACCIÓN: Validar todas las funciones RPC esperadas

### P1 - ALTO (Implementar en 2-3 días)

6. **⚠️ Recursion en RLS potencialmente activo**
   - Migraciones sp8+ dicen "fix recursion"
   - Si sp8+ no fue aplicada → querys podrían fallar
   - ACCIÓN: Aplicar sp8 y posteriores

7. **⚠️ Storage RLS posiblemente incompleto**
   - ~4 migraciones storage RLS, incluyendo "private_scoped"
   - Si no están aplicadas → archivos accesibles a cualquiera
   - ACCIÓN: Validar storage.objects policies

8. **⚠️ Aula tables estructura desconocida**
   - Frontend espera AulaCurso, AulaModulo, AulaInscripcion, AulaProgresoActividad
   - Migraciones crearon tabla "aula_curso", "aula_modulo", etc.
   - RIESGO: Nombres inconsistentes (aula_curso vs AulaCurso)
   - ACCIÓN: Validar todas las aula tables

9. **⚠️ HojaDeVida creada pero frontend desconoce**
   - Tabla `hoja_de_vida` creada
   - Interface `HojaDeVida` NO en `src/types/app.types.ts`
   - RIESGO: Feature Aula está incompleta
   - ACCIÓN: Agregar tipos TypeScript

10. **⚠️ Múltiples migraciones de "fix" sugieren bugs históricos**
    - 15+ migraciones dicen "fix" (recursion, RLS, scope)
    - Esto indica:
      - Bugs se descubrieron post-deployment
      - Fixes se aplicaron gradualmente
      - Posible que algunos bugs NO estén fijos
    - ACCIÓN: Revisar cada "fix" migration y validar que solucionó el problema

### P2 - MEDIO (Implementar en la semana)

11. **⚠️ Deuda técnica en RLS**
    - 190+ políticas distribuidas en 80+ migraciones
    - Dificil mantener, auditar, entender
    - ACCIÓN: Consolidar RLS en migraciones temáticas

12. **⚠️ Indices potencialmente faltantes**
    - Migraciones crean UNIQUE constraints pero pocos índices para JOIN queries
    - RIESGO: Queries N+1, slow filters
    - ACCIÓN: Analizar slow queries, agregar índices

13. **⚠️ Triggers de sync no validados**
    - sync_pastor_iglesia, sync_tarea_iglesia, etc.
    - RIESGO: Datos inconsistentes si triggers no existen
    - ACCIÓN: Validar que todos los triggers existen y funcionan

14. **⚠️ Columnas de auditoría incompletas**
    - creado_en, updated_at presentes
    - FALTA: deleted_at (para soft deletes) en algunas tablas
    - ACCIÓN: Agregar deleted_at donde sea necesario

### P3 - BAJO (Deuda técnica)

15. **📝 Documentación desactualizada**
    - Schema ha evolucionado 92 migraciones
    - IGLESIABD_Supabase_Agent.md podría estar outdated
    - ACCIÓN: Regenerar docs desde schema actual

16. **📝 Tipos TypeScript parcialmente documentados**
    - Falta `HojaDeVida`, aula tables, etc.
    - ACCIÓN: Sincronizar src/types con schema actual

---

## 🛡️ PROBLEMAS DE SEGURIDAD

### Riesgos Inmediatos

1. **Multi-Tenant Bypass**
   - Si RLS no está correcto → un admin_iglesia podría ver otra iglesia
   - CRITICIDAD: ALTA
   - DETECCIÓN: Revisar todas las políticas SELECT de iglesia, ministerio, sede

2. **Service Role Misuse**
   - Si service_role key está expuesta → acceso total sin RLS
   - CRITICIDAD: ALTA
   - DETECCIÓN: Auditar uso de service_role en backend

3. **SQL Injection**
   - Dinamically constructed queries sin parametrization
   - CRITICIDAD: MEDIA
   - DETECCIÓN: Buscar string concatenation en RPCs

4. **Exposición de Datos Sensibles**
   - Emails, teléfonos, datos personales en tablas con RLS débil
   - CRITICIDAD: MEDIA
   - DETECCIÓN: Validar políticas de usuario, notificacion

5. **JWT Claims vs Permisos Desincronizados**
   - Si JWT dice "admin_iglesia" pero BD dice "servidor"
   - CRITICIDAD: MEDIA
   - DETECCIÓN: Comparar claims en JWT vs query get_my_roles()

---

## 📈 PERFORMANCE

### Potenciales Problemas

1. **Queries RLS con Recursion**
   - Varias migraciones arreglan "recursion errors"
   - IMPACTO: Timeouts, conexiones rechazadas
   - ACCIÓN: Validar que sp8+ fue aplicada

2. **Falta de Índices**
   - ENUMs sin índices
   - Foreign keys sin índices explícitos
   - IMPACTO: SELECT lentos
   - ACCIÓN: Analizar plan de queries, agregar índices

3. **N+1 Queries**
   - Si frontend hace loops + queries por cada item
   - IMPACTO: Latencia, carga en BD
   - ACCIÓN: Revisar componentes React, usar batch RPCs

4. **Storage Queries sin Índices**
   - storage.objects tenía ~4 migraciones de RLS/índices
   - IMPACTO: Listar archivos lento
   - ACCIÓN: Validar índices en storage.objects

---

## 📂 STORAGE

### Buckets Esperados

Basado en migraciones:
- `aula-recursos` - Archivos de módulos/cursos
- Posiblemente otros para eventos, tareas

### Políticas Storage

Migraciones crean ~15+ políticas storage.objects:
- Public vs Private
- Scoped por usuario/iglesia/ministerio

**RIESGO:** Si no están aplicadas → archivos públicos sin restricciones

---

## 📋 MATRIZ DE VERIFICACIÓN

¿QUÉ NECESITO VALIDAR SIN PSQL?

```
[ ] Listar todas las columnas reales de cada tabla
[ ] Validar que todos los tipos TypeScript coinciden
[ ] Confirmar que todas las funciones RPC existen
[ ] Verificar que todas las políticas RLS están presentes
[ ] Auditar cada política RLS para bypasses
[ ] Validar que triggers existen (sin pedir TRIGGER LIST)
[ ] Confirmar índices en campos críticos
[ ] Verificar enums exactamente
[ ] Checar sincronización auth.users ↔ usuario
[ ] Validar storage buckets y policies
[ ] Confirmar que migraciones SKIPPED no son críticas
[ ] Confirmar que migraciones ELIMINADAS se pueden reconstruir
```

---

## 🎯 PRÓXIMOS PASOS

### FASE 1: Obtener Acceso Directo (Hoy)

1. Obtener credenciales PostgreSQL directo
2. Conectar con psql / pg_dump
3. Generar dump actual
4. Comparar con expected schema

### FASE 2: Identificar Gaps (Hoy - Mañana)

1. Listar todas las tablas actuales vs esperadas
2. Listar todas las columnas vs esperadas
3. Listar todas las funciones vs esperadas
4. Listar todas las políticas RLS vs esperadas
5. Crear matriz de discrepancias

### FASE 3: Plan de Corrección (Mañana)

1. Priorizar P0 (crítico)
2. Escribir migraciones correctivas
3. Redefinir RLS donde sea necesario
4. Validar con test queries

### FASE 4: Ejecución (3-5 días)

1. Backup de Supabase actual
2. Aplicar migraciones correctivas en staging
3. Test completo de funcionalidad
4. Deploy a producción con monitoring

---

## 📊 RESUMEN POR ESTADO

| Área | Estado | Confianza | Acción |
|------|--------|-----------|--------|
| Base Schema | ✅ Existe | 90% | Validar estructura |
| Migraciones | ⚠️ 92 totales, 2 SKIPPED | 60% | Aplicar SKIPPED, validar ejecución |
| Funciones RPC | ✅ 55+ creadas | 85% | Validar todas existen |
| RLS | ⚠️ ~190+ políticas | 50% | AUDITAR COMPLETO |
| Auth | ⚠️ Triggers posiblemente rotos | 40% | Validar y reconstruir |
| Storage | ⚠️ 4+ migraciones RLS | 60% | Validar aplicadas |
| TypeScript | ✅ Tipos completos | 95% | Agregar HojaDeVida, Aula tables |
| Frontend | ✅ Conectado | 85% | Probar queries después de fixes |

---

## ⚡ CONCLUSIÓN

**El sistema está en estado de RECUPERACIÓN PARCIAL.**

Estructura base es sólida, pero:
- ❌ Estado actual de Supabase es DESCONOCIDO
- ❌ Migraciones SKIPPED pueden ser críticas
- ❌ RLS necesita auditoría profunda
- ⚠️ Auth puede estar sincronización rota
- ⚠️ Muchas migraciones de "fix" indican bugs históricos no resueltos

**NO es seguro asumir que el sistema está completamente funcional sin:**
1. Acceso directo a PostgreSQL
2. Validación de cada migración aplicada
3. Auditoría completa de RLS
4. Test de auth flow completo
5. Validación de sync datos auth ↔ BD

**PRIORIDAD: Obtener acceso psql hoy. Auditoría completa en 2-3 días. Correcciones en 1 semana.**

