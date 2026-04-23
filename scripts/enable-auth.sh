#!/bin/bash

# Script para habilitar login sin confirmación de email en Supabase
# Uso: bash scripts/enable-auth.sh

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Configurando Supabase para permitir login sin confirmación   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Opción 1: Ejecutar migración
echo "📋 Ejecutando migración para confirmar usuarios existentes..."
cd supabase
supabase db push

echo ""
echo "✅ Migración completada."
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                 PASOS ADICIONALES EN DASHBOARD                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Para que funcione completamente, debes cambiar la configuración"
echo "de Supabase en el dashboard:"
echo ""
echo "1. Ve a: https://supabase.com/dashboard"
echo "2. Selecciona tu proyecto"
echo "3. Ve a: Authentication → Providers → Email"
echo "4. Busca 'Require email confirmation' o 'Confirm email'"
echo "5. DESACTIVA la opción (toggle OFF)"
echo "6. Guarda cambios"
echo ""
echo "Después de esto, los usuarios podrán:"
echo "✓ Registrarse con email y contraseña"
echo "✓ Acceder inmediatamente sin confirmación"
echo ""
echo "✅ ¡Listo!"
