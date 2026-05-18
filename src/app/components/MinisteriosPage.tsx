import { useState } from "react";
import { useParams } from "react-router";
import {
  useMinisteriosEnriquecidos,
  useDeleteMinisterio,
  useToggleMinisterioEstado,
  useCreateMinisterio,
} from "@/hooks/useMinisterios";
import { useSedesEnriquecidas } from "@/hooks/useIglesias";
import { useCanManageMinisterio } from "@/hooks/useMinisterioRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { motion } from "motion/react";
import { Users, Plus, Search, Power, PowerOff, BookOpen, UserCog, UsersRound, Trash2, Settings } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { CardSkeleton } from "./loading/skeletons";
import { toast } from "sonner";
import { MinisterioDetailPanel } from "./MinisterioDetailPanel";


export function MinisteriosPage() {
  const { idIglesia } = useParams<{ idIglesia: string }>();
  const idIglesiaNum = Number(idIglesia) || undefined;
  const { iglesiaActual, iglesiasDelUsuario, rolActual, setIglesiaActual, sedesDelUsuario } = useApp();
  const { data: ministerios = [], isLoading, error } = useMinisteriosEnriquecidos(idIglesiaNum);
  const { data: todasSedes = [] } = useSedesEnriquecidas();
  const sedes = (() => {
    const baseSedes = idIglesiaNum
      ? todasSedes.filter(s => s.idIglesia === idIglesiaNum)
      : todasSedes;
    // Admin sede can only create ministerios in their own sedes
    if (rolActual === 'admin_sede' && sedesDelUsuario.length > 0) {
      const mySedeIds = new Set(sedesDelUsuario.map(s => s.id));
      return baseSedes.filter(s => mySedeIds.has(s.idSede));
    }
    return baseSedes;
  })();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMin, setSelectedMin] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; nombre: string } | null>(null);

  const toggleEstadoMutation = useToggleMinisterioEstado();
  const createMinisterioMutation = useCreateMinisterio();
  const deleteMinisterioMutation = useDeleteMinisterio();
  const canManageMinisterios = useCanManageMinisterio(null);

  function handleDeleteMinisterio(id: number, nombre: string) {
    setConfirmDelete({ id, nombre });
  }

  function executeDeleteMinisterio() {
    if (!confirmDelete) return;
    deleteMinisterioMutation.mutate(confirmDelete.id, {
      onSuccess: () => {
        toast.success(`Ministerio "${confirmDelete.nombre}" eliminado exitosamente`);
        setConfirmDelete(null);
      },
      onError: (error: any) => {
        toast.error(`Error al eliminar ministerio: ${error.message}`);
        setConfirmDelete(null);
      }
    });
  }
  const [createForm, setCreateForm] = useState({ nombre: "", descripcion: "", idSede: "" });

  if (isLoading) return (
    <div className="space-y-6 max-w-6xl mx-auto px-4">
      <div className="flex items-center gap-4 p-4">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <CardSkeleton items={6} columns={3} showActions />
    </div>
  );

  // Admin sede only sees ministerios from their assigned sedes
  const sedeFilteredMinisterios = (() => {
    if (rolActual === 'admin_sede' && sedesDelUsuario.length > 0) {
      const mySedeIds = new Set(sedesDelUsuario.map(s => s.id));
      return ministerios.filter(m => mySedeIds.has(m.idSede));
    }
    return ministerios;
  })();

  const filtered = sedeFilteredMinisterios.filter((m) => m.nombre.toLowerCase().includes(search.toLowerCase()));
  const min = selectedMin ? ministerios.find((m) => m.idMinisterio === selectedMin) : null;

  if (selectedMin && min) {
    return <MinisterioDetailPanel min={min} onBack={() => setSelectedMin(null)} />;
  }

  const handleCreateMinisterio = () => {
    if (!canManageMinisterios) {
      toast.error("No tienes permisos para crear ministerios");
      return;
    }
    if (!createForm.nombre.trim() || !createForm.idSede) {
      toast.error("Por favor completa nombre y sede");
      return;
    }

    // Verificar si ya existe un ministerio con el mismo nombre en la misma sede
    const existingMinisterio = ministerios.find(m =>
      m.nombre.toLowerCase() === createForm.nombre.trim().toLowerCase() &&
      m.idSede === parseInt(createForm.idSede)
    );

    if (existingMinisterio) {
      toast.error(`Ya existe un ministerio llamado "${existingMinisterio.nombre}" en esta sede. Por favor elige un nombre diferente.`);
      return;
    }

    createMinisterioMutation.mutate(
      {
        nombre: createForm.nombre.trim(),
        descripcion: createForm.descripcion.trim() || null,
        idSede: parseInt(createForm.idSede),
        estado: 'activo',
      },
      {
        onSuccess: () => {
          toast.success('Ministerio creado exitosamente');
          setShowCreate(false);
          setCreateForm({ nombre: "", descripcion: "", idSede: "" });
        },
        onError: (error: any) => {
          console.error('Error creando ministerio:', error);
          if (error.message?.includes('duplicate key') || error.code === '23505') {
            toast.error('Ya existe un ministerio con este nombre en la sede seleccionada. Por favor elige un nombre diferente.');
          } else {
            toast.error(`Error al crear el ministerio: ${error.message || 'Error desconocido'}`);
          }
        }
      }
    );
  };

  // Validación en tiempo real del nombre
  const isNombreDuplicado = createForm.nombre.trim() && createForm.idSede &&
    ministerios.some(m =>
      m.nombre.toLowerCase() === createForm.nombre.trim().toLowerCase() &&
      m.idSede === parseInt(createForm.idSede)
    );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Encabezado Principal y Controles Acoplados */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
        
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-medium uppercase tracking-[0.2em] text-[10px] mb-1">Estructura</p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">Ministerios</h1>
            <p className="text-foreground font-normal text-xs sm:text-sm mt-1">Gestiona la estructura organizativa de la iglesia</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors" />
            <Input 
              placeholder="Buscar ministerio..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9 h-10 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/80 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-300 text-sm" 
            />
          </div>
          {canManageMinisterios && (
            <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto shrink-0 h-10 rounded-xl font-medium bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 transition-all">
            <Plus className="w-4 h-4 mr-2" /> Nuevo
            </Button>
          )}
        </div>
      </motion.div>

      {/* Grid Bento de Ministerios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((m, i) => (
          <motion.div key={m.idMinisterio} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, ease: "easeOut" }}>
            <Card className={`group relative p-4 h-full bg-card/40 backdrop-blur-xl border border-border/50 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 rounded-2xl flex flex-col justify-between overflow-hidden ${m.estado !== "activo" ? "opacity-70 grayscale-[20%]" : ""}`} onClick={() => setSelectedMin(m.idMinisterio)}>
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
               
               <div>
                 <div className="relative z-10 flex items-start justify-between mb-3">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform shrink-0">
                      <Users className="w-5 h-5 text-white" />
                   </div>
                   <Badge variant={m.estado === "activo" ? "default" : "secondary"} className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 ${m.estado === 'activo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200' : ''}`}>{m.estado === "activo" ? "Activo" : "Inactivo"}</Badge>
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
                  {canManageMinisterios && (
                    <>
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
                    </>
                  )}
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
                className={`h-11 bg-background/50 border-white/10 rounded-xl text-sm ${isNombreDuplicado ? 'border-red-500 focus-visible:ring-red-500/30' : ''}`}
              />
              {isNombreDuplicado && (
                <p className="text-red-500 text-xs mt-1">⚠️ Ya existe un ministerio con este nombre en la sede seleccionada</p>
              )}
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
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Sede</label>
              <Select value={createForm.idSede} onValueChange={(value) => setCreateForm(p => ({ ...p, idSede: value }))}>
                <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                  <SelectValue placeholder="Selecciona una sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map((sede) => (
                    <SelectItem key={sede.idSede} value={sede.idSede.toString()}>
                      {sede.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-2 border-t border-border/50 pt-4">
            <Button variant="ghost" className="rounded-xl" onClick={() => { setShowCreate(false); setCreateForm({ nombre: "", descripcion: "", idSede: "" }); }}>
              Cancelar
            </Button>
            <Button variant="default" className="rounded-xl" onClick={handleCreateMinisterio} disabled={!createForm.nombre.trim() || !createForm.idSede || createMinisterioMutation.isPending || isNombreDuplicado}>
              {createMinisterioMutation.isPending ? "Creando..." : "Crear Ministerio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={executeDeleteMinisterio}
        title="Eliminar Ministerio"
        description={`¿Estás seguro de que deseas eliminar el ministerio "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText={deleteMinisterioMutation.isPending ? "Eliminando..." : "Eliminar"}
        isDestructive
      />
    </div>
  );
}
