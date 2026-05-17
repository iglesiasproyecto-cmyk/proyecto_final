import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Plus, Trash2, Eye, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCursoDetalle, useEditCurso, useManageEnrollments } from '@/hooks/useGlobalAula';
import type { Tables } from '@/types/database.types';
import { useNavigate } from 'react-router';

interface GlobalAulaDetailPanelProps {
  open: boolean;
  cursoId: number | null;
  onClose: () => void;
}

type CursoRow = Tables<'aula_curso'>;

interface CursoDetalleData extends CursoRow {
  usuario_creador?: { id_usuario: number; nombres: string; apellidos: string } | null;
  iglesia?: { id_iglesia: number; nombre: string } | null;
  ministerio?: { id_ministerio: number; nombre: string } | null;
  inscripciones?: Array<{
    id_usuario: number;
    inscrito_en: string;
    activo: boolean;
    usuario?: { id_usuario: number; nombres: string; apellidos: string; correo: string } | null;
  }>;
}

export function GlobalAulaDetailPanel({
  open,
  cursoId,
  onClose,
}: GlobalAulaDetailPanelProps) {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [removeUserDialog, setRemoveUserDialog] = useState<{ open: boolean; userId: number | null }>({
    open: false,
    userId: null,
  });

  const { data: curso, isLoading, error } = useCursoDetalle(cursoId || undefined);
  const editMutation = useEditCurso(cursoId || 0);
  const enrollMutation = useManageEnrollments(cursoId || 0);

  const { register, handleSubmit, reset, watch } = useForm<{
    titulo: string;
    descripcion: string | null;
    estado: string;
  }>({
    defaultValues: {
      titulo: curso?.titulo || '',
      descripcion: curso?.descripcion || '',
      estado: curso?.estado || 'borrador',
    },
  });

  // Update form when curso data changes
  React.useEffect(() => {
    if (curso) {
      reset({
        titulo: curso.titulo,
        descripcion: curso.descripcion,
        estado: curso.estado,
      });
    }
  }, [curso, reset]);

  const onEditSubmit = (data: { titulo: string; descripcion: string | null; estado: string }) => {
    if (!cursoId) return;

    editMutation.mutate(
      {
        titulo: data.titulo,
        descripcion: data.descripcion,
        estado: data.estado as 'borrador' | 'activo' | 'archivado',
      },
      {
        onSuccess: () => {
          setEditMode(false);
        },
      }
    );
  };

  const handleRemoveUser = (userId: number) => {
    if (!cursoId) return;

    enrollMutation.mutate(
      { action: 'remove', idUsuario: userId },
      {
        onSuccess: () => {
          setRemoveUserDialog({ open: false, userId: null });
        },
      }
    );
  };

  const handleAddUserFromDialog = (userIds: number[]) => {
    if (!cursoId || userIds.length === 0) return;

    // Add first user, then close dialog
    userIds.forEach((userId) => {
      enrollMutation.mutate(
        { action: 'add', idUsuario: userId },
        {
          onSuccess: () => {
            if (userIds[0] === userId) {
              setEnrollDialogOpen(false);
            }
          },
        }
      );
    });
  };

  const handleViewFullCourse = () => {
    if (!curso || !curso.id_iglesia) {
      toast.error('No se puede abrir el curso completo');
      return;
    }
    onClose();
    navigate(`/app/${curso.id_iglesia}/aula/curso/${cursoId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Cargando detalles del curso...</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 mt-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Error state
  if (error || !curso) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Detalles del Curso</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">Curso no encontrado</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const inscripciones = (curso.inscripciones || []) as Array<{
    id_usuario: number;
    inscrito_en: string;
    activo: boolean;
    usuario?: { id_usuario: number; nombres: string; apellidos: string; correo: string } | null;
  }>;

  const estadoBadgeColor = {
    borrador: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    activo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    archivado: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between gap-2">
              <span>Detalles del Curso</span>
              <button
                onClick={() => setEditMode(!editMode)}
                className="p-1.5 hover:bg-accent rounded-lg transition-colors"
                title={editMode ? 'Cancelar edición' : 'Editar curso'}
              >
                {editMode ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              </button>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Información del Curso */}
            <div className="border-b pb-6">
              {editMode ? (
                <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2 block">
                      Título
                    </label>
                    <Input
                      {...register('titulo', { required: true })}
                      className="h-10 bg-background/50 border-white/10 rounded-lg text-sm"
                      placeholder="Título del curso"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2 block">
                      Descripción
                    </label>
                    <Textarea
                      {...register('descripcion')}
                      className="min-h-24 bg-background/50 border-white/10 rounded-lg text-sm resize-none"
                      placeholder="Descripción del curso"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2 block">
                      Estado
                    </label>
                    <Select defaultValue={watch('estado')} onValueChange={(value) => register('estado').onChange({ target: { value } })}>
                      <SelectTrigger className="h-10 bg-background/50 border-white/10 rounded-lg text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="borrador">Borrador</SelectItem>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="archivado">Archivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-9 rounded-lg text-xs"
                      onClick={() => {
                        setEditMode(false);
                        reset();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-9 rounded-lg text-xs"
                      disabled={editMutation.isPending}
                    >
                      {editMutation.isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold">{curso.titulo}</h3>
                  </div>

                  {curso.descripcion && (
                    <p className="text-xs text-muted-foreground line-clamp-3">{curso.descripcion}</p>
                  )}

                  <div className="flex gap-2 pt-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Estado</p>
                      <Badge
                        className={`text-[10px] uppercase font-bold tracking-widest ${
                          estadoBadgeColor[curso.estado as keyof typeof estadoBadgeColor] ||
                          'bg-gray-100 text-gray-700 dark:bg-gray-900/30'
                        }`}
                      >
                        {curso.estado}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-widest">
                        {curso.id_iglesia ? 'Iglesia' : 'Ministerio'}
                      </Badge>
                    </div>
                  </div>

                  {(curso.iglesia || curso.ministerio || curso.usuario_creador) && (
                    <div className="space-y-1.5 pt-2 text-xs text-muted-foreground">
                      {(curso.iglesia as any)?.nombre && (
                        <p>
                          <span className="font-semibold text-foreground">Iglesia:</span> {(curso.iglesia as any).nombre}
                        </p>
                      )}
                      {(curso.ministerio as any)?.nombre && (
                        <p>
                          <span className="font-semibold text-foreground">Ministerio:</span> {(curso.ministerio as any).nombre}
                        </p>
                      )}
                      {(curso.usuario_creador as any)?.nombres && (
                        <p>
                          <span className="font-semibold text-foreground">Creado por:</span> {(curso.usuario_creador as any).nombres}{' '}
                          {(curso.usuario_creador as any).apellidos}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Inscritos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">
                  Inscritos ({inscripciones.length})
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 rounded-lg text-xs"
                  onClick={() => setEnrollDialogOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Agregar
                </Button>
              </div>

              {inscripciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-xs text-muted-foreground">Sin usuarios inscritos</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {inscripciones.map((inscripcion) => {
                    const usuario = (inscripcion.usuario as any);
                    return (
                      <div
                        key={inscripcion.id_usuario}
                        className="flex items-center justify-between gap-3 p-2 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {usuario?.nombres || '?'} {usuario?.apellidos || ''}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{usuario?.correo || 'N/A'}</p>
                        </div>
                        <button
                          onClick={() => setRemoveUserDialog({ open: true, userId: inscripcion.id_usuario })}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-destructive rounded transition-all shrink-0"
                          title="Remover usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Link */}
            <div className="border-t pt-4">
              <Button
                variant="outline"
                className="w-full h-9 rounded-lg text-xs"
                onClick={handleViewFullCourse}
              >
                Ver curso completo
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Enroll Users Dialog */}
      <EnrollUsersDialog
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        onSubmit={handleAddUserFromDialog}
        isLoading={enrollMutation.isPending}
      />

      {/* Remove User Confirmation Dialog */}
      <AlertDialog
        open={removeUserDialog.open}
        onOpenChange={(open) => setRemoveUserDialog({ ...removeUserDialog, open })}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogTitle>Remover usuario</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Seguro que deseas remover este usuario del curso? Perderá acceso a todo el contenido.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end pt-4">
            <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeUserDialog.userId !== null) {
                  handleRemoveUser(removeUserDialog.userId);
                }
              }}
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? 'Removiendo...' : 'Remover'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Sub-component: Enroll Users Dialog
 * TODO: List users based on search and allow selection of multiple users
 */
interface EnrollUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (userIds: number[]) => void;
  isLoading: boolean;
}

function EnrollUsersDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: EnrollUsersDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = () => {
    // TODO: List users based on search and implement multi-select
    toast.info('Funcionalidad en desarrollo');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Agregar Usuarios al Curso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2 block">
              Buscar usuario
            </label>
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 bg-background/50 border-white/10 rounded-lg text-sm"
            />
          </div>
          <div className="py-8 text-center text-sm text-muted-foreground">
            <p>Funcionalidad en desarrollo</p>
          </div>
        </div>
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" className="rounded-lg" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="rounded-lg"
            onClick={handleSubmit}
            disabled={isLoading || !searchQuery.trim()}
          >
            {isLoading ? 'Agregando...' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
