import { useState } from "react";
import {
  useMinisteriosEnriquecidos, useDeleteMinisterio, useMiembrosMinisterio, useToggleMinisterioEstado, useCreateMinisterio,
} from "@/hooks/useMinisterios";
import type { Ministerio } from "@/types/app.types";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { motion } from "motion/react";
import { Users, Plus, Search, Power, PowerOff, BookOpen, UserCog, UsersRound, Trash2 } from "lucide-react";

const rolLabels: Record<string, string> = { lider: "Líder", servidor: "Servidor" };
const rolColors: Record<string, string> = { lider: "bg-indigo-100 text-indigo-700", servidor: "bg-gray-100 text-gray-700" };

function MinisterioDetail({ min, onBack }: { min: Ministerio; onBack: () => void }) {
  const { data: minMembers = [] } = useMiembrosMinisterio(min.idMinisterio);
  return (
    <div className="space-y-4 max-w-7xl mx-auto motion-preset-fade">
      {/* Header Compacto tipo Tarjeta */}
      <div className="bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10 pointer-events-none" />
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="w-10 h-10 rounded-xl bg-background/50 border border-white/5 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors hover:-translate-x-1 shrink-0">
             &larr;
           </button>
           <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
                <Users className="w-6 h-6 text-white" />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight leading-none mb-1">{min.nombre}</h1>
                <p className="text-muted-foreground text-xs">{min.descripcion}</p>
             </div>
           </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
           <Badge variant={min.estado === "activo" ? "default" : "secondary"} className={`px-3 py-1 text-[10px] uppercase font-bold tracking-widest ${min.estado === 'activo' ? 'bg-primary/10 text-primary border border-white/10' : ''}`}>{min.estado === "activo" ? "Activo" : "Inactivo"}</Badge>
        </div>
      </div>

      <Tabs defaultValue="miembros" className="w-full">
        <TabsList className="bg-card/40 backdrop-blur-md border border-white/10 p-1 rounded-xl mb-4 w-fit mx-auto md:mx-0 flex">
          <TabsTrigger value="miembros" className="rounded-lg text-xs font-medium px-4"><UsersRound className="w-4 h-4 mr-2" /> Directorio ({minMembers.length})</TabsTrigger>
          <TabsTrigger value="config" className="rounded-lg text-xs font-medium px-4"><UserCog className="w-4 h-4 mr-2" /> Configuración</TabsTrigger>
        </TabsList>
        <TabsContent value="miembros" className="outline-none">
          <Card className="bg-card/40 backdrop-blur-xl border-white/10 p-0 overflow-hidden shadow-sm rounded-2xl">
            <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/20">
               <div>
                  <h3 className="font-bold text-sm">Equipo Ministerial</h3>
                  <p className="text-xs text-muted-foreground">Gestiona los servidores y líderes asignados a esta área.</p>
               </div>
               <Button size="sm" className="h-9 rounded-xl text-xs transition-colors shadow-sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar Miembro</Button>
            </div>
            
            <div className="divide-y divide-border/30">
              {minMembers.map((mm) => (
                <div key={mm.idMiembroMinisterio} className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                     <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary text-xs font-bold ring-2 ring-background shadow-inner">{(mm.nombreCompleto || "?").charAt(0).toUpperCase()}</div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{mm.nombreCompleto}</p>
                       <p className="text-[11px] text-muted-foreground truncate">{mm.correo}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0 justify-end">
                     <Badge variant="outline" className={`${rolColors[mm.rolEnMinisterio || "servidor"]} border-white/10 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5`}>{rolLabels[mm.rolEnMinisterio || "servidor"] || mm.rolEnMinisterio}</Badge>
                     <Badge variant={mm.activo ? "secondary" : "outline"} className={`text-[10px] bg-background/50 border-white/5`}>{mm.activo ? "Activo" : "Inactivo"}</Badge>
                  </div>
                </div>
              ))}
              {minMembers.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                  <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center mb-3"><UsersRound className="w-6 h-6 opacity-50" /></div>
                  <p className="text-sm font-medium">Ministerio sin equipo</p>
                  <p className="text-xs">Usa el botón superior para añadir personas.</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="config" className="outline-none">
          <Card className="bg-card/40 backdrop-blur-xl border-white/10 p-6 shadow-sm rounded-2xl max-w-2xl">
             <div className="space-y-5">
                <div>
                   <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Nombre del Ministerio</label>
                   <Input value={min.nombre} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" readOnly />
                </div>
                <div>
                   <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Descripción del Propósito</label>
                   <Input value={min.descripcion || ""} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" readOnly />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                   <div>
                      <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Líder Asignado</label>
                      <Input value={min.liderNombre || "No asignado"} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" readOnly />
                   </div>
                   <div>
                      <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Estado del Ministerio</label>
                      <Input value={min.estado} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm capitalize" readOnly />
                   </div>
                </div>
                <div className="pt-4 border-t border-border/50">
                   <Button variant="secondary" className="bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl h-10 px-6 transition-colors font-semibold border-white/5 shadow-none">Actualizar Datos</Button>
                </div>
             </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function DepartmentsPage() {
  const { data: ministerios = [], isLoading } = useMinisteriosEnriquecidos();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMin, setSelectedMin] = useState<number | null>(null);

  const toggleEstadoMutation = useToggleMinisterioEstado();
  const createMinisterioMutation = useCreateMinisterio();
  const deleteMinisterioMutation = useDeleteMinisterio();

  function handleDeleteMinisterio(id: number, nombre: string) {
    if (!confirm(`¿Eliminar ministerio "${nombre}"? Esta acción no se puede deshacer.`)) return;
    deleteMinisterioMutation.mutate(id);
  }
  const [createForm, setCreateForm] = useState({ nombre: "", descripcion: "" });

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  const filtered = ministerios.filter((m) => m.nombre.toLowerCase().includes(search.toLowerCase()));
  const min = selectedMin ? ministerios.find((m) => m.idMinisterio === selectedMin) : null;

  if (selectedMin && min) {
    return <MinisterioDetail min={min} onBack={() => setSelectedMin(null)} />;
  }

  const handleCreateMinisterio = () => {
    if (!createForm.nombre.trim()) return;
    createMinisterioMutation.mutate(
      {
        nombre: createForm.nombre.trim(),
        descripcion: createForm.descripcion.trim() || null,
        idSede: 1, // MVP: single-sede demo
        estado: 'activo',
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setCreateForm({ nombre: "", descripcion: "" });
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Encabezado Principal y Controles Acoplados */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
        
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">Ministerios</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Gestiona la estructura organizativa de la iglesia</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input placeholder="Buscar ministerio..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-background/50 border-white/5 rounded-xl focus-visible:ring-primary/20 text-sm" />
          </div>
          <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto shrink-0 h-10 rounded-xl font-medium">
            <Plus className="w-4 h-4 mr-2" /> Nuevo
          </Button>
        </div>
      </motion.div>

      {/* Grid Bento de Ministerios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((m, i) => (
          <motion.div key={m.idMinisterio} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, ease: "easeOut" }}>
            <Card className={`group relative p-4 h-full bg-card/40 backdrop-blur-xl border border-white/10 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 rounded-2xl flex flex-col justify-between overflow-hidden ${m.estado !== "activo" ? "opacity-70 grayscale-[20%]" : ""}`} onClick={() => setSelectedMin(m.idMinisterio)}>
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
               
               <div>
                 <div className="relative z-10 flex items-start justify-between mb-3">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 group-hover:scale-105 transition-transform shrink-0">
                      <Users className="w-5 h-5 text-white" />
                   </div>
                   <Badge variant={m.estado === "activo" ? "default" : "secondary"} className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 ${m.estado === 'activo' ? 'bg-primary/10 text-primary border border-primary/20' : ''}`}>{m.estado === "activo" ? "Activo" : "Inactivo"}</Badge>
                 </div>
                 
                 <div className="relative z-10">
                   <h3 className="font-bold text-[15px] tracking-tight mb-1 group-hover:text-primary transition-colors leading-tight">{m.nombre}</h3>
                   <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-[34px]">{m.descripcion || "Sin descripción asignada."}</p>
                   
                   <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                         <div className="w-6 h-6 rounded-full bg-accent/60 flex items-center justify-center text-[10px] text-muted-foreground shrink-0"><UserCog className="w-3 h-3" /></div>
                         <span className="text-[11px] font-medium text-foreground/80 truncate">{m.liderNombre || "Sin líder asignado"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 bg-background/50 px-2 py-1 rounded-lg border border-white/5">
                         <UsersRound className="w-3.5 h-3.5 text-primary/70" />
                         <span className="text-[11px] font-bold text-foreground/80">{m.cantidadMiembros}</span>
                      </div>
                   </div>
                 </div>
               </div>

               <div className="relative z-10 mt-3 flex gap-2 w-full pt-1">
                  <Button variant="secondary" size="sm" className="flex-1 h-8 text-[11px] bg-background/50 hover:bg-primary/10 hover:text-primary border border-white/5 transition-colors font-medium shadow-none" onClick={(e) => { e.stopPropagation(); }}><BookOpen className="w-3.5 h-3.5 mr-1" /> Aula</Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 rounded-xl transition-all ${m.estado === "activo" ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`} 
                    disabled={toggleEstadoMutation.isPending} 
                    onClick={(e) => { e.stopPropagation(); toggleEstadoMutation.mutate(m.idMinisterio); }}
                  >
                    {m.estado === "activo" ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/50 hover:bg-red-500/10 hover:text-red-500 border border-white/5 text-muted-foreground shrink-0" disabled={deleteMinisterioMutation.isPending} onClick={(e) => { e.stopPropagation(); handleDeleteMinisterio(m.idMinisterio, m.nombre); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
               </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center text-muted-foreground">
             <div className="w-16 h-16 rounded-full bg-accent/50 flex flex-col items-center justify-center mb-4"><Search className="w-8 h-8 opacity-40" /></div>
             <p className="font-semibold text-sm">No se encontraron ministerios</p>
             <p className="text-xs">Prueba con otros términos de búsqueda o crea uno nuevo.</p>
          </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">Nuevo Ministerio</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Nombre del Ministerio</label>
              <Input
                value={createForm.nombre}
                onChange={(e) => setCreateForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej. Alabanza y Adoración"
                className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Descripción</label>
              <Input
                value={createForm.descripcion}
                onChange={(e) => setCreateForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Propósito y enfoque del ministerio"
                className="h-11 bg-background/50 border-white/10 rounded-xl text-sm"
              />
            </div>
          </div>
          <DialogFooter className="mt-2 border-t border-border/50 pt-4">
            <Button variant="ghost" className="rounded-xl" onClick={() => { setShowCreate(false); setCreateForm({ nombre: "", descripcion: "" }); }}>
              Cancelar
            </Button>
            <Button variant="default" className="rounded-xl" onClick={handleCreateMinisterio} disabled={!createForm.nombre.trim() || createMinisterioMutation.isPending}>
              {createMinisterioMutation.isPending ? "Creando..." : "Crear Ministerio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
