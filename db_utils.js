import { createClient } from '@supabase/supabase-js'

// Configurar cliente Supabase
const supabaseUrl = 'https://heibyjbvfiokmduwwawm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaWJ5amJ2Zmlva21kdXd3YXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDAzNjEsImV4cCI6MjA4OTA3NjM2MX0.dCwu7xz1hExRFX1brCGDZySW0aacxBaV-yjPt0bqVZI'

const supabase = createClient(supabaseUrl, supabaseKey)

export async function executeQuery(table, options = {}) {
  try {
    const { select = '*', limit = 10, filters = {} } = options

    let query = supabase.from(table).select(select).limit(limit)

    // Aplicar filtros
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    const { data, error } = await query

    if (error) {
      console.error(`Error consultando ${table}:`, error)
      return null
    }

    return data
  } catch (err) {
    console.error(`Error ejecutando query en ${table}:`, err)
    return null
  }
}

export async function executeSQL(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      console.error('Error ejecutando SQL:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Error ejecutando SQL:', err)
    return null
  }
}

export async function getTableInfo(tableName) {
  try {
    // Intentar obtener estructura de la tabla
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .order('ordinal_position')

    if (error) {
      console.error(`Error obteniendo info de tabla ${tableName}:`, error)
      return null
    }

    return data
  } catch (err) {
    console.error(`Error obteniendo info de tabla ${tableName}:`, err)
    return null
  }
}

// Función principal para testing
async function testConnection() {
  console.log('🧪 Probando conexión a IGLESIABD Database...\n')

  // Probar diferentes tablas
  const tables = ['usuario', 'iglesia', 'ministerio', 'curso', 'evaluacion']

  for (const table of tables) {
    console.log(`📋 Consultando tabla: ${table}`)
    const data = await executeQuery(table, { limit: 3 })

    if (data) {
      console.log(`✅ ${table}: ${data.length} registros encontrados`)
      if (data.length > 0) {
        console.log('Primer registro:', JSON.stringify(data[0], null, 2))
      }
    } else {
      console.log(`❌ Error consultando ${table}`)
    }
    console.log('')
  }

  console.log('🎉 Pruebas completadas!')
}

export { supabase, testConnection }

// Si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testConnection()
}