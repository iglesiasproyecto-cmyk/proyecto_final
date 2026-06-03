import { useState, useEffect } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { useAccesoModulos } from '@/hooks/useAccesoModulos'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton';
import { ModuleSkeleton } from '@/app/components/loading/skeletons';
import { ModuloEditorPanel } from './ModuloEditorPanel'
import { getInternalUserId } from '@/lib/userHelpers'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { BookOpen, CheckCircle, Unlock, Lock, Loader2 } from 'lucide-react'

interface ModulosNavegacionProps {
  idCurso: number
}

function useMarcarModuloCompletado(idCurso: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ idModulo, idUsuario }: { idModulo: number; idUsuario: number }) => {
      // Obtener todas las actividades del módulo
      const { data: actividades } = await supabase
        .from('aula_actividad')
        .select('id_aula_actividad')
        .eq('id_aula_modulo', idModulo)

      if (!actividades || actividades.length === 0) {
        // Módulo solo con contenido — ya se auto-completa, nada que insertar
        return { sinActividades: true }
      }

      // Marcar todas las actividades como completadas
      const rows = actividades.map(a => ({
        id_aula_actividad: a.id_aula_actividad,
        id_usuario: idUsuario,
        completada: true,
        completada_en: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('aula_progreso_actividad')
        .upsert(rows, { onConflict: 'id_usuario,id_aula_actividad' })

      if (error) throw error
      return { sinActividades: false }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['acceso-modulos', vars.idUsuario, idCurso] })
      qc.invalidateQueries({ queryKey: ['progreso-curso'] })
    },
  })
}

export function ModulosNavegacion({ idCurso }: ModulosNavegacionProps) {
  const { user } = useAuth()
  const [internalUserId, setInternalUserId] = useState<number | null>(null)
  const [moduloAbierto, setModuloAbierto] = useState<{ id: number; titulo: string } | null>(null)
  const marcarCompletado = useMarcarModuloCompletado(idCurso)

  const { data: modulos, isLoading } = useAccesoModulos({
    idUsuario: internalUserId,
    idCurso,
  })

  useEffect(() => {
    if (!user?.id) return
    getInternalUserId(user.id).then(setInternalUserId)
  }, [user?.id])

  if (isLoading) {
    return <ModuleSkeleton modules={5} />
  }

  if (!modulos || modulos.length === 0) {
    return (
      <Card className="rounded-[28px] border border-dashed border-border/70 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No hay módulos disponibles</h3>
          <p className="text-center text-muted-foreground">
            El líder aún no ha creado módulos para este curso
          </p>
        </CardContent>
      </Card>
    )
  }

  const getEstadoIcon = (estadoAcceso: string) => {
    switch (estadoAcceso) {
      case 'completado': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'disponible': return <Unlock className="h-4 w-4 text-blue-600" />
      case 'bloqueado':  return <Lock className="h-4 w-4 text-gray-400" />
      default: return null
    }
  }

  const getEstadoColor = (estadoAcceso: string) => {
    switch (estadoAcceso) {
      case 'completado': return 'border-green-200 bg-green-50 cursor-pointer hover:bg-green-100'
      case 'disponible': return 'border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100'
      case 'bloqueado':  return 'border-gray-200 bg-gray-50 opacity-60'
      default: return ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-white/10 bg-card/55 p-5 backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Ruta disponible</p>
        <h3 className="mt-1 text-lg font-semibold">Módulos del Curso</h3>
      </div>

      <div className="grid gap-3">
        {modulos.map((modulo) => (
          <div key={modulo.idModulo}>
            <Card
              className={`overflow-hidden rounded-[24px] border transition-all ${getEstadoColor(modulo.estadoAcceso)} ${
                modulo.estadoAcceso === 'disponible' || modulo.estadoAcceso === 'completado' ? 'hover:shadow-md' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getEstadoIcon(modulo.estadoAcceso)}
                    <div>
                      <CardTitle className="text-base">{modulo.titulo}</CardTitle>
                      <CardDescription>Módulo {modulo.orden}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={modulo.estadoAcceso === 'completado' ? 'default' : 'secondary'}>
                    {modulo.estadoAcceso === 'completado' ? 'Completado' :
                     modulo.estadoAcceso === 'disponible' ? 'Disponible' : 'Bloqueado'}
                  </Badge>
                </div>
              </CardHeader>

              {(modulo.estadoAcceso === 'disponible' || modulo.estadoAcceso === 'completado') && (
                <CardContent className="pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-2xl"
                    onClick={() =>
                      setModuloAbierto(
                        moduloAbierto?.id === modulo.idModulo
                          ? null
                          : { id: modulo.idModulo, titulo: modulo.titulo }
                      )
                    }
                  >
                    {moduloAbierto?.id === modulo.idModulo ? 'Cerrar' : 'Ver contenido'}
                  </Button>
                </CardContent>
              )}

              {modulo.estadoAcceso === 'bloqueado' && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    Completa los módulos anteriores para desbloquear este contenido
                  </p>
                </CardContent>
              )}
            </Card>

            {moduloAbierto?.id === modulo.idModulo && (
              <div className="mt-2 rounded-[24px] border border-white/10 bg-background/35 p-4 space-y-4">
                <ModuloEditorPanel
                  idModulo={modulo.idModulo}
                  tituloModulo={modulo.titulo}
                  readOnly
                  onClose={() => setModuloAbierto(null)}
                />
                {modulo.estadoAcceso !== 'completado' && (
                  <div className="flex justify-end pt-2 border-t border-white/10">
                    <Button
                      onClick={async () => {
                        if (!internalUserId) return
                        try {
                          await marcarCompletado.mutateAsync({
                            idModulo: modulo.idModulo,
                            idUsuario: internalUserId,
                          })
                          toast.success('¡Módulo marcado como completado!')
                          setModuloAbierto(null)
                        } catch {
                          toast.error('No se pudo marcar el módulo como completado')
                        }
                      }}
                      disabled={marcarCompletado.isPending}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-900/20"
                    >
                      {marcarCompletado.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                      ) : (
                        <><CheckCircle className="w-4 h-4 mr-2" /> Marcar como completado</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
