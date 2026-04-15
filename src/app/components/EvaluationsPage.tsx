import { useState } from "react";
import { useEvaluacionesEnriquecidas, useDeleteEvaluacion, useCreateEvaluacion, useUpdateEvaluacion, useCursos } from "@/hooks/useCursos";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { ClipboardCheck, Plus, Filter, TrendingUp, Trash2, Pencil } from "lucide-react";

const estadoEvalColors: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  aprobado: "bg-green-100 text-green-700",
  reprobado: "bg-red-100 text-red-700",
  en_revision: "bg-blue-100 text-blue-700",
};
const estadoEvalLabels: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  reprobado: "Reprobado",
  en_revision: "En Revisión",
};

export function EvaluationsPage() {
  const { usuarioActual } = useApp();
  const { data: evaluaciones = [], isLoading } = useEvaluacionesEnriquecidas();
  const { data: cursos = [] } = useCursos();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [cursoFilter, setCursoFilter] = useState("all");
  const [editTarget, setEditTarget] = useState<{ id: number; calificacion: string; estado: string; observaciones: string } | null>(null);
  const [createForm, setCreateForm] = useState({ idModulo: 0, calificacion: "", estado: "pendiente" as string, observaciones: "", fechaEvaluacion: "" });
  const resetCreateForm = () => setCreateForm({ idModulo: 0, calificacion: "", estado: "pendiente", observaciones: "", fechaEvaluacion: "" });

  const deleteEvaluacionMutation = useDeleteEvaluacion();
  const createEvaluacionMutation = useCreateEvaluacion();
  const updateEvaluacionMutation = useUpdateEvaluacion();

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  const uniqueCursos = [...new Set(evaluaciones.map((e) => e.cursoNombre).filter(Boolean))] as string[];

  const filtered = evaluaciones.filter((ev) => {
    const matchCurso = cursoFilter === "all" || ev.cursoNombre === cursoFilter;
    return matchCurso;
  });

  const avgCal = evaluaciones.filter((e) => e.calificacion !== null).length > 0
    ? evaluaciones.filter((e) => e.calificacion !== null).reduce((sum, e) => sum + (e.calificacion || 0), 0) / evaluaciones.filter((e) => e.calificacion !== null).length
    : 0;

  const renderCalificacion = (cal: number | null) => {
    if (cal === null) return <span className="text-muted-foreground text-sm">—</span>;
    const color = cal >= 80 ? "text-green-600" : cal >= 60 ? "text-amber-600" : "text-red-600";
    return <span className={`text-lg ${color}`}>{cal.toFixed(1)}</span>;
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteEvaluacionMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleCreate = () => {
    if (!createForm.idModulo || !usuarioActual) return;
    createEvaluacionMutation.mutate(
      {
        idModulo: createForm.idModulo,
        idUsuario: usuarioActual.idUsuario,
        calificacion: createForm.calificacion ? Number(createForm.calificacion) : null,
        estado: createForm.estado as any,
        observaciones: createForm.observaciones.trim() || null,
        fechaEvaluacion: createForm.fechaEvaluacion || null,
      },
      { onSuccess: () => { setShowCreate(false); resetCreateForm(); } }
    );
  };

  const handleUpdate = () => {
    if (!editTarget) return;
    updateEvaluacionMutation.mutate(
      {
        id: editTarget.id,
        data: {
          calificacion: editTarget.calificacion ? Number(editTarget.calificacion) : null,
          estado: editTarget.estado as any,
          observaciones: editTarget.observaciones.trim() || null,
        },
      },
      { onSuccess: () => setEditTarget(null) }
    );
  };

  // Build module options from cursos
  const moduleOptions = cursos.flatMap(c =>
    (c.modulos || []).map(m => ({ idModulo: m.idModulo, label: `${c.nombre} — ${m.titulo}` }))
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3"><ClipboardCheck className="w-6 h-6 text-primary" /> Mis Evaluaciones</h1>
          <p className="text-muted-foreground text-sm mt-1">Historial de evaluaciones de modulos de formacion</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Nueva Evaluacion</Button>
      </div>

      {evaluaciones.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="p-4 bg-primary/5">
            <p className="text-xs text-muted-foreground mb-1">Promedio General</p>
            {renderCalificacion(avgCal)}
            <p className="text-xs text-muted-foreground mt-1">{evaluaciones.length} evaluacion(es)</p>
          </Card>
          {uniqueCursos.map((c) => {
            const cursoEvals = evaluaciones.filter((e) => e.cursoNombre === c && e.calificacion !== null);
            const avg = cursoEvals.length > 0 ? cursoEvals.reduce((sum, e) => sum + (e.calificacion || 0), 0) / cursoEvals.length : 0;
            return (
              <Card key={c} className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{c}</p>
                {renderCalificacion(avg)}
                <p className="text-xs text-muted-foreground mt-1">{cursoEvals.length} evaluacion(es)</p>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select value={cursoFilter} onChange={(e) => setCursoFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-card">
            <option value="all">Todos los cursos</option>
            {uniqueCursos.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardCheck className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-muted-foreground mb-2">Sin evaluaciones</h3>
          <p className="text-sm text-muted-foreground">Aun no tienes evaluaciones registradas.</p>
        </Card>
      ) : (
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Historial</h3>
          <div className="space-y-3">
            {[...filtered].sort((a, b) => new Date(b.fechaEvaluacion || b.creadoEn).getTime() - new Date(a.fechaEvaluacion || a.creadoEn).getTime()).map((ev) => (
              <div key={ev.idEvaluacion} className="flex gap-4 p-4 rounded-lg bg-accent/30 group">
                <div className="text-center shrink-0 w-16">
                  <p className="text-xs text-muted-foreground">{new Date(ev.fechaEvaluacion || ev.creadoEn).toLocaleDateString("es", { month: "short" })}</p>
                  <p className="text-lg">{new Date(ev.fechaEvaluacion || ev.creadoEn).getDate()}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{ev.cursoNombre}</Badge>
                      <span className="text-xs text-muted-foreground">{ev.moduloNombre}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderCalificacion(ev.calificacion)}
                      <Badge variant="outline" className={`${estadoEvalColors[ev.estado]} border-0 text-xs`}>{estadoEvalLabels[ev.estado]}</Badge>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditTarget({ id: ev.idEvaluacion, calificacion: ev.calificacion?.toString() ?? "", estado: ev.estado, observaciones: ev.observaciones ?? "" })} className="p-1 rounded hover:bg-blue-50" title="Editar">
                          <Pencil className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                        <button onClick={() => setDeleteTarget(ev.idEvaluacion)} className="p-1 rounded hover:bg-red-50" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {ev.observaciones && <p className="text-sm text-muted-foreground mt-2">{ev.observaciones}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar evaluacion</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente esta evaluacion del registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteEvaluacionMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={o => { if (!o) { setShowCreate(false); resetCreateForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nueva Evaluación</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Módulo *</label>
              <select className="w-full h-10 rounded-md border border-input bg-input-background px-3 text-sm" value={createForm.idModulo} onChange={e => setCreateForm(p => ({ ...p, idModulo: Number(e.target.value) }))}>
                <option value={0}>Seleccionar módulo...</option>
                {moduleOptions.map(mo => <option key={mo.idModulo} value={mo.idModulo}>{mo.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm text-muted-foreground mb-1 block">Calificación (0-100)</label><Input type="number" min="0" max="100" step="0.5" value={createForm.calificacion} onChange={e => setCreateForm(p => ({ ...p, calificacion: e.target.value }))} placeholder="85.00" className="bg-input-background" /></div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Estado</label>
                <select className="w-full h-10 rounded-md border border-input bg-input-background px-3 text-sm" value={createForm.estado} onChange={e => setCreateForm(p => ({ ...p, estado: e.target.value }))}>
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="reprobado">Reprobado</option>
                  <option value="en_revision">En Revisión</option>
                </select>
              </div>
            </div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Observaciones</label><textarea value={createForm.observaciones} onChange={e => setCreateForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Retroalimentación..." className="w-full border rounded-lg px-3 py-2 text-sm bg-input-background min-h-[80px] resize-y" /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Fecha</label><Input type="date" value={createForm.fechaEvaluacion} onChange={e => setCreateForm(p => ({ ...p, fechaEvaluacion: e.target.value }))} className="bg-input-background" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createEvaluacionMutation.isPending || !createForm.idModulo}>
              {createEvaluacionMutation.isPending ? "Registrando..." : "Registrar Evaluación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={o => { if (!o) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Evaluación</DialogTitle></DialogHeader>
          {editTarget && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm text-muted-foreground mb-1 block">Calificación</label><Input type="number" min="0" max="100" step="0.5" value={editTarget.calificacion} onChange={e => setEditTarget(p => p ? { ...p, calificacion: e.target.value } : p)} className="bg-input-background" /></div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Estado</label>
                  <select className="w-full h-10 rounded-md border border-input bg-input-background px-3 text-sm" value={editTarget.estado} onChange={e => setEditTarget(p => p ? { ...p, estado: e.target.value } : p)}>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="reprobado">Reprobado</option>
                    <option value="en_revision">En Revisión</option>
                  </select>
                </div>
              </div>
              <div><label className="text-sm text-muted-foreground mb-1 block">Observaciones</label><textarea value={editTarget.observaciones} onChange={e => setEditTarget(p => p ? { ...p, observaciones: e.target.value } : p)} className="w-full border rounded-lg px-3 py-2 text-sm bg-input-background min-h-[80px] resize-y" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateEvaluacionMutation.isPending}>
              {updateEvaluacionMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
