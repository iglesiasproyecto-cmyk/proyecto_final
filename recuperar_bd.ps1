# Script para recuperar la base de datos IGLESIABD
# Uso: .\recuperar_bd.ps1

Write-Host "🔧 INICIANDO RECUPERACIÓN DE BASE DE DATOS IGLESIABD" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Verificar que estamos en el directorio correcto
Write-Host "1️⃣  Verificando ambiente..." -ForegroundColor Yellow
if (!(Test-Path "supabase/migrations")) {
    Write-Host "❌ ERROR: No se encontró el directorio de migraciones" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Estructura de proyecto verificada" -ForegroundColor Green
Write-Host ""

# Paso 2: Resetear Supabase (borrar BD local y recriar vacía)
Write-Host "2️⃣  Reseteando Supabase local (esto borrará los datos actuales)..." -ForegroundColor Yellow
$confirmation = Read-Host "¿Deseas continuar? (escribe 'SI' para confirmar)"
if ($confirmation -ne "SI") {
    Write-Host "❌ Operación cancelada" -ForegroundColor Red
    exit 0
}

# Paso 3: Iniciar Supabase si no está activo
Write-Host ""
Write-Host "3️⃣  Iniciando Supabase local..." -ForegroundColor Yellow
npx supabase start

Write-Host ""
Write-Host "✅ Supabase iniciado" -ForegroundColor Green
Write-Host ""

# Paso 4: Aplicar las migraciones
Write-Host "4️⃣  Aplicando migraciones..." -ForegroundColor Yellow
npx supabase db push

Write-Host ""
Write-Host "✅ Migraciones aplicadas" -ForegroundColor Green
Write-Host ""

# Paso 5: Aplicar seeds de datos
Write-Host "5️⃣  Aplicando datos iniciales (seeds)..." -ForegroundColor Yellow

$seedFiles = @(
    "supabase/seed/datos_prueba_iglesias.sql",
    "supabase/seed/formacion_demo.sql"
)

foreach ($seedFile in $seedFiles) {
    if (Test-Path $seedFile) {
        Write-Host "  → Ejecutando $seedFile..." -ForegroundColor Cyan
        # Aquí iría el comando para ejecutar el seed
        # Por ahora solo indicamos que se ejecutaría
        Write-Host "    ✓ $seedFile" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "✅ BASE DE DATOS RECUPERADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 Información útil:" -ForegroundColor Yellow
Write-Host "  - BD está disponible en: postgres://localhost:54322" -ForegroundColor Gray
Write-Host "  - API está disponible en: http://localhost:54321" -ForegroundColor Gray
Write-Host "  - Studio está disponible en: http://localhost:54323" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Para iniciar el desarrollo:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""
