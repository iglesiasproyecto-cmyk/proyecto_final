import React, { useState, useMemo } from "react";
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
import { ClipboardCheck, Plus, Calendar, Filter, TrendingUp, BookOpen, Trash2, Edit3, GraduationCap } from "lucide-react";

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

interface EvalForm {
  idUsuario: string;
  idCurso: string;
  idModulo: string;
  calificacion: string;
  estado: "pendiente" | "aprobado" | "reprobado" | "en_revision";
  observaciones: string;
  fechaEvaluacion: string;
}

const emptyForm: EvalForm = {
  idUsuario: "",
  idCurso: "",
  idModulo: "",
  calificacion: "",
  estado: "pendiente",
  observaciones: "",
  fechaEvaluacion: new Date().toISOString().split("T")[0],
};

export function EvaluationsPage() {
  const {
    evaluaciones, cursos, miembrosMinisterio, ministerios, user,
    addEvaluacion, updateEvaluacion, deleteEvaluacion,
    procesosAsignadoCurso, detallesProcesoCurso,
  } = useApp();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EvalForm>(emptyForm);
  const [memberFilter, setMemberFilter] = useState("all");
  const [cursoFilter, setCursoFilter] = useState("all");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (!user) return null;
  const role = user.rol;
  const canCreateEval = role === "lider";
  const isViewOwn = role === "servidor";

  let baseEvals = evaluaciones;
  if (canCreateEval && user.idMinisterio) {
    baseEvals = evaluaciones.filter((ev) => ev.idMinisterio === user.idMinisterio);
  } else if (isViewOwn) {
    baseEvals = evaluaciones.filter((ev) => ev.idUsuario === user.idUsuario);
  } else {
    baseEvals = [];
  }

  const uniqueCursos = [...new Set(baseEvals.map((e) => e.nombreCurso).filter(Boolean))] as string[];
  const uniqueMembers = [...new Set(baseEvals.map((e) => e.idUsuario))].map((id) => {
    const ev = baseEvals.find((e) => e.idUsuario === id);
    return { id, nombre: ev?.nombreUsuario || "" };
  });

  const filtered = baseEvals.filter((ev) => {
    const matchMember = memberFilter === "all" || ev.idUsuario === memberFilter;
    const matchCurso = cursoFilter === "all" || ev.nombreCurso === cursoFilter;
    return matchMember && matchCurso;
  });

  const memberEvals = selectedMember ? baseEvals.filter((ev) => ev.idUsuario === selectedMember) : [];
  const memberName = selectedMember ? (baseEvals.find((ev) => ev.idUsuario === selectedMember)?.nombreUsuario || "") : "";

  const min = ministerios.find((m) => m.idMinisterio === user.idMinisterio);
  const minMembers = miembrosMinisterio.filter((mm) => mm.idMinisterio === user.idMinisterio && mm.activo);
  const minCursos = cursos.filter((c) => c.idMinisterio === user.idMinisterio);

  // Ciclos lectivos connection: get active ciclos for user's iglesia
  const activeCiclos = useMemo(() => {
    return procesosAsignadoCurso.filter(
      (p) => p.idIglesia === user.idIglesiaActiva && (p.estado === "en_curso" || p.estado === "programado")
    );
  }, [procesosAsignadoCurso, user.idIglesiaActiva]);

  // Filter modules based on selected course
  const availableModulos = useMemo(() => {
    if (!form.idCurso) return [];
    const curso = minCursos.find((c) => c.idCurso === form.idCurso);
    return curso?.modulos || [];
  }, [form.idCurso, minCursos]);

  // Get enrolled users for selected curso (from ciclos lectivos)
  const enrolledUsersForCurso = useMemo(() => {
    if (!form.idCurso) return minMembers.filter((mm) => mm.rolEnMinisterio !== "lider");
    const ciclos = procesosAsignadoCurso.filter((p) => p.idCurso === form.idCurso && p.idIglesia === user.idIglesiaActiva);
    const enrolledUserIds = new Set(
      detallesProcesoCurso
        .filter((d) => ciclos.some((c) => c.idProcesoAsignadoCurso === d.idProcesoAsignadoCurso) && d.estado !== "retirado")
        .map((d) => d.idUsuario)
    );
    if (enrolledUserIds.size === 0) return minMembers.filter((mm) => mm.rolEnMinisterio !== "lider");
    return minMembers.filter((mm) => mm.rolEnMinisterio !== "lider" && enrolledUserIds.has(mm.idUsuario));
  }, [form.idCurso, minMembers, procesosAsignadoCurso, detallesProcesoCurso, user.idIglesiaActiva]);

  const renderCalificacion = (cal: number | null) => {
    if (cal === null) return <span className="text-muted-foreground text-sm">—</span>;
    const color = cal >= 80 ? "text-green-600" : cal >= 60 ? "text-amber-600" : "text-red-600";
    return <span className={`text-lg ${color}`}>{cal.toFixed(1)}</span>;
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowCreate(true);
  };

  const openEdit = (evalId: string) => {
    const ev = evaluaciones.find((e) => e.idEvaluacion === evalId);
    if (!ev) return;
    setForm({
      idUsuario: ev.idUsuario,
      idCurso: cursos.find((c) => c.modulos?.some((m) => m.idModulo === ev.idModulo))?.idCurso || "",
      idModulo: ev.idModulo,
      calificacion: ev.calificacion !== null ? String(ev.calificacion) : "",
      estado: ev.estado,
      observaciones: ev.observaciones || "",
      fechaEvaluacion: ev.fechaEvaluacion || "",
    });
    setEditingId(evalId);
    setShowCreate(true);
  };

  const handleSubmit = () => {
    const curso = minCursos.find((c) => c.idCurso === form.idCurso);
    const modulo = curso?.modulos?.find((m) => m.idModulo === form.idModulo);
    const member = minMembers.find((mm) => mm.idUsuario === form.idUsuario);
    const cal = form.calificacion ? parseFloat(form.calificacion) : null;

    const evalData = {
      idModulo: form.idModulo,
      idUsuario: form.idUsuario,
      calificacion: cal,
      estado: form.estado,
      observaciones: form.observaciones || null,
      fechaEvaluacion: form.fechaEvaluacion || null,
      nombreUsuario: member?.nombreCompleto || "",
      tituloModulo: modulo?.titulo || "",
      nombreCurso: curso?.nombre || "",
      idMinisterio: user.idMinisterio || "",
    };

    if (editingId) {
      updateEvaluacion(editingId, evalData);
    } else {
      addEvaluacion(evalData);
    }
    setShowCreate(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteEvaluacion(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const isFormValid = form.idUsuario && form.idCurso && form.idModulo;

  // Servidor: own evaluations
  if (isViewOwn) {
    const myEvals = baseEvals;
    const avgCal = myEvals.filter((e) => e.calificacion !== null).length > 0
      ? myEvals.filter((e) => e.calificacion !== null).reduce((sum, e) => sum + (e.calificacion || 0), 0) / myEvals.filter((e) => e.calificacion !== null).length
      : 0;

    // Ciclos in which this user is enrolled
    const myCiclos = detallesProcesoCurso.filter((d) => d.idUsuario === user.idUsuario);
    const myCicloIds = myCiclos.map((d) => d.idProcesoAsignadoCurso);
    const myProcesos = procesosAsignadoCurso.filter((p) => myCicloIds.includes(p.idProcesoAsignadoCurso));

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="flex items-center gap-3"><ClipboardCheck className="w-6 h-6 text-primary" /> Mis Evaluaciones</h1>
          <p className="text-muted-foreground text-sm mt-1">Historial de evaluaciones de modulos de formacion</p>
        </div>

        {/* Ciclos lectivos del usuario */}
        {myProcesos.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-primary" /> Mis Ciclos Lectivos
            </h3>
            <div className="flex flex-wrap gap-2">
              {myProcesos.map((p) => {
                const curso = cursos.find((c) => c.idCurso === p.idCurso);
                const detalle = myCiclos.find((d) => d.idProcesoAsignadoCurso === p.idProcesoAsignadoCurso);
                return (
                  <Badge key={p.idProcesoAsignadoCurso} variant="outline" className="py-1.5 px-3 text-xs">
                    {curso?.nombre || "Curso"} — {p.estado}
                    {detalle && <span className="ml-1.5 text-muted-foreground">({detalle.estado})</span>}
                  </Badge>
                );
              })}
            </div>
          </Card>
        )}

        {myEvals.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardCheck className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-muted-foreground mb-2">Sin evaluaciones</h3>
            <p className="text-sm text-muted-foreground">Aun no tienes evaluaciones registradas.</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card className="p-4 bg-primary/5">
                <p className="text-xs text-muted-foreground mb-1">Promedio General</p>
                {renderCalificacion(avgCal)}
                <p className="text-xs text-muted-foreground mt-1">{myEvals.length} evaluacion(es)</p>
              </Card>
              {uniqueCursos.map((c) => {
                const cursoEvals = myEvals.filter((e) => e.nombreCurso === c && e.calificacion !== null);
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
            <Card className="p-5">
              <h3 className="mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Historial</h3>
              <div className="space-y-3">
                {[...myEvals].sort((a, b) => new Date(b.fechaEvaluacion || b.creadoEn).getTime() - new Date(a.fechaEvaluacion || a.creadoEn).getTime()).map((ev) => (
                  <div key={ev.idEvaluacion} className="flex gap-4 p-4 rounded-lg bg-accent/30">
                    <div className="text-center shrink-0 w-16">
                      <p className="text-xs text-muted-foreground">{new Date(ev.fechaEvaluacion || ev.creadoEn).toLocaleDateString("es", { month: "short" })}</p>
                      <p className="text-lg">{new Date(ev.fechaEvaluacion || ev.creadoEn).getDate()}</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">{ev.nombreCurso}</Badge>
                          <span className="text-xs text-muted-foreground">{ev.tituloModulo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {renderCalificacion(ev.calificacion)}
                          <Badge variant="outline" className={`${estadoEvalColors[ev.estado]} border-0 text-xs`}>{estadoEvalLabels[ev.estado]}</Badge>
                        </div>
                      </div>
                      {ev.observaciones && <p className="text-sm text-muted-foreground mt-2">{ev.observaciones}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    );
  }

  // Leader: member history view
  if (selectedMember) {
    // Member's ciclos
    const memberCiclos = detallesProcesoCurso.filter((d) => d.idUsuario === selectedMember);
    const memberProcesos = procesosAsignadoCurso.filter((p) => memberCiclos.some((d) => d.idProcesoAsignadoCurso === p.idProcesoAsignadoCurso));

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <button onClick={() => setSelectedMember(null)} className="text-primary hover:underline text-sm">&larr; Volver a evaluaciones</button>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl">{memberName.charAt(0)}</div>
          <div><h1>{memberName}</h1><p className="text-muted-foreground text-sm">Historial de evaluaciones</p></div>
        </div>

        {/* Member's ciclos lectivos */}
        {memberProcesos.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-primary" /> Ciclos Lectivos Inscritos
            </h3>
            <div className="flex flex-wrap gap-2">
              {memberProcesos.map((p) => {
                const curso = cursos.find((c) => c.idCurso === p.idCurso);
                const detalle = memberCiclos.find((d) => d.idProcesoAsignadoCurso === p.idProcesoAsignadoCurso);
                return (
                  <Badge key={p.idProcesoAsignadoCurso} variant="outline" className="py-1.5 px-3 text-xs">
                    {curso?.nombre || "Curso"} ({p.fechaInicio} a {p.fechaFin})
                    <span className="ml-1.5">&mdash; {detalle?.estado || p.estado}</span>
                  </Badge>
                );
              })}
            </div>
          </Card>
        )}

        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Evolucion</h3>
          <div className="space-y-3">
            {[...memberEvals].sort((a, b) => new Date(b.fechaEvaluacion || b.creadoEn).getTime() - new Date(a.fechaEvaluacion || a.creadoEn).getTime()).map((ev) => (
              <div key={ev.idEvaluacion} className="flex gap-4 p-3 rounded-lg bg-accent/30 group">
                <div className="text-center shrink-0 w-16">
                  <p className="text-xs text-muted-foreground">{new Date(ev.fechaEvaluacion || ev.creadoEn).toLocaleDateString("es", { month: "short" })}</p>
                  <p className="text-lg">{new Date(ev.fechaEvaluacion || ev.creadoEn).getDate()}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{ev.nombreCurso}</Badge>
                      <span className="text-xs text-muted-foreground">{ev.tituloModulo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderCalificacion(ev.calificacion)}
                      <Badge variant="outline" className={`${estadoEvalColors[ev.estado]} border-0 text-xs`}>{estadoEvalLabels[ev.estado]}</Badge>
                      {canCreateEval && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(ev.idEvaluacion)} className="p-1 rounded hover:bg-accent" title="Editar">
                            <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => setDeleteTarget(ev.idEvaluacion)} className="p-1 rounded hover:bg-red-50" title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {ev.observaciones && <p className="text-sm text-muted-foreground mt-1">{ev.observaciones}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>

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
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create/Edit Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editingId ? "Editar Evaluacion" : "Nueva Evaluacion"}</DialogTitle></DialogHeader>
            <EvalFormContent
              form={form}
              setForm={setForm}
              enrolledUsers={enrolledUsersForCurso}
              minCursos={minCursos}
              availableModulos={availableModulos}
              activeCiclos={activeCiclos}
              cursos={cursos}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditingId(null); }}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={!isFormValid}>{editingId ? "Guardar Cambios" : "Registrar Evaluacion"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Leader: full evaluations management
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Evaluaciones — {min?.nombre || "Ministerio"}</h1>
          <p className="text-muted-foreground text-sm">Registra y consulta evaluaciones de modulos de formacion</p>
        </div>
        {canCreateEval && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Nueva Evaluacion</Button>}
      </div>

      {/* Active ciclos lectivos */}
      {activeCiclos.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-primary" /> Ciclos Lectivos Activos
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeCiclos.map((p) => {
              const curso = cursos.find((c) => c.idCurso === p.idCurso);
              const inscritos = detallesProcesoCurso.filter((d) => d.idProcesoAsignadoCurso === p.idProcesoAsignadoCurso && d.estado !== "retirado").length;
              return (
                <Badge key={p.idProcesoAsignadoCurso} variant="secondary" className="py-1.5 px-3 text-xs">
                  {curso?.nombre || "Curso"} &middot; {p.estado} &middot; {inscritos} inscritos
                </Badge>
              );
            })}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-card">
            <option value="all">Todos los miembros</option>
            {uniqueMembers.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
        <select value={cursoFilter} onChange={(e) => setCursoFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-card">
          <option value="all">Todos los cursos</option>
          {uniqueCursos.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((ev) => (
          <Card key={ev.idEvaluacion} className="p-4 hover:shadow-md transition-shadow group">
            <div className="flex gap-4">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 cursor-pointer" onClick={() => setSelectedMember(ev.idUsuario)}>
                {(ev.nombreUsuario || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <button onClick={() => setSelectedMember(ev.idUsuario)} className="text-sm text-primary hover:underline cursor-pointer">{ev.nombreUsuario}</button>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="secondary" className="text-xs flex items-center gap-1"><BookOpen className="w-3 h-3" /> {ev.nombreCurso}</Badge>
                      <span className="text-xs text-muted-foreground">{ev.tituloModulo}</span>
                      {ev.fechaEvaluacion && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {ev.fechaEvaluacion}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {renderCalificacion(ev.calificacion)}
                    <Badge variant="outline" className={`${estadoEvalColors[ev.estado]} border-0 text-xs`}>{estadoEvalLabels[ev.estado]}</Badge>
                    {canCreateEval && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(ev.idEvaluacion)} className="p-1 rounded hover:bg-accent" title="Editar">
                          <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => setDeleteTarget(ev.idEvaluacion)} className="p-1 rounded hover:bg-red-50" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {ev.observaciones && <p className="text-sm text-muted-foreground mt-2">{ev.observaciones}</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="p-12 text-center"><ClipboardCheck className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" /><p className="text-muted-foreground">No se encontraron evaluaciones</p></Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Editar Evaluacion" : "Nueva Evaluacion"}</DialogTitle></DialogHeader>
          <EvalFormContent
            form={form}
            setForm={setForm}
            enrolledUsers={enrolledUsersForCurso}
            minCursos={minCursos}
            availableModulos={availableModulos}
            activeCiclos={activeCiclos}
            cursos={cursos}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditingId(null); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!isFormValid}>{editingId ? "Guardar Cambios" : "Registrar Evaluacion"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Shared form content for create/edit eval dialog */
function EvalFormContent({
  form,
  setForm,
  enrolledUsers,
  minCursos,
  availableModulos,
  activeCiclos,
  cursos,
}: {
  form: EvalForm;
  setForm: React.Dispatch<React.SetStateAction<EvalForm>>;
  enrolledUsers: any[];
  minCursos: any[];
  availableModulos: any[];
  activeCiclos: any[];
  cursos: any[];
}) {
  return (
    <div className="space-y-3">
      {/* Active ciclos indicator */}
      {activeCiclos.length > 0 && (
        <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-primary" />
            {activeCiclos.length} ciclo(s) lectivo(s) activo(s) — Los miembros inscritos se filtran automaticamente.
          </p>
        </div>
      )}

      <div>
        <label className="text-sm">Curso</label>
        <select
          value={form.idCurso}
          onChange={(e) => setForm((p) => ({ ...p, idCurso: e.target.value, idModulo: "", idUsuario: "" }))}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1"
        >
          <option value="">— Seleccionar curso —</option>
          {minCursos.map((c) => {
            const hasCiclo = activeCiclos.some((ac) => ac.idCurso === c.idCurso);
            return (
              <option key={c.idCurso} value={c.idCurso}>
                {c.nombre}{hasCiclo ? " (ciclo activo)" : ""}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className="text-sm">Modulo</label>
        <select
          value={form.idModulo}
          onChange={(e) => setForm((p) => ({ ...p, idModulo: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1"
          disabled={!form.idCurso}
        >
          <option value="">— Seleccionar modulo —</option>
          {availableModulos.map((m) => <option key={m.idModulo} value={m.idModulo}>{m.titulo}</option>)}
        </select>
      </div>

      <div>
        <label className="text-sm">Miembro a evaluar</label>
        <select
          value={form.idUsuario}
          onChange={(e) => setForm((p) => ({ ...p, idUsuario: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1"
          disabled={!form.idCurso}
        >
          <option value="">— Seleccionar miembro —</option>
          {enrolledUsers.map((mm) => <option key={mm.idMiembroMinisterio} value={mm.idUsuario}>{mm.nombreCompleto}</option>)}
        </select>
      </div>

      <div>
        <label className="text-sm">Calificacion (0-100)</label>
        <Input
          type="number"
          min="0"
          max="100"
          step="0.5"
          placeholder="85.00"
          className="mt-1"
          value={form.calificacion}
          onChange={(e) => setForm((p) => ({ ...p, calificacion: e.target.value }))}
        />
      </div>

      <div>
        <label className="text-sm">Estado</label>
        <select
          value={form.estado}
          onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value as EvalForm["estado"] }))}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1"
        >
          <option value="pendiente">Pendiente</option>
          <option value="aprobado">Aprobado</option>
          <option value="reprobado">Reprobado</option>
          <option value="en_revision">En Revision</option>
        </select>
      </div>

      <div>
        <label className="text-sm">Observaciones</label>
        <textarea
          placeholder="Retroalimentacion del evaluador..."
          className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1 min-h-[80px] resize-y"
          value={form.observaciones}
          onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
        />
      </div>

      <div>
        <label className="text-sm">Fecha de Evaluacion</label>
        <Input
          type="date"
          className="mt-1"
          value={form.fechaEvaluacion}
          onChange={(e) => setForm((p) => ({ ...p, fechaEvaluacion: e.target.value }))}
        />
      </div>
    </div>
  );
}
