import { useEffect, useState } from "react";
import { useIglesiasEnriquecidas, useCreateIglesia, useUpdateIglesia, useToggleIglesiaEstado, useDeleteIglesia } from "@/hooks/useIglesias";
import { usePaisesEnhanced, useDepartamentosEnhanced, useCiudadesEnhanced } from "@/hooks/useGeografiaEnhanced";
import { useCiudades } from "@/hooks/useGeografia";

import type { IglesiaEnriquecida } from "@/services/iglesias.service";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton";

import { Building2, Plus, Search, MapPin, Power, PowerOff, Globe, Pencil, Save, X, Calendar, Eye } from "lucide-react";
import { useNavigate } from "react-router";
import { useApp } from "../store/AppContext";

const estadoLabels: Record<string, string> = {
  activa: "Activa",
  inactiva: "Inactiva",
  fusionada: "Fusionada",
  cerrada: "Cerrada",
};

interface IglesiaFormData {
  nombre: string;
  fechaFundacion: string;
  direccion: string;
  telefono: string;
  descripcion: string;
  sitioWeb: string;
  idPais: number;
  idDepartamento: number;
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
  const navigate = useNavigate();
  const { rolActual } = useApp();
  const { data: iglesias = [], isLoading } = useIglesiasEnriquecidas();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "activa" | "inactiva">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingIglesia, setEditingIglesia] = useState<IglesiaEnriquecida | null>(null);
  const [deletingIglesia, setDeletingIglesia] = useState<IglesiaEnriquecida | null>(null);
  const [form, setForm] = useState<IglesiaFormData>({
    nombre: "",
    fechaFundacion: "",
    direccion: "",
    telefono: "",
    descripcion: "",
    sitioWeb: "",
    idPais: 0,
    idDepartamento: 0,
    idCiudad: 0,
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof IglesiaFormData, string>>>({});

  const { data: paises = [] } = usePaisesEnhanced();
  const { data: departamentosAll = [] } = useDepartamentosEnhanced();
  const departamentos = form.idPais
    ? departamentosAll.filter((d) => d.idPais === form.idPais)
    : [];
  const { data: ciudades = [] } = useCiudadesEnhanced(form.idDepartamento || undefined);
  const { data: ciudadesAll = [] } = useCiudades();

  const createIglesiaMutation = useCreateIglesia();
  const updateIglesiaMutation = useUpdateIglesia();
  const toggleEstadoMutation = useToggleIglesiaEstado();
  const deleteIglesiaMutation = useDeleteIglesia();


  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-5 space-y-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const updateField = (field: keyof IglesiaFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const resolveLocationFromCityId = (cityId: number) => {
    const city = ciudadesAll.find((c) => c.idCiudad === cityId);
    if (!city) return { idDepartamento: 0, idPais: 0 };
    const dept = departamentosAll.find((d) => d.idDepartamentoGeo === city.idDepartamentoGeo);
    return { idDepartamento: city.idDepartamentoGeo, idPais: dept?.idPais ?? 0 };
  };

  useEffect(() => {
    if (!editingIglesia || !editingIglesia.idCiudad) return;
    const loc = resolveLocationFromCityId(editingIglesia.idCiudad);
    if (!loc.idDepartamento || !loc.idPais) return;
    setForm((prev) => ({
      ...prev,
      idPais: loc.idPais,
      idDepartamento: loc.idDepartamento,
      idCiudad: editingIglesia.idCiudad || 0,
    }));
  }, [editingIglesia, ciudadesAll, departamentosAll]);

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
      { id: editingIglesia.idIglesia, data: { nombre: form.nombre.trim(), fechaFundacion: form.fechaFundacion || null, direccion: form.direccion.trim() || null, telefono: form.telefono.trim() || null, descripcion: form.descripcion.trim() || null, sitioWeb: form.sitioWeb.trim() || null } },
      { onSuccess: () => setEditingIglesia(null) }
    );
  };

  const handleCreate = () => {
    if (!validateForm()) return;
    createIglesiaMutation.mutate(
      {
        nombre: form.nombre.trim(),
        fechaFundacion: form.fechaFundacion || null,
        estado: "activa",
        idCiudad: form.idCiudad || null,
        direccion: form.direccion.trim() || null,
        telefono: form.telefono.trim() || null,
        descripcion: form.descripcion.trim() || null,
        sitioWeb: form.sitioWeb.trim() || null,
      },
      { onSuccess: () => setShowCreate(false) }
    );
  };

  const handleDeleteIglesia = () => {
    if (!deletingIglesia) return;
    deleteIglesiaMutation.mutate(deletingIglesia.idIglesia, {
      onSuccess: (result) => {
        setDeletingIglesia(null);
        if (result.type === 'hard') {
          toast.success(`Iglesia "${deletingIglesia.nombre}" eliminada permanentemente.`);
        } else {
          toast.warning(`Iglesia "${deletingIglesia.nombre}" desactivada (tiene datos asociados).`);
        }
      },
      onError: (error) => {
        toast.error(`Error al eliminar iglesia: ${error.message}`);
      }
    });
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
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">País <span className="text-destructive">*</span></label>
        <Select
          value={form.idPais ? String(form.idPais) : ""}
          onValueChange={(v) => {
            updateField("idPais", Number(v));
            updateField("idDepartamento", 0);
            updateField("idCiudad", 0);
          }}
        >
          <SelectTrigger className="bg-input-background"><SelectValue placeholder="Seleccionar país..." /></SelectTrigger>
          <SelectContent>
            {paises.map((p) => (
              <SelectItem key={p.idPais} value={String(p.idPais)}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Departamento <span className="text-destructive">*</span></label>
        <Select
          value={form.idDepartamento ? String(form.idDepartamento) : ""}
          onValueChange={(v) => {
            updateField("idDepartamento", Number(v));
            updateField("idCiudad", 0);
          }}
          disabled={!form.idPais}
        >
          <SelectTrigger className="bg-input-background"><SelectValue placeholder="Seleccionar departamento..." /></SelectTrigger>
          <SelectContent>
            {departamentos.map((d) => (
              <SelectItem key={d.idDepartamentoGeo} value={String(d.idDepartamentoGeo)}>{d.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Ciudad <span className="text-destructive">*</span></label>
        <Select
          value={form.idCiudad ? String(form.idCiudad) : ""}
          onValueChange={(v) => updateField("idCiudad", Number(v))}
          disabled={!form.idDepartamento}
        >
          <SelectTrigger className={`bg-input-background ${formErrors.idCiudad ? "border-destructive ring-destructive/20" : ""}`}>
            <SelectValue placeholder="Seleccionar ciudad..." />
          </SelectTrigger>
          <SelectContent>
            {ciudades.map((c) => (
              <SelectItem key={c.idCiudad} value={String(c.idCiudad)}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formErrors.idCiudad && <p className="text-destructive text-[11px] font-medium mt-1">{formErrors.idCiudad}</p>}
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Fecha de Fundación</label>
        <Input type="date" value={form.fechaFundacion} onChange={(e) => updateField("fechaFundacion", e.target.value)} className="bg-input-background focus-visible:ring-primary/20" />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Dirección</label>
        <Input value={form.direccion} onChange={(e) => updateField("direccion", e.target.value)} placeholder="Dirección de la iglesia" className="bg-input-background focus-visible:ring-primary/20" />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Teléfono</label>
        <Input value={form.telefono} onChange={(e) => updateField("telefono", e.target.value)} placeholder="Número de teléfono" className="bg-input-background focus-visible:ring-primary/20" />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Descripción</label>
        <Input value={form.descripcion} onChange={(e) => updateField("descripcion", e.target.value)} placeholder="Descripción de la iglesia" className="bg-input-background focus-visible:ring-primary/20" />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Sitio Web</label>
        <Input value={form.sitioWeb} onChange={(e) => updateField("sitioWeb", e.target.value)} placeholder="https://ejemplo.com" className="bg-input-background focus-visible:ring-primary/20" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 px-4 md:px-0">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium uppercase tracking-widest pl-1 hidden sm:block">Directorio</p>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight leading-tight">Gestión de Iglesias</h1>
          </div>
        </div>
        {rolActual === "super_admin" && (
          <Button onClick={() => { setForm({ nombre: "", fechaFundacion: "", direccion: "", telefono: "", descripcion: "", sitioWeb: "", idPais: 0, idDepartamento: 0, idCiudad: 0 }); setFormErrors({}); setShowCreate(true); }} className="shrink-0 shadow-md shadow-primary/20 bg-[#4682b4] hover:bg-[#4682b4]/90 shadow-blue-900/20 text-sm">
            <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Nueva Iglesia</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        )}
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3 border-t border-border/30 pt-3 sm:pt-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input 
            placeholder="Buscar por nombre o ciudad..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-11 bg-white/50 dark:bg-black/20 border-transparent focus-visible:ring-[#4682b4]/20 h-11 rounded-xl" 
          />
        </div>
        <div className="flex gap-1.5 p-1 bg-background/60 border border-border/40 rounded-xl shadow-sm overflow-x-auto h-10 items-center min-w-0">
          {(["all", "activa", "inactiva"] as const).map((f) => (
            <Button 
              key={f} 
              variant={filter === f ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setFilter(f)} 
              className={`h-full px-3 sm:px-4 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filter === f ? "shadow-sm bg-[#4682b4] text-white hover:bg-[#4682b4]/90" : "text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/5"}`}
            >
              {f === "all" ? "Todas" : f === "activa" ? "Activas" : "Inactivas"}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid de Iglesias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filtered.map((ig, i) => (
          <GlassCard key={ig.idIglesia} index={i} isActive={ig.estado === "activa"}>
            <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#709dbd]/20 to-[#4682b4]/5 flex items-center justify-center shadow-inner border border-primary/10 transition-transform hover:scale-105">
                <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-primary/80" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant={ig.estado === "activa" ? "default" : "secondary"} className={`shadow-sm tracking-wide text-xs ${ig.estado === "activa" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200" : ""}`}>{estadoLabels[ig.estado]}</Badge>
                {ig.cantidadSedes > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-card/50 border-white/50 dark:border-white/10 uppercase font-semibold">
                    {ig.cantidadSedes} {ig.cantidadSedes === 1 ? "sede" : "sedes"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex-1 mb-3 sm:mb-4">
              <h3 className="text-xl sm:text-2xl font-light text-foreground mb-1.5 line-clamp-1" title={ig.nombre}>{ig.nombre}</h3>
              {ig.fechaFundacion && (
                <p className="text-xs font-medium text-primary/80 mb-2 sm:mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Fundada:</span> {new Date(ig.fechaFundacion).toLocaleDateString("es", { month: "short", year: "numeric" })}
                </p>
              )}
              
              <div className="space-y-2 mt-3 sm:mt-4 p-2 sm:p-3 rounded-xl bg-white/30 dark:bg-black/10 border border-white/20 dark:border-white/5">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-foreground/90 font-medium text-xs sm:text-sm">
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

            <div className="mt-auto pt-3 sm:pt-4 border-t border-border/40 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 rounded-xl bg-[#4682b4]/10 hover:bg-[#4682b4]/20 text-[#4682b4] transition-colors text-xs sm:text-sm"
                onClick={() => navigate(`/app/global/iglesias/${ig.idIglesia}`)}
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" /> <span className="hidden sm:inline">Ver detalle</span>
                <span className="sm:hidden">Detalle</span>
              </Button>
{rolActual === "super_admin" && (
                <>
                   <Button variant="secondary" size="sm" className="flex-1 rounded-xl bg-white/50 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 transition-colors text-xs sm:text-sm" onClick={() => {
                      setFormErrors({});
                      setForm({
                        nombre: ig.nombre,
                        fechaFundacion: ig.fechaFundacion ? ig.fechaFundacion.split("T")[0] : "",
                        direccion: ig.direccion || "",
                        telefono: ig.telefono || "",
                        descripcion: ig.descripcion || "",
                        sitioWeb: ig.sitioWeb || "",
                        idPais: 0,
                        idDepartamento: 0,
                        idCiudad: ig.idCiudad || 0,
                      });
                      setEditingIglesia(ig);
                    }}>
                     <Pencil className="w-3.5 h-3.5 mr-1.5" /> <span className="hidden sm:inline">Editar</span>
                   </Button>
                   <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl px-2 sm:px-3 text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => setDeletingIglesia(ig)}
                      disabled={deleteIglesiaMutation.isPending}
                      title="Eliminar iglesia"
                    >
                      <X className="w-4 h-4" />
                   </Button>
                </>
              )}
              {rolActual === "super_admin" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-xl px-2 sm:px-3 transition-all ${ig.estado === "activa" ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`}
                  onClick={() => toggleEstadoMutation.mutate(ig.idIglesia)}
                  title={ig.estado === "activa" ? "Desactivar" : "Activar"}
                >
                  {ig.estado === "activa" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                </Button>
              )}
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
        <DialogContent className="sm:max-w-md max-h-[90vh] rounded-2xl overflow-hidden p-0 border border-white/20 shadow-2xl">
          <div className="px-4 sm:px-6 py-4 bg-muted/30 border-b border-border/40">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg font-semibold"><Pencil className="w-4 h-4 text-primary" /> Editar Iglesia</DialogTitle></DialogHeader>
          </div>
          <div className="px-4 sm:px-6 py-4 overflow-y-auto max-h-[50vh]">
             {renderFormFields()}
          </div>
          <div className="px-4 sm:px-6 py-4 bg-muted/20 border-t border-border/40 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
             <Button variant="ghost" onClick={() => setEditingIglesia(null)} className="rounded-full px-5 w-full sm:w-auto"><X className="w-4 h-4 mr-1.5" /> Cancelar</Button>
             <Button onClick={handleSaveEdit} className="rounded-full px-5 shadow-sm shadow-primary/20 w-full sm:w-auto"><Save className="w-4 h-4 mr-1.5" /> Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md max-h-[90vh] rounded-2xl overflow-hidden p-0 border border-white/20 shadow-2xl">
          <div className="px-4 sm:px-6 py-4 bg-muted/30 border-b border-border/40">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold"><Plus className="w-5 h-5 text-primary" /> Nueva Iglesia</DialogTitle>
          </div>
          <div className="px-4 sm:px-6 py-4 overflow-y-auto max-h-[50vh]">
             {renderFormFields()}
          </div>
          <div className="px-4 sm:px-6 py-4 bg-muted/20 border-t border-border/40 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
             <Button variant="ghost" onClick={() => setShowCreate(false)} className="rounded-full px-5 w-full sm:w-auto"><X className="w-4 h-4 mr-1.5" /> Cancelar</Button>
             <Button onClick={handleCreate} className="rounded-full px-5 shadow-sm shadow-primary/20 w-full sm:w-auto"><Save className="w-4 h-4 mr-1.5" /> Crear</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingIglesia} onOpenChange={(open) => !open && setDeletingIglesia(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] rounded-2xl overflow-hidden p-0 border border-white/20 shadow-2xl">
          <div className="px-4 sm:px-6 py-4 bg-destructive/10 border-b border-border/40">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-destructive">
                <X className="w-5 h-5" /> Eliminar Iglesia
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="px-4 sm:px-6 py-4 space-y-4 overflow-y-auto max-h-[50vh]">
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro de que quieres eliminar la iglesia <strong>"{deletingIglesia?.nombre}"</strong>?
            </p>
            {deletingIglesia && deletingIglesia.cantidadSedes > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  ⚠️ Esta iglesia tiene {deletingIglesia.cantidadSedes} sede{deletingIglesia.cantidadSedes !== 1 ? 's' : ''} activa{deletingIglesia.cantidadSedes !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Será desactivada en lugar de eliminada permanentemente para proteger la integridad de los datos.
                </p>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {deletingIglesia && deletingIglesia.cantidadSedes === 0 ? (
                <p>✅ <strong>Eliminación permanente:</strong> Esta iglesia no tiene sedes ni datos asociados, será eliminada completamente.</p>
              ) : (
                <p>⚠️ <strong>Desactivación:</strong> Esta iglesia tiene datos asociados y será desactivada para mantener la integridad de la información.</p>
              )}
            </div>
          </div>
          <div className="px-4 sm:px-6 py-4 bg-muted/20 border-t border-border/40 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <Button
              variant="ghost"
              onClick={() => setDeletingIglesia(null)}
              className="rounded-full px-5 w-full sm:w-auto"
              disabled={deleteIglesiaMutation.isPending}
            >
              <X className="w-4 h-4 mr-1.5" /> Cancelar
            </Button>
            <Button
              onClick={handleDeleteIglesia}
              className="rounded-full px-5 shadow-sm shadow-destructive/20 bg-destructive hover:bg-destructive/90 text-destructive-foreground w-full sm:w-auto"
              disabled={deleteIglesiaMutation.isPending}
            >
              {deleteIglesiaMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                  Eliminando...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-1.5" />
                  {deletingIglesia && deletingIglesia.cantidadSedes === 0 ? 'Eliminar' : 'Desactivar'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
