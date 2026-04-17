import { useState } from "react";
import { useIglesiasEnriquecidas, useCreateIglesia, useUpdateIglesia, useToggleIglesiaEstado, useDeleteIglesia } from "@/hooks/useIglesias";
import type { Iglesia } from "@/types/app.types";
import type { IglesiaEnriquecida } from "@/services/iglesias.service";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useCiudades } from "@/hooks/useGeografia";
import { motion } from "motion/react";
import { Building2, Plus, Search, MapPin, Power, PowerOff, Globe, Pencil, Save, X, Calendar, MoreVertical } from "lucide-react";

const estadoLabels: Record<string, string> = {
  activa: "Activa",
  inactiva: "Inactiva",
  fusionada: "Fusionada",
  cerrada: "Cerrada",
};

interface IglesiaFormData {
  nombre: string;
  fechaFundacion: string;
  idCiudad: number;
}

// Componente Glass para las tarjetas de iglesias al estilo Dashboard
function GlassCard({ children, index = 0, isActive = true }: { children: React.ReactNode; index?: number; isActive?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
      className="h-full"
    >
      <div 
        className={`h-full relative overflow-hidden rounded-2xl bg-card/40 backdrop-blur-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300 dark:border-white/10 dark:bg-card/20 hover:shadow-lg hover:bg-card/60 hover:-translate-y-1 ${!isActive ? "opacity-75 grayscale-[0.2]" : ""}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
        <div className="relative z-10 p-5 flex flex-col h-full">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

export function ChurchesPage() {
  const { data: iglesias = [], isLoading } = useIglesiasEnriquecidas();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "activa" | "inactiva">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingIglesia, setEditingIglesia] = useState<IglesiaEnriquecida | null>(null);
  const [form, setForm] = useState<IglesiaFormData>({ nombre: "", fechaFundacion: "", idCiudad: 0 });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof IglesiaFormData, string>>>({});
  
  const createIglesiaMutation = useCreateIglesia();
  const updateIglesiaMutation = useUpdateIglesia();
  const toggleEstadoMutation = useToggleIglesiaEstado();
  const deleteIglesiaMutation = useDeleteIglesia();
  const { data: ciudades = [] } = useCiudades();

  if (isLoading) return (
    <div className="max-w-7xl mx-auto flex items-center justify-center p-12">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Cargando iglesias...</p>
      </div>
    </div>
  );

  const updateField = (field: keyof IglesiaFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof IglesiaFormData, string>> = {};
    if (!form.nombre.trim()) errors.nombre = "El nombre es requerido";
    if (!form.idCiudad) errors.idCiudad = "La ciudad es requerida";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = () => {
    if (!editingIglesia || !validateForm()) return;
    updateIglesiaMutation.mutate(
      { id: editingIglesia.idIglesia, data: { nombre: form.nombre.trim(), fechaFundacion: form.fechaFundacion || null } },
      { onSuccess: () => setEditingIglesia(null) }
    );
  };

  const handleCreate = () => {
    if (!validateForm()) return;
    createIglesiaMutation.mutate(
      { nombre: form.nombre.trim(), fechaFundacion: form.fechaFundacion || null, estado: "activa", idCiudad: Number(form.idCiudad) },
      { onSuccess: () => setShowCreate(false) }
    );
  };

  const handleDeleteIglesia = (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
    deleteIglesiaMutation.mutate(id);
  };

  const filtered = iglesias.filter((ig) => {
    const matchSearch = ig.nombre.toLowerCase().includes(search.toLowerCase()) || (ig.ciudadNombre || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "activa" && ig.estado === "activa") || (filter === "inactiva" && ig.estado !== "activa");
    return matchSearch && matchFilter;
  });

  const renderFormFields = () => (
    <div className="space-y-5 py-2">
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Nombre <span className="text-destructive">*</span></label>
        <Input value={form.nombre} onChange={(e) => updateField("nombre", e.target.value)} placeholder="Ej. Iglesia Central" className={`bg-input-background transition-all ${formErrors.nombre ? "border-destructive ring-destructive/20" : "focus-visible:ring-primary/20"}`} />
        {formErrors.nombre && <p className="text-destructive text-[11px] font-medium mt-1">{formErrors.nombre}</p>}
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Fecha de Fundación</label>
        <Input type="date" value={form.fechaFundacion} onChange={(e) => updateField("fechaFundacion", e.target.value)} className="bg-input-background focus-visible:ring-primary/20" />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Ciudad <span className="text-destructive">*</span></label>
        <Select
          value={form.idCiudad ? String(form.idCiudad) : ""}
          onValueChange={v => setForm(prev => ({ ...prev, idCiudad: Number(v) }))}
        >
          <SelectTrigger className={`bg-input-background transition-all ${formErrors.idCiudad ? "border-destructive ring-destructive/20" : "focus-visible:ring-primary/20"}`}>
            <SelectValue placeholder="Seleccionar ciudad" />
          </SelectTrigger>
          <SelectContent>
            {ciudades.map(c => (
              <SelectItem key={c.idCiudad} value={String(c.idCiudad)}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formErrors.idCiudad && <p className="text-destructive text-[11px] font-medium mt-1">{formErrors.idCiudad}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header unificado con controles */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Directorio</p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">Gestión de Iglesias</h1>
            </div>
          </div>
          <Button onClick={() => { setForm({ nombre: "", fechaFundacion: "", idCiudad: 0 }); setFormErrors({}); setShowCreate(true); }} className="w-full sm:w-auto shrink-0 h-10 rounded-xl font-medium bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white shadow-lg shadow-cyan-600/30 hover:shadow-cyan-500/40 transition-all">
            <Plus className="w-4 h-4 mr-2" /> Nueva Iglesia
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1 border-t border-border/30">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input 
              placeholder="Buscar por nombre o ciudad..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10 h-10 bg-background/60 border border-border/40 rounded-xl shadow-sm focus-visible:ring-primary/30 focus-visible:border-primary/40 text-sm" 
            />
          </div>
          <div className="flex gap-1.5 p-1 bg-background/60 border border-border/40 rounded-xl shadow-sm overflow-x-auto h-10 items-center">
            {(["all", "activa", "inactiva"] as const).map((f) => (
              <Button 
                key={f} 
                variant={filter === f ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setFilter(f)} 
                className={`h-full px-4 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filter === f ? "shadow-sm bg-gradient-to-r from-cyan-600 to-blue-700 text-white hover:from-cyan-500 hover:to-blue-600" : "text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/5"}`}
              >
                {f === "all" ? "Todas" : f === "activa" ? "Activas" : "Inactivas"}
              </Button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Grid de Iglesias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((ig, i) => (
          <GlassCard key={ig.idIglesia} index={i} isActive={ig.estado === "activa"}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner border border-primary/10 transition-transform hover:scale-105">
                <Building2 className="w-7 h-7 text-primary/80" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant={ig.estado === "activa" ? "default" : "secondary"} className={`shadow-sm tracking-wide ${ig.estado === "activa" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200" : ""}`}>{estadoLabels[ig.estado]}</Badge>
                {ig.cantidadSedes > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-card/50 border-white/50 dark:border-white/10 uppercase font-semibold">
                    {ig.cantidadSedes} {ig.cantidadSedes === 1 ? "sede" : "sedes"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex-1 mb-4">
              <h3 className="text-xl font-medium text-foreground mb-1.5 line-clamp-1" title={ig.nombre}>{ig.nombre}</h3>
              {ig.fechaFundacion && (
                <p className="text-xs font-medium text-primary/80 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5" /> Fundada: {new Date(ig.fechaFundacion).toLocaleDateString("es", { month: "short", year: "numeric" })}
                </p>
              )}
              
              <div className="space-y-2 mt-4 p-3 rounded-xl bg-white/30 dark:bg-black/10 border border-white/20 dark:border-white/5">
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-foreground/90 font-medium">
                    {ig.ciudadNombre || "--"}
                    {ig.departamentoNombre ? `, ${ig.departamentoNombre}` : ""}
                  </span>
                </div>
                {ig.departamentoGeoNombre && !ig.departamentoNombre && (
                  <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                    <Globe className="w-4 h-4 shrink-0" />
                    <span>{ig.departamentoGeoNombre}, {ig.paisNombre}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-border/40 flex items-center gap-2">
              <Button variant="secondary" size="sm" className="flex-1 rounded-xl bg-white/50 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 transition-colors" onClick={() => {
                setFormErrors({});
                setForm({ nombre: ig.nombre, fechaFundacion: ig.fechaFundacion ? ig.fechaFundacion.split("T")[0] : "", idCiudad: ig.idCiudad || 0 });
                setEditingIglesia(ig);
              }}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`rounded-xl px-3 transition-all ${ig.estado === "activa" ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`}
                onClick={() => toggleEstadoMutation.mutate(ig.idIglesia)} 
                title={ig.estado === "activa" ? "Desactivar" : "Activar"}
              >
                {ig.estado === "activa" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl px-3 text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => handleDeleteIglesia(ig.idIglesia, ig.nombre)}
                disabled={deleteIglesiaMutation.isPending}
                title="Eliminar iglesia"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>

      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-12 text-center rounded-3xl bg-card/30 border border-dashed border-border mt-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Building2 className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-medium text-foreground mb-2">No se encontraron iglesias</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">Intenta con otros términos de búsqueda o elimina algunos filtros para ver más resultados.</p>
        </motion.div>
      )}

      <Dialog open={!!editingIglesia} onOpenChange={(open) => !open && setEditingIglesia(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border border-white/20 shadow-2xl">
          <div className="px-6 py-4 bg-muted/30 border-b border-border/40">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg font-semibold"><Pencil className="w-4 h-4 text-primary" /> Editar Iglesia</DialogTitle></DialogHeader>
          </div>
          <div className="px-6 py-4">
             {renderFormFields()}
          </div>
          <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex justify-end gap-3">
             <Button variant="ghost" onClick={() => setEditingIglesia(null)} className="rounded-full px-5"><X className="w-4 h-4 mr-1.5" /> Cancelar</Button>
             <Button onClick={handleSaveEdit} className="rounded-full px-5 shadow-sm shadow-primary/20"><Save className="w-4 h-4 mr-1.5" /> Guardar Cambios</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border border-white/20 shadow-2xl">
          <div className="px-6 py-4 bg-muted/30 border-b border-border/40">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg font-semibold"><Plus className="w-5 h-5 text-primary" /> Nueva Iglesia</DialogTitle></DialogHeader>
          </div>
          <div className="px-6 py-4">
             {renderFormFields()}
          </div>
          <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex justify-end gap-3">
             <Button variant="ghost" onClick={() => setShowCreate(false)} className="rounded-full px-5"><X className="w-4 h-4 mr-1.5" /> Cancelar</Button>
             <Button onClick={handleCreate} className="rounded-full px-5 shadow-sm shadow-primary/20"><Save className="w-4 h-4 mr-1.5" /> Crear Iglesia</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
