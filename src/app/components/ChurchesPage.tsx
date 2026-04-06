import { useState } from "react";
import { useIglesias, useCreateIglesia, useUpdateIglesia, useToggleIglesiaEstado } from "@/hooks/useIglesias";
import type { Iglesia } from "@/types/app.types";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useCiudades } from "@/hooks/useGeografia";
import { motion } from "motion/react";
import { Building2, Plus, Search, MapPin, Power, PowerOff, Globe, Pencil, Save, X, Calendar } from "lucide-react";

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

export function ChurchesPage() {
  const { data: iglesias = [], isLoading } = useIglesias();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "activa" | "inactiva">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingIglesia, setEditingIglesia] = useState<Iglesia | null>(null);
  const [form, setForm] = useState<IglesiaFormData>({ nombre: "", fechaFundacion: "", idCiudad: 0 });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof IglesiaFormData, string>>>({});
  const createIglesiaMutation = useCreateIglesia();
  const updateIglesiaMutation = useUpdateIglesia();
  const toggleEstadoMutation = useToggleIglesiaEstado();
  const { data: ciudades = [] } = useCiudades();

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

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

  const filtered = iglesias.filter((ig) => {
    const matchSearch = ig.nombre.toLowerCase().includes(search.toLowerCase()) || (ig.ciudadNombre || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "activa" && ig.estado === "activa") || (filter === "inactiva" && ig.estado !== "activa");
    return matchSearch && matchFilter;
  });

  const renderFormFields = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Nombre <span className="text-destructive">*</span></label>
        <Input value={form.nombre} onChange={(e) => updateField("nombre", e.target.value)} placeholder="Nombre de la iglesia" className={`bg-input-background ${formErrors.nombre ? "border-destructive" : ""}`} />
        {formErrors.nombre && <p className="text-destructive text-xs mt-1">{formErrors.nombre}</p>}
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Fecha de Fundación</label>
        <Input type="date" value={form.fechaFundacion} onChange={(e) => updateField("fechaFundacion", e.target.value)} className="bg-input-background" />
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Ciudad <span className="text-destructive">*</span></label>
        <Select
          value={form.idCiudad ? String(form.idCiudad) : ""}
          onValueChange={v => setForm(prev => ({ ...prev, idCiudad: Number(v) }))}
        >
          <SelectTrigger className={`bg-input-background ${formErrors.idCiudad ? "border-destructive" : ""}`}>
            <SelectValue placeholder="Seleccionar ciudad" />
          </SelectTrigger>
          <SelectContent>
            {ciudades.map(c => (
              <SelectItem key={c.idCiudad} value={String(c.idCiudad)}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formErrors.idCiudad && <p className="text-destructive text-xs mt-1">{formErrors.idCiudad}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Gestión de Iglesias</h1>
          <p className="text-muted-foreground text-sm">Administra las iglesias registradas en la plataforma</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0"><Plus className="w-4 h-4 mr-2" /> Nueva Iglesia</Button>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o ciudad..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card h-11" />
        </div>
        <div className="flex gap-2">
          {(["all", "activa", "inactiva"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="h-11">
              {f === "all" ? "Todas" : f === "activa" ? "Activas" : "Inactivas"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((ig, i) => (
          <motion.div key={ig.idIglesia} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className={`p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${ig.estado !== "activa" ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <Badge variant={ig.estado === "activa" ? "default" : "secondary"} className="text-[10px]">{estadoLabels[ig.estado]}</Badge>
              </div>
              <h3 className="mb-1">{ig.nombre}</h3>
              {ig.fechaFundacion && (
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Fundada: {new Date(ig.fechaFundacion).toLocaleDateString("es")}
                </p>
              )}
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{ig.ciudadNombre || "--"}</span>
                </div>
                {ig.departamentoGeoNombre && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span>{ig.departamentoGeoNombre}, {ig.paisNombre}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingIglesia(ig)}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
                </Button>
                <Button variant={ig.estado === "activa" ? "destructive" : "default"} size="sm" onClick={() => toggleEstadoMutation.mutate(ig.idIglesia)} title={ig.estado === "activa" ? "Desactivar" : "Activar"}>
                  {ig.estado === "activa" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="p-16 text-center">
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-muted-foreground mb-1">No se encontraron iglesias</h3>
          <p className="text-sm text-muted-foreground">Intenta con otros terminos de busqueda.</p>
        </Card>
      )}

      <Dialog open={!!editingIglesia} onOpenChange={(open) => !open && setEditingIglesia(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-4 h-4 text-primary" /> Editar Iglesia</DialogTitle></DialogHeader>
          {renderFormFields()}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingIglesia(null)}><X className="w-4 h-4 mr-1.5" /> Cancelar</Button>
            <Button onClick={handleSaveEdit}><Save className="w-4 h-4 mr-1.5" /> Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Nueva Iglesia</DialogTitle></DialogHeader>
          {renderFormFields()}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCreate(false)}><X className="w-4 h-4 mr-1.5" /> Cancelar</Button>
            <Button onClick={handleCreate}><Save className="w-4 h-4 mr-1.5" /> Crear Iglesia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
