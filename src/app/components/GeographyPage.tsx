import { useState } from "react";
import {
  usePaises, useDepartamentos, useCiudades,
  useCreatePais, useUpdatePais, useDeletePais,
  useCreateDepartamento, useUpdateDepartamento, useDeleteDepartamento,
  useCreateCiudad, useUpdateCiudad, useDeleteCiudad,
} from "@/hooks/useGeografia";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { Globe, MapPin, Building, Plus, Pencil, Trash2, ChevronRight, ChevronDown, Search } from "lucide-react";

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

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando geografía...</div>;

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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2"><Globe className="w-6 h-6 text-primary" /> Gestión Geográfica</h1>
          <p className="text-muted-foreground text-sm mt-1">Administra países, departamentos y ciudades (Tablas: Pais, Departamento, Ciudad)</p>
        </div>
        <Button onClick={() => openDialog("pais", "add")}><Plus className="w-4 h-4 mr-2" /> Nuevo País</Button>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card" />
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{paises.length} países</Badge>
          <Badge variant="outline">{departamentosGeo.length} departamentos</Badge>
          <Badge variant="outline">{ciudades.length} ciudades</Badge>
        </div>
      </div>

      <div className="space-y-2">
        {filteredPaises.map(pais => {
          const deps = departamentosGeo.filter(d => d.idPais === pais.idPais);
          const isExpP = expandedPais.has(pais.idPais);
          return (
            <Card key={pais.idPais} className="overflow-hidden">
              <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/30" onClick={() => togglePais(pais.idPais)}>
                <Globe className="w-5 h-5 text-blue-500 shrink-0" />
                <span className="flex-1 text-sm">{pais.nombre}</span>
                <Badge variant="secondary" className="text-xs">{deps.length} dep.</Badge>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => openDialog("dep", "add", undefined, pais.idPais)}><Plus className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openDialog("pais", "edit", pais.idPais)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete({ type: "pais", id: pais.idPais, name: pais.nombre })}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
                {isExpP ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
              {isExpP && (
                <div className="border-t bg-muted/10">
                  {deps.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sin departamentos</p>}
                  {deps.map(dep => {
                    const cius = ciudades.filter(c => c.idDepartamentoGeo === dep.idDepartamentoGeo);
                    const isExpD = expandedDep.has(dep.idDepartamentoGeo);
                    return (
                      <div key={dep.idDepartamentoGeo}>
                        <div className="flex items-center gap-3 px-4 py-3 pl-10 cursor-pointer hover:bg-accent/20 border-b last:border-0" onClick={() => toggleDep(dep.idDepartamentoGeo)}>
                          <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                          <span className="flex-1 text-sm">{dep.nombre}</span>
                          <Badge variant="outline" className="text-xs">{cius.length} ciudades</Badge>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" onClick={() => openDialog("ciudad", "add", undefined, dep.idDepartamentoGeo)}><Plus className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => openDialog("dep", "edit", dep.idDepartamentoGeo)}><Pencil className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete({ type: "dep", id: dep.idDepartamentoGeo, name: dep.nombre })}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                          {isExpD ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                        {isExpD && cius.length > 0 && (
                          <div className="bg-muted/20">
                            {cius.map(ci => (
                              <div key={ci.idCiudad} className="flex items-center gap-3 px-4 py-2 pl-16 border-b last:border-0 hover:bg-accent/10">
                                <Building className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                <span className="flex-1 text-sm">{ci.nombre}</span>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openDialog("ciudad", "edit", ci.idCiudad)}><Pencil className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete({ type: "ciudad", id: ci.idCiudad, name: ci.nombre })}><Trash2 className="w-3 h-3" /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={!!dialog} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>
          <div><label className="text-sm">Nombre</label><Input value={formNombre} onChange={e => setFormNombre(e.target.value)} placeholder="Nombre" className="mt-1" onKeyDown={e => e.key === "Enter" && handleSubmit()} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!formNombre.trim() || isMutating}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {confirmDelete?.type === "pais" ? "País" : confirmDelete?.type === "dep" ? "Departamento" : "Ciudad"}</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara permanentemente "{confirmDelete?.name}". Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deletePaisMutation.isPending || deleteDeptoMutation.isPending || deleteCiudadMutation.isPending}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
