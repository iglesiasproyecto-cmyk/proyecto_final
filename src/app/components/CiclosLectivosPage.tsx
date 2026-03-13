import React, { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";
import type { ProcesoAsignadoCurso, DetalleProcesoCurso } from "../store/AppContext";
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
  GraduationCap,
  Plus,
  Calendar,
  Filter,
  Users,
  ArrowLeft,
  BookOpen,
  UserPlus,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  PauseCircle,
  ChevronRight,
  AlertTriangle,
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
const estadoCicloIcons: Record<string, React.ReactNode> = {
  programado: <Clock className="w-3.5 h-3.5" />,
  en_curso: <PlayCircle className="w-3.5 h-3.5" />,
  finalizado: <CheckCircle2 className="w-3.5 h-3.5" />,
  cancelado: <XCircle className="w-3.5 h-3.5" />,
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

export function CiclosLectivosPage() {
  const {
    user,
    cursos,
    iglesias,
    ministerios,
    miembrosMinisterio,
    procesosAsignadoCurso,
    detallesProcesoCurso,
    addProcesoAsignadoCurso,
    updateProcesoAsignadoCurso,
    deleteProcesoAsignadoCurso,
    addDetalleProcesoCurso,
    updateDetalleProcesoCurso,
    deleteDetalleProcesoCurso,
  } = useApp();

  const [selectedCicloId, setSelectedCicloId] = useState<string | null>(null);
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [cursoFilter, setCursoFilter] = useState("all");
  const [showCreateCiclo, setShowCreateCiclo] = useState(false);
  const [showEditCiclo, setShowEditCiclo] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [showConfirmDeleteInscripcion, setShowConfirmDeleteInscripcion] = useState<string | null>(null);

  // Form states for creating/editing ciclo
  const [formCurso, setFormCurso] = useState("");
  const [formFechaInicio, setFormFechaInicio] = useState("");
  const [formFechaFin, setFormFechaFin] = useState("");
  const [formEstado, setFormEstado] = useState<ProcesoAsignadoCurso["estado"]>("programado");

  // Form state for enrollment
  const [enrollUserId, setEnrollUserId] = useState("");

  if (!user) return null;

  const role = user.rol;
  const canManage = role === "lider" || role === "admin_iglesia" || role === "super_admin";
  const isViewOwn = role === "servidor";

  const iglesiaActiva = user.idIglesiaActiva;

  // Get all ciclos for current church
  const ciclosBase = procesosAsignadoCurso.filter((p) => p.idIglesia === iglesiaActiva);

  // Unique cursos from ciclos
  const cursosUsados = [...new Set(ciclosBase.map((c) => c.idCurso))];

  // Filtered ciclos
  const ciclosFiltrados = ciclosBase.filter((c) => {
    const matchEstado = estadoFilter === "all" || c.estado === estadoFilter;
    const matchCurso = cursoFilter === "all" || c.idCurso === cursoFilter;
    return matchEstado && matchCurso;
  });

  // Sort: en_curso first, then programado, then others by date desc
  const estadoOrder: Record<string, number> = { en_curso: 0, programado: 1, finalizado: 2, cancelado: 3 };
  const ciclosOrdenados = [...ciclosFiltrados].sort((a, b) => {
    const orderDiff = (estadoOrder[a.estado] ?? 9) - (estadoOrder[b.estado] ?? 9);
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime();
  });

  // Selected ciclo detail
  const selectedCiclo = selectedCicloId ? ciclosBase.find((c) => c.idProcesoAsignadoCurso === selectedCicloId) : null;
  const selectedCurso = selectedCiclo ? cursos.find((c) => c.idCurso === selectedCiclo.idCurso) : null;
  const inscripciones = selectedCicloId ? detallesProcesoCurso.filter((d) => d.idProcesoAsignadoCurso === selectedCicloId) : [];

  // Stats
  const stats = useMemo(() => {
    const total = ciclosBase.length;
    const enCurso = ciclosBase.filter((c) => c.estado === "en_curso").length;
    const programados = ciclosBase.filter((c) => c.estado === "programado").length;
    const finalizados = ciclosBase.filter((c) => c.estado === "finalizado").length;
    const totalInscritos = detallesProcesoCurso.filter((d) =>
      ciclosBase.some((c) => c.idProcesoAsignadoCurso === d.idProcesoAsignadoCurso)
    ).length;
    return { total, enCurso, programados, finalizados, totalInscritos };
  }, [ciclosBase, detallesProcesoCurso]);

  const getCursoNombre = (idCurso: string) => cursos.find((c) => c.idCurso === idCurso)?.nombre || "Curso desconocido";
  const getIglesiaNombre = (idIglesia: string) => iglesias.find((i) => i.idIglesia === idIglesia)?.nombre || "";

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getDaysProgress = (inicio: string, fin: string) => {
    const start = new Date(inicio).getTime();
    const end = new Date(fin).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  // ── Create Ciclo ──
  const handleCreateCiclo = () => {
    if (!formCurso || !formFechaInicio || !formFechaFin) return;
    addProcesoAsignadoCurso({
      idCurso: formCurso,
      idIglesia: iglesiaActiva,
      fechaInicio: formFechaInicio,
      fechaFin: formFechaFin,
      estado: formEstado,
    });
    setShowCreateCiclo(false);
    resetForm();
  };

  // ── Edit Ciclo ──
  const openEditCiclo = (ciclo: ProcesoAsignadoCurso) => {
    setFormCurso(ciclo.idCurso);
    setFormFechaInicio(ciclo.fechaInicio);
    setFormFechaFin(ciclo.fechaFin);
    setFormEstado(ciclo.estado);
    setShowEditCiclo(true);
  };

  const handleEditCiclo = () => {
    if (!selectedCicloId || !formCurso || !formFechaInicio || !formFechaFin) return;
    updateProcesoAsignadoCurso(selectedCicloId, {
      idCurso: formCurso,
      fechaInicio: formFechaInicio,
      fechaFin: formFechaFin,
      estado: formEstado,
    });
    setShowEditCiclo(false);
    resetForm();
  };

  const handleDeleteCiclo = (id: string) => {
    deleteProcesoAsignadoCurso(id);
    setShowConfirmDelete(null);
    if (selectedCicloId === id) setSelectedCicloId(null);
  };

  // ── Enroll student ──
  const handleEnroll = () => {
    if (!selectedCicloId || !enrollUserId) return;
    const usr = miembrosMinisterio.find((m) => m.idUsuario === enrollUserId);
    addDetalleProcesoCurso({
      idProcesoAsignadoCurso: selectedCicloId,
      idUsuario: enrollUserId,
      fechaInscripcion: new Date().toISOString().split("T")[0],
      estado: "inscrito",
      nombreCompleto: usr?.nombreCompleto || "",
      correo: usr?.correo || "",
    });
    setShowEnrollDialog(false);
    setEnrollUserId("");
  };

  const handleUpdateEstadoInscripcion = (id: string, estado: DetalleProcesoCurso["estado"]) => {
    updateDetalleProcesoCurso(id, { estado });
  };

  const handleDeleteInscripcion = (id: string) => {
    deleteDetalleProcesoCurso(id);
    setShowConfirmDeleteInscripcion(null);
  };

  const resetForm = () => {
    setFormCurso("");
    setFormFechaInicio("");
    setFormFechaFin("");
    setFormEstado("programado");
  };

  const openCreateCiclo = () => {
    resetForm();
    if (cursos.length > 0) setFormCurso(cursos[0].idCurso);
    setShowCreateCiclo(true);
  };

  // Available members not yet enrolled in the current ciclo
  const availableMembers = useMemo(() => {
    if (!selectedCicloId) return [];
    const enrolledUserIds = new Set(inscripciones.map((d) => d.idUsuario));
    return miembrosMinisterio.filter(
      (m) => m.activo && !enrolledUserIds.has(m.idUsuario) && m.rolEnMinisterio !== "lider"
    );
  }, [selectedCicloId, inscripciones, miembrosMinisterio]);

  // ═════════════════════════════════════════
  // Coordinador / Servidor: Own enrollments
  // ═════════════════════════════════════════
  if (isViewOwn) {
    const myInscripciones = detallesProcesoCurso.filter((d) => d.idUsuario === user.idUsuario);
    const myProcesos = myInscripciones.map((insc) => {
      const proc = procesosAsignadoCurso.find((p) => p.idProcesoAsignadoCurso === insc.idProcesoAsignadoCurso);
      const curso = proc ? cursos.find((c) => c.idCurso === proc.idCurso) : null;
      return { insc, proc, curso };
    }).filter((x) => x.proc && x.curso);

    const activos = myProcesos.filter((x) => x.proc!.estado === "en_curso" || x.proc!.estado === "programado");
    const finalizados = myProcesos.filter((x) => x.proc!.estado === "finalizado");

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-primary" /> Mis Ciclos Lectivos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cursos en los que estas inscrito y tu progreso
          </p>
        </div>

        {myProcesos.length === 0 ? (
          <Card className="p-12 text-center">
            <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-muted-foreground mb-2">Sin inscripciones</h3>
            <p className="text-sm text-muted-foreground">
              No estas inscrito en ningun ciclo lectivo actualmente.
            </p>
          </Card>
        ) : (
          <>
            {/* Active enrollments */}
            {activos.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm text-muted-foreground">
                  <PlayCircle className="w-4 h-4" /> Ciclos Activos ({activos.length})
                </h2>
                {activos.map(({ insc, proc, curso }) => {
                  const progress = getDaysProgress(proc!.fechaInicio, proc!.fechaFin);
                  return (
                    <Card key={insc.idDetalleProcesoCurso} className="p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm">{curso!.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(proc!.fechaInicio)} — {formatDate(proc!.fechaFin)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${estadoInscripcionColors[insc.estado]} border-0 text-xs`}>
                            {estadoInscripcionLabels[insc.estado]}
                          </Badge>
                          <Badge variant="outline" className={`${estadoCicloColors[proc!.estado]} border-0 text-xs`}>
                            {estadoCicloLabels[proc!.estado]}
                          </Badge>
                        </div>
                      </div>
                      {proc!.estado === "en_curso" && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progreso del ciclo</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Inscrito: {formatDate(insc.fechaInscripcion)}
                        </span>
                        {curso!.duracionHoras && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {curso!.duracionHoras}h de duracion
                          </span>
                        )}
                        {curso!.modulos && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> {curso!.modulos.length} modulos
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Finished enrollments */}
            {finalizados.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4" /> Ciclos Finalizados ({finalizados.length})
                </h2>
                {finalizados.map(({ insc, proc, curso }) => (
                  <Card key={insc.idDetalleProcesoCurso} className="p-4 opacity-75">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm">{curso!.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(proc!.fechaInicio)} — {formatDate(proc!.fechaFin)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`${estadoInscripcionColors[insc.estado]} border-0 text-xs`}>
                        {estadoInscripcionLabels[insc.estado]}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════
  // Detail view for a selected ciclo
  // ═════════════════════════════════════════
  if (selectedCiclo && selectedCurso) {
    const progress = getDaysProgress(selectedCiclo.fechaInicio, selectedCiclo.fechaFin);
    const inscripcionStats = {
      total: inscripciones.length,
      inscritos: inscripciones.filter((d) => d.estado === "inscrito").length,
      enProgreso: inscripciones.filter((d) => d.estado === "en_progreso").length,
      completados: inscripciones.filter((d) => d.estado === "completado").length,
      retirados: inscripciones.filter((d) => d.estado === "retirado").length,
    };

    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <button
          onClick={() => setSelectedCicloId(null)}
          className="flex items-center gap-2 text-primary hover:underline text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Ciclos Lectivos
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <GraduationCap className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="flex items-center gap-3">
                {selectedCurso.nombre}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {getIglesiaNombre(selectedCiclo.idIglesia)} &middot;{" "}
                {formatDate(selectedCiclo.fechaInicio)} — {formatDate(selectedCiclo.fechaFin)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={`${estadoCicloColors[selectedCiclo.estado]} border-0 text-xs flex items-center gap-1`}>
                  {estadoCicloIcons[selectedCiclo.estado]} {estadoCicloLabels[selectedCiclo.estado]}
                </Badge>
                {selectedCurso.duracionHoras && (
                  <Badge variant="secondary" className="text-xs">{selectedCurso.duracionHoras}h</Badge>
                )}
                {selectedCurso.modulos && (
                  <Badge variant="secondary" className="text-xs">{selectedCurso.modulos.length} modulos</Badge>
                )}
              </div>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openEditCiclo(selectedCiclo)}>
                <Pencil className="w-4 h-4 mr-1" /> Editar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (availableMembers.length > 0) {
                    setEnrollUserId(availableMembers[0].idUsuario);
                  }
                  setShowEnrollDialog(true);
                }}
              >
                <UserPlus className="w-4 h-4 mr-1" /> Inscribir
              </Button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {selectedCiclo.estado === "en_curso" && (
          <Card className="p-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Progreso temporal del ciclo</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>{formatDate(selectedCiclo.fechaInicio)}</span>
              <span>{formatDate(selectedCiclo.fechaFin)}</span>
            </div>
          </Card>
        )}

        {/* Inscription stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl text-primary">{inscripcionStats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl text-blue-600">{inscripcionStats.inscritos}</p>
            <p className="text-xs text-muted-foreground">Inscritos</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl text-amber-600">{inscripcionStats.enProgreso}</p>
            <p className="text-xs text-muted-foreground">En Progreso</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl text-green-600">{inscripcionStats.completados}</p>
            <p className="text-xs text-muted-foreground">Completados</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl text-red-600">{inscripcionStats.retirados}</p>
            <p className="text-xs text-muted-foreground">Retirados</p>
          </Card>
        </div>

        {/* Inscripciones list */}
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Estudiantes Inscritos
          </h3>
          {inscripciones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm">No hay estudiantes inscritos en este ciclo.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {inscripciones.map((insc) => (
                <div
                  key={insc.idDetalleProcesoCurso}
                  className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm shrink-0">
                    {(insc.nombreCompleto || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{insc.nombreCompleto}</p>
                    <p className="text-xs text-muted-foreground">{insc.correo}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <Calendar className="w-3 h-3" />
                    {formatDate(insc.fechaInscripcion)}
                  </div>
                  {canManage ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={insc.estado}
                        onChange={(e) =>
                          handleUpdateEstadoInscripcion(
                            insc.idDetalleProcesoCurso,
                            e.target.value as DetalleProcesoCurso["estado"]
                          )
                        }
                        className="border rounded-md px-2 py-1 text-xs bg-card"
                      >
                        <option value="inscrito">Inscrito</option>
                        <option value="en_progreso">En Progreso</option>
                        <option value="completado">Completado</option>
                        <option value="retirado">Retirado</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setShowConfirmDeleteInscripcion(insc.idDetalleProcesoCurso)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className={`${estadoInscripcionColors[insc.estado]} border-0 text-xs`}
                    >
                      {estadoInscripcionLabels[insc.estado]}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Enroll Dialog */}
        <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Inscribir Estudiante</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm">Ciclo</label>
                <Input value={selectedCurso.nombre} disabled className="mt-1" />
              </div>
              <div>
                <label className="text-sm">Miembro</label>
                {availableMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    Todos los miembros ya estan inscritos en este ciclo.
                  </p>
                ) : (
                  <select
                    value={enrollUserId}
                    onChange={(e) => setEnrollUserId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1"
                  >
                    {availableMembers.map((m) => (
                      <option key={m.idMiembroMinisterio} value={m.idUsuario}>
                        {m.nombreCompleto}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEnrollDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEnroll} disabled={availableMembers.length === 0}>
                Inscribir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Ciclo Dialog */}
        <Dialog open={showEditCiclo} onOpenChange={setShowEditCiclo}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Ciclo Lectivo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm">Curso</label>
                <select
                  value={formCurso}
                  onChange={(e) => setFormCurso(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1"
                >
                  {cursos.map((c) => (
                    <option key={c.idCurso} value={c.idCurso}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Fecha Inicio</label>
                  <Input
                    type="date"
                    value={formFechaInicio}
                    onChange={(e) => setFormFechaInicio(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm">Fecha Fin</label>
                  <Input
                    type="date"
                    value={formFechaFin}
                    onChange={(e) => setFormFechaFin(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm">Estado</label>
                <select
                  value={formEstado}
                  onChange={(e) => setFormEstado(e.target.value as ProcesoAsignadoCurso["estado"])}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1"
                >
                  <option value="programado">Programado</option>
                  <option value="en_curso">En Curso</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditCiclo(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditCiclo}>Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm delete inscripcion */}
        <Dialog
          open={!!showConfirmDeleteInscripcion}
          onOpenChange={() => setShowConfirmDeleteInscripcion(null)}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" /> Eliminar Inscripcion
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Esta accion eliminara la inscripcion del estudiante de este ciclo lectivo. Esta accion no se puede deshacer.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDeleteInscripcion(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => showConfirmDeleteInscripcion && handleDeleteInscripcion(showConfirmDeleteInscripcion)}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═════════════════════════════════════════
  // Main list view (Leader / Admin)
  // ═════════════════════════════════════════
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-primary" /> Ciclos Lectivos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestion de periodos academicos y asignacion de cursos — {getIglesiaNombre(iglesiaActiva)}
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreateCiclo}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Ciclo
          </Button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4 bg-primary/5">
          <p className="text-xs text-muted-foreground mb-1">Total Ciclos</p>
          <p className="text-2xl text-primary">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">En Curso</p>
          <p className="text-2xl text-green-600">{stats.enCurso}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Programados</p>
          <p className="text-2xl text-blue-600">{stats.programados}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Finalizados</p>
          <p className="text-2xl text-gray-600">{stats.finalizados}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Inscripciones</p>
          <p className="text-2xl text-amber-600">{stats.totalInscritos}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-card"
          >
            <option value="all">Todos los estados</option>
            <option value="en_curso">En Curso</option>
            <option value="programado">Programado</option>
            <option value="finalizado">Finalizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <select
          value={cursoFilter}
          onChange={(e) => setCursoFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-card"
        >
          <option value="all">Todos los cursos</option>
          {cursosUsados.map((id) => (
            <option key={id} value={id}>
              {getCursoNombre(id)}
            </option>
          ))}
        </select>
      </div>

      {/* Ciclos list */}
      <div className="space-y-3">
        {ciclosOrdenados.map((ciclo) => {
          const curso = cursos.find((c) => c.idCurso === ciclo.idCurso);
          const insc = detallesProcesoCurso.filter(
            (d) => d.idProcesoAsignadoCurso === ciclo.idProcesoAsignadoCurso
          );
          const progress = getDaysProgress(ciclo.fechaInicio, ciclo.fechaFin);

          return (
            <Card
              key={ciclo.idProcesoAsignadoCurso}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedCicloId(ciclo.idProcesoAsignadoCurso)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="truncate">{curso?.nombre || "Curso desconocido"}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(ciclo.fechaInicio)} — {formatDate(ciclo.fechaFin)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {insc.length} inscrito{insc.length !== 1 ? "s" : ""}
                        </span>
                        {curso?.duracionHoras && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {curso.duracionHoras}h
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`${estadoCicloColors[ciclo.estado]} border-0 text-xs flex items-center gap-1`}
                      >
                        {estadoCicloIcons[ciclo.estado]} {estadoCicloLabels[ciclo.estado]}
                      </Badge>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowConfirmDelete(ciclo.idProcesoAsignadoCurso);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  {ciclo.estado === "en_curso" && (
                    <div className="mt-2">
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {ciclosOrdenados.length === 0 && (
        <Card className="p-12 text-center">
          <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground">No se encontraron ciclos lectivos</p>
        </Card>
      )}

      {/* Create Ciclo Dialog */}
      <Dialog open={showCreateCiclo} onOpenChange={setShowCreateCiclo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Ciclo Lectivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Curso</label>
              <select
                value={formCurso}
                onChange={(e) => setFormCurso(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1"
              >
                {cursos.map((c) => (
                  <option key={c.idCurso} value={c.idCurso}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Fecha Inicio</label>
                <Input
                  type="date"
                  value={formFechaInicio}
                  onChange={(e) => setFormFechaInicio(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm">Fecha Fin</label>
                <Input
                  type="date"
                  value={formFechaFin}
                  onChange={(e) => setFormFechaFin(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm">Estado</label>
              <select
                value={formEstado}
                onChange={(e) => setFormEstado(e.target.value as ProcesoAsignadoCurso["estado"])}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1"
              >
                <option value="programado">Programado</option>
                <option value="en_curso">En Curso</option>
                <option value="finalizado">Finalizado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCiclo(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCiclo} disabled={!formCurso || !formFechaInicio || !formFechaFin}>
              Crear Ciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete ciclo */}
      <Dialog open={!!showConfirmDelete} onOpenChange={() => setShowConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Eliminar Ciclo Lectivo
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta accion eliminara el ciclo lectivo y todas las inscripciones asociadas. Esta accion no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => showConfirmDelete && handleDeleteCiclo(showConfirmDelete)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}