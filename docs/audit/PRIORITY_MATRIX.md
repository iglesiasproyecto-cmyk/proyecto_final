# 🎯 MATRIZ DE PRIORIDADES - RECUPERACIÓN IGLESIABD

**Generado:** 2026-05-12  
**Basado en:** AUDIT_REPORT.md  
**Objetivo:** Estabilidad y Seguridad

---

## 📊 DISTRIBUCIÓN DE TAREAS

```
P0 (CRÍTICO)   5 items → 2-3 días
P1 (ALTO)     10 items → 3-5 días
P2 (MEDIO)     4 items → 1 semana
P3 (BAJO)      2 items → 2 semanas
─────────────────────────────
TOTAL:        21 items → 2-3 semanas
```

---

## 🔴 P0 - CRÍTICO (Hacer primero)

Impacto: Sistema no funciona sin esto.

### P0.1 Obtener acceso directo a PostgreSQL

**Descripción:** Necesario para validar estado real de BD

**Tareas:**
- [ ] Solicitar credenciales de PostgreSQL a Supabase
  - Usuario: `postgres`
  - Contraseña: (resetear si es necesario)
  - Host: `db.heibyjbvfiokmduwwawm.supabase.co:5432`
  - Database: `postgres`
- [ ] Conectar con `psql` y hacer test
- [ ] Generar dump schema actual: `pg_dump --schema-only -f current.sql`
- [ ] Generar dump datos: `pg_dump -f current-data.sql`

**Estimado:** 1-2 horas  
**Blocker:** SIN ESTO NO PUEDO AUDITAR RESTO

---

### P0.2 Validar y aplicar migraciones SKIPPED

**Descripción:** sp6 y sp7 contienen security hardening y RLS gap fixes

**Archivos:**
- `supabase/migrations/.skip_sp6_rls_security_hardening.sql` (6.2 KB)
- `supabase/migrations/.skip_sp7_rls_complete_gaps.sql` (7.8 KB)

**Tareas:**
- [ ] Leer contenido de sp6 - analizar qué problemas soluciona
- [ ] Leer contenido de sp7 - analizar qué gaps cierra
- [ ] Determinar si son aplicables a BD actual
- [ ] Si aplicables: Renombrar (remove .skip) y marcar como críticas
- [ ] Aplicar en staging, validar que no fallan
- [ ] Documentar cualquier conflicto encontrado

**Estimado:** 2-3 horas  
**Riesgo:** Si sp7 cierra vulns de RLS → APLICAR INMEDIATAMENTE

**Comando:**
```bash
# Primero: Revisar
cat supabase/migrations/.skip_sp6_rls_security_hardening.sql | head -50
cat supabase/migrations/.skip_sp7_rls_complete_gaps.sql | head -50

# Luego: Renombrar si son seguros
mv supabase/migrations/.skip_sp6_rls_security_hardening.sql \
   supabase/migrations/20260512_CRITICAL_sp6_rls_security_hardening.sql
```

---

### P0.3 Reconstruir migraciones eliminadas

**Descripción:** 4 migraciones fueron eliminadas de git y pueden ser críticas

**Migraciones Faltantes:**
1. `20260415100000_phase5_rls_usuarios.sql` - RLS para tabla usuario
2. `20260421_auto_confirm_emails.sql` - Auto-confirmar emails en auth
3. `20260421_confirm_existing_users.sql` - Confirmar usuarios existentes

**Tareas:**
- [ ] Buscar en git history si aún existen en commits previos
  ```bash
  git log --all --full-history -- "supabase/migrations/20260415100000*"
  git show <commit>:supabase/migrations/20260415100000_phase5_rls_usuarios.sql
  ```
- [ ] Si no están en git → Reconstruir basado en patrón:
  - Leer migrations posteriores que referencian tabla usuario
  - Inferir qué RLS se necesitaba
  - Escribir migración correctiva
- [ ] Aplicar en staging, validar

**Estimado:** 3-4 horas  
**Comando:**
```bash
git log --all --format="%H %s" -- supabase/migrations/ | grep -i "usuario\|email"
```

---

### P0.4 Validar sincronización auth.users ↔ usuario

**Descripción:** Post-desastre, usuarios pueden estar orphaned (en auth pero no en BD)

**Tareas:**
- [ ] Conectar a BD directamente con psql
- [ ] Ejecutar query:
  ```sql
  SELECT au.id, au.email 
  FROM auth.users au 
  LEFT JOIN public.usuario u ON au.id = u.auth_user_id 
  WHERE u.auth_user_id IS NULL;
  ```
- [ ] Registrar cuántos orphaned users hay
- [ ] Si > 0: Decidir:
  - Opción A: Crear registros usuario para auth.users existentes
  - Opción B: Borrar auth.users sin usuario
  - Opción C: Contactar usuarios para que se re-registren
- [ ] Ejecutar fix elegido

**Estimado:** 2-3 horas (depende de cantidad)

---

### P0.5 Validar que funciones RPC críticas existen

**Descripción:** Frontend espera estas funciones. Si no existen → app no funciona

**Funciones a Validar:**
- [ ] `get_my_usuario()` - Para obtener perfil en login
- [ ] `get_my_roles()` - Para obtener roles/permisos
- [ ] `get_my_unread_notifications_count()` - Para badge notificaciones
- [ ] `get_my_usuario_id()` - Helper para RLS
- [ ] `invite_user_rpc()` - Para invitar usuarios
- [ ] `get_user_iglesias()` - Para iglesiasDelUsuario
- [ ] `get_user_ministerios()` - Para ministeriosDelUsuario
- [ ] `enroll_users()` - Para inscribir en cursos

**Tareas:**
- [ ] Para cada función:
  ```bash
  psql -c "SELECT * FROM information_schema.routines WHERE routine_name = 'get_my_usuario'"
  ```
- [ ] Si NO existe: Buscar en migraciones dónde se crea
- [ ] Si no está en migraciones: Crear migración correctiva
- [ ] Aplicar en staging, test con `SELECT get_my_usuario()`

**Estimado:** 2-3 horas

---

## 🟡 P1 - ALTO (Hacer en 2-3 días)

Impacto: Seguridad, performance, o funcionalidad parcial comprometida.

### P1.1 Auditar todas las políticas RLS

**Descripción:** 190+ políticas RLS. Necesita revisión de seguridad completa.

**Tareas:**
- [ ] Exportar todas las políticas:
  ```bash
  psql -c "\dp" | grep -E "TABLE|POLICY" > rls-all.txt
  ```
- [ ] Para cada tabla crítica (usuario, iglesia, ministerio, aula):
  - [ ] Listar todas las políticas SELECT
  - [ ] Verificar que se filtran por usuario/iglesia/ministerio
  - [ ] Buscar condiciones "sempre TRUE" (permisivos)
  - [ ] Buscar lógica de CTEs que puedan eludir RLS
  - [ ] Documentar en `RLS_AUDIT.md`
- [ ] Particular atención a:
  - [ ] `usuario` - solo puede ver su propio perfil
  - [ ] `iglesia` - admin_iglesia solo su iglesia
  - [ ] `ministerio` - lider solo su ministerio
  - [ ] `aula_*` - estudiantes solo sus cursos inscritos
  - [ ] `storage.objects` - archivos privados por usuario

**Estimado:** 8-10 horas  
**Riesgo:** Si se salta esto → posible multi-tenant bypass

**Patrón a Buscar (VULNERABLE):**
```sql
-- ❌ BAD - Cualquiera puede leer
CREATE POLICY "allow_select" ON usuario
FOR SELECT USING (true);

-- ✅ GOOD - Solo tu propio record
CREATE POLICY "select_own" ON usuario
FOR SELECT USING (auth.uid() = id);
```

---

### P1.2 Identificar y aplicar fixes de recursion

**Descripción:** sp8 (y posteriores) arreglan "recursion errors" en RLS

**Tareas:**
- [ ] Leer `20260508000000_sp8_fix_rls_recursion_and_gaps.sql`
- [ ] Identificar qué funciones tenían recursion:
  - [ ] `get_my_usuario_id()` - fue LANGUAGE sql, causaba inlining
  - [ ] Políticas que recursaban en get_my_usuario_id()
- [ ] Aplicar fix en staging
- [ ] Test: queries que tenían problemas ahora funcionan
- [ ] Aplicar en producción

**Estimado:** 3-4 horas

---

### P1.3 Validar estructura de AulaTablas

**Descripción:** Aula es feature nueva. Estructura puede estar incompleta.

**Tablas Esperadas (TypeScript):**
- `aula_curso` - Cursos en aula (✅ en migraciones)
- `aula_modulo` - Módulos (✅ en migraciones)
- `aula_contenido` - Contenido (✅ en migraciones)
- `aula_recursos` - Archivos (✅ en migraciones)
- `aula_inscripcion` - Inscripción estudiantes (❓ en migraciones?)
- `aula_progreso_actividad` - Progreso del estudiante (❓ en migraciones?)

**Tareas:**
- [ ] Listar todas las tablas de aula en BD actual
- [ ] Para cada una, verificar columnas esperadas
- [ ] Buscar en migraciones si están creadas
- [ ] Si falta alguna → crear migración

**Estimado:** 2-3 horas

---

### P1.4 Validar Storage RLS y buckets

**Descripción:** Si RLS storage está incompleto → archivos públicos

**Tareas:**
- [ ] Listar buckets existentes:
  ```bash
  curl -H "apikey: $ANON_KEY" \
    "https://heibyjbvfiokmduwwawm.supabase.co/rest/v1/storage/buckets"
  ```
- [ ] Para cada bucket, verificar:
  - [ ] ¿Es público o privado?
  - [ ] Políticas storage.objects están aplicadas?
  - [ ] Scope es correcto (por usuario, iglesia, ministerio)?
- [ ] Buckets esperados:
  - [ ] `aula-recursos` - Para archivos de módulos
  - [ ] Otros?
- [ ] Si bucket falta RLS → aplicar inmediatamente

**Estimado:** 2-3 horas

---

### P1.5 Sincronizar tipos TypeScript con schema actual

**Descripción:** Frontend espera tipos que pueden no estar en BD

**Tareas:**
- [ ] Leer `src/types/app.types.ts`
- [ ] Comparar con estructura actual de tablas:
  - [ ] Usuarios - ¿tiene todas las columnas?
  - [ ] Iglesia - ¿tiene ciudad_id, direccion, etc.?
  - [ ] Aula* - ¿nuevas tablas tienen todas las columnas?
  - [ ] HojaDeVida - ¿está modelado correctamente?
- [ ] Agregar tipos faltantes:
  - [ ] HojaDeVida (existe tabla, falta tipo)
  - [ ] AulaInscripcion, AulaProgresoActividad
  - [ ] Otros?
- [ ] Agregar/remover columnas en tipos según BD actual

**Estimado:** 2-3 horas

---

### P1.6 Verificar triggers de sync de datos

**Descripción:** Triggers aseguran datos consistentes. Si no existen → corrupción.

**Tareas:**
- [ ] Listar todos los triggers en BD:
  ```bash
  psql -c "SELECT trigger_name, event_object_table 
           FROM information_schema.triggers 
           WHERE trigger_schema = 'public' 
           ORDER BY event_object_table"
  ```
- [ ] Para cada tabla con datos críticos:
  - [ ] ¿Existe trigger `on_insert`?
  - [ ] ¿Existe trigger `on_update`?
  - [ ] ¿Existe trigger `on_delete`?
- [ ] Triggers esperados:
  - [ ] `sync_pastor_iglesia` - Cuando pastor cambia
  - [ ] `sync_tarea_iglesia` - Cuando tarea se crea
  - [ ] `trigger_set_updated_at` - En TODAS las tablas
  - [ ] `on_auth_user_created` - Cuando se registra usuario
- [ ] Si falta alguno → crear migración

**Estimado:** 2-3 horas

---

### P1.7 Validar Foreign Keys y constraints

**Descripción:** Integridad referencial es crítica

**Tareas:**
- [ ] Listar todas las FKs en BD:
  ```bash
  psql -c "SELECT constraint_name, table_name, column_name, 
           referenced_table_name, referenced_column_name 
           FROM information_schema.key_column_usage 
           WHERE referenced_table_name IS NOT NULL 
           ORDER BY table_name"
  ```
- [ ] Para cada FK:
  - [ ] ¿Existe índice en column_name?
  - [ ] ¿Existe índice en referenced_column_name?
- [ ] Si falta índice → agregar:
  ```sql
  CREATE INDEX idx_tabla_fk ON tabla(fk_column);
  ```
- [ ] Validar que no hay datos huérfanos:
  ```sql
  SELECT * FROM usuario u 
  LEFT JOIN iglesia i ON u.iglesia_id = i.id 
  WHERE i.id IS NULL;  -- Esto reportaría usuarios huérfanos
  ```

**Estimado:** 3-4 horas

---

### P1.8 Validar enums exactamente

**Descripción:** Si ENUM en BD difiere de TypeScript → validaciones fallan

**Tareas:**
- [ ] Para cada ENUM en BD:
  ```bash
  psql -c "SELECT enum_range(NULL::estado_iglesia)"
  ```
- [ ] Comparar con TypeScript:
  - [ ] estado_iglesia: `'activa' | 'inactiva' | 'fusionada' | 'cerrada'`
  - [ ] estado_sede: `'activa' | 'inactiva' | 'en_construccion'`
  - [ ] estado_ministerio: `'activo' | 'inactivo' | 'suspendido'`
  - [ ] estado_evento: `'programado' | 'en_curso' | 'finalizado' | 'cancelado'`
  - [ ] estado_tarea: `'pendiente' | 'en_progreso' | 'completada' | 'cancelada'`
  - [ ] Otros?
- [ ] Si hay diferencia:
  - [ ] Opción A: Alterar ENUM en BD
  - [ ] Opción B: Actualizar TypeScript
  - [ ] Opción C: Migrar datos a nuevo ENUM

**Estimado:** 1-2 horas

---

### P1.9 Búsqueda de SQL injection en funciones RPC

**Descripción:** Validar que RPCs no concatenan strings en queries

**Tareas:**
- [ ] Listar todas las funciones:
  ```bash
  pg_dump --schema-only | grep -A 20 "CREATE FUNCTION"
  ```
- [ ] Para cada función:
  - [ ] Buscar `||` (concatenation)
  - [ ] Buscar `EXECUTE` dinámico
  - [ ] Si existe: Verificar que usa parametrización
- [ ] Patrón seguro:
  ```sql
  -- ✅ SAFE
  PREPARE stmt AS SELECT * FROM usuario WHERE id = $1;
  EXECUTE stmt USING p_id;
  
  -- ❌ UNSAFE
  EXECUTE 'SELECT * FROM usuario WHERE id = ' || p_id;
  ```
- [ ] Si encuentra vulnerabilidad → Crear migración correctiva

**Estimado:** 2-3 horas

---

### P1.10 Performance: Identidad índices faltantes

**Descripción:** Queries lentas sugieren índices faltantes

**Tareas:**
- [ ] Analizar migraciones para índices:
  ```bash
  grep -h "CREATE INDEX" supabase/migrations/*.sql
  ```
- [ ] Identificar campos que deberían tener índice:
  - [ ] ENUMs (estado, prioridad, tipo)
  - [ ] Foreign keys
  - [ ] Campos de búsqueda (email, nombre)
  - [ ] Campos de filtro temporal (created_at, fecha_inicio)
- [ ] Crear índices faltantes:
  ```sql
  CREATE INDEX idx_usuario_email ON usuario(email);
  CREATE INDEX idx_ministerio_estado ON ministerio(estado);
  CREATE INDEX idx_tarea_id_usuario ON tarea_asignada(id_usuario);
  ```

**Estimado:** 2-3 horas

---

## 🟠 P2 - MEDIO (Hacer en 1 semana)

### P2.1 Consolidar RLS en migraciones temáticas

**Descripción:** 190+ políticas en 80+ archivos es difícil de mantener

**Tareas:**
- [ ] Crear migraciones consolidadas por tabla:
  - `20260512_rls_consolidate_usuario.sql`
  - `20260512_rls_consolidate_iglesia.sql`
  - `20260512_rls_consolidate_ministerio.sql`
  - etc.
- [ ] Extraer todas las políticas de una tabla
- [ ] Combinar en 1 archivo
- [ ] DROP políticas antiguas
- [ ] CREATE nuevas políticas consolidadas
- [ ] Test que RLS sigue funcionando

**Estimado:** 4-6 horas

---

### P2.2 Completar documentación de schema

**Descripción:** Mantener IGLESIABD_Supabase_Agent.md actualizado

**Tareas:**
- [ ] Listar todas las tablas actuales
- [ ] Para cada tabla: documentar
  - [ ] Propósito
  - [ ] Columnas
  - [ ] Relaciones
  - [ ] RLS policies
  - [ ] Triggers
- [ ] Actualizar documento principal

**Estimado:** 3-4 horas

---

### P2.3 Crear test suite para RLS

**Descripción:** Validar que RLS funciona como se espera

**Tareas:**
- [ ] Crear usuario de test: super_admin, admin_iglesia, admin_sede, lider, servidor
- [ ] Para cada usuario:
  - [ ] Test: puede ver su propio record
  - [ ] Test: NO puede ver otros usuarios
  - [ ] Test: puede leer su iglesia
  - [ ] Test: NO puede leer otra iglesia
  - [ ] Test: puede crear registro en su scope
  - [ ] Test: NO puede crear fuera de su scope
- [ ] Automatizar con script SQL

**Estimado:** 4-5 horas

---

### P2.4 Agregar soft-deletes donde sea necesario

**Descripción:** Algunas tablas necesitan `deleted_at` para auditoría

**Tareas:**
- [ ] Identificar tablas que deberían tener soft-delete:
  - [ ] usuario (posiblemente)
  - [ ] iglesia (posiblemente)
  - [ ] evento (posiblemente)
  - [ ] tarea (posiblemente)
- [ ] Crear migración para agregar `deleted_at`:
  ```sql
  ALTER TABLE usuario ADD COLUMN deleted_at TIMESTAMPTZ;
  CREATE INDEX idx_usuario_deleted_at ON usuario(deleted_at);
  ```
- [ ] Actualizar RLS para filtrar deleted = NULL
- [ ] Actualizar funciones DELETE para usar soft-delete

**Estimado:** 2-3 horas

---

## 🟢 P3 - BAJO (Deuda técnica)

### P3.1 Regenerar documentación de arquitectura

**Estimado:** 2-3 horas

### P3.2 Crear postman/insomnia collection para APIs

**Estimado:** 2-3 horas

---

## 📈 TIMELINE SUGERIDO

```
SEMANA 1 (Hoy - 5 días)
├─ Día 1: P0.1 + P0.2 + P0.3 (Acceso, migraciones SKIPPED, migraciones eliminadas)
├─ Día 1: P0.4 + P0.5 (Sincronización auth, validar funciones RPC)
├─ Día 2-3: P1.1 + P1.2 (Auditar RLS, fixes de recursion)
├─ Día 3-4: P1.3 + P1.4 + P1.5 (Aula, Storage, TypeScript)
└─ Día 4-5: P1.6 + P1.7 + P1.8 (Triggers, FKs, ENUMs)

SEMANA 2
├─ Día 1: P1.9 + P1.10 (SQL injection, índices)
├─ Día 2-3: P2.1 + P2.2 (Consolidar RLS, documentación)
├─ Día 4-5: P2.3 + P2.4 (Test suite, soft-deletes)
└─ Fin de semana: Buffer para issues inesperados

SEMANA 3
├─ P3.1 + P3.2 (Deuda técnica)
├─ Buffer para issues P2
└─ Validación final + deployment a producción
```

---

## ✅ CRITERIOS DE ÉXITO

- [ ] Todas las migraciones se ejecutan sin errores
- [ ] Schema actual coincide con schema esperado
- [ ] Todas las funciones RPC están presentes y funcionan
- [ ] RLS está validado y no tiene bypasses
- [ ] Auth.users sincronizado con tabla usuario
- [ ] Storage tiene RLS correcto
- [ ] Test suite de RLS pasa 100%
- [ ] No hay usuarios orphaned
- [ ] Frontend se conecta y funciona sin errors
- [ ] Documentación está actualizada
- [ ] Sistema es estable y escalable

