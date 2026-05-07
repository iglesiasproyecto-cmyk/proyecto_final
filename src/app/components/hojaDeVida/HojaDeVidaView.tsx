import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Award,
  BookOpen,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Zap,
} from 'lucide-react';
import * as hojaDeVidaService from '@/services/hojaDeVida.service';

interface HojaDeVidaViewProps {
  hoja: hojaDeVidaService.HojaDeVidaCompleta | null;
  loading?: boolean;
  puedeEditar?: boolean;
  onEditar?: () => void;
}

export function HojaDeVidaView({
  hoja,
  loading = false,
  puedeEditar = false,
  onEditar,
}: HojaDeVidaViewProps) {
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hoja) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            No hay hoja de vida disponible. {puedeEditar && 'Crea una nueva.'}
          </p>
          {puedeEditar && onEditar && (
            <button
              onClick={onEditar}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Crear Hoja de Vida
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  const habilidades = (hoja.habilidades as hojaDeVidaService.Habilidad[]) || [];
  const formacion = (hoja.formacion_academica as hojaDeVidaService.FormacionAcademica[]) || [];
  const certificados = hoja.certificados || [];

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'basico':
        return 'bg-yellow-100 text-yellow-800';
      case 'intermedio':
        return 'bg-blue-100 text-blue-800';
      case 'avanzado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">
                  {hoja.usuario_nombres} {hoja.usuario_apellidos}
                </h2>
                {hoja.completa && (
                  <Badge className="bg-green-500">Completa</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {hoja.usuario_correo}
              </p>
              {hoja.titulo_profesional && (
                <p className="text-lg font-semibold text-primary mt-2">
                  Rol: {hoja.titulo_profesional}
                </p>
              )}
            </div>
            {puedeEditar && onEditar && (
              <button
                onClick={onEditar}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Editar
              </button>
            )}
          </div>
        </CardHeader>

        {hoja.resumen_profesional && (
          <CardContent>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Testimonio de Fe:</h3>
              <p className="text-gray-700 leading-relaxed">{hoja.resumen_profesional}</p>
            </div>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="habilidades" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="habilidades" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Dones
          </TabsTrigger>
          <TabsTrigger value="formacion" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Conocimiento
          </TabsTrigger>
          <TabsTrigger value="certificados" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Certificados
          </TabsTrigger>
        </TabsList>

        {/* Dones y Ministerios Tab */}
        <TabsContent value="habilidades">
          <Card>
            <CardHeader>
              <CardTitle>Dones y Ministerios Espirituales</CardTitle>
            </CardHeader>
            <CardContent>
              {habilidades.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {habilidades.map((habilidad, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-gray-900">{habilidad.nombre}</h4>
                        <Badge className={getNivelColor(habilidad.nivel)}>
                          {habilidad.nivel.charAt(0).toUpperCase() + habilidad.nivel.slice(1)}
                        </Badge>
                      </div>
                      {habilidad.años_experiencia && (
                        <p className="text-sm text-gray-600 mt-2">
                          {habilidad.años_experiencia} años de experiencia
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">No hay dones o ministerios registrados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conocimiento Espiritual Tab */}
        <TabsContent value="formacion">
          <Card>
            <CardHeader>
              <CardTitle>Conocimiento Espiritual y Habilidades</CardTitle>
            </CardHeader>
            <CardContent>
              {formacion.length > 0 ? (
                <div className="space-y-4">
                  {formacion.map((item, idx) => (
                    <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{item.titulo}</h4>
                          <p className="text-sm text-gray-600">{item.institucion}</p>
                          <p className="text-sm text-gray-500">{item.campo_estudio}</p>
                        </div>
                        <Badge
                          variant={item.estado === 'completado' ? 'default' : 'secondary'}
                        >
                          {item.estado === 'completado' ? 'Completado' : 'En progreso'}
                        </Badge>
                      </div>
                      {item.fecha_graduacion && (
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(item.fecha_graduacion), 'MMMM yyyy', {
                            locale: es,
                          })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">No hay conocimiento o habilidades registradas</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificados Tab */}
        <TabsContent value="certificados">
          <Card>
            <CardHeader>
              <CardTitle>Certificados y Cursos Completados</CardTitle>
              <CardDescription>
                {certificados.length} certificado{certificados.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {certificados.length > 0 ? (
                <div className="space-y-3">
                  {certificados.map((cert) => (
                    <div key={cert.id_aula_certificado} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Award className="w-4 h-4 text-yellow-500" />
                            {cert.titulo_curso}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Certificado #{cert.numero_certificado}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {format(new Date(cert.fecha_emision), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  No hay certificados registrados aún. Completa cursos para obtenerlos.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Metadata Footer */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>Creada: {format(new Date(hoja.creado_en), 'dd MMMM yyyy HH:mm', { locale: es })}</p>
        <p>
          Actualizada: {format(new Date(hoja.actualizado_en), 'dd MMMM yyyy HH:mm', {
            locale: es,
          })}
        </p>
      </div>
    </div>
  );
}
