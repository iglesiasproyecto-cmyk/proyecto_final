import { useState, useEffect } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { LiderAulaPage } from './LiderAulaPage'
import { ServidorAulaPage } from './ServidorAulaPage'
import { supabase } from '@/lib/supabaseClient'
import { getInternalUserId, getUserMinisterios } from '@/lib/userHelpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Alert, AlertDescription } from '@/app/components/ui/alert'
import { Loader2 } from 'lucide-react'

export function AulaPage() {
  const { user } = useAuth()
  const [isLider, setIsLider] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkRole = async () => {
      console.log('AulaPage - Checking role for user:', user?.id)

      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        // Obtener el id_usuario interno basado en el auth_user_id
        console.log('AulaPage - Getting internal user ID...')
        const internalUserId = await getInternalUserId(user.id)

        if (!internalUserId) {
          console.error('AulaPage - Could not get internal user ID')
          setIsLider(false)
          setLoading(false)
          return
        }

        console.log('AulaPage - Internal user ID:', internalUserId)

        // Obtener ministerios del usuario
        const ministerios = await getUserMinisterios(internalUserId)
        console.log('AulaPage - User ministerios:', ministerios)

        // Verificar si tiene rol de líder en alguno de sus ministerios
        const isLiderMinisterio = ministerios.some(ministerio => ministerio.rol_en_ministerio === 'lider')
        console.log('AulaPage - Is lider ministerio:', isLiderMinisterio)

        // También verificar la tabla usuario_rol como backup
        const { data: rolData, error: rolError } = await supabase
          .from('usuario_rol')
          .select(`rol:rol(nombre)`)
          .eq('id_usuario', internalUserId)
          .eq('rol.nombre', 'Líder de Ministerio')
          .is('fecha_fin', null)

        const isLiderRol = (rolData && rolData.length > 0) || false
        console.log('AulaPage - Is lider rol:', isLiderRol)

        // Es líder si tiene cualquiera de las dos condiciones
        const finalIsLider = isLiderMinisterio || isLiderRol
        console.log('AulaPage - Final is lider:', finalIsLider)

        setIsLider(finalIsLider)
      } catch (error) {
        console.error('Error checking role:', error)
        setIsLider(false)
      } finally {
        setLoading(false)
      }
    }

    checkRole()
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <Alert>
        <AlertDescription>
          Debes iniciar sesión para acceder al aula.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Aula de Formación</CardTitle>
          <CardDescription>
            Plataforma de formación interna para ministerios
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLider ? <LiderAulaPage /> : <ServidorAulaPage />}
        </CardContent>
      </Card>
    </div>
  )
}