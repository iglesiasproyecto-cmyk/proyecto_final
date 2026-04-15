import { useState } from "react";
import { useSedesEnriquecidas, useIglesias, useCreateSede, useUpdateSede, useToggleSedeEstado, useDeleteSede } from "@/hooks/useIglesias";
import { useApp } from "@/app/store/AppContext";
import { useCiudades } from "@/hooks/useGeografia";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { motion } from "motion/react";
import { Building2, Plus, Pencil, Search, Power, PowerOff, Trash2, MapPin, X, Save } from "lucide-react";

export function SedesPage() {
  const { iglesiaActual } = useApp();
  const { data: sedes = [], isLoading } = useSedesEnriquecidas(iglesiaActual?.id);
  const { data: iglesias = [] } = useIglesias();
  const { data: ciudades = [] } = useCiudades();
  const [search, setSearch] = useState("");
  const [filterIglesia, setFilterIglesia] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: "", direccion: "", idCiudad: 0, idIglesia: 0, estado: "activa" as "activa" | "inactiva" | "en_construccion" });

  const createSedeMutation = useCreateSede();
  const updateSedeMutation = useUpdateSede();
  const toggleSedeMutation = useToggleSedeEstado();
  const deleteSedeMutation = useDeleteSede();

  if (isLoading) return (
    <div className="max-w-7xl mx-auto flex items-center justify-center p-12">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Cargando sedes...</p>
      </div>
    </div>
  );

  const openAdd = () => { setForm({ nombre: "", direccion: "", idCiudad: 0, idIglesia: 0, estado: "activa" }); setEditing(null); setDialog(true); };
  
  const openEdit = (id: number) => {
    const s = sedes.find(x => x.idSede === id); if (!s) return;
    setForm({ nombre: s.nombre, direccion: s.direccion || "", idCiudad: s.idCiudad || 0, idIglesia: s.idIglesia, estado: s.estado });
    setEditing(id); setDialog(true);
  };

  const handleSubmit = () => {
    if (!form.nombre.trim() || !form.idCiudad || !form.idIglesia) return;
    if (editing) updateSedeMutation.mutate(
      { id: editing, data: { nombre: form.nombre, direccion: form.direccion || null, idCiudad: form.idCiudad, idIglesia: form.idIglesia, estado: form.estado } },
      { onSuccess: () => { setEditing(null); setDialog(false); } }
    );
    else createSedeMutation.mutate(
      { nombre: form.nombre, direccion: form.direccion || null, idCiudad: form.idCiudad, idIglesia: form.idIglesia, estado: form.estado },
      { onSuccess: () => { setEditing(null); setDialog(false); } }
    );
  };

  const handleDeleteSede = (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar sede "${nombre}"? Esta acción es irreversible.`)) return;
    deleteSedeMutation.mutate(id);
  };

  const lookupIglesia = (idIglesia: number) => iglesias.find(i => i.idIglesia === idIglesia)?.nombre || "-";
  const estadoColor = (e: string) => e === "activa" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200" : e === "inactiva" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200";
  const estadoLabel = (e: string) => e === "activa" ? "Activa" : e === "inactiva" ? "Inactiva" : "En Construcción";

  const filtered = sedes.filter(s => {
    if (search && !s.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterIglesia !== "all" && s.idIglesia !== Number(filterIglesia)) return false;
    if (filterEstado !== "all" && s.estado !== filterEstado) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* HEADER: Diferencia clara de títulos y subtítulos por color/tamaño */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Estructura</p>
            <h1 className="text-3xl font-light tracking-tight text-foreground">Gestión de Sedes</h1>
          </div>
        </div>
        <Button onClick={openAdd} className="shrink-0 shadow-md shadow-primary/20 rounded-full px-6 bg-cyan-600 hover:bg-cyan-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Nueva Sede
        </Button>
      </motion.div>

      {/* ACTION BAR: Estética Glass */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <div className="p-3 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/20 shadow-sm flex flex-col md:flex-row gap-3 dark:border-white/10 dark:bg-card/20">
          <div className="relative flex-1 md:max-w-md">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar sedes por nombre..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-11 bg-white/50 dark:bg-black/20 border-transparent focus-visible:ring-cyan-600/20 h-11 rounded-xl" 
            />
          </div>
          <Select value={filterIglesia} onValueChange={setFilterIglesia}>
            <SelectTrigger className="w-full md:w-56 bg-white/50 dark:bg-black/20 border-transparent h-11 rounded-xl focus:ring-cyan-600/20">
              <SelectValue placeholder="Iglesia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Iglesias</SelectItem>
              {iglesias.map(i => <SelectItem key={i.idIglesia} value={String(i.idIglesia)}>{i.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-full md:w-48 bg-white/50 dark:bg-black/20 border-transparent h-11 rounded-xl focus:ring-cyan-600/20">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Estados</SelectItem>
              <SelectItem value="activa">Activa</SelectItem>
              <SelectItem value="inactiva">Inactiva</SelectItem>
              <SelectItem value="en_construccion">En Construcción</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* TABLA PRINCIPAL en contenedor unificado */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <div className="rounded-2xl bg-card/50 backdrop-blur-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden dark:border-white/10 dark:bg-card/20">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Nombre Sede</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Iglesia Principal</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Mins.</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Ubicación</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Estado</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.idSede} className={`transition-colors hover:bg-white/40 dark:hover:bg-white/5 border-border/40 ${s.estado !== 'activa' ? 'opacity-70' : ''}`}>
                    <TableCell className="py-4">
                      <div className="font-medium text-foreground">{s.nombre}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {lookupIglesia(s.idIglesia)}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <span className="inline-flex w-7 h-7 bg-primary/10 text-primary rounded-full items-center justify-center font-bold text-xs">
                        {s.cantidadMinisterios}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5 text-sm text-foreground/80">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{s.ciudadNombre || "-"}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 ml-5 truncate max-w-[150px]">{s.direccion || "Sin dirección"}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={`font-semibold tracking-wide border ${estadoColor(s.estado)}`}>
                        {estadoLabel(s.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-black/5 dark:hover:bg-white/10" onClick={() => openEdit(s.idSede)}>
                          <Pencil className="w-3.5 h-3.5 text-foreground/70" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-black/5 dark:hover:bg-white/10" onClick={() => toggleSedeMutation.mutate(s.idSede)} title={s.estado === "activa" ? "Desactivar" : "Activar"}>
                          {s.estado === "activa" ? <PowerOff className="w-3.5 h-3.5 text-amber-500" /> : <Power className="w-3.5 h-3.5 text-emerald-500" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10" onClick={() => handleDeleteSede(s.idSede, s.nombre)} disabled={deleteSedeMutation.isPending}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-base font-medium text-foreground">No se encontraron sedes</p>
                      <p className="text-sm text-muted-foreground mt-1">Prueba con otros filtros o términos de búsqueda</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>

      {/* MODAL (Diálogo de Creación / Edición) */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border border-white/20 shadow-2xl">
          <div className="px-6 py-4 bg-muted/30 border-b border-border/40">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                {editing ? <Pencil className="w-5 h-5 text-cyan-600" /> : <Plus className="w-5 h-5 text-cyan-600" />} 
                {editing ? "Editar Sede" : "Registrar Nueva Sede"}
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Nombre de la Sede <span className="text-destructive">*</span></label>
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="bg-input-background focus-visible:ring-cyan-600/30" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Dirección Física</label>
              <Input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} className="bg-input-background focus-visible:ring-cyan-600/30" placeholder="Ej. Calle 123 #45-67" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Iglesia Asignada <span className="text-destructive">*</span></label>
                <Select value={form.idIglesia ? String(form.idIglesia) : ""} onValueChange={v => setForm(f => ({ ...f, idIglesia: Number(v) }))}>
                  <SelectTrigger className="bg-input-background focus:ring-cyan-600/30"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{iglesias.map(i => <SelectItem key={i.idIglesia} value={String(i.idIglesia)}>{i.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Ciudad <span className="text-destructive">*</span></label>
                <Select value={form.idCiudad ? String(form.idCiudad) : ""} onValueChange={v => setForm(f => ({ ...f, idCiudad: Number(v) }))}>
                  <SelectTrigger className="bg-input-background focus:ring-cyan-600/30"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {ciudades.map(c => (
                      <SelectItem key={c.idCiudad} value={String(c.idCiudad)}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Estado Inicial</label>
              <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v as "activa" | "inactiva" | "en_construccion" }))}>
                <SelectTrigger className="bg-input-background focus:ring-cyan-600/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="inactiva">Inactiva</SelectItem>
                  <SelectItem value="en_construccion">En Construcción</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDialog(false)} className="rounded-full px-5"><X className="w-4 h-4 mr-1.5" /> Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.nombre.trim() || !form.idCiudad || !form.idIglesia} className="rounded-full px-5 bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm shadow-cyan-600/20"><Save className="w-4 h-4 mr-1.5" /> Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
