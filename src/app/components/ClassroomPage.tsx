import { useState } from "react";
import { useCursosEnriquecidos, useDeleteCurso, useCreateCurso, useCreateModulo, useUpdateCurso, useDeleteModulo, useCreateRecurso, useDeleteRecurso } from "@/hooks/useCursos";
import { useMinisterios } from "@/hooks/useMinisterios";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Plus, ChevronRight, ChevronDown, FileText, Link as LinkIcon, Download, ExternalLink, GraduationCap, Layers, ArrowLeft, Pencil, Trash2, PlusCircle } from "lucide-react";

export function ClassroomPage() {
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
  const { usuarioActual } = useApp();
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
  const [recursoForm, setRecursoForm] = useState({ nombre: "", tipo: "enlace" as "archivo" | "enlace", url: "" });

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  const selectedCurso = selectedCursoId ? cursos.find((c) => c.idCurso === selectedCursoId) : null;
  const selectedModulo = selectedModuloId && selectedCurso ? selectedCurso.modulos?.find((m) => m.idModulo === selectedModuloId) : null;
  const min = ministerios.find((m) => m.idMinisterio === actualMinId);

  const toggleCurso = (id: number) => {
    const next = new Set(expandedCursos);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedCursos(next);
  };

  const handleCreateCurso = () => {
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
    if (!confirm(`¿Eliminar curso "${nombre}"? Se eliminarán todos sus módulos y evaluaciones.`)) return;
    deleteCursoMutation.mutate(id);
  }

  const handleCreateModulo = (idCurso: number) => {
    if (!moduloForm.titulo.trim()) return;
    createModuloMutation.mutate(
      {
        titulo: moduloForm.titulo.trim(),
        descripcion: moduloForm.descripcion.trim() || null,
        orden: (cursos.find((c) => c.idCurso === idCurso)?.modulos?.length ?? 0) + 1,
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
    if (!editCurso || !editCurso.nombre.trim()) return;
    updateCursoMutation.mutate(
      { id: editCurso.id, data: { nombre: editCurso.nombre.trim(), descripcion: editCurso.descripcion.trim() || null, estado: editCurso.estado } },
      { onSuccess: () => setEditCurso(null) }
    );
  };

  const handleDeleteModulo = (id: number, titulo: string) => {
    if (!confirm(`¿Eliminar módulo "${titulo}"?`)) return;
    deleteModuloMutation.mutate(id);
  };

  const handleCreateRecurso = (idModulo: number) => {
    if (!recursoForm.nombre.trim() || !recursoForm.url.trim()) return;
    createRecursoMutation.mutate(
      { idModulo, nombre: recursoForm.nombre.trim(), tipo: recursoForm.tipo, url: recursoForm.url.trim() },
      { onSuccess: () => { setShowCreateRecurso(false); setRecursoForm({ nombre: "", tipo: "enlace", url: "" }); } }
    );
  };

  if (selectedModulo && selectedCurso) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <button onClick={() => setSelectedModuloId(null)} className="flex items-center gap-2 text-primary hover:underline text-sm"><ArrowLeft className="w-4 h-4" /> Volver al curso</button>
        <div><Badge variant="secondary" className="mb-2">{selectedCurso.nombre}</Badge><h1>{selectedModulo.titulo}</h1></div>
        <Card className="p-6"><div className="prose max-w-none"><p className="text-sm text-muted-foreground leading-relaxed">{selectedModulo.descripcion}</p></div></Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2"><Download className="w-5 h-5 text-primary" /> Recursos Adjuntos</h3>
            <Button size="sm" variant="outline" onClick={() => setShowCreateRecurso(true)}><PlusCircle className="w-3.5 h-3.5 mr-1" /> Agregar Recurso</Button>
          </div>
          {selectedModulo.recursos && selectedModulo.recursos.length > 0 ? (
            <div className="space-y-2">
              {selectedModulo.recursos.map((r) => (
                <div key={r.idRecurso} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors group">
                  {r.tipo === "archivo" ? <FileText className="w-5 h-5 text-primary shrink-0" /> : <LinkIcon className="w-5 h-5 text-primary shrink-0" />}
                  <span className="flex-1 text-sm">{r.nombre}</span>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="sm">{r.tipo === "archivo" ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}</Button>
                  </a>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" title="Eliminar recurso"
                    onClick={() => { if (confirm(`¿Eliminar recurso "${r.nombre}"?`)) deleteRecursoMutation.mutate(r.idRecurso); }}
                    disabled={deleteRecursoMutation.isPending}
                  ><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin recursos adjuntos. Agrega enlaces o archivos.</p>
          )}
        </Card>

        {/* Create Recurso Dialog */}
        <Dialog open={showCreateRecurso} onOpenChange={o => { if (!o) { setShowCreateRecurso(false); setRecursoForm({ nombre: "", tipo: "enlace", url: "" }); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Agregar Recurso</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nombre *</label>
                <Input value={recursoForm.nombre} onChange={e => setRecursoForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del recurso" className="bg-input-background" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Tipo</label>
                <select className="w-full h-10 rounded-md border border-input bg-input-background px-3 text-sm" value={recursoForm.tipo} onChange={e => setRecursoForm(p => ({ ...p, tipo: e.target.value as "archivo" | "enlace" }))}>
                  <option value="enlace">Enlace (URL)</option>
                  <option value="archivo">Archivo</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">URL *</label>
                <Input value={recursoForm.url} onChange={e => setRecursoForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." className="bg-input-background" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreateRecurso(false); setRecursoForm({ nombre: "", tipo: "enlace", url: "" }); }}>Cancelar</Button>
              <Button onClick={() => selectedModuloId && handleCreateRecurso(selectedModuloId)} disabled={createRecursoMutation.isPending || !recursoForm.nombre || !recursoForm.url}>
                {createRecursoMutation.isPending ? "Guardando..." : "Agregar Recurso"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Aula de Formación</h1>
          <p className="text-muted-foreground text-sm">{min ? `${min.nombre} — Cursos y módulos de capacitación` : "Selecciona un ministerio"}</p>
        </div>
        <div className="flex gap-2">
          {ministerios.length > 0 && (
            <select
              value={actualMinId}
              onChange={(e) => { setSelectedMinId(Number(e.target.value)); setSelectedCursoId(null); }}
              className="border rounded-lg px-3 py-2 text-sm bg-card"
            >
              {ministerios.filter((m) => m.estado === "activo").map((m) => <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>)}
            </select>
          )}
          <Button onClick={() => setShowCreateCurso(true)}><Plus className="w-4 h-4 mr-2" /> Nuevo Curso</Button>
        </div>
      </div>

      {cursos.length === 0 ? (
        <Card className="p-12 text-center">
          <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-muted-foreground mb-2">Aula vacía</h3>
          <p className="text-sm text-muted-foreground">Aún no hay cursos de formación en este ministerio.</p>
          <Button className="mt-4" onClick={() => setShowCreateCurso(true)}><Plus className="w-4 h-4 mr-2" /> Crear primer curso</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {cursos.map((curso, idx) => {
            const isExpanded = expandedCursos.has(curso.idCurso);
            return (
              <Card key={curso.idCurso} className="overflow-hidden">
                <button onClick={() => toggleCurso(curso.idCurso)} className="w-full flex items-center gap-4 p-4 text-left hover:bg-accent/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"><Layers className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Curso {idx + 1}</Badge>
                      <h4 className="text-sm truncate">{curso.nombre}</h4>
                      {curso.duracionHoras && <span className="text-xs text-muted-foreground">({curso.duracionHoras}h)</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{curso.descripcion}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{curso.estado}</Badge>
                  {curso.cantidadModulos > 0 && <Badge variant="outline" className="text-xs shrink-0">{curso.cantidadModulos} módulos</Badge>}
                  {curso.cantidadInscritos > 0 && <Badge variant="outline" className="text-xs shrink-0">{curso.cantidadInscritos} inscritos</Badge>}
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCurso(curso.idCurso, curso.nombre); }}
                    disabled={deleteCursoMutation.isPending}
                    className="ml-1 p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors disabled:opacity-50"
                    title="Eliminar curso"
                  >
                    <span className="text-xs">✕</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditCurso({ id: curso.idCurso, nombre: curso.nombre, descripcion: curso.descripcion ?? "", estado: curso.estado }); }}
                    className="ml-1 p-1 rounded hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors"
                    title="Editar curso"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </button>
                {isExpanded && (
                  <div className="border-t bg-muted/20">
                    {curso.modulos?.sort((a, b) => a.orden - b.orden).map((modulo, mi) => (
                      <button key={modulo.idModulo} onClick={() => { setSelectedCursoId(curso.idCurso); setSelectedModuloId(modulo.idModulo); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors border-b last:border-0 group/mod">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs shrink-0">{mi + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{modulo.titulo}</p>
                          {modulo.recursos && modulo.recursos.length > 0 && <p className="text-xs text-muted-foreground">{modulo.recursos.length} recurso(s)</p>}
                        </div>
                        <Badge variant="outline" className="text-xs">{modulo.estado}</Badge>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteModulo(modulo.idModulo, modulo.titulo); }}
                          className="p-1 rounded hover:bg-destructive/10 text-destructive/50 hover:text-destructive opacity-0 group-hover/mod:opacity-100 transition-all"
                          disabled={deleteModuloMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))}
                    <button onClick={() => { setSelectedCursoId(curso.idCurso); setShowCreateModulo(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-left text-primary hover:bg-primary/5 transition-colors">
                      <Plus className="w-4 h-4" /><span className="text-sm">Agregar módulo</span>
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreateCurso} onOpenChange={setShowCreateCurso}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo Curso</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nombre *</label>
              <Input
                value={cursoForm.nombre}
                onChange={(e) => setCursoForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre del curso"
                className="bg-input-background"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Descripción</label>
              <Input
                value={cursoForm.descripcion}
                onChange={(e) => setCursoForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Descripción opcional"
                className="bg-input-background"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Duración (horas)</label>
              <Input
                type="number"
                value={cursoForm.duracionHoras}
                onChange={(e) => setCursoForm(p => ({ ...p, duracionHoras: e.target.value }))}
                placeholder="Ej: 40"
                className="bg-input-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCurso(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateCurso}
              disabled={createCursoMutation.isPending || !usuarioActual}
            >
              {createCursoMutation.isPending ? "Creando..." : "Crear Curso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateModulo} onOpenChange={setShowCreateModulo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo Módulo</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Título *</label>
              <Input
                value={moduloForm.titulo}
                onChange={(e) => setModuloForm(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Título del módulo"
                className="bg-input-background"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Descripción/Contenido</label>
              <textarea
                value={moduloForm.descripcion}
                onChange={(e) => setModuloForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Contenido del módulo..."
                className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1 min-h-[120px] resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModulo(false)}>Cancelar</Button>
            <Button
              onClick={() => selectedCursoId && handleCreateModulo(selectedCursoId)}
              disabled={createModuloMutation.isPending || !selectedCursoId}
            >
              {createModuloMutation.isPending ? "Creando..." : "Crear Módulo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Curso Dialog */}
      <Dialog open={!!editCurso} onOpenChange={o => { if (!o) setEditCurso(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Curso</DialogTitle></DialogHeader>
          {editCurso && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nombre *</label>
                <Input value={editCurso.nombre} onChange={e => setEditCurso(p => p ? { ...p, nombre: e.target.value } : p)} className="bg-input-background" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Descripción</label>
                <Input value={editCurso.descripcion} onChange={e => setEditCurso(p => p ? { ...p, descripcion: e.target.value } : p)} className="bg-input-background" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Estado</label>
                <select className="w-full h-10 rounded-md border border-input bg-input-background px-3 text-sm" value={editCurso.estado} onChange={e => setEditCurso(p => p ? { ...p, estado: e.target.value } : p)}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="archivado">Archivado</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCurso(null)}>Cancelar</Button>
            <Button onClick={handleUpdateCurso} disabled={updateCursoMutation.isPending}>
              {updateCursoMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
