# 📚 PLAN DE RECUPERACIÓN - IGLESIABD

**Versión:** 1.0  
**Generado:** 2026-05-12  
**Estado:** Listo para ejecución
**Duración Estimada:** 2-3 semanas
**Riesgo:** MEDIO (múltiples puntos de validación)

---

## 🎯 OBJETIVO

Restaurar el sistema IGLESIABD a un estado **estable, consistente, seguro y completamente funcional** después de una pérdida crítica de datos.

**Criterio de éxito:** Sistema en producción sin datos perdidos, RLS validado, auth sincronizado, usuarios funcionales.

---

## ⚠️ PRECONDICIONES

Antes de empezar, confirmar:
- [ ] Backup de Supabase actual existe (si es necesario para rollback)
- [ ] Acceso administrativo a proyecto Supabase
- [ ] Credenciales PostgreSQL disponibles
- [ ] Ambiente de staging disponible para testing
- [ ] Equipo disponible para testing post-deployment

---

## 📊 FASES

### FASE 0: PREPARACIÓN (1-2 días)

#### 0.1 Obtener Acceso Directo

```bash
# Solicitar al Supabase team:
psql postgresql://postgres:[PASSWORD]@db.heibyjbvfiokmduwwawm.supabase.co:5432/postgres

# Verificar acceso:
psql> SELECT version();
psql> SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';
```

**Deliverable:** Credenciales de BD y confirmación de acceso

#### 0.2 Generar Dumps de Estado Actual

```bash
# Dump de schema
pg_dump -s --schema=public \
  postgresql://postgres:[PASSWORD]@db.heibyjbvfiokmduwwawm.supabase.co:5432/postgres \
  > docs/audit/00-CURRENT-schema.sql

# Dump de datos (si existen)
pg_dump --data-only --schema=public \
  postgresql://postgres:[PASSWORD]@db.heibyjbvfiokmduwwawm.supabase.co:5432/postgres \
  > docs/audit/00-CURRENT-data.sql

# Dump de definiciones de funciones
pg_dump --schema-only --schema=public \
  postgresql://postgres:[PASSWORD]@db.heibyjbvfiokmduwwawm.supabase.co:5432/postgres \
  | grep "FUNCTION\|PROCEDURE" > docs/audit/00-CURRENT-functions.sql
```

**Deliverable:** Archivos SQL con estado actual

#### 0.3 Comparación Inicial

```bash
# Comparar schema actual vs expected (migraciones)
diff docs/audit/00-CURRENT-schema.sql docs/audit/01-database-schema-current.sql \
  > docs/audit/01-INITIAL-DIFF.txt

# Identificar tablas faltantes
comm -23 <(grep "^CREATE TABLE" 00-CURRENT-schema.sql | sed 's/.*IF NOT EXISTS //;s/ .*//' | sort) \
         <(grep "^CREATE TABLE" supabase/migrations/*.sql | sed 's/.*IF NOT EXISTS //;s/ .*//' | sort) \
  > docs/audit/01-MISSING-TABLES.txt
```

**Deliverable:** Documentación de qué falta vs qué existe

#### 0.4 Setup Ambiente de Testing

```bash
# En ambiente local staging (Supabase local o segunda BD):
supabase link --project-ref=heibyjbvfiokmduwwawm-staging
supabase migration list
supabase migration up
```

**Deliverable:** Ambiente de staging con migraciones aplicadas

---

### FASE 1: CORRECCIONES CRÍTICAS (2-3 días)

Tareas bloqueantes sin las cuales el sistema no funciona.

#### 1.1 Aplicar Migraciones SKIPPED

**Migración:** sp6 + sp7

```bash
# Paso 1: Revisar contenido
cat supabase/migrations/.skip_sp6_rls_security_hardening.sql | head -100
cat supabase/migrations/.skip_sp7_rls_complete_gaps.sql | head -100

# Paso 2: Renombrar (si son seguras)
mv supabase/migrations/.skip_sp6_rls_security_hardening.sql \
   supabase/migrations/20260512_CRITICAL_sp6_rls_security_hardening.sql

mv supabase/migrations/.skip_sp7_rls_complete_gaps.sql \
   supabase/migrations/20260512_CRITICAL_sp7_rls_complete_gaps.sql

# Paso 3: Aplicar
supabase migration up

# Paso 4: Validar (verificar que no hay errores)
psql -c "\du" # Listar funciones
```

**Validación:**
```bash
# Debe correr sin errores
supabase migration up --verbose
# Revisar logs para errores
```

#### 1.2 Reconstruir Migraciones Eliminadas

**Migraciones Faltantes (en git):**
1. `20260415100000_phase5_rls_usuarios.sql` 
2. `20260421_auto_confirm_emails.sql`
3. `20260421_confirm_existing_users.sql`

**Procedimiento para cada una:**

```bash
# Opción A: Recuperar desde git history
git log --all --full-history -- "supabase/migrations/20260415100000*" --oneline
git checkout [COMMIT] -- supabase/migrations/20260415100000_phase5_rls_usuarios.sql

# Opción B: Reconstruir desde cero
# - Leer migraciones posteriores que dependan de ella
# - Inferir estructura
# - Crear archivo nuevo
```

**Archivo Template:**

```sql
-- 20260415100000_phase5_rls_usuarios.sql
-- RECONSTRUIDA POST-DESASTRE
-- Basada en análisis de migraciones posteriores
-- Propósito: RLS para tabla usuario

BEGIN;

-- Enable RLS on usuario table
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios pueden ver su propio record
CREATE POLICY "usuario_select_own" ON public.usuario
  FOR SELECT
  USING (id = auth.uid() OR auth.role() = 'service_role' OR current_user = 'postgres');

-- Policy: Super admin ve todos
CREATE POLICY "usuario_select_super_admin" ON public.usuario
  FOR SELECT
  USING (is_super_admin());

-- ... otras políticas según patrón

COMMIT;
```

**Aplicar:**
```bash
supabase migration up --verbose
```

#### 1.3 Sincronizar auth.users ↔ usuario

**Problema:** Usuarios en auth sin registro en tabla usuario

**Script de Fix:**

```sql
-- 20260512_SYNC_fix_orphaned_users.sql
-- Sincronizar auth.users con tabla usuario

BEGIN;

-- Identificar orphaned users
CREATE TEMP TABLE orphaned AS
SELECT au.id, au.email, au.user_metadata->>'email' as alt_email
FROM auth.users au
LEFT JOIN public.usuario u ON au.id = u.auth_user_id
WHERE u.auth_user_id IS NULL
  AND au.email NOT IN (
    SELECT correo FROM public.usuario WHERE auth_user_id IS NOT NULL
  );

-- Opción A: Crear usuarios en tabla usuario para cada auth.user orfanado
INSERT INTO public.usuario (
  auth_user_id,
  correo,
  nombres,
  apellidos,
  activo,
  creado_en,
  updated_at
)
SELECT 
  id,
  COALESCE(email, 'no-email@system.local'),
  SPLIT_PART(COALESCE((user_metadata->>'nombre'), 'Usuario'), ' ', 1),
  SPLIT_PART(COALESCE((user_metadata->>'nombre'), 'Sistema'), ' ', 2),
  true,
  created_at,
  now()
FROM orphaned
ON CONFLICT DO NOTHING;

-- Opción B (alternativa): Eliminar auth.users sin usuario
-- DELETE FROM auth.users WHERE id IN (SELECT id FROM orphaned);

DROP TABLE orphaned;

COMMIT;
```

**Validar:**
```bash
psql -c "SELECT COUNT(*) 
         FROM auth.users au 
         LEFT JOIN public.usuario u ON au.id = u.auth_user_id 
         WHERE u.auth_user_id IS NULL;"
# Debe retornar 0
```

#### 1.4 Validar Funciones RPC Críticas

**Script de Validación:**

```bash
#!/bin/bash

# Funciones que DEBEN existir
declare -a CRITICAL_RPCS=(
  "get_my_usuario"
  "get_my_roles"
  "get_my_unread_notifications_count"
  "get_my_usuario_id"
  "invite_user_rpc"
  "get_user_iglesias"
  "enroll_users"
)

for func in "${CRITICAL_RPCS[@]}"; do
  echo -n "Checking $func... "
  result=$(psql -t -c "
    SELECT EXISTS(
      SELECT 1 FROM information_schema.routines
      WHERE routine_name = '$func'
    )
  ")
  if [ "$result" = "t" ]; then
    echo "✓ OK"
  else
    echo "✗ MISSING - CRITICAL!"
    # Crear migración correctiva
    cat >> docs/audit/MISSING_RPCS.sql << EOF
-- CREATE FUNCTION $func() ...
EOF
  fi
done
```

**Si falta alguna:**
- [ ] Revisar migraciones posteriores que la usan
- [ ] Extraer definición
- [ ] Crear migración correctiva
- [ ] Aplicar

---

### FASE 2: VALIDACIÓN DE SEGURIDAD (2-3 días)

Auditoría completa de RLS y permisos.

#### 2.1 Auditar Todas las Políticas RLS

**Script:**

```bash
# Exportar todas las políticas
psql << 'EOF' > docs/audit/20-ALL-RLS-POLICIES.sql
SELECT pg_get_expr(polqual, polrelid) as condition,
       pg_get_expr(polwithcheck, polrelid) as with_check,
       schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
EOF

# Revisar cada tabla crítica
for table in usuario iglesia ministerio aula_curso aula_inscripcion; do
  psql -c "
    SELECT schemaname, tablename, policyname, cmd 
    FROM pg_policies 
    WHERE tablename = '$table'
    ORDER BY cmd
  " | tee docs/audit/20-RLS-${table}.txt
done
```

**Análisis Manual Para Cada Tabla:**

Tabla: `usuario`
```
✓ SELECT policy: auth.uid() = id (solo usuario ve su propio)
✓ SELECT policy: is_super_admin() (super admin ve todos)
✓ UPDATE policy: auth.uid() = id (usuario actualiza solo su record)
✓ DELETE policy: is_super_admin() (solo super admin borra)
```

Tabla: `iglesia`
```
✓ SELECT policy: is_admin_iglesia() OR is_super_admin()
✓ INSERT policy: is_super_admin()
✓ UPDATE policy: is_admin_iglesia(id) OR is_super_admin()
✓ DELETE policy: is_super_admin()
```

**Documento Resultante:** `docs/audit/20-RLS-AUDIT-RESULTS.md`

#### 2.2 Buscar RLS Bypasses

**Patrones a Buscar (VULNERABLES):**

```sql
-- ❌ BAD: Siempre verdadero
USING (true)
USING (1=1)

-- ❌ BAD: Sin filtro de usuario
FOR SELECT USING (estado = 'activo')

-- ❌ BAD: CTE que elude RLS (posible)
FOR SELECT USING (id IN (SELECT id FROM base_table WHERE ...))

-- ✅ GOOD: Filtra por usuario
USING (auth.uid() = id_usuario)
USING (iglesia_id = (SELECT iglesia_id FROM usuario WHERE id = auth.uid()))
```

**Script:**

```bash
# Buscar políticas permisivas
psql << 'EOF'
SELECT tablename, policyname, 
       pg_get_expr(polqual, polrelid) as condition
FROM pg_policies
WHERE tablename NOT IN ('_sqlc_migrations')
  AND (pg_get_expr(polqual, polrelid) LIKE '%true%'
    OR pg_get_expr(polqual, polrelid) LIKE '%1=1%'
    OR pg_get_expr(polqual, polrelid) IS NULL)
ORDER BY tablename;
EOF
```

**Análisis:** Cualquier resultado requiere revisión manual

#### 2.3 Verificar CTEs no Eludan RLS

**Buscar en código de funciones:**

```bash
pg_dump --schema-only --schema=public \
  | grep -A 50 "CREATE FUNCTION\|CREATE OR REPLACE FUNCTION" \
  | grep -B 10 -A 10 "WITH\|CTE\|SELECT" \
  > docs/audit/20-CTEs-in-functions.sql

# Revisar manualmente cada uno
```

**Patrón Vulnerable:**
```sql
-- ❌ CTE esconde datos reales
CREATE FUNCTION get_iglesias() RETURNS TABLE (...)
LANGUAGE sql
AS $$
WITH all_iglesias AS (
  SELECT * FROM iglesia  -- RLS NO se aplica aquí
)
SELECT * FROM all_iglesias  -- Posible bypass
$$;

-- ✅ BETTER: SQL SECURITY DEFINER + explícito
CREATE FUNCTION get_iglesias() RETURNS TABLE (...)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT * FROM iglesia  -- RLS se aplica
WHERE is_admin_iglesia(id)
$$;
```

#### 2.4 Validar Multi-Tenant Aislamiento

**Test Script:**

```sql
-- Como usuario_1 en iglesia_1
-- No debe poder ver iglesia_2

SET ROLE user_with_iglesia_1;

-- Este query debe retornar vacío
SELECT * FROM iglesia WHERE id_iglesia != 1;

-- Este query debe retornar solo iglesia 1
SELECT * FROM iglesia;
```

**Implementar test para:**
- [ ] Usuario no ve otra iglesia
- [ ] Admin sede no ve otra sede
- [ ] Líder no ve otro ministerio
- [ ] Servidor no ve otra información que su asignación

---

### FASE 3: INTEGRIDAD REFERENCIAL (1-2 días)

Validar que datos no están corruptos.

#### 3.1 Validar Foreign Keys

```bash
# Script: 30-VALIDATE-FKs.sql

-- Usuarios huérfanos (referencia a iglesia que no existe)
SELECT u.id_usuario, u.correo, u.auth_user_id
FROM public.usuario u
LEFT JOIN public.iglesia i ON u.iglesia_id = i.id_iglesia
WHERE u.iglesia_id IS NOT NULL AND i.id_iglesia IS NULL;

-- Roles huérfanos
SELECT ur.id_usuario_rol, ur.id_usuario, ur.id_rol
FROM public.usuario_rol ur
LEFT JOIN public.usuario u ON ur.id_usuario = u.id_usuario
WHERE u.id_usuario IS NULL;

-- Ministerios sin iglesia
SELECT m.id_ministerio, m.nombre, m.id_iglesia
FROM public.ministerio m
LEFT JOIN public.iglesia i ON m.id_iglesia = i.id_iglesia
WHERE m.id_iglesia IS NOT NULL AND i.id_iglesia IS NULL;

-- ... continuar para cada FK
```

**Resultado:** Lista de registros corruptos

**Acción:**
- Opción A: Borrar registros huérfanos
- Opción B: Crear registros faltantes
- Opción C: Investigar si datos están bien y referencias son problema

#### 3.2 Validar Índices en Foreign Keys

```bash
# Script: 30-VALIDATE-INDEXES.sql

-- Para cada FK, verificar que existe índice
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE referenced_table_name IS NOT NULL
  AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Crear índices faltantes
CREATE INDEX idx_usuario_iglesia_id ON public.usuario(iglesia_id);
CREATE INDEX idx_ministerio_iglesia_id ON public.ministerio(iglesia_id);
-- ... etc
```

#### 3.3 Validar Datos Inconsistentes

```sql
-- Triggers de audit: ¿creado_en > actualizado_en?
SELECT * FROM public.usuario
WHERE creado_en > updated_at;
# Debe retornar 0

-- Fechas en futuro (imposible)
SELECT * FROM public.evento
WHERE fecha_inicio > NOW() + INTERVAL '10 years';

-- Estados inválidos
SELECT * FROM public.iglesia
WHERE estado NOT IN ('activa', 'inactiva', 'fusionada', 'cerrada');
```

---

### FASE 4: SINCRONIZACIÓN AUTH (1-2 días)

Garantizar que auth.users sincronizado con permisos en BD.

#### 4.1 Verificar Metadata de JWT

```bash
# Obtener un JWT de usuario
curl -X POST https://heibyjbvfiokmduwwawm.supabase.co/auth/v1/token \
  -H "apikey: $ANON_KEY" \
  -d '{"email":"test@example.com","password":"password"}'

# Decodificar JWT (usar jwt.io)
# Verificar que claims incluyen:
# - sub (usuario id)
# - email
# - roles (custom claims)
# - app_metadata
```

#### 4.2 Sincronizar Permisos

```bash
# Script: 40-SYNC-permisos.sql

-- Generar JWT claims actualizado para cada usuario
-- Basado en usuario_rol, miembro_ministerio, etc.

-- Si JWT claims están desactualizados:
-- Opción A: Forzar logout de todos (perderán sesiones)
-- Opción B: Esperar a que JWT expire (24h típico)
-- Opción C: Actualizar metadata en auth.users (si es posible)

UPDATE auth.users
SET user_metadata = jsonb_set(
  user_metadata,
  '{roles}',
  to_jsonb((
    SELECT array_agg(r.nombre)
    FROM usuario_rol ur
    JOIN rol r ON ur.id_rol = r.id_rol
    WHERE ur.id_usuario = auth.users.id
  ))
)
WHERE EXISTS (
  SELECT 1 FROM usuario WHERE auth_user_id = auth.users.id
);
```

#### 4.3 Validar Login Flow

**Manual Test:**

```bash
# 1. Registrar usuario de test
curl -X POST https://heibyjbvfiokmduwwawm.supabase.co/auth/v1/signup \
  -H "apikey: $ANON_KEY" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# 2. Obtener JWT
TOKEN=$(curl -X POST ... | jq -r '.session.access_token')

# 3. Llamar a RPC get_my_usuario
curl -X POST https://heibyjbvfiokmduwwawm.supabase.co/rest/v1/rpc/get_my_usuario \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# 4. Verificar que retorna registro usuario
```

---

### FASE 5: VALIDACIÓN FUNCIONAL (2-3 días)

Probar que todas las features funcionan.

#### 5.1 Test de Queries Frontend

**Para cada query importante:**

```bash
# Test: Obtener mis iglesias
curl -X GET "https://heibyjbvfiokmduwwawm.supabase.co/rest/v1/usuario?auth_user_id=eq.USER_ID&select=*" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $TOKEN"

# Test: Obtener mis ministerios
curl -X POST https://heibyjbvfiokmduwwawm.supabase.co/rest/v1/rpc/get_my_ministerios \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}'

# Test: Listar tareas asignadas a mí
curl -X GET "https://heibyjbvfiokmduwwawm.supabase.co/rest/v1/tarea_asignada?id_usuario=eq.USER_ID&select=*" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $TOKEN"
```

#### 5.2 Test de RLS Bypass Attempts

**Intentar acceso no autorizado:**

```bash
# Como usuario_1, intentar ver usuario_2 (debe fallar)
curl -X GET "https://heibyjbvfiokmduwwawm.supabase.co/rest/v1/usuario?id_usuario=eq.2" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer TOKEN_USER_1"
# Esperado: []  (array vacío, no error)

# Como admin_sede, intentar ver otra sede (debe fallar)
curl -X GET "https://heibyjbvfiokmduwwawm.supabase.co/rest/v1/sede?id_sede=eq.999" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer TOKEN_ADMIN_SEDE"
# Esperado: []
```

#### 5.3 Test de Create/Update/Delete

```bash
# Crear tarea (debe funcionar)
curl -X POST https://heibyjbvfiokmduwwawm.supabase.co/rest/v1/tarea \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Test","id_usuario_creador":1}'

# Actualizar tarea (debe funcionar solo si es dueño)
curl -X PATCH "https://heibyjbvfiokmduwwawm.supabase.co/rest/v1/tarea?id_tarea=eq.1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"titulo":"Updated"}'

# Intentar borrar tarea de otro (debe fallar)
curl -X DELETE "https://heibyjbvfiokmduwwawm.supabase.co/rest/v1/tarea?id_tarea=eq.999" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $TOKEN"
# Esperado: 0 rows affected o error
```

#### 5.4 Test Frontend End-to-End

**Casos de uso críticos:**

1. **Login Flow**
   - [ ] Usuario se registra
   - [ ] JWT se genera
   - [ ] Perfil se obtiene
   - [ ] Roles se cargan
   - [ ] Dashboard se renderiza

2. **Admin Iglesia**
   - [ ] Ve solo su iglesia
   - [ ] Puede crear usuarios en su iglesia
   - [ ] Puede ver ministerios de su iglesia
   - [ ] NO ve otras iglesias

3. **Líder Ministerio**
   - [ ] Ve su ministerio
   - [ ] Puede crear tareas en su ministerio
   - [ ] Puede asignar tareas a miembros
   - [ ] NO ve otros ministerios

4. **Servidor**
   - [ ] Ve solo sus asignaciones
   - [ ] Puede marcar tareas completadas
   - [ ] NO ve tareas de otros

---

### FASE 6: DOCUMENTACIÓN Y LIMPIEZA (1-2 días)

#### 6.1 Actualizar Documentación

- [ ] IGLESIABD_Supabase_Agent.md (schema actual)
- [ ] src/types/app.types.ts (tipos actualizados)
- [ ] docs/audit/ (documentación de auditoría)
- [ ] README.md (instrucciones de setup/recovery)

#### 6.2 Limpiar Archivos Temporales

```bash
# Remover archivos de test
rm docs/audit/*.sql.bak
rm supabase/migrations/.skip_*

# Consolidar migraciones si es necesario
# (Fase 2 de PRIORITY_MATRIX)
```

#### 6.3 Setup CI/CD para Prevenir Recurrencia

```yaml
# .github/workflows/db-audit.yml
name: Database Audit

on:
  pull_request:
    paths:
      - 'supabase/migrations/**'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate migrations
        run: |
          # Verificar que migraciones no se eliminan sin review
          # Verificar que nuevas migraciones siguen patrón
          # Verificar que RLS está presente
```

---

## 🚀 DEPLOYMENT A PRODUCCIÓN

### Pre-Deployment Checklist

- [ ] Backup de BD actual
- [ ] Staging ambiente completamente funcional
- [ ] Todas las pruebas pasan
- [ ] RLS auditoría completada
- [ ] Auth sincronización validada
- [ ] Performance testing hecho
- [ ] Rollback plan documentado

### Deployment Steps

```bash
# 1. Final backup
pg_dump postgresql://... > backups/pre-recovery-$(date +%Y%m%d).sql

# 2. Aplicar migraciones en orden
supabase migration up --linked

# 3. Validar que no hay errores
supabase migration list --linked

# 4. Health check
curl https://heibyjbvfiokmduwwawm.supabase.co/rest/v1/usuario?limit=1 \
  -H "apikey: $ANON_KEY"

# 5. Monitor logs
tail -f supabase/logs/postgres.log

# 6. Test login flow en producción
# (ver scripts en FASE 5)
```

### Rollback Plan

Si algo falla:

```bash
# 1. Revert migraciones
supabase migration down --linked

# 2. Restaurar desde backup
pg_restore backups/pre-recovery-[DATE].sql

# 3. Notificar usuarios
# (enviar email: sistema en recuperación)

# 4. Investigar problema
# (revisar logs, crear ticket)

# 5. Reintentar deployment
# (después de fijar problema)
```

---

## 📈 MONITOREO POST-RECOVERY

Después del deployment, monitorear:

- [ ] Error logs (postgresql, Supabase)
- [ ] Slow query logs
- [ ] Auth failures
- [ ] RLS denial logs (si aplicable)
- [ ] Storage access logs
- [ ] User complaints/tickets

**Alertas a configurar:**

```sql
-- Query lenta detectada
SELECT query, calls, mean_time 
FROM pg_stat_statements 
WHERE mean_time > 1000
ORDER BY mean_time DESC;

-- RLS denials (si log existe)
SELECT COUNT(*) FROM system_logs 
WHERE message LIKE '%RLS%'
  AND created_at > now() - INTERVAL '1 hour';

-- Auth failures
SELECT COUNT(*) FROM auth_logs
WHERE status = 'failed'
  AND created_at > now() - INTERVAL '1 hour';
```

---

## 📝 DOCUMENTOS RESULTANTES

Después de la recuperación, archivos generados:

```
docs/audit/
├── AUDIT_REPORT.md                     ✅ COMPLETADO
├── PRIORITY_MATRIX.md                  ✅ COMPLETADO
├── RECOVERY_PLAN.md                    ← Este archivo
├── 00-CURRENT-schema.sql               (Generado Fase 0)
├── 00-CURRENT-data.sql                 (Generado Fase 0)
├── 01-INITIAL-DIFF.txt                 (Generado Fase 0)
├── 20-ALL-RLS-POLICIES.sql             (Generado Fase 2)
├── 20-RLS-AUDIT-RESULTS.md             (Generado Fase 2)
├── 30-VALIDATE-FKs.sql                 (Generado Fase 3)
├── 40-SYNC-permisos.sql                (Generado Fase 4)
└── RECOVERY_SUMMARY.md                 (Final - resultados finales)
```

---

## ✅ CRITERIOS DE ÉXITO FINAL

Sistema está **RECUPERADO** cuando:

1. **Schema Correcto**
   - [ ] Todas las 23+ tablas existen
   - [ ] Todos los tipos de datos coinciden
   - [ ] Todas las FK existen
   - [ ] Todos los ENUMs son correctos

2. **RLS Validado**
   - [ ] Todas las políticas existen
   - [ ] No hay bypasses
   - [ ] Multi-tenant aislado
   - [ ] Test suite pasa 100%

3. **Auth Funcional**
   - [ ] Usuarios registran sin errores
   - [ ] JWT se genera correctamente
   - [ ] Roles se sincronizan
   - [ ] Login flow funciona

4. **Datos Consistentes**
   - [ ] No hay registros huérfanos
   - [ ] FK integridad validada
   - [ ] Triggers funcionan
   - [ ] Timestamps correctos

5. **Frontend Funcional**
   - [ ] Queries retornan datos
   - [ ] Mutaciones funcionan
   - [ ] RLS bypass attempts fallan
   - [ ] Features críticas funcionan

6. **Performance Aceptable**
   - [ ] Queries < 500ms
   - [ ] No hay N+1 queries
   - [ ] Índices presentes
   - [ ] Storage acceso rápido

7. **Documentación Actualizada**
   - [ ] Schema documentado
   - [ ] Tipos TypeScript sincronizados
   - [ ] Auditoría documentada
   - [ ] Runbook creado

8. **Monitoring Activo**
   - [ ] Logs se recopilan
   - [ ] Alertas configuradas
   - [ ] Team notificado
   - [ ] Incidents se trackean

---

## 🎓 LECCIONES APRENDIDAS

Después de completar la recuperación, documentar:

1. ¿Cómo ocurrió la pérdida de datos?
2. ¿Qué faltó en migraciones?
3. ¿Qué faltó en backup strategy?
4. ¿Cómo prevenir en futuro?

Crear:
- [ ] Disaster Recovery Plan
- [ ] Backup automation
- [ ] Testing procedures
- [ ] Documentation standards

---

## ⏱️ TIMELINE FINAL

```
Semana 1:  Fase 0 + Fase 1 (Acceso, migraciones críticas)
Semana 2:  Fase 2 (Auditoría RLS)
Semana 2:  Fase 3 + Fase 4 (Integridad, Auth)
Semana 3:  Fase 5 (Validación)
Semana 3:  Fase 6 (Documentación, deployment)

TOTAL: 2-3 semanas
```

**Start Date:** 2026-05-12 (HOY)  
**Estimated End Date:** 2026-05-26 a 2026-06-02

