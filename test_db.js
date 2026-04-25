import { createClient } from '@supabase/supabase-js'

// Configurar cliente Supabase
const supabaseUrl = 'https://heibyjbvfiokmduwwawm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaWJ5amJ2Zmlva21kdXd3YXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDAzNjEsImV4cCI6MjA4OTA3NjM2MX0.dCwu7xz1hExRFX1brCGDZySW0aacxBaV-yjPt0bqVZI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    // Intentar consultar una tabla específica del proyecto IGLESIABD
    console.log('Probando conexión con tabla usuario...')

    const { data, error } = await supabase
      .from('usuario')
      .select('id_usuario, nombres, apellidos, correo')
      .limit(5)

    if (error) {
      console.error('Error consultando usuario:', error)

      // Intentar con otra tabla
      console.log('Probando con tabla iglesia...')
      const { data: iglesias, error: errorIglesia } = await supabase
        .from('iglesia')
        .select('id_iglesia, nombre')
        .limit(3)

      if (errorIglesia) {
        console.error('Error consultando iglesia:', errorIglesia)
        return
      }

      console.log('Conexión exitosa. Iglesias encontradas:')
      iglesias.forEach(iglesia => {
        console.log(`- ID: ${iglesia.id_iglesia}, Nombre: ${iglesia.nombre}`)
      })

    } else {
      console.log('Conexión exitosa. Usuarios encontrados:')
      data.forEach(usuario => {
        console.log(`- ID: ${usuario.id_usuario}, Nombre: ${usuario.nombres} ${usuario.apellidos}, Email: ${usuario.correo}`)
      })
    }

  } catch (err) {
    console.error('Error de conexión:', err)
  }
}

testConnection()