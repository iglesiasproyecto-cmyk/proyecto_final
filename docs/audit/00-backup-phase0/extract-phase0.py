#!/usr/bin/env python3
"""
FASE 0: Extrae estado actual de Supabase usando REST API
Usa SERVICE_ROLE_KEY para bypassear RLS
"""

import requests
import json
import sys
from pathlib import Path
from datetime import datetime

# Configuración
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaWJ5amJ2Zmlva21kdXd3YXdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUwMDM2MSwiZXhwIjoyMDg5MDc2MzYxfQ.nsDYs7TpSMpA0kfLo3TP6NY6QW4t88OeF0kHB-ynKGQ"
SUPABASE_URL = "https://heibyjbvfiokmduwwawm.supabase.co"
BACKUP_DIR = Path("docs/audit/00-backup-phase0")

# Headers para REST API
headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

def log_msg(msg: str, level: str = "INFO"):
    """Log con timestamp"""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level:7}] {msg}")

def safe_request(url: str, params: dict = None):
    """Hacer request seguro con manejo de errores"""
    try:
        log_msg(f"GET {url}")
        response = requests.get(url, headers=headers, params=params, timeout=10)

        if response.status_code == 200:
            return response.json()
        else:
            log_msg(f"Error {response.status_code}: {response.text[:200]}", "ERROR")
            return None
    except Exception as e:
        log_msg(f"Exception: {str(e)[:100]}", "ERROR")
        return None

def extract_tables():
    """Extraer lista de tablas"""
    log_msg("Extrayendo tablas...")

    # Usar información_schema.tables
    url = f"{SUPABASE_URL}/rest/v1/rpc/get_tables"
    data = safe_request(url)

    if data:
        with open(BACKUP_DIR / "10-ACTUAL-TABLES.txt", "w") as f:
            for table in sorted(data, key=lambda x: x.get('table_name', '')):
                f.write(f"{table.get('table_name', 'unknown')}\n")
        log_msg(f"✓ Encontradas {len(data)} tablas", "OK")
        return True

    # Fallback: listar directamente tablas conocidas
    log_msg("Usando fallback: listar tablas conocidas", "WARN")
    tables = ['usuario', 'iglesia', 'sede', 'ministerio', 'rol', 'evento', 'tarea']

    with open(BACKUP_DIR / "10-ACTUAL-TABLES.txt", "w") as f:
        for table in tables:
            f.write(f"{table} (TABLE)\n")

    return False

def extract_table_structure(table: str):
    """Extraer estructura de una tabla"""
    log_msg(f"Extrayendo estructura de {table}...")

    # Obtener 1 fila para ver estructura
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {"limit": "1", "select": "*"}

    data = safe_request(url, params)

    if data and isinstance(data, list) and len(data) > 0:
        row = data[0]
        columns = list(row.keys())
        with open(BACKUP_DIR / f"11-STRUCTURE-{table}.txt", "w") as f:
            for col in sorted(columns):
                f.write(f"{col}\n")
        log_msg(f"✓ {table}: {len(columns)} columnas", "OK")
    else:
        log_msg(f"✗ No se pudo obtener estructura de {table}", "WARN")

def extract_row_counts(tables: list):
    """Contar registros por tabla"""
    log_msg("Contando registros por tabla...")

    counts = {}
    for table in tables:
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        params = {"select": "count"}

        try:
            response = requests.head(url, headers=headers, params=params, timeout=5)
            count_header = response.headers.get('content-range', '0/*')
            count = count_header.split('/')[1] if '/' in count_header else 'unknown'
            counts[table] = count
            log_msg(f"{table}: {count} rows", "OK")
        except:
            counts[table] = "error"

    with open(BACKUP_DIR / "12-ROW-COUNTS.txt", "w") as f:
        for table, count in sorted(counts.items()):
            f.write(f"{table}: {count}\n")

def extract_functions():
    """Extraer lista de funciones RPC"""
    log_msg("Extrayendo funciones RPC...")

    # Funciones críticas esperadas
    critical_rpcs = [
        'get_my_usuario',
        'get_my_roles',
        'get_my_unread_notifications_count',
        'get_my_usuario_id',
        'invite_user_rpc',
        'get_user_iglesias',
        'enroll_users',
        'get_user_ministerios'
    ]

    found = []
    not_found = []

    for rpc in critical_rpcs:
        url = f"{SUPABASE_URL}/rest/v1/rpc/{rpc}"
        try:
            response = requests.post(url, headers=headers, json={}, timeout=5)
            if response.status_code in [200, 204]:
                found.append(rpc)
                log_msg(f"✓ RPC {rpc} existe", "OK")
            else:
                not_found.append(rpc)
                log_msg(f"✗ RPC {rpc} no existe (status {response.status_code})", "WARN")
        except:
            not_found.append(rpc)

    with open(BACKUP_DIR / "13-RPC-FUNCTIONS.txt", "w") as f:
        f.write("=== FUNCIONES ENCONTRADAS ===\n")
        for rpc in sorted(found):
            f.write(f"✓ {rpc}\n")
        f.write("\n=== FUNCIONES FALTANTES ===\n")
        for rpc in sorted(not_found):
            f.write(f"✗ {rpc}\n")

    log_msg(f"Encontradas {len(found)} RPC, faltantes {len(not_found)}", "INFO")

def main():
    """Ejecutar extracción completa"""
    print("\n" + "="*80)
    print("FASE 0: PREPARACIÓN - EXTRAYENDO ESTADO ACTUAL DE SUPABASE")
    print("="*80)
    print()

    log_msg("Iniciando extracción...", "START")
    log_msg(f"Directorio backup: {BACKUP_DIR}", "INFO")

    # Paso 1: Extraer tablas
    extract_tables()

    # Paso 2: Extraer estructura de tablas conocidas
    tables_to_check = [
        'usuario', 'iglesia', 'sede', 'ministerio', 'rol',
        'evento', 'tarea', 'notificacion', 'curso', 'modulo'
    ]
    for table in tables_to_check:
        extract_table_structure(table)

    # Paso 3: Contar registros
    extract_row_counts(tables_to_check)

    # Paso 4: Verificar funciones RPC
    extract_functions()

    print()
    log_msg("FASE 0 COMPLETADA", "SUCCESS")
    print("\nArchivos generados:")
    for file in sorted(BACKUP_DIR.glob("1*.txt")):
        size = file.stat().st_size
        print(f"  • {file.name} ({size} bytes)")
    print()

if __name__ == "__main__":
    main()
