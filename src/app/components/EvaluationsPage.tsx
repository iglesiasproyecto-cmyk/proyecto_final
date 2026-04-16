import { useState } from "react";
import { useEvaluacionesEnriquecidas, useDeleteEvaluacion } from "@/hooks/useCursos";
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
import { ClipboardCheck, Plus, Filter, TrendingUp, Trash2 } from "lucide-react";

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
  const { data: evaluaciones = [], isLoading } = useEvaluacionesEnriquecidas();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [cursoFilter, setCursoFilter] = useState("all");

  const deleteEvaluacionMutation = useDeleteEvaluacion();

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
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nueva Evaluacion</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm">Calificacion (0-100)</label><Input type="number" min="0" max="100" step="0.5" placeholder="85.00" className="mt-1" /></div>
            <div>
              <label className="text-sm">Estado</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1">
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="reprobado">Reprobado</option>
                <option value="en_revision">En Revision</option>
              </select>
            </div>
            <div><label className="text-sm">Observaciones</label><textarea placeholder="Retroalimentacion..." className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1 min-h-[80px] resize-y" /></div>
            <div><label className="text-sm">Fecha de Evaluacion</label><Input type="date" className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => setShowCreate(false)}>Registrar Evaluacion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
