#!/bin/bash

# ════════════════════════════════════════════════════════════════════════════
# FASE 0: PREPARACIÓN - COMANDOS LISTOS PARA EJECUTAR
# ════════════════════════════════════════════════════════════════════════════
#
# INSTRUCCIONES:
# 1. Obtén la contraseña de PostgreSQL (ver instrucciones abajo)
# 2. Reemplaza [PASSWORD] con la contraseña real
# 3. Ejecuta este script: bash COMANDOS-FASE0.sh
#
# ════════════════════════════════════════════════════════════════════════════

set -e

# CONFIGURACIÓN
DB_USER="postgres"
DB_PASSWORD="[REEMPLAZA_CON_TU_PASSWORD]"  # ← CAMBIAR AQUÍ
DB_HOST="db.heibyjbvfiokmduwwawm.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
BACKUP_DIR="docs/audit/00-backup-phase0"

DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "════════════════════════════════════════════════════════════════════════════"
echo "FASE 0: PREPARACIÓN - EXTRACCIÓN DE ESTADO ACTUAL"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Base de Datos: $DB_HOST"
echo "Usuario: $DB_USER"
echo "Directorio Backup: $BACKUP_DIR"
echo ""

# ════════════════════════════════════════════════════════════════════════════
# 0.1: VERIFICAR ACCESO
# ════════════════════════════════════════════════════════════════════════════

echo "[0.1] Verificando acceso a PostgreSQL..."
if psql "$DB_URL" -c "SELECT version();" > /dev/null 2>&1; then
  echo "✓ Acceso confirmado"
  psql "$DB_URL" -c "SELECT version();" | tee "${BACKUP_DIR}/01-postgres-version.txt"
else
  echo "✗ NO se puede conectar a PostgreSQL"
  echo "  Revisa que:"
  echo "  1. Password es correcto"
  echo "  2. Ruta es accesible desde tu IP"
  echo "  3. Credenciales son válidas"
  exit 1
fi

echo ""

# ════════════════════════════════════════════════════════════════════════════
# 0.2: GENERAR DUMP SCHEMA ACTUAL
# ════════════════════════════════════════════════════════════════════════════

echo "[0.2] Generando dump del schema actual (SCHEMA ONLY)..."
pg_dump \
  --schema-only \
  --schema=public \
  --no-owner \
  --no-privileges \
  "$DB_URL" \
  > "${BACKUP_DIR}/02-ACTUAL-schema-only.sql"
echo "✓ Guardado en 02-ACTUAL-schema-only.sql"
echo "  Tamaño: $(wc -l < "${BACKUP_DIR}/02-ACTUAL-schema-only.sql") líneas"

echo ""

# ════════════════════════════════════════════════════════════════════════════
# 0.3: GENERAR DUMP DATOS ACTUALES
# ════════════════════════════════════════════════════════════════════════════

echo "[0.3] Generando dump de DATOS actuales..."
pg_dump \
  --data-only \
  --schema=public \
  --no-owner \
  "$DB_URL" \
  > "${BACKUP_DIR}/03-ACTUAL-data-only.sql"
echo "✓ Guardado en 03-ACTUAL-data-only.sql"
echo "  Tamaño: $(wc -l < "${BACKUP_DIR}/03-ACTUAL-data-only.sql") líneas"

echo ""

# ════════════════════════════════════════════════════════════════════════════
# 0.4: LISTAR TABLAS ACTUALES
# ════════════════════════════════════════════════════════════════════════════

echo "[0.4] Listando todas las tablas en BD actual..."
psql "$DB_URL" -c "
  SELECT tablename
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
" > "${BACKUP_DIR}/04-ACTUAL-tables-list.txt"
echo "✓ Tablas encontradas:"
cat "${BACKUP_DIR}/04-ACTUAL-tables-list.txt"

echo ""

# ════════════════════════════════════════════════════════════════════════════
# 0.5: LISTAR FUNCIONES ACTUALES
# ════════════════════════════════════════════════════════════════════════════

echo "[0.5] Listando todas las funciones en BD actual..."
psql "$DB_URL" -c "
  SELECT routine_name
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  ORDER BY routine_name;
" > "${BACKUP_DIR}/05-ACTUAL-functions-list.txt"
echo "✓ Funciones encontradas: $(wc -l < "${BACKUP_DIR}/05-ACTUAL-functions-list.txt")"

echo ""

# ════════════════════════════════════════════════════════════════════════════
# 0.6: LISTAR POLÍTICAS RLS ACTUALES
# ════════════════════════════════════════════════════════════════════════════

echo "[0.6] Listando todas las políticas RLS..."
psql "$DB_URL" -c "
  SELECT tablename, policyname
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
" > "${BACKUP_DIR}/06-ACTUAL-rls-policies-list.txt"
echo "✓ Políticas RLS encontradas: $(wc -l < "${BACKUP_DIR}/06-ACTUAL-rls-policies-list.txt")"

echo ""

# ════════════════════════════════════════════════════════════════════════════
# 0.7: LISTAR TRIGGERS ACTUALES
# ════════════════════════════════════════════════════════════════════════════

echo "[0.7] Listando todos los triggers..."
psql "$DB_URL" -c "
  SELECT trigger_name, event_object_table
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
  ORDER BY event_object_table, trigger_name;
" > "${BACKUP_DIR}/07-ACTUAL-triggers-list.txt"
echo "✓ Triggers encontrados: $(wc -l < "${BACKUP_DIR}/07-ACTUAL-triggers-list.txt")"

echo ""

# ════════════════════════════════════════════════════════════════════════════
# 0.8: LISTAR MIGRACIONES APLICADAS
# ════════════════════════════════════════════════════════════════════════════

echo "[0.8] Listando migraciones aplicadas en BD..."
psql "$DB_URL" -c "
  SELECT name, hash, executed_at
  FROM _sqlc_migrations
  ORDER BY executed_at;
" > "${BACKUP_DIR}/08-ACTUAL-migrations-applied.txt"
echo "✓ Migraciones aplicadas: $(wc -l < "${BACKUP_DIR}/08-ACTUAL-migrations-applied.txt")"

echo ""

# ════════════════════════════════════════════════════════════════════════════
# 0.9: CONTAR DATOS POR TABLA
# ════════════════════════════════════════════════════════════════════════════

echo "[0.9] Contando registros por tabla..."
psql "$DB_URL" -c "
  SELECT
    tablename,
    (SELECT COUNT(*) FROM pg_class WHERE relname = tablename) as num_rows
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
" > "${BACKUP_DIR}/09-ACTUAL-table-row-counts.txt"
cat "${BACKUP_DIR}/09-ACTUAL-table-row-counts.txt"

echo ""

# ════════════════════════════════════════════════════════════════════════════
# 0.10: REPORTE FINAL
# ════════════════════════════════════════════════════════════════════════════

echo "════════════════════════════════════════════════════════════════════════════"
echo "✓ FASE 0 COMPLETADA"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Archivos generados en: $BACKUP_DIR"
echo ""
ls -lh "${BACKUP_DIR}"/0*.txt
echo ""
echo "Siguientes pasos:"
echo "  1. Revisar los archivos generados"
echo "  2. Comparar con estado esperado (ver AUDIT_REPORT.md)"
echo "  3. Proceder con FASE 1 (Correcciones Críticas)"
echo ""
echo "════════════════════════════════════════════════════════════════════════════"
