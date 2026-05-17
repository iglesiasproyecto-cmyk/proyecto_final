import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { HojaDeVidaView } from './HojaDeVidaView';
import {
  usePerfilProfesionalCompletaV2PorUsuario, useCrearRevision,
  useEtiquetasPerfil, useAsignarEtiqueta, useRemoverEtiqueta,
} from '@/hooks/useHojaDeVida';
import { useApp } from '@/app/store/AppContext';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, Clock, Tag, X } from 'lucide-react';

const revisionColors = {
  aprobada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  observada: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  pendiente: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const revisionIcons = {
  aprobada: CheckCircle2,
  observada: AlertTriangle,
  pendiente: Clock,
}

interface HojaDeVidaModalProps {
  idUsuario: number | null;
  isOpen: boolean;
  onClose: () => void;
  nombreUsuario?: string;
  puedeRevisar?: boolean;
}

export function HojaDeVidaModal({
  idUsuario,
  isOpen,
  onClose,
  nombreUsuario = 'Usuario',
  puedeRevisar = false,
}: HojaDeVidaModalProps) {
  const { usuarioActual, rolActual } = useApp();
  const { data: hdv, isLoading } = usePerfilProfesionalCompletaV2PorUsuario(isOpen ? idUsuario : null);
  const { data: todasEtiquetas = [] } = useEtiquetasPerfil();
  const crearRevisionMutation = useCrearRevision();
  const asignarEtiquetaMutation = useAsignarEtiqueta();
  const removerEtiquetaMutation = useRemoverEtiqueta();

  const [estadoRevision, setEstadoRevision] = useState<'aprobada' | 'observada' | 'pendiente'>('aprobada');
  const [observaciones, setObservaciones] = useState('');

  const etiquetasAsignadas = hdv?.etiquetas ?? [];
  const etiquetasDisponibles = todasEtiquetas.filter(
    e => !etiquetasAsignadas.some(ea => ea.id_etiqueta === e.id_etiqueta)
  );

  const handleRevision = () => {
    if (!hdv || !usuarioActual) return;
    crearRevisionMutation.mutate(
      {
        idHojaDeVida: hdv.id_hoja_de_vida,
        idRevisor: usuarioActual.idUsuario,
        rolRevisor: rolActual ?? 'lider',
        estadoRevision,
        observaciones: observaciones.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Revisión guardada exitosamente');
          setObservaciones('');
        },
        onError: (e: any) => toast.error(`Error: ${e.message}`),
      }
    );
  };

  const handleAsignarEtiqueta = (idEtiqueta: number) => {
    if (!hdv || !usuarioActual) return;
    asignarEtiquetaMutation.mutate(
      { idHojaDeVida: hdv.id_hoja_de_vida, idEtiqueta, asignadaPor: usuarioActual.idUsuario },
      {
        onSuccess: () => toast.success('Etiqueta asignada'),
        onError: (e: any) => toast.error(`Error: ${e.message}`),
      }
    );
  };

  const handleRemoverEtiqueta = (idEtiqueta: number) => {
    if (!hdv) return;
    removerEtiquetaMutation.mutate(
      { idHojaDeVida: hdv.id_hoja_de_vida, idEtiqueta },
      { onError: (e: any) => toast.error(`Error: ${e.message}`) }
    );
  };

  const ultimaRevision = hdv?.ultima_revision;
  const UltimaRevisionIcon = ultimaRevision
    ? revisionIcons[ultimaRevision.estado_revision as keyof typeof revisionIcons] ?? Clock
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card/95 backdrop-blur-2xl border-border/50">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-xl font-bold tracking-tight">
              Perfil Profesional — {nombreUsuario}
            </DialogTitle>
            {ultimaRevision && UltimaRevisionIcon && (
              <Badge className={`text-[10px] flex items-center gap-1 ${revisionColors[ultimaRevision.estado_revision as keyof typeof revisionColors] ?? ''}`}>
                <UltimaRevisionIcon className="w-3 h-3" />
                {ultimaRevision.estado_revision}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="perfil" className="mt-4">
          <TabsList className="rounded-xl bg-accent/40">
            <TabsTrigger value="perfil" className="rounded-lg text-xs">Perfil</TabsTrigger>
            {puedeRevisar && (
              <>
                <TabsTrigger value="revision" className="rounded-lg text-xs">Revisión</TabsTrigger>
                <TabsTrigger value="etiquetas" className="rounded-lg text-xs">Etiquetas</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="perfil" className="mt-4">
            <HojaDeVidaView hoja={hdv as any} loading={isLoading} puedeEditar={false} />
          </TabsContent>

          {puedeRevisar && (
            <TabsContent value="revision" className="mt-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                Registra tu revisión del perfil de {nombreUsuario}.
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Estado
                </label>
                <Select value={estadoRevision} onValueChange={v => setEstadoRevision(v as any)}>
                  <SelectTrigger className="h-10 bg-background/50 border-white/10 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aprobada">Aprobada</SelectItem>
                    <SelectItem value="observada">Observada (hay correcciones)</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Observaciones
                </label>
                <Textarea
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Escribe tus comentarios o correcciones..."
                  className="min-h-[100px] bg-background/50 border-white/10 rounded-xl text-sm resize-none"
                />
              </div>
              {ultimaRevision && (
                <div className="p-3 rounded-xl bg-accent/40 text-xs text-muted-foreground">
                  Última revisión:{' '}
                  <strong>{ultimaRevision.estado_revision}</strong>{' '}
                  el {new Date(ultimaRevision.revisado_en).toLocaleDateString('es-CO')}
                </div>
              )}
              <Button
                className="rounded-xl"
                onClick={handleRevision}
                disabled={crearRevisionMutation.isPending}
              >
                {crearRevisionMutation.isPending ? 'Guardando...' : 'Guardar Revisión'}
              </Button>
            </TabsContent>
          )}

          {puedeRevisar && (
            <TabsContent value="etiquetas" className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Etiquetas asignadas
                </p>
                <div className="flex flex-wrap gap-2">
                  {etiquetasAsignadas.length === 0 && (
                    <span className="text-xs text-muted-foreground">Sin etiquetas</span>
                  )}
                  {etiquetasAsignadas.map(e => (
                    <Badge
                      key={e.id_etiqueta}
                      variant="secondary"
                      className="text-xs gap-1 pr-1 cursor-pointer"
                    >
                      {e.nombre}
                      <button
                        className="hover:text-red-500 transition-colors"
                        onClick={() => handleRemoverEtiqueta(e.id_etiqueta)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Agregar etiqueta
                </p>
                <div className="flex flex-wrap gap-2">
                  {etiquetasDisponibles.map(e => (
                    <button
                      key={e.id_etiqueta}
                      onClick={() => handleAsignarEtiqueta(e.id_etiqueta)}
                      className="px-2.5 py-1 rounded-full text-xs border border-border/40 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {e.nombre}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
