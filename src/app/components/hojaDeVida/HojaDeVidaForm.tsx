import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Plus, Trash2, Save, X } from 'lucide-react';
import * as hojaDeVidaService from '@/services/hojaDeVida.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';

interface HojaDeVidaFormData {
  resumen_profesional: string; // Testimonio de fe
  experiencia_laboral: string; // Experiencia en iglesias
  foto_perfil_url: string; // No se usa ahora
  habilidades: hojaDeVidaService.Habilidad[]; // Dones espirituales
  formacion_academica: hojaDeVidaService.FormacionAcademica[]; // Otros datos eclesiásticos
}

interface HojaDeVidaFormProps {
  hojaActual: hojaDeVidaService.HojaDeVidaCompleta | null;
  onGuardar: (datos: hojaDeVidaService.HojaDeVidaUpdate) => Promise<any>;
  onMarcarCompleta?: () => Promise<any>;
  isUpdating?: boolean;
  onCancel?: () => void;
}

export function HojaDeVidaForm({
  hojaActual,
  onGuardar,
  onMarcarCompleta,
  isUpdating = false,
  onCancel,
}: HojaDeVidaFormProps) {
  const [showHabilidadDialog, setShowHabilidadDialog] = useState(false);
  const [showFormacionDialog, setShowFormacionDialog] = useState(false);
  const [editingHabilidadIndex, setEditingHabilidadIndex] = useState<number | null>(null);
  const [editingFormacionIndex, setEditingFormacionIndex] = useState<number | null>(null);
  const [tempHabilidad, setTempHabilidad] = useState<hojaDeVidaService.Habilidad>({
    nombre: '',
    nivel: 'intermedio',
  });
  const [tempFormacion, setTempFormacion] = useState<hojaDeVidaService.FormacionAcademica>({
    institucion: '',
    titulo: '',
    campo_estudio: '',
    estado: 'en_progreso',
  });

  const { control, handleSubmit, watch, setValue } = useForm<HojaDeVidaFormData>({
    defaultValues: {
      resumen_profesional: hojaActual?.resumen_profesional || '',
      experiencia_laboral: hojaActual?.experiencia_laboral || '',
      foto_perfil_url: hojaActual?.foto_perfil_url || '',
      habilidades: (hojaActual?.habilidades as hojaDeVidaService.Habilidad[]) || [],
      formacion_academica: (hojaActual?.formacion_academica as hojaDeVidaService.FormacionAcademica[]) || [],
    },
  });

  const {
    fields: habilidadesFields,
    append: appendHabilidad,
    remove: removeHabilidad,
    update: updateHabilidad,
  } = useFieldArray({
    control,
    name: 'habilidades',
  });

  const {
    fields: formacionFields,
    append: appendFormacion,
    remove: removeFormacion,
    update: updateFormacion,
  } = useFieldArray({
    control,
    name: 'formacion_academica',
  });

  const habilidades = watch('habilidades');
  const formacion = watch('formacion_academica');

  const onSubmit = async (data: HojaDeVidaFormData) => {
    try {
      await onGuardar({
        resumen_profesional: data.resumen_profesional || null,
        experiencia_laboral: data.experiencia_laboral || null,
        foto_perfil_url: data.foto_perfil_url || null,
        habilidades: data.habilidades as any,
        formacion_academica: data.formacion_academica as any,
      });
    } catch (error) {
      console.error('Error saving hoja de vida:', error);
    }
  };

  // Habilidad Dialog Handlers
  const handleAddHabilidad = () => {
    if (editingHabilidadIndex !== null) {
      updateHabilidad(editingHabilidadIndex, tempHabilidad);
      setEditingHabilidadIndex(null);
    } else {
      appendHabilidad(tempHabilidad);
    }
    setTempHabilidad({ nombre: '', nivel: 'intermedio' });
    setShowHabilidadDialog(false);
  };

  const handleEditHabilidad = (index: number) => {
    setTempHabilidad(habilidades[index]);
    setEditingHabilidadIndex(index);
    setShowHabilidadDialog(true);
  };

  // Formación Dialog Handlers
  const handleAddFormacion = () => {
    if (editingFormacionIndex !== null) {
      updateFormacion(editingFormacionIndex, tempFormacion);
      setEditingFormacionIndex(null);
    } else {
      appendFormacion(tempFormacion);
    }
    setTempFormacion({
      institucion: '',
      titulo: '',
      campo_estudio: '',
      estado: 'en_progreso',
    });
    setShowFormacionDialog(false);
  };

  const handleEditFormacion = (index: number) => {
    setTempFormacion(formacion[index]);
    setEditingFormacionIndex(index);
    setShowFormacionDialog(true);
  };

  const handleCancelHabilidad = () => {
    setShowHabilidadDialog(false);
    setEditingHabilidadIndex(null);
    setTempHabilidad({ nombre: '', nivel: 'intermedio' });
  };

  const handleCancelFormacion = () => {
    setShowFormacionDialog(false);
    setEditingFormacionIndex(null);
    setTempFormacion({
      institucion: '',
      titulo: '',
      campo_estudio: '',
      estado: 'en_progreso',
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
      {/* Información Espiritual */}
      <Card>
        <CardHeader>
          <CardTitle>Información Espiritual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            name="resumen_profesional"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Testimonio de Fe
                </label>
                <Textarea
                  {...field}
                  placeholder="Comparte tu testimonio de fe, cómo llegaste a Cristo y tu experiencia espiritual..."
                  rows={4}
                  disabled={isUpdating}
                />
              </div>
            )}
          />

          <Controller
            name="experiencia_laboral"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experiencia en Iglesias
                </label>
                <Textarea
                  {...field}
                  placeholder="Iglesias donde has asistido o servido, años de experiencia, roles que has tenido..."
                  rows={4}
                  disabled={isUpdating}
                />
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Dones y Ministerios */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dones y Ministerios</CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setTempHabilidad({ nombre: '', nivel: 'intermedio' });
              setEditingHabilidadIndex(null);
              setShowHabilidadDialog(true);
            }}
            disabled={isUpdating}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {habilidades.length > 0 ? (
            <div className="space-y-2">
              {habilidades.map((hab, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{hab.nombre}</p>
                    <p className="text-sm text-gray-600">
                      Nivel: <Badge>{hab.nivel}</Badge>
                      {hab.años_experiencia && ` • ${hab.años_experiencia} años`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditHabilidad(idx)}
                      disabled={isUpdating}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeHabilidad(idx)}
                      disabled={isUpdating}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              Sin dones o ministerios agregados. Agrega tus dones espirituales.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Otro Conocimiento Espiritual */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Conocimiento Espiritual y Habilidades</CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setTempFormacion({
                institucion: '',
                titulo: '',
                campo_estudio: '',
                estado: 'en_progreso',
              });
              setEditingFormacionIndex(null);
              setShowFormacionDialog(true);
            }}
            disabled={isUpdating}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {formacion.length > 0 ? (
            <div className="space-y-2">
              {formacion.map((form, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{form.titulo}</p>
                    <p className="text-sm text-gray-600">{form.institucion}</p>
                    <p className="text-sm text-gray-500">{form.campo_estudio}</p>
                    {form.fecha_graduacion && (
                      <p className="text-xs text-gray-500 mt-1">
                        Fecha: {form.fecha_graduacion}
                      </p>
                    )}
                    <Badge className="mt-2" variant={form.estado === 'completado' ? 'default' : 'secondary'}>
                      {form.estado}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditFormacion(idx)}
                      disabled={isUpdating}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeFormacion(idx)}
                      disabled={isUpdating}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              Sin conocimiento espiritual o habilidades agregadas.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="submit"
          className="bg-green-600 hover:bg-green-700"
          disabled={isUpdating}
        >
          <Save className="w-4 h-4 mr-2" />
          {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
        </Button>

        {onMarcarCompleta && !hojaActual?.completa && (
          <Button
            type="button"
            variant="secondary"
            onClick={onMarcarCompleta}
            disabled={isUpdating}
          >
            Marcar como Completa
          </Button>
        )}

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isUpdating}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        )}
      </div>

      {/* Dones y Ministerios Dialog */}
      <Dialog open={showHabilidadDialog} onOpenChange={setShowHabilidadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHabilidadIndex !== null ? 'Editar Don o Ministerio' : 'Agregar Don o Ministerio'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Don o Ministerio</label>
              <Input
                value={tempHabilidad.nombre}
                onChange={(e) =>
                  setTempHabilidad({ ...tempHabilidad, nombre: e.target.value })
                }
                placeholder="Ej: Predicación, Alabanza, Enseñanza, Tocador de Guitarra, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nivel de Dominio</label>
              <Select
                value={tempHabilidad.nivel}
                onValueChange={(value) =>
                  setTempHabilidad({
                    ...tempHabilidad,
                    nivel: value as 'basico' | 'intermedio' | 'avanzado',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico">Básico</SelectItem>
                  <SelectItem value="intermedio">Intermedio</SelectItem>
                  <SelectItem value="avanzado">Avanzado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Años de Experiencia (Opcional)
              </label>
              <Input
                type="number"
                min="0"
                value={tempHabilidad.años_experiencia || ''}
                onChange={(e) =>
                  setTempHabilidad({
                    ...tempHabilidad,
                    años_experiencia: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelHabilidad}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleAddHabilidad}>
              {editingHabilidadIndex !== null ? 'Actualizar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conocimiento Espiritual Dialog */}
      <Dialog open={showFormacionDialog} onOpenChange={setShowFormacionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFormacionIndex !== null ? 'Editar Conocimiento Espiritual' : 'Agregar Conocimiento Espiritual'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tema o Área de Conocimiento</label>
              <Input
                value={tempFormacion.institucion}
                onChange={(e) =>
                  setTempFormacion({ ...tempFormacion, institucion: e.target.value })
                }
                placeholder="Ej: Biblia, Teología, Liderazgo Cristiano, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nombre del Conocimiento o Habilidad</label>
              <Input
                value={tempFormacion.titulo}
                onChange={(e) =>
                  setTempFormacion({ ...tempFormacion, titulo: e.target.value })
                }
                placeholder="Ej: Libro de Génesis, Predicación Efectiva, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Subtema o Especialidad</label>
              <Input
                value={tempFormacion.campo_estudio}
                onChange={(e) =>
                  setTempFormacion({ ...tempFormacion, campo_estudio: e.target.value })
                }
                placeholder="Ej: Exégesis Bíblica, Hermenéutica, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <Select
                value={tempFormacion.estado}
                onValueChange={(value) =>
                  setTempFormacion({
                    ...tempFormacion,
                    estado: value as 'en_progreso' | 'completado',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_progreso">En Progreso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Fecha de Finalización (Opcional)
              </label>
              <Input
                type="date"
                value={tempFormacion.fecha_graduacion || ''}
                onChange={(e) =>
                  setTempFormacion({
                    ...tempFormacion,
                    fecha_graduacion: e.target.value || undefined,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelFormacion}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleAddFormacion}>
              {editingFormacionIndex !== null ? 'Actualizar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
