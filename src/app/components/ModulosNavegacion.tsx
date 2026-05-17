import { useState, useEffect } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { useAccesoModulos } from '@/hooks/useAccesoModulos'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton';
import { ModuleSkeleton } from '@/app/components/loading/skeletons';
import { ModuloEditorPanel } from './ModuloEditorPanel'
import { getInternalUserId } from '@/lib/userHelpers'
import { BookOpen, CheckCircle, Unlock, Lock } from 'lucide-react'
import { motion } from 'motion/react'

interface ModulosNavegacionProps {
  idCurso: number
}

export function ModulosNavegacion({ idCurso }: ModulosNavegacionProps) {
  const { user } = useAuth()
  const [internalUserId, setInternalUserId] = useState<number | null>(null)
  const [moduloAbierto, setModuloAbierto] = useState<{ id: number; titulo: string } | null>(null)

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
      case 'completado': return 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 cursor-pointer shadow-sm shadow-emerald-500/5'
      case 'disponible': return 'border-[#4682b4]/30 bg-[#4682b4]/5 hover:bg-[#4682b4]/10 hover:border-[#4682b4]/40 cursor-pointer shadow-sm shadow-[#4682b4]/5'
      case 'bloqueado':  return 'border-muted bg-muted/20 opacity-70'
      default: return ''
    }
  }

  const getBadgeVariant = (estadoAcceso: string) => {
    switch (estadoAcceso) {
      case 'completado': return 'bg-emerald-500/10 text-emerald-600 border-none hover:bg-emerald-500/20'
      case 'disponible': return 'bg-[#4682b4]/10 text-[#4682b4] border-none hover:bg-[#4682b4]/20'
      case 'bloqueado':  return 'bg-muted text-muted-foreground border-none hover:bg-muted/80'
      default: return ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-border/50 bg-card/40 p-6 backdrop-blur-xl shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Ruta disponible</p>
        <h3 className="mt-1 text-xl font-black">Módulos del Curso</h3>
      </div>

      <div className="grid gap-4">
        {modulos.map((modulo, index) => (
          <div key={modulo.idModulo}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`overflow-hidden rounded-[24px] border backdrop-blur-xl transition-all duration-300 ${getEstadoColor(modulo.estadoAcceso)} ${
                  modulo.estadoAcceso === 'disponible' || modulo.estadoAcceso === 'completado' ? 'hover:-translate-y-0.5' : ''
                }`}
              >
                <CardHeader className="pb-4 pt-5 px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                        modulo.estadoAcceso === 'completado' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white' :
                        modulo.estadoAcceso === 'disponible' ? 'bg-gradient-to-br from-[#709dbd] to-[#4682b4] text-white' :
                        'bg-muted/50 text-muted-foreground'
                      }`}>
                        {getEstadoIcon(modulo.estadoAcceso)}
                      </div>
                      <div>
                        <Badge variant="outline" className="mb-1 text-[10px] border-border/50 bg-background/50">Módulo {modulo.orden}</Badge>
                        <CardTitle className="text-lg font-bold">{modulo.titulo}</CardTitle>
                      </div>
                    </div>
                    <Badge variant="outline" className={`px-3 py-1 font-bold uppercase tracking-wider text-[10px] ${getBadgeVariant(modulo.estadoAcceso)}`}>
                      {modulo.estadoAcceso === 'completado' ? 'Completado' :
                       modulo.estadoAcceso === 'disponible' ? 'Disponible' : 'Bloqueado'}
                    </Badge>
                  </div>
                </CardHeader>

                {(modulo.estadoAcceso === 'disponible' || modulo.estadoAcceso === 'completado') && (
                  <CardContent className="pt-0 px-6 pb-5">
                    <Button
                      variant={moduloAbierto?.id === modulo.idModulo ? "default" : "outline"}
                      className={`rounded-xl shadow-sm ${moduloAbierto?.id === modulo.idModulo ? 'bg-primary text-primary-foreground' : 'bg-background/50 hover:bg-background'}`}
                      onClick={() =>
                        setModuloAbierto(
                          moduloAbierto?.id === modulo.idModulo
                            ? null
                            : { id: modulo.idModulo, titulo: modulo.titulo }
                        )
                      }
                    >
                      {moduloAbierto?.id === modulo.idModulo ? 'Ocultar contenido' : 'Ver contenido'}
                    </Button>
                  </CardContent>
                )}

                {modulo.estadoAcceso === 'bloqueado' && (
                  <CardContent className="pt-0 px-6 pb-5">
                    <p className="text-sm text-muted-foreground flex items-center bg-background/50 px-4 py-2 rounded-xl w-fit">
                      <Lock className="w-4 h-4 mr-2 opacity-50" />
                      Completa los módulos anteriores para desbloquear este contenido
                    </p>
                  </CardContent>
                )}
              </Card>
            </motion.div>

            {moduloAbierto?.id === modulo.idModulo && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 rounded-[28px] border border-border/50 bg-card/40 backdrop-blur-xl p-5 shadow-sm"
              >
                <ModuloEditorPanel
                  idModulo={modulo.idModulo}
                  tituloModulo={modulo.titulo}
                  readOnly
                  onClose={() => setModuloAbierto(null)}
                />
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
