import { useState } from "react";
import { Link } from "react-router";
import { useNavigate } from "react-router";
import {
  useCursosEnriquecidos,
  useDeleteCurso,
  useCreateCurso,
  useCreateModulo,
  useUpdateCurso,
  useDeleteModulo,
  useCreateRecurso,
  useDeleteRecurso,
  useProcesosAsignadoCurso,
} from "@/hooks/useCursos";
import { uploadRecursoArchivo } from "@/services/cursos.service";
import { useMinisterios } from "@/hooks/useMinisterios";
import type { ProcesoAsignadoCurso } from "@/types/app.types";
import { useApp } from "../store/AppContext";
import { EnrollmentPickerModal } from "./classroom/EnrollmentPickerModal";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { 
  Plus, ChevronRight, ChevronDown, FileText, Link as LinkIcon, Download, 
  ExternalLink, GraduationCap, Layers, ArrowLeft, Pencil, Trash2, 
  PlusCircle, BookOpen, Clock, Users, CheckCircle2
} from "lucide-react";

export function ClassroomPage() {
  const navigate = useNavigate();
  const { data: ministerios = [] } = useMinisterios();
  const [selectedMinId, setSelectedMinId] = useState<number | null>(null);
  const actualMinId = selectedMinId ?? ministerios[0]?.idMinisterio ?? 0;
  const { data: cursos = [], isLoading } = useCursosEnriquecidos();
  const deleteCursoMutation = useDeleteCurso();
  const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null);
  const [selectedModuloId, setSelectedModuloId] = useState<number | null>(null);
  const [expandedCursos, setExpandedCursos] = useState<Set<number>>(new Set());
  const [showCreateCurso, setShowCreateCurso] = useState(false);
  const [showCreateModulo, setShowCreateModulo] = useState(false);
  const { usuarioActual, rolActual } = useApp();
  const { data: todosProcesos = [] } = useProcesosAsignadoCurso();
  const [pickerForCiclo, setPickerForCiclo] = useState<{ ciclo: ProcesoAsignadoCurso; cursoNombre: string } | null>(null);
  const createCursoMutation = useCreateCurso();
  const createModuloMutation = useCreateModulo();
  const updateCursoMutation = useUpdateCurso();
  const deleteModuloMutation = useDeleteModulo();
  const createRecursoMutation = useCreateRecurso();
  const deleteRecursoMutation = useDeleteRecurso();
  const [cursoForm, setCursoForm] = useState({ nombre: "", descripcion: "", duracionHoras: "" });
  const [moduloForm, setModuloForm] = useState({ titulo: "", descripcion: "" });
  const [editCurso, setEditCurso] = useState<{ id: number; nombre: string; descripcion: string; estado: string } | null>(null);
  const [showCreateRecurso, setShowCreateRecurso] = useState(false);
  const [recursoForm, setRecursoForm] = useState({ nombre: "", tipo: "archivo" as "archivo" | "enlace", url: "" });
  const [recursoFile, setRecursoFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const canManageAula =
    rolActual === "lider";

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm tracking-widest uppercase text-[10px] font-bold">Iniciando Aula...</span>
      </div>
    </div>
  );

  const selectedCurso = selectedCursoId ? cursos.find((c) => c.idCurso === selectedCursoId) : null;
  const selectedModulo = selectedModuloId && selectedCurso ? selectedCurso.modulos?.find((m) => m.idModulo === selectedModuloId) : null;
  const min = ministerios.find((m) => m.idMinisterio === actualMinId);

  const toggleCurso = (id: number) => {
    const next = new Set(expandedCursos);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedCursos(next);
  };

  const handleCreateCurso = () => {
    if (!canManageAula) return;
    if (!cursoForm.nombre.trim() || !usuarioActual) return;
    createCursoMutation.mutate(
      {
        nombre: cursoForm.nombre.trim(),
        descripcion: cursoForm.descripcion.trim() || null,
        duracionHoras: cursoForm.duracionHoras ? Number(cursoForm.duracionHoras) : null,
        idUsuarioCreador: usuarioActual.idUsuario,
        idMinisterio: actualMinId,
      },
      {
        onSuccess: () => {
          setCursoForm({ nombre: "", descripcion: "", duracionHoras: "" });
          setShowCreateCurso(false);
        },
      }
    );
  };

  function handleDeleteCurso(id: number, nombre: string) {
    if (!canManageAula) return;
    if (!confirm(`¿Eliminar curso "${nombre}"?`)) return;
    deleteCursoMutation.mutate(id);
  }

  const handleCreateModulo = (idCurso: number) => {
    if (!canManageAula) return;
    if (!moduloForm.titulo.trim()) return;
    createModuloMutation.mutate(
      {
        titulo: moduloForm.titulo.trim(),
        descripcion: moduloForm.descripcion.trim() || null,
        idCurso,
      },
      {
        onSuccess: () => {
          setModuloForm({ titulo: "", descripcion: "" });
          setShowCreateModulo(false);
        },
      }
    );
  };

  const handleUpdateCurso = () => {
    if (!canManageAula) return;
    if (!editCurso || !editCurso.nombre.trim()) return;
    updateCursoMutation.mutate(
      { id: editCurso.id, data: { nombre: editCurso.nombre.trim(), descripcion: editCurso.descripcion.trim() || null, estado: editCurso.estado } },
      { onSuccess: () => setEditCurso(null) }
    );
  };

  const handleDeleteModulo = (id: number, titulo: string) => {
    if (!canManageAula) return;
    if (!confirm(`¿Eliminar módulo "${titulo}"?`)) return;
    deleteModuloMutation.mutate(id);
  };

  const handleCreateRecurso = async (idModulo: number) => {
    if (!canManageAula) return;
    const nombre = recursoForm.nombre.trim();

    if (recursoForm.tipo === "enlace" && (!nombre || !recursoForm.url.trim())) return;
    if (recursoForm.tipo === "archivo" && !recursoFile) return;

    try {
      let finalUrl = recursoForm.url.trim();
      const finalNombre = nombre || recursoFile?.name || "Archivo";

      if (recursoForm.tipo === "archivo" && recursoFile) {
        setIsUploadingFile(true);
        finalUrl = await uploadRecursoArchivo({ idModulo, file: recursoFile });
      }

      await createRecursoMutation.mutateAsync({
        idModulo,
        nombre: finalNombre,
        tipo: recursoForm.tipo,
        url: finalUrl,
      });

      setShowCreateRecurso(false);
      setRecursoForm({ nombre: "", tipo: "archivo", url: "" });
      setRecursoFile(null);
      toast.success("Recurso agregado");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo agregar el recurso";
      toast.error(msg);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const statusColors: Record<string, string> = {
    activo: "bg-primary/10 text-primary border-primary/20",
    inactivo: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    archivado: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  };

  if (selectedModulo && selectedCurso) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 max-w-4xl mx-auto"
      >
        <button 
          onClick={() => setSelectedModuloId(null)} 
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al curso
        </button>

        <div className="relative overflow-hidden bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
          <Badge variant="outline" className="mb-4 bg-primary/5 border-primary/20 text-primary uppercase font-black text-[10px] tracking-widest">
            {selectedCurso.nombre}
          </Badge>
          <h1 className="text-3xl font-light tracking-tight text-foreground">{selectedModulo.titulo}</h1>
          <div className="mt-8 prose prose-slate dark:prose-invert max-w-none">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{selectedModulo.descripcion}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-card/40 backdrop-blur-xl border-border/50 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <h3 className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.25em] text-primary/70">
                <Download className="w-4 h-4" /> Recursos Adjuntos
              </h3>
              {canManageAula ? (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 hover:text-primary"
                  onClick={() => setShowCreateRecurso(true)}
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Agregar Recurso
                </Button>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Solo lectura</span>
              )}
            </div>
            {selectedModulo.recursos && selectedModulo.recursos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedModulo.recursos.map((r) => (
                  <div key={r.idRecurso} className="flex items-center gap-3 p-4 rounded-2xl bg-background/40 hover:bg-background/60 border border-border/50 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                      {r.tipo === "archivo" ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold truncate text-foreground/90">{r.nombre}</span>
                      <span className="block text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{r.tipo}</span>
                    </div>
                    <div className="flex items-center gap-1 group-hover:opacity-100 opacity-0 md:opacity-0 transition-opacity">
                      <a href={r.url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors">
                        {r.tipo === "archivo" ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                      </a>
                      {canManageAula && (
                        <button 
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors shrink-0"
                          onClick={() => { if (confirm(`¿Eliminar recurso "${r.nombre}"?`)) deleteRecursoMutation.mutate(r.idRecurso); }}
                          disabled={deleteRecursoMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground/40">
                <FileText className="w-12 h-12" />
                <p className="text-sm font-medium">Sin recursos adjuntos</p>
              </div>
            )}
          </Card>
        </div>

        {/* Create Recurso Dialog */}
        <Dialog open={canManageAula && showCreateRecurso} onOpenChange={o => { if (!o) { setShowCreateRecurso(false); setRecursoForm({ nombre: "", tipo: "archivo", url: "" }); setRecursoFile(null); } }}>
          <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                Agregar Recurso
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Nombre *</label>
                <Input value={recursoForm.nombre} onChange={e => setRecursoForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del recurso" className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Tipo</label>
                <select className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20" value={recursoForm.tipo} onChange={e => { const tipo = e.target.value as "archivo" | "enlace"; setRecursoForm(p => ({ ...p, tipo, url: tipo === "archivo" ? "" : p.url })); if (tipo === "enlace") setRecursoFile(null); }}>
                  <option value="archivo">Archivo adjunto (PDF/Docs)</option>
                  <option value="enlace">Enlace externo (opcional)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  {recursoForm.tipo === "enlace" ? "URL *" : "Archivo *"}
                </label>
                {recursoForm.tipo === "enlace" ? (
                  <Input key="recurso-url" value={recursoForm.url} onChange={e => setRecursoForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
                ) : (
                  <Input key="recurso-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.zip" onChange={e => setRecursoFile(e.target.files?.[0] ?? null)} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" className="rounded-xl" onClick={() => { setShowCreateRecurso(false); setRecursoForm({ nombre: "", tipo: "archivo", url: "" }); setRecursoFile(null); }}>Cancelar</Button>
              <Button className="rounded-xl px-6" onClick={() => selectedModuloId && handleCreateRecurso(selectedModuloId)} disabled={createRecursoMutation.isPending || isUploadingFile || (recursoForm.tipo === "enlace" ? (!recursoForm.nombre || !recursoForm.url) : !recursoFile)}>
                {isUploadingFile ? "Subiendo..." : createRecursoMutation.isPending ? "Agregando..." : "Agregar Recurso"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header Panorámico */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 bg-card/40 backdrop-blur-xl border border-border/50 p-6 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-48 bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shrink-0 shadow-lg shadow-cyan-600/20">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none mb-2">
              Aula de Formación
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium">
              {min ? `${min.nombre} — Cursos y capacitación` : "Capacitación continua para el equipo"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {ministerios.length > 1 && (
            <div className="flex items-center gap-2 bg-background/40 border border-border/50 rounded-2xl px-3 h-11 shrink-0">
              <BookOpen className="w-4 h-4 text-muted-foreground/50" />
              <select
                value={actualMinId}
                onChange={(e) => { setSelectedMinId(Number(e.target.value)); setSelectedCursoId(null); }}
                className="text-xs bg-transparent border-0 outline-none text-foreground cursor-pointer font-bold tracking-tight"
              >
                {ministerios.filter((m) => m.estado === "activo").map((m) => <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>)}
              </select>
            </div>
          )}
          {canManageAula ? (
            <Button 
              onClick={() => setShowCreateCurso(true)} 
              className="h-11 rounded-2xl font-bold uppercase tracking-widest text-[10px] shrink-0 bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg shadow-blue-900/30 hover:scale-105 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" /> Nuevo Curso
            </Button>
          ) : (
            <Badge variant="outline" className="h-11 rounded-2xl px-4 text-[10px] font-bold uppercase tracking-widest bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-600/20">
              Modo lectura
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Cursos Totales", value: cursos.length, icon: <Layers className="w-4 h-4" /> },
          { label: "Modulos", value: cursos.reduce((acc, c) => acc + (c.cantidadModulos || 0), 0), icon: <BookOpen className="w-4 h-4" /> },
          { label: "Inscritos", value: cursos.reduce((acc, c) => acc + (c.cantidadInscritos || 0), 0), icon: <Users className="w-4 h-4" /> },
          { label: "Activos", value: cursos.filter(c => c.estado === "activo").length, icon: <CheckCircle2 className="w-4 h-4" /> },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-4 flex items-center gap-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shadow-md shadow-blue-900/10 group-hover:scale-110 transition-transform">
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-foreground leading-none mb-1">{s.value}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {cursos.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-card/20 backdrop-blur-md border border-border/50 rounded-[40px] p-20 flex flex-col items-center justify-center text-center overflow-hidden"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white mb-8 shadow-xl shadow-blue-900/20">
            <GraduationCap className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-foreground/80 mb-3">Aula vacía</h3>
          <p className="text-sm text-muted-foreground/60 max-w-sm mb-8">
            Aún no hay cursos de formación en este ministerio. Inicia la academia agregando un nuevo programa.
          </p>
          {canManageAula && (
            <Button onClick={() => setShowCreateCurso(true)} className="h-11 rounded-2xl px-8 font-bold uppercase tracking-widest text-[11px]">
              <Plus className="w-4 h-4 mr-2" /> Crear primer curso
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {cursos.map((curso, idx) => {
            const isExpanded = expandedCursos.has(curso.idCurso);
            return (
              <motion.div
                key={curso.idCurso}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.05 }}
                className="group overflow-hidden rounded-3xl bg-card/40 backdrop-blur-xl border border-border/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div 
                  className={`flex flex-col sm:flex-row sm:items-center gap-5 p-5 cursor-pointer transition-colors ${isExpanded ? "bg-primary/5" : "hover:bg-white/5"}`}
                  onClick={() => toggleCurso(curso.idCurso)}
                >
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/20 to-primary/10 border border-blue-600/10 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0 transition-transform group-hover:scale-105">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 overflow-x-auto no-scrollbar">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 shrink-0">Curso {idx + 1}</span>
                        <Badge variant="outline" className={`shrink-0 text-[10px] uppercase font-bold tracking-tighter px-1.5 py-0 ${statusColors[curso.estado]}`}>
                          {curso.estado}
                        </Badge>
                        {curso.duracionHoras && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/60 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full shrink-0">
                            <Clock className="w-3 h-3" /> {curso.duracionHoras}h
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold tracking-tight text-foreground truncate">{curso.nombre}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{curso.descripcion}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0 pl-[68px] sm:pl-0">
                    <div className="flex items-center gap-4">
                      {curso.cantidadModulos > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="text-base font-black leading-none">{curso.cantidadModulos}</span>
                          <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Módulos</span>
                        </div>
                      )}
                      {curso.cantidadInscritos > 0 && (
                        <div className="flex flex-col items-end border-l border-border/40 pl-4">
                          <span className="text-base font-black leading-none">{curso.cantidadInscritos}</span>
                          <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Inscritos</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-md shadow-blue-900/20 transition-all"
                        onClick={(e) => { e.stopPropagation(); toggleCurso(curso.idCurso); }}
                      >
                        {isExpanded ? "Ocultar módulos" : "Ver módulos"}
                      </Button>
                      {canManageAula && (
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditCurso({ id: curso.idCurso, nombre: curso.nombre, descripcion: curso.descripcion ?? "", estado: curso.estado }); }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCurso(curso.idCurso, curso.nombre); }}
                          disabled={deleteCursoMutation.isPending}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-destructive/50 hover:text-destructive transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? "bg-primary text-white rotate-180" : "bg-muted text-muted-foreground"}`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-background/20"
                    >
                      <div className="grid grid-cols-1 divide-y divide-white/5 border-t border-white/5">
                        {(() => {
                          const ciclosDelCurso = todosProcesos.filter((p) => p.idCurso === curso.idCurso);
                          const activos = ciclosDelCurso.filter((p) => p.estado === "programado" || p.estado === "en_curso");
                          const historicos = ciclosDelCurso.filter((p) => p.estado === "finalizado" || p.estado === "cancelado");
                          if (activos.length === 0 && historicos.length === 0) return null;

                          return (
                            <div className="p-4 bg-card/20 border-b border-white/5">
                              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" /> Ciclos activos
                              </h3>
                              {activos.length === 0 && <p className="text-xs text-muted-foreground">No hay ciclos activos.</p>}
                              <div className="space-y-2">
                                {activos.map((p) => (
                                  <div
                                    key={p.idProcesoAsignadoCurso}
                                    className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 px-3 py-2"
                                  >
                                    <div className="text-xs">
                                      <p className="font-semibold">
                                        {new Date(p.fechaInicio).toLocaleDateString("es")} - {new Date(p.fechaFin).toLocaleDateString("es")}
                                      </p>
                                      <p className="text-muted-foreground capitalize">{p.estado.replace("_", " ")}</p>
                                    </div>
                                    {canManageAula && (
                                      <Button
                                        size="sm"
                                        className="h-8 rounded-lg text-xs bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-md shadow-blue-900/20 transition-all"
                                        onClick={() => setPickerForCiclo({ ciclo: p, cursoNombre: curso.nombre })}
                                      >
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Inscribir
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {historicos.length > 0 && (
                                <details className="mt-3">
                                  <summary className="text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none">
                                    Ver histórico ({historicos.length})
                                  </summary>
                                  <div className="mt-2 space-y-1">
                                    {historicos.map((p) => (
                                      <div key={p.idProcesoAsignadoCurso} className="text-[11px] text-muted-foreground/80 px-3">
                                        {new Date(p.fechaInicio).toLocaleDateString("es")} - {new Date(p.fechaFin).toLocaleDateString("es")} · {p.estado}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          );
                        })()}

                        {curso.modulos?.sort((a, b) => a.orden - b.orden).map((modulo, mi) => (
                          <div 
                            key={modulo.idModulo} 
                            onClick={() => { navigate(`/app/aula/curso/${curso.idCurso}/modulo/${modulo.idModulo}`); }} 
                            className="group/mod flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-primary/5 transition-colors border-l-4 border-transparent hover:border-primary/40"
                          >
                            <div className="w-8 h-8 rounded-full bg-background/50 border border-white/5 flex items-center justify-center text-[11px] font-black text-foreground shrink-0 group-hover/mod:bg-primary group-hover/mod:text-white transition-all">
                              {mi + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate text-foreground/90">{modulo.titulo}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {modulo.recursos && modulo.recursos.length > 0 && (
                                  <span className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-tight">
                                    <FileText className="w-2.5 h-2.5" /> {modulo.recursos.length} recursos
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{modulo.estado}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover/mod:opacity-100 transition-opacity">
                              <Link
                                to={`/app/aula/curso/${curso.idCurso}/modulo/${modulo.idModulo}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline px-2 py-1 rounded-md border border-primary/30 bg-primary/5"
                              >
                                Abrir →
                              </Link>
                              {canManageAula && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteModulo(modulo.idModulo, modulo.titulo); }}
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-destructive/50 hover:text-destructive transition-colors shrink-0"
                                disabled={deleteModuloMutation.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover/mod:translate-x-1 group-hover/mod:text-primary transition-all shrink-0" />
                          </div>
                        ))}
                        {canManageAula && (
                          <button 
                            onClick={() => { setSelectedCursoId(curso.idCurso); setShowCreateModulo(true); }} 
                            className="flex items-center gap-3 px-8 py-5 text-primary/70 hover:text-primary hover:bg-primary/5 transition-all text-sm font-bold tracking-tight bg-white/10 dark:bg-black/10"
                          >
                            <PlusCircle className="w-4 h-4" /> Agregar un nuevo módulo a este curso
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modern Glass Dialogs */}
      <Dialog open={showCreateCurso && canManageAula} onOpenChange={setShowCreateCurso}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Crear Nuevo Curso
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Diseña un nuevo programa de capacitación.</p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Nombre del Curso *</label>
              <Input
                value={cursoForm.nombre}
                onChange={(e) => setCursoForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej. Liderazgo Nivel 1"
                className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Descripción</label>
              <Input
                value={cursoForm.descripcion}
                onChange={(e) => setCursoForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Breve descripción del objetivo"
                className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Duración Estimada (horas)</label>
              <Input
                type="number"
                value={cursoForm.duracionHoras}
                onChange={(e) => setCursoForm(p => ({ ...p, duracionHoras: e.target.value }))}
                placeholder="Ej: 24"
                className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setShowCreateCurso(false)}>Cancelar</Button>
            <Button className="rounded-xl px-8" onClick={handleCreateCurso} disabled={createCursoMutation.isPending || !usuarioActual}>
              {createCursoMutation.isPending ? "Creando..." : "Crear Curso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateModulo && canManageAula} onOpenChange={setShowCreateModulo}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Agregar Módulo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Título del Módulo *</label>
              <Input
                value={moduloForm.titulo}
                onChange={(e) => setModuloForm(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Ej. Introducción al Servicio"
                className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Contenido / Descripción</label>
              <textarea
                value={moduloForm.descripcion}
                onChange={(e) => setModuloForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Contenido principal del módulo..."
                className="w-full h-32 rounded-xl border border-white/10 bg-background/50 p-4 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setShowCreateModulo(false)}>Cancelar</Button>
            <Button
              className="rounded-xl px-8"
              onClick={() => selectedCursoId && handleCreateModulo(selectedCursoId)}
              disabled={createModuloMutation.isPending || !selectedCursoId}
            >
              {createModuloMutation.isPending ? "Agregando..." : "Agregar Módulo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCurso && canManageAula} onOpenChange={o => { if (!o) setEditCurso(null); }}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Editar Curso
            </DialogTitle>
          </DialogHeader>
          {editCurso && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Nombre *</label>
                <Input value={editCurso.nombre} onChange={e => setEditCurso(p => p ? { ...p, nombre: e.target.value } : p)} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Descripción</label>
                <Input value={editCurso.descripcion} onChange={e => setEditCurso(p => p ? { ...p, descripcion: e.target.value } : p)} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Estado</label>
                <select className="w-full h-11 rounded-xl border border-white/10 bg-background/50 px-3 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/20" value={editCurso.estado} onChange={e => setEditCurso(p => p ? { ...p, estado: e.target.value } : p)}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="archivado">Archivado</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setEditCurso(null)}>Cancelar</Button>
            <Button className="rounded-xl px-8" onClick={handleUpdateCurso} disabled={updateCursoMutation.isPending}>
              {updateCursoMutation.isPending ? "Guardar" : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pickerForCiclo && (
        <EnrollmentPickerModal
          ciclo={pickerForCiclo.ciclo}
          cursoNombre={pickerForCiclo.cursoNombre}
          open={true}
          onOpenChange={(o) => {
            if (!o) setPickerForCiclo(null);
          }}
        />
      )}
    </div>
  );
}
