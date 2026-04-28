import { useAuth } from '@/app/store/AppContext'
import { useCertificadosUsuario } from '@/hooks/useCertificados'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Award, Download, Calendar, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from '@/app/components/ui/dialog'
import { Separator } from '@/app/components/ui/separator'

interface CertificadoPDFProps {
  certificado: any
  usuario: any
}

function CertificadoPDF({ certificado, usuario }: CertificadoPDFProps) {
  const handleDescargar = () => {
    // Por ahora, abrir una nueva ventana con el certificado formateado para impresión
    const certificadoHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificado - ${certificado.curso.nombre}</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              text-align: center;
              border: 2px solid #333;
            }
            .titulo {
              font-size: 32px;
              font-weight: bold;
              margin: 40px 0 20px 0;
              color: #2563eb;
            }
            .subtitulo {
              font-size: 18px;
              margin: 20px 0;
              color: #666;
            }
            .nombre {
              font-size: 24px;
              font-weight: bold;
              margin: 30px 0;
              color: #333;
            }
            .curso {
              font-size: 20px;
              margin: 20px 0;
              font-style: italic;
            }
            .codigo {
              font-size: 14px;
              margin: 20px 0;
              color: #666;
            }
            .fecha {
              font-size: 16px;
              margin: 30px 0;
            }
            .firma {
              margin-top: 60px;
              padding-top: 20px;
              border-top: 1px solid #333;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="titulo">CERTIFICADO DE FINALIZACIÓN</div>
          <div class="subtitulo">Sistema de Evangelización Integral</div>

          <div class="nombre">${usuario.nombres} ${usuario.apellidos}</div>

          <div>ha completado satisfactoriamente el curso:</div>

          <div class="curso">${certificado.curso.nombre}</div>

          <div class="codigo">Código único: ${certificado.codigo_unico}</div>

          <div class="fecha">
            Fecha de emisión: ${new Date(certificado.fecha_emision).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>

          <div class="firma">
            <div>_______________________________</div>
            <div>Líder de Ministerio</div>
          </div>
        </body>
      </html>
    `

    const nuevaVentana = window.open('', '_blank')
    if (nuevaVentana) {
      nuevaVentana.document.write(certificadoHTML)
      nuevaVentana.document.close()
      nuevaVentana.print()
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8 border-2 border-gray-300 bg-white">
      <div className="text-center">
        <Award className="h-16 w-16 mx-auto mb-4 text-blue-600" />
        <h1 className="text-3xl font-bold text-blue-600 mb-2">CERTIFICADO DE FINALIZACIÓN</h1>
        <p className="text-gray-600 mb-8">Sistema de Evangelización Integral</p>

        <div className="text-2xl font-bold mb-4 text-gray-800">
          {usuario.nombres} {usuario.apellidos}
        </div>

        <p className="mb-4">ha completado satisfactoriamente el curso:</p>

        <div className="text-xl font-semibold italic mb-6 text-blue-700">
          {certificado.curso.nombre}
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Código único: {certificado.codigo_unico}
        </div>

        <div className="text-lg mb-8">
          Fecha de emisión: {new Date(certificado.fecha_emision).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>

        <Separator className="my-8" />

        <div className="text-center">
          <div className="border-t border-gray-400 pt-4 inline-block">
            <div className="text-sm">_______________________________</div>
            <div className="text-sm font-semibold">Líder de Ministerio</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CertificadosServidor() {
  const { user } = useAuth()
  const { data: certificados, isLoading } = useCertificadosUsuario(user?.id)

  if (isLoading) {
    return <div>Cargando certificados...</div>
  }

  if (!certificados || certificados.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Award className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tienes certificados aún</h3>
          <p className="text-muted-foreground text-center">
            Completa tus cursos al 100% para obtener certificados
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {certificados.map((certificado) => (
        <Card key={certificado.id_certificado}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg flex items-center">
                  <Award className="h-5 w-5 mr-2 text-yellow-500" />
                  {certificado.curso?.nombre}
                </CardTitle>
                <CardDescription>Certificado de Finalización</CardDescription>
              </div>
              <Badge variant="default">
                Completado
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {certificado.curso?.descripcion || 'Curso completado exitosamente'}
            </p>

            <div className="flex items-center text-sm text-muted-foreground mb-4">
              <Calendar className="h-4 w-4 mr-1" />
              Emitido el {new Date(certificado.fecha_emision).toLocaleDateString()}
            </div>

            <div className="text-sm text-muted-foreground mb-4">
              Código único: {certificado.codigo_unico}
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full mb-2">
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Certificado
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <CertificadoPDF certificado={certificado} usuario={user} />
                <div className="flex justify-center mt-4">
                  <Button onClick={() => {
                    const dialog = document.querySelector('[data-state="open"]')
                    if (dialog) {
                      const certificadoElement = dialog.querySelector('.max-w-2xl')
                      if (certificadoElement) {
                        // Aquí se podría implementar descarga real de PDF
                        window.print()
                      }
                    }
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Imprimir/Descargar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}