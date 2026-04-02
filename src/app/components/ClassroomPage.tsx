import { useState } from "react";
import { useCursos } from "@/hooks/useCursos";
import { useMinisterios } from "@/hooks/useMinisterios";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Plus, ChevronRight, ChevronDown, FileText, Link as LinkIcon, Download, ExternalLink, GraduationCap, Layers, ArrowLeft } from "lucide-react";

export function ClassroomPage() {
  const { data: ministerios = [] } = useMinisterios();
  const [selectedMinId, setSelectedMinId] = useState<number | null>(null);
  const actualMinId = selectedMinId ?? ministerios[0]?.idMinisterio ?? 0;
  const { data: cursos = [], isLoading } = useCursos(actualMinId || undefined);
  const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null);
  const [selectedModuloId, setSelectedModuloId] = useState<number | null>(null);
  const [expandedCursos, setExpandedCursos] = useState<Set<number>>(new Set());
  const [showCreateCurso, setShowCreateCurso] = useState(false);
  const [showCreateModulo, setShowCreateModulo] = useState(false);

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  const selectedCurso = selectedCursoId ? cursos.find((c) => c.idCurso === selectedCursoId) : null;
  const selectedModulo = selectedModuloId && selectedCurso ? selectedCurso.modulos?.find((m) => m.idModulo === selectedModuloId) : null;
  const min = ministerios.find((m) => m.idMinisterio === actualMinId);

  const toggleCurso = (id: number) => {
    const next = new Set(expandedCursos);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedCursos(next);
  };

  if (selectedModulo && selectedCurso) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <button onClick={() => setSelectedModuloId(null)} className="flex items-center gap-2 text-primary hover:underline text-sm"><ArrowLeft className="w-4 h-4" /> Volver al curso</button>
        <div><Badge variant="secondary" className="mb-2">{selectedCurso.nombre}</Badge><h1>{selectedModulo.titulo}</h1></div>
        <Card className="p-6"><div className="prose max-w-none"><p className="text-sm text-muted-foreground leading-relaxed">{selectedModulo.descripcion}</p></div></Card>
        {selectedModulo.recursos && selectedModulo.recursos.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-4 flex items-center gap-2"><Download className="w-5 h-5 text-primary" /> Recursos Adjuntos</h3>
            <div className="space-y-2">
              {selectedModulo.recursos.map((r) => (
                <div key={r.idRecurso} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
                  {r.tipo === "archivo" ? <FileText className="w-5 h-5 text-primary" /> : <LinkIcon className="w-5 h-5 text-primary" />}
                  <span className="flex-1 text-sm">{r.nombre}</span>
                  <Button variant="ghost" size="sm">{r.tipo === "archivo" ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}</Button>
                </div>
              ))}
            </div>
          </Card>
        )}
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
                  <span className="text-xs text-muted-foreground shrink-0">{curso.modulos?.length || 0} módulos</span>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <div className="border-t bg-muted/20">
                    {curso.modulos?.sort((a, b) => a.orden - b.orden).map((modulo, mi) => (
                      <button key={modulo.idModulo} onClick={() => { setSelectedCursoId(curso.idCurso); setSelectedModuloId(modulo.idModulo); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors border-b last:border-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs shrink-0">{mi + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{modulo.titulo}</p>
                          {modulo.recursos && modulo.recursos.length > 0 && <p className="text-xs text-muted-foreground">{modulo.recursos.length} recurso(s)</p>}
                        </div>
                        <Badge variant="outline" className="text-xs">{modulo.estado}</Badge>
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
          <div className="space-y-3">
            <div><label className="text-sm">Nombre</label><Input placeholder="Nombre del curso" className="mt-1" /></div>
            <div><label className="text-sm">Descripción</label><Input placeholder="Descripción breve" className="mt-1" /></div>
            <div><label className="text-sm">Duración (horas)</label><Input type="number" placeholder="12" className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCurso(false)}>Cancelar</Button>
            <Button onClick={() => setShowCreateCurso(false)}>Crear Curso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateModulo} onOpenChange={setShowCreateModulo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo Módulo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm">Título</label><Input placeholder="Título del módulo" className="mt-1" /></div>
            <div><label className="text-sm">Descripción/Contenido</label><textarea placeholder="Contenido del módulo..." className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1 min-h-[120px] resize-y" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModulo(false)}>Cancelar</Button>
            <Button onClick={() => setShowCreateModulo(false)}>Crear Módulo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
