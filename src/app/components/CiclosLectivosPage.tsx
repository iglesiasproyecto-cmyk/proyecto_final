import { useState } from "react";
import { useProcesosAsignadoCurso, useCursos, useDetallesProcesoCurso } from "@/hooks/useCursos";
import type { ProcesoAsignadoCurso } from "@/types/app.types";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { Progress } from "./ui/progress";
import {
  GraduationCap, Plus, Calendar, Filter, Users, ArrowLeft, BookOpen, Trash2, ChevronRight,
} from "lucide-react";

const estadoCicloColors: Record<string, string> = {
  programado: "bg-blue-100 text-blue-700",
  en_curso: "bg-green-100 text-green-700",
  finalizado: "bg-gray-100 text-gray-700",
  cancelado: "bg-red-100 text-red-700",
};
const estadoCicloLabels: Record<string, string> = {
  programado: "Programado",
  en_curso: "En Curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const estadoInscripcionColors: Record<string, string> = {
  inscrito: "bg-blue-100 text-blue-700",
  en_progreso: "bg-amber-100 text-amber-700",
  completado: "bg-green-100 text-green-700",
  retirado: "bg-red-100 text-red-700",
};
const estadoInscripcionLabels: Record<string, string> = {
  inscrito: "Inscrito",
  en_progreso: "En Progreso",
  completado: "Completado",
  retirado: "Retirado",
};

function CicloDetail({ ciclo, onBack }: { ciclo: ProcesoAsignadoCurso; onBack: () => void }) {
  const { data: detalles = [] } = useDetallesProcesoCurso(ciclo.idProcesoAsignadoCurso);
  const { data: cursos = [] } = useCursos();
  const selectedCurso = cursos.find((c) => c.idCurso === ciclo.idCurso);

  const completados = detalles.filter((d) => d.estado === "completado").length;
  const progressPct = detalles.length > 0 ? Math.round((completados / detalles.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-primary hover:underline text-sm"><ArrowLeft className="w-4 h-4" /> Volver a ciclos</button>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1>{selectedCurso?.nombre || "Curso"}</h1>
          <p className="text-muted-foreground text-sm">{ciclo.fechaInicio} — {ciclo.fechaFin}</p>
        </div>
        <Badge className={`${estadoCicloColors[ciclo.estado]} border-0 text-xs px-3 py-1.5`}>{estadoCicloLabels[ciclo.estado]}</Badge>
      </div>

      {detalles.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progreso: {completados}/{detalles.length} completados</span>
            <span className="text-sm text-primary">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Participantes ({detalles.length})</h3>
        </div>
        <div className="space-y-2">
          {detalles.map((d) => (
            <div key={d.idDetalleProcesoCurso} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs shrink-0">{(d.nombreCompleto || "?").charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{d.nombreCompleto || `Usuario ${d.idUsuario}`}</p>
                <p className="text-xs text-muted-foreground">{d.correo}</p>
              </div>
              <Badge variant="outline" className={`${estadoInscripcionColors[d.estado]} border-0 text-xs`}>{estadoInscripcionLabels[d.estado]}</Badge>
            </div>
          ))}
          {detalles.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay participantes inscritos</p>}
        </div>
      </Card>
    </div>
  );
}

export function CiclosLectivosPage() {
  const { data: procesosAsignadoCurso = [], isLoading, error } = useProcesosAsignadoCurso();
  const { data: cursos = [] } = useCursos();
  const [selectedCicloId, setSelectedCicloId] = useState<number | null>(null);
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [cursoFilter, setCursoFilter] = useState("all");
  const [showCreateCiclo, setShowCreateCiclo] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<number | null>(null);

  // Stub mutations — Phase 3
  const deleteProcesoAsignadoCurso = (_id: number) => { /* Phase 3 */ };

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  if (error) return (
    <Card className="p-8 text-center text-destructive">
      <h3 className="mb-2">Error cargando ciclos lectivos</h3>
      <p className="text-sm text-muted-foreground">{String((error as any)?.message ?? JSON.stringify(error))}</p>
    </Card>
  );

  const selectedCiclo = selectedCicloId ? procesosAsignadoCurso.find((c) => c.idProcesoAsignadoCurso === selectedCicloId) : null;

  if (selectedCiclo) {
    return <CicloDetail ciclo={selectedCiclo} onBack={() => setSelectedCicloId(null)} />;
  }

  const uniqueCursoIds = [...new Set(procesosAsignadoCurso.map((c) => c.idCurso))];

  const ciclosFiltrados = procesosAsignadoCurso.filter((c) => {
    const matchEstado = estadoFilter === "all" || c.estado === estadoFilter;
    const matchCurso = cursoFilter === "all" || c.idCurso === Number(cursoFilter);
    return matchEstado && matchCurso;
  });

  const estadoOrder: Record<string, number> = { en_curso: 0, programado: 1, finalizado: 2, cancelado: 3 };
  const ciclosOrdenados = [...ciclosFiltrados].sort((a, b) => {
    const orderDiff = (estadoOrder[a.estado] ?? 9) - (estadoOrder[b.estado] ?? 9);
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime();
  });

  const stats = {
    total: procesosAsignadoCurso.length,
    enCurso: procesosAsignadoCurso.filter((c) => c.estado === "en_curso").length,
    programados: procesosAsignadoCurso.filter((c) => c.estado === "programado").length,
    finalizados: procesosAsignadoCurso.filter((c) => c.estado === "finalizado").length,
  };

  const getCursoNombre = (idCurso: number) => cursos.find((c) => c.idCurso === idCurso)?.nombre || "Curso desconocido";

  const handleDelete = () => {
    if (showConfirmDelete) {
      deleteProcesoAsignadoCurso(showConfirmDelete);
      setShowConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2"><GraduationCap className="w-6 h-6 text-primary" /> Ciclos Lectivos</h1>
          <p className="text-muted-foreground text-sm">Gestiona los procesos de formación académica</p>
        </div>
        <Button onClick={() => setShowCreateCiclo(true)}><Plus className="w-4 h-4 mr-2" /> Nuevo Ciclo</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center"><p className="text-2xl text-primary">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></Card>
        <Card className="p-3 text-center"><p className="text-2xl text-green-600">{stats.enCurso}</p><p className="text-xs text-muted-foreground">En Curso</p></Card>
        <Card className="p-3 text-center"><p className="text-2xl text-blue-600">{stats.programados}</p><p className="text-xs text-muted-foreground">Programados</p></Card>
        <Card className="p-3 text-center"><p className="text-2xl text-gray-600">{stats.finalizados}</p><p className="text-xs text-muted-foreground">Finalizados</p></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-card">
            <option value="all">Todos los estados</option>
            <option value="programado">Programado</option>
            <option value="en_curso">En Curso</option>
            <option value="finalizado">Finalizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <select value={cursoFilter} onChange={(e) => setCursoFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-card">
          <option value="all">Todos los cursos</option>
          {uniqueCursoIds.map((id) => <option key={id} value={id}>{getCursoNombre(id)}</option>)}
        </select>
      </div>

      {/* Ciclos list */}
      {ciclosOrdenados.length === 0 ? (
        <Card className="p-12 text-center">
          <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-muted-foreground mb-2">Sin ciclos lectivos</h3>
          <p className="text-sm text-muted-foreground">Crea un ciclo lectivo para comenzar a gestionar la formacion.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {ciclosOrdenados.map((ciclo) => (
            <Card key={ciclo.idProcesoAsignadoCurso} className="p-4 hover:shadow-md transition-shadow group cursor-pointer" onClick={() => setSelectedCicloId(ciclo.idProcesoAsignadoCurso)}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm">{getCursoNombre(ciclo.idCurso)}</h4>
                    <Badge className={`${estadoCicloColors[ciclo.estado]} border-0 text-xs`}>{estadoCicloLabels[ciclo.estado]}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {ciclo.fechaInicio} — {ciclo.fechaFin}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(ciclo.idProcesoAsignadoCurso); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateCiclo} onOpenChange={setShowCreateCiclo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo Ciclo Lectivo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Curso *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1">
                <option value="">— Seleccionar curso —</option>
                {cursos.map((c) => <option key={c.idCurso} value={c.idCurso}>{c.nombre}</option>)}
              </select>
            </div>
            <div><label className="text-sm">Fecha de Inicio *</label><Input type="date" className="mt-1" /></div>
            <div><label className="text-sm">Fecha de Fin *</label><Input type="date" className="mt-1" /></div>
            <div>
              <label className="text-sm">Estado</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1">
                <option value="programado">Programado</option>
                <option value="en_curso">En Curso</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCiclo(false)}>Cancelar</Button>
            <Button onClick={() => setShowCreateCiclo(false)}>Crear Ciclo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!showConfirmDelete} onOpenChange={(open) => !open && setShowConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Ciclo Lectivo</AlertDialogTitle>
            <AlertDialogDescription>Esta accion eliminara permanentemente este ciclo y sus inscripciones. No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
