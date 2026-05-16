import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

interface InviteData {
  email: string
  nombres: string
  apellidos: string
  id_iglesia: number
  id_rol: number
  id_sede?: number
  iglesia?: { nombre: string }
  rol?: { nombre: string }
  sede?: { nombre: string }
}

export function AcceptInvitePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Token de invitación no encontrado')
      setLoading(false)
      return
    }

    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-invite-token', {
        body: { token }
      })

      if (error) throw error

      if (!data?.valid) {
        setError(data?.error || data?.message || 'Token inválido o expirado')
        return
      }

      setInviteData(data.inviteData)
    } catch (err) {
      console.error('Error validating token:', err)
      setError('Error validando token de invitación')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token || !inviteData) return

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data, error } = await supabase.functions.invoke('complete-invite', {
        body: { token, password }
      })

      if (error) {
        // Extraer mensaje real de la Edge Function si está disponible
        try {
          const errBody = await (error as any).context?.json?.()
          if (errBody?.error) throw new Error(errBody.error)
        } catch (parseErr) {
          if ((parseErr as Error)?.message) throw parseErr
        }
        throw error
      }

      if (data?.success) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/login', {
            state: {
              message: 'Cuenta creada exitosamente. Ahora puedes iniciar sesión.',
              email: inviteData.email
            }
          })
        }, 3000)
      } else {
        setError(data?.error || 'Error completando invitación')
      }
    } catch (err) {
      console.error('Error completing invite:', err)
      setError(err instanceof Error ? err.message : 'Error completando invitación')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2">Validando invitación...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Invitación Inválida</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Button onClick={() => navigate('/login')} variant="outline">
                Ir al Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-green-600">¡Cuenta Creada!</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Tu cuenta ha sido creada exitosamente. Serás redirigido al login en unos segundos...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Aceptar Invitación</CardTitle>
          <CardDescription>
            Completa tu registro para IGLESIABD
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteData && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900">Detalles de la Invitación</h3>
              <div className="mt-2 text-sm text-blue-800">
                <p><strong>Nombre:</strong> {inviteData.nombres} {inviteData.apellidos}</p>
                <p><strong>Email:</strong> {inviteData.email}</p>
                <p><strong>Rol:</strong> {inviteData.rol?.nombre || 'N/A'}</p>
                <p><strong>Iglesia:</strong> {inviteData.iglesia?.nombre || 'N/A'}</p>
                {inviteData.sede && <p><strong>Sede:</strong> {inviteData.sede.nombre}</p>}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Repite tu contraseña"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}