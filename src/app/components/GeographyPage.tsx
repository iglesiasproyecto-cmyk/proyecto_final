import { useState } from "react";
import {
  usePaises, useDepartamentos, useCiudades,
  useCreatePais, useUpdatePais, useDeletePais,
  useCreateDepartamento, useUpdateDepartamento, useDeleteDepartamento,
  useCreateCiudad, useUpdateCiudad, useDeleteCiudad,
} from "@/hooks/useGeografia";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { Globe, MapPin, Building, Plus, Pencil, Trash2, ChevronRight, ChevronDown, Search, X, Layers, Flag } from "lucide-react";
import { motion } from "motion/react";

export function GeographyPage() {
  const { data: paises = [], isLoading: paisesLoading } = usePaises();
  const { data: departamentosGeo = [], isLoading: deptosLoading } = useDepartamentos();
  const { data: ciudades = [], isLoading: ciudadesLoading } = useCiudades();
  const isLoading = paisesLoading || deptosLoading || ciudadesLoading;

  const [expandedPais, setExpandedPais] = useState<Set<number>>(new Set());
  const [expandedDep, setExpandedDep] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ type: "pais" | "dep" | "ciudad"; mode: "add" | "edit"; id?: number; parentId?: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: number; name: string } | null>(null);
  const [formNombre, setFormNombre] = useState("");

  const createPaisMutation = useCreatePais();
  const updatePaisMutation = useUpdatePais();
  const deletePaisMutation = useDeletePais();
  const createDeptoMutation = useCreateDepartamento();
  const updateDeptoMutation = useUpdateDepartamento();
  const deleteDeptoMutation = useDeleteDepartamento();
  const createCiudadMutation = useCreateCiudad();
  const updateCiudadMutation = useUpdateCiudad();
  const deleteCiudadMutation = useDeleteCiudad();

  if (isLoading) return (
    <div className="max-w-7xl mx-auto flex items-center justify-center p-12">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Cargando geografía...</p>
      </div>
    </div>
  );

  const togglePais = (id: number) => { const s = new Set(expandedPais); s.has(id) ? s.delete(id) : s.add(id); setExpandedPais(s); };
  const toggleDep = (id: number) => { const s = new Set(expandedDep); s.has(id) ? s.delete(id) : s.add(id); setExpandedDep(s); };

  const openDialog = (type: NonNullable<typeof dialog>["type"], mode: "add" | "edit", id?: number, parentId?: number) => {
    if (mode === "edit") {
      if (type === "pais") setFormNombre(paises.find(p => p.idPais === id)?.nombre || "");
      if (type === "dep") setFormNombre(departamentosGeo.find(d => d.idDepartamentoGeo === id)?.nombre || "");
      if (type === "ciudad") setFormNombre(ciudades.find(c => c.idCiudad === id)?.nombre || "");
    } else setFormNombre("");
    setDialog({ type, mode, id, parentId });
  };

  const isMutating =
    createPaisMutation.isPending || updatePaisMutation.isPending ||
    createDeptoMutation.isPending || updateDeptoMutation.isPending ||
    createCiudadMutation.isPending || updateCiudadMutation.isPending;

  const handleSubmit = () => {
    if (!formNombre.trim() || !dialog) return;
    const { type, mode, id, parentId } = dialog;
    if (type === "pais") {
      if (mode === "add") createPaisMutation.mutate(formNombre.trim(), { onSuccess: () => setDialog(null) });
      else if (id !== undefined) updatePaisMutation.mutate({ id, nombre: formNombre.trim() }, { onSuccess: () => setDialog(null) });
    }
    if (type === "dep") {
      if (mode === "add" && parentId !== undefined) createDeptoMutation.mutate({ nombre: formNombre.trim(), idPais: parentId }, { onSuccess: () => setDialog(null) });
      else if (mode === "edit" && id !== undefined) updateDeptoMutation.mutate({ id, nombre: formNombre.trim() }, { onSuccess: () => setDialog(null) });
    }
    if (type === "ciudad") {
      if (mode === "add" && parentId !== undefined) createCiudadMutation.mutate({ nombre: formNombre.trim(), idDepartamento: parentId }, { onSuccess: () => setDialog(null) });
      else if (mode === "edit" && id !== undefined) updateCiudadMutation.mutate({ id, nombre: formNombre.trim() }, { onSuccess: () => setDialog(null) });
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    const opts = { onSuccess: () => setConfirmDelete(null) };
    if (type === "pais") deletePaisMutation.mutate(id, opts);
    if (type === "dep") deleteDeptoMutation.mutate(id, opts);
    if (type === "ciudad") deleteCiudadMutation.mutate(id, opts);
  };

  const filteredPaises = search
    ? paises.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        departamentosGeo.some(d => d.idPais === p.idPais && d.nombre.toLowerCase().includes(search.toLowerCase())) ||
        ciudades.some(c => {
          const d = departamentosGeo.find(dd => dd.idDepartamentoGeo === c.idDepartamentoGeo);
          return d?.idPais === p.idPais && c.nombre.toLowerCase().includes(search.toLowerCase());
        })
      )
    : paises;

  const dialogTitle = dialog ? `${dialog.mode === "add" ? "Nuevo" : "Editar"} ${dialog.type === "pais" ? "País" : dialog.type === "dep" ? "Departamento" : "Ciudad"}` : "";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] shadow-blue-900/20 shrink-0">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Catálogos</p>
            <h1 className="text-3xl font-light tracking-tight">Gestión Geográfica</h1>
          </div>
        </div>
        <Button onClick={() => openDialog("pais", "add")} className="shrink-0 rounded-full px-6 bg-[#4682b4] hover:bg-[#4682b4]/90 shadow-lg shadow-blue-900/20"><Plus className="w-4 h-4 mr-2" /> Nuevo País</Button>
      </motion.div>

      {/* STATS ROW */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/20 shadow-sm dark:border-white/10 dark:bg-card/20 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1">
          <p className="text-3xl font-light text-[#4682b4] dark:text-[#709dbd]">{paises.length}</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5"/> Países</p>
        </div>
        <div className="p-5 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/20 shadow-sm dark:border-white/10 dark:bg-card/20 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1">
          <p className="text-3xl font-light text-violet-600 dark:text-violet-400">{departamentosGeo.length}</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Departamentos</p>
        </div>
        <div className="p-5 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/20 shadow-sm dark:border-white/10 dark:bg-card/20 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1">
          <p className="text-3xl font-light text-emerald-600 dark:text-emerald-400">{ciudades.length}</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-1.5"><Building className="w-3.5 h-3.5"/> Ciudades</p>
        </div>
      </motion.div>

      {/* ACTION BAR */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <div className="p-3 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/20 shadow-sm flex dark:border-white/10 dark:bg-card/20">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar países, departamentos o ciudades..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-11 bg-white/50 dark:bg-black/20 border-transparent focus-visible:ring-[#4682b4]/20 h-11 rounded-xl w-full" 
            />
          </div>
        </div>
      </motion.div>

      {/* LISTA GEOGRÁFICA */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-4">
        {filteredPaises.map(pais => {
          const deps = departamentosGeo.filter(d => d.idPais === pais.idPais);
          const isExpP = expandedPais.has(pais.idPais);
          return (
             <div key={pais.idPais} className="rounded-2xl bg-card/50 backdrop-blur-2xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden dark:border-white/10 dark:bg-card/20 transition-all">
                <div className="flex items-center gap-4 p-4 md:px-6 cursor-pointer hover:bg-white/40 dark:hover:bg-white/5 transition-colors" onClick={() => togglePais(pais.idPais)}>
                   <div className="w-10 h-10 rounded-xl bg-[#4682b4]/10 dark:bg-[#4682b4]/20 text-[#4682b4] dark:text-[#709dbd] shrink-0">
                      <Globe className="w-5 h-5" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-lg truncate">{pais.nombre}</p>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">{deps.length} {deps.length === 1 ? 'Departamento' : 'Departamentos'}</p>
                   </div>
                   <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-emerald-600 shrink-0 border border-emerald-500/20 bg-emerald-500/5 shadow-sm" onClick={() => openDialog("dep", "add", undefined, pais.idPais)} title="Agregar Departamento">
                         <Plus className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-6 bg-border/60 mx-1 hidden sm:block" />
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-foreground/70 shrink-0" onClick={() => openDialog("pais", "edit", pais.idPais)}>
                         <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-destructive/10 text-destructive shrink-0" onClick={() => setConfirmDelete({ type: "pais", id: pais.idPais, name: pais.nombre })}>
                         <Trash2 className="w-4 h-4" />
                      </Button>
                   </div>
                   <div className="ml-1 sm:ml-2">
                       {isExpP ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                   </div>
                </div>

                {isExpP && (
                  <div className="bg-white/20 dark:bg-black/10 border-t border-white/20 dark:border-white/5">
                    {deps.length === 0 && <p className="text-sm text-muted-foreground text-center py-6 italic">Sin departamentos registrados en este país.</p>}
                    <div className="flex flex-col">
                      {deps.map(dep => {
                        const cius = ciudades.filter(c => c.idDepartamentoGeo === dep.idDepartamentoGeo);
                        const isExpD = expandedDep.has(dep.idDepartamentoGeo);
                        return (
                           <div key={dep.idDepartamentoGeo}>
                              <div className="flex items-center gap-4 py-3 px-4 md:px-6 md:pl-12 cursor-pointer hover:bg-white/40 dark:hover:bg-white/5 border-b border-white/10 dark:border-white/5 last:border-0 transition-colors" onClick={() => toggleDep(dep.idDepartamentoGeo)}>
                                 <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                                    <MapPin className="w-4 h-4" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground/90 text-sm md:text-base truncate">{dep.nombre}</p>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">{cius.length} {cius.length === 1 ? 'Ciudad' : 'Ciudades'}</p>
                                 </div>
                                 <div className="flex items-center gap-1.5 md:gap-2" onClick={e => e.stopPropagation()}>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-emerald-600 shrink-0 border border-emerald-500/20 bg-emerald-500/5 shadow-sm" onClick={() => openDialog("ciudad", "add", undefined, dep.idDepartamentoGeo)} title="Agregar Ciudad">
                                       <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                    <div className="w-px h-5 bg-border/60 mx-1 hidden sm:block" />
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-foreground/70 shrink-0" onClick={() => openDialog("dep", "edit", dep.idDepartamentoGeo)}>
                                       <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 text-destructive shrink-0" onClick={() => setConfirmDelete({ type: "dep", id: dep.idDepartamentoGeo, name: dep.nombre })}>
                                       <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                 </div>
                                 <div className="ml-2 w-5 flex justify-center">
                                    {isExpD ? <ChevronDown className="w-4 h-4 text-muted-foreground/60" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/60" />}
                                 </div>
                              </div>
                              
                              {isExpD && cius.length > 0 && (
                                 <div className="bg-muted/10">
                                   {cius.map(ci => (
                                     <div key={ci.idCiudad} className="flex items-center gap-4 py-2.5 px-4 md:px-6 md:pl-[5.5rem] border-b border-border/30 last:border-0 hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
                                       <div className="flex items-center gap-3 flex-1 min-w-0">
                                         <Building className="w-4 h-4 text-emerald-500/80 shrink-0" />
                                         <span className="text-sm font-medium text-foreground/80 truncate">{ci.nombre}</span>
                                       </div>
                                       <div className="flex gap-1.5 pr-8">
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-foreground/70 shrink-0" onClick={() => openDialog("ciudad", "edit", ci.idCiudad)}>
                                             <Pencil className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full hover:bg-destructive/10 text-destructive shrink-0" onClick={() => setConfirmDelete({ type: "ciudad", id: ci.idCiudad, name: ci.nombre })}>
                                             <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                              )}
                           </div>
                        );
                      })}
                    </div>
                  </div>
                )}
             </div>
          );
        })}
        {filteredPaises.length === 0 && (
          <div className="col-span-full py-16 text-center rounded-3xl bg-card/30 border border-dashed border-border mt-4">
             <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
             <p className="text-base font-medium text-foreground">No se encontraron resultados</p>
             <p className="text-sm text-muted-foreground mt-1">Prueba con otras palabras de búsqueda</p>
          </div>
        )}
      </motion.div>

      {/* DIALOG CREAR/EDITAR */}
      <Dialog open={!!dialog} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border border-white/20 shadow-2xl">
          <div className="px-6 py-4 bg-muted/30 border-b border-border/40">
             <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
               {dialog?.mode === "edit" ? <Pencil className="w-5 h-5 text-[#4682b4]" /> : <Plus className="w-5 h-5 text-[#4682b4]" />} {dialogTitle}
             </DialogTitle></DialogHeader>
          </div>
          <div className="px-6 py-5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Nombre <span className="text-destructive">*</span></label>
            <Input 
              value={formNombre} 
              onChange={e => setFormNombre(e.target.value)} 
              placeholder={`Ej. ${dialog?.type === 'pais' ? 'Colombia' : dialog?.type === 'dep' ? 'Antioquia' : 'Medellín'}`} 
              className="bg-input-background focus-visible:ring-[#4682b4]/30 h-11" 
              onKeyDown={e => e.key === "Enter" && handleSubmit()} 
            />
          </div>
          <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex justify-end gap-3">
             <Button variant="ghost" onClick={() => setDialog(null)} className="rounded-full px-5"><X className="w-4 h-4 mr-1.5" /> Cancelar</Button>
             <Button onClick={handleSubmit} disabled={!formNombre.trim() || isMutating} className="rounded-full px-5 bg-[#4682b4] hover:bg-[#4682b4]/90 shadow-lg shadow-blue-900/20">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG ELIMINAR */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent className="rounded-2xl border border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Eliminar {confirmDelete?.type === "pais" ? "País" : confirmDelete?.type === "dep" ? "Departamento" : "Ciudad"}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              ¿Seguro que deseas eliminar "<strong className="text-foreground">{confirmDelete?.name}</strong>"? Esta acción es irreversible y podría afectar datos que dependan de esta ubicación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 text-right">
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm" disabled={deletePaisMutation.isPending || deleteDeptoMutation.isPending || deleteCiudadMutation.isPending}>
              Eliminar Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
