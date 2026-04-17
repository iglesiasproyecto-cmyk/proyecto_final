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
import { Building2, Plus, Pencil, Search, Power, PowerOff, Trash2, MapPin, X, Save, Globe, Users } from "lucide-react";
import { AnimatedCard } from "./ui/AnimatedCard";

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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Estructura</p>
            <h1 className="text-3xl font-light tracking-tight text-foreground">Gestión de Sedes</h1>
          </div>
        </div>
        <Button onClick={openAdd} className="shrink-0 shadow-md shadow-primary/20 rounded-full px-6 bg-[#4682b4] hover:bg-[#4682b4]/90 shadow-blue-900/20">
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
              className="pl-11 bg-white/50 dark:bg-black/20 border-transparent focus-visible:ring-[#4682b4]/20 h-11 rounded-xl" 
            />
          </div>
          <Select value={filterIglesia} onValueChange={setFilterIglesia}>
            <SelectTrigger className="w-full md:w-56 bg-white/50 dark:bg-black/20 border-transparent h-11 rounded-xl focus:ring-[#4682b4]/20">
              <SelectValue placeholder="Iglesia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Iglesias</SelectItem>
              {iglesias.map(i => <SelectItem key={i.idIglesia} value={String(i.idIglesia)}>{i.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-full md:w-48 bg-white/50 dark:bg-black/20 border-transparent h-11 rounded-xl focus:ring-[#4682b4]/20">
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

      {/* KPI Stats Row (Bento style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatedCard index={0} className="p-5">
           <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shadow-lg">
                 <Building2 className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-0">Total</Badge>
           </div>
           <p className="text-3xl font-light tracking-tight text-foreground">{sedes.length}</p>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Sedes Registradas</p>
        </AnimatedCard>
        <AnimatedCard index={1} className="p-5">
           <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
                 <Power className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border-0">OK</Badge>
           </div>
           <p className="text-3xl font-light tracking-tight text-foreground">{sedes.filter(s => s.estado === 'activa').length}</p>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Sedes Activas</p>
        </AnimatedCard>
        <AnimatedCard index={2} className="p-5">
           <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
                 <Globe className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border-0">Geografía</Badge>
           </div>
           <p className="text-3xl font-light tracking-tight text-foreground">{new Set(sedes.map(s => s.idCiudad)).size}</p>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Ciudades Cubiertas</p>
        </AnimatedCard>
        <AnimatedCard index={3} className="p-5">
           <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                 <Users className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-500 border-0">Staff</Badge>
           </div>
           <p className="text-3xl font-light tracking-tight text-foreground">{sedes.reduce((acc, s) => acc + (s.cantidadMinisterios || 0), 0)}</p>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Min. Operativos</p>
        </AnimatedCard>
      </div>

      {/* GRID PRINCIPAL de Sedes (Bento Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((s, idx) => (
          <AnimatedCard 
            key={s.idSede} 
            index={idx} 
            className={`group p-6 flex flex-col justify-between ${s.estado !== 'activa' ? 'opacity-80 grayscale-[0.3]' : ''}`}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-[20px] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Building2 className={`w-6 h-6 ${s.estado === 'activa' ? 'text-[#4682b4]' : 'text-muted-foreground'}`} />
                </div>
                <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest border-0 py-1 px-3 rounded-lg shadow-sm ${estadoColor(s.estado)}`}>
                  {estadoLabel(s.estado)}
                </Badge>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-[#4682b4] transition-colors line-clamp-1 uppercase italic leading-none">{s.nombre}</h3>
                <p className="text-[11px] font-bold text-[#4682b4]/70 uppercase tracking-widest truncate">{lookupIglesia(s.idIglesia)}</p>
              </div>

              <div className="mt-5 space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-center gap-3 text-[13px] text-muted-foreground/80 font-medium">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{s.ciudadNombre || "Ciudad no def."}</span>
                </div>
                {s.direccion && (
                  <p className="text-[11px] text-muted-foreground/60 italic line-clamp-1 pl-10">
                    {s.direccion}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className="h-8 px-3 rounded-lg bg-[#4682b4]/10 border border-[#4682b4]/20 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#4682b4]" />
                    <span className="text-xs font-black text-[#4682b4]">{s.cantidadMinisterios}</span>
                 </div>
              </div>

              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-black/5 dark:hover:bg-white/10" onClick={() => openEdit(s.idSede)}>
                  <Pencil className="w-4 h-4 text-foreground/70" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-9 w-9 p-0 rounded-xl transition-all ${s.estado === "activa" ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`} 
                  onClick={() => toggleSedeMutation.mutate(s.idSede)} 
                >
                  {s.estado === "activa" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-red-500/10 text-red-500" onClick={() => handleDeleteSede(s.idSede, s.nombre)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-24 text-center rounded-[40px] bg-card/30 backdrop-blur-3xl border border-white/10 shadow-xl">
          <MapPin className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-foreground/80 tracking-tight">Expediente Vacío</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">No se encontraron sedes activas con los criterios de búsqueda actuales.</p>
        </div>
      )}

      {/* MODAL (Diálogo de Creación / Edición) */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border border-white/20 shadow-2xl">
          <div className="px-6 py-4 bg-muted/30 border-b border-border/40">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                {editing ? <Pencil className="w-5 h-5 text-[#4682b4]" /> : <Plus className="w-5 h-5 text-[#4682b4]" />} 
                {editing ? "Editar Sede" : "Registrar Nueva Sede"}
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Nombre de la Sede <span className="text-destructive">*</span></label>
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="bg-input-background focus-visible:ring-[#4682b4]/30" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Dirección Física</label>
              <Input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} className="bg-input-background focus-visible:ring-[#4682b4]/30" placeholder="Ej. Calle 123 #45-67" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Iglesia Asignada <span className="text-destructive">*</span></label>
                <Select value={form.idIglesia ? String(form.idIglesia) : ""} onValueChange={v => setForm(f => ({ ...f, idIglesia: Number(v) }))}>
                  <SelectTrigger className="bg-input-background focus:ring-[#4682b4]/30"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{iglesias.map(i => <SelectItem key={i.idIglesia} value={String(i.idIglesia)}>{i.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Ciudad <span className="text-destructive">*</span></label>
                <Select value={form.idCiudad ? String(form.idCiudad) : ""} onValueChange={v => setForm(f => ({ ...f, idCiudad: Number(v) }))}>
                  <SelectTrigger className="bg-input-background focus:ring-[#4682b4]/30"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
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
                <SelectTrigger className="bg-input-background focus:ring-[#4682b4]/30"><SelectValue /></SelectTrigger>
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
            <Button onClick={handleSubmit} disabled={!form.nombre.trim() || !form.idCiudad || !form.idIglesia} className="rounded-full px-5 bg-[#4682b4] hover:bg-[#4682b4]/90 shadow-blue-900/20"><Save className="w-4 h-4 mr-1.5" /> Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
