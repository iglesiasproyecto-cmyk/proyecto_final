import React, { useState, useEffect } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { getInternalUserId } from '@/lib/userHelpers'
import { useCertificadosUsuario } from '@/hooks/useEvaluacionCurso'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Award, Download, Calendar } from 'lucide-react'
import { motion } from 'motion/react'

export function MisCertificados() {
  const { user } = useAuth()
  const [internalUserId, setInternalUserId] = useState<number | null>(null)

  useEffect(() => {
    if (user?.id) {
      getInternalUserId(user.id).then(setInternalUserId)
    }
  }, [user?.id])

  const { data: certificados, isLoading } = useCertificadosUsuario(internalUserId ?? undefined)

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-[200px] rounded-[24px]" />
        ))}
      </div>
    )
  }

  if (!certificados || certificados.length === 0) {
    return (
      <Card className="rounded-[28px] border border-dashed border-border bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Award className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold mb-2">No tienes certificados aún</h3>
          <p className="text-muted-foreground text-center">
            Completa todas las evaluaciones de un curso para obtener tu certificado.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {certificados.map((cert, idx) => (
        <motion.div
          key={cert.id_aula_certificado}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Card className="h-full rounded-[28px] border border-white/10 bg-gradient-to-br from-amber-500/10 to-orange-500/5 backdrop-blur-2xl group hover:border-amber-500/30 transition-all">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Badge className="mb-2 bg-amber-500/20 text-amber-600 border-amber-500/30">
                    Certificado
                  </Badge>
                  <CardTitle className="text-lg leading-tight">
                    {cert.aula_curso?.titulo}
                  </CardTitle>
                  <CardDescription className="text-xs uppercase tracking-wider mt-1">
                    {cert.aula_curso?.ministerio?.nombre || 'General'}
                  </CardDescription>
                </div>
                <Award className="h-8 w-8 text-amber-500 flex-shrink-0" />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2 pb-4 border-b border-border/50">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {new Date(cert.emitido_en).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  {cert.numero_certificado}
                </p>
              </div>

              <Button className="w-full rounded-2xl bg-amber-500 text-white hover:bg-amber-600 h-10">
                <Download className="h-4 w-4 mr-2" />
                Descargar Certificado
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
