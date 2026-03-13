import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Building2, Plus, Pencil, Search, ToggleLeft, ToggleRight } from "lucide-react";

export function SedesPage() {
  const { sedes, iglesias, ciudades, departamentosGeo, paises, addSede, updateSede, toggleSedeEstado } = useApp();
  const [search, setSearch] = useState("");
  const [filterIglesia, setFilterIglesia] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", direccion: "", idCiudad: "", idIglesia: "", estado: "activa" as "activa" | "inactiva" | "en_construccion" });

  const openAdd = () => { setForm({ nombre: "", direccion: "", idCiudad: "", idIglesia: "", estado: "activa" }); setEditing(null); setDialog(true); };
  const openEdit = (id: string) => {
    const s = sedes.find(x => x.idSede === id); if (!s) return;
    setForm({ nombre: s.nombre, direccion: s.direccion || "", idCiudad: s.idCiudad, idIglesia: s.idIglesia, estado: s.estado });
    setEditing(id); setDialog(true);
  };
  const handleSubmit = () => {
    if (!form.nombre.trim() || !form.idCiudad || !form.idIglesia) return;
    if (editing) updateSede(editing, { nombre: form.nombre, direccion: form.direccion || null, idCiudad: form.idCiudad, idIglesia: form.idIglesia, estado: form.estado });
    else addSede({ nombre: form.nombre, direccion: form.direccion || null, idCiudad: form.idCiudad, idIglesia: form.idIglesia, estado: form.estado });
    setDialog(false);
  };

  const lookupIglesia = (idIglesia: string) => iglesias.find(i => i.idIglesia === idIglesia)?.nombre || "-";
  const lookupUbicacion = (idCiudad: string) => {
    const ci = ciudades.find(c => c.idCiudad === idCiudad);
    if (!ci) return "-";
    const dep = departamentosGeo.find(d => d.idDepartamentoGeo === ci.idDepartamentoGeo);
    const pa = dep ? paises.find(p => p.idPais === dep.idPais) : null;
    return `${ci.nombre}, ${dep?.nombre || ""}, ${pa?.nombre || ""}`;
  };
  const estadoColor = (e: string) => e === "activa" ? "bg-green-100 text-green-800" : e === "inactiva" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800";

  const filtered = sedes.filter(s => {
    if (search && !s.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterIglesia !== "all" && s.idIglesia !== filterIglesia) return false;
    if (filterEstado !== "all" && s.estado !== filterEstado) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2"><Building2 className="w-6 h-6 text-primary" /> Gestion de Sedes</h1>
          <p className="text-muted-foreground text-sm mt-1">Administra todas las sedes de las iglesias registradas</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Nueva Sede</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar sedes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card" />
        </div>
        <Select value={filterIglesia} onValueChange={setFilterIglesia}>
          <SelectTrigger className="w-52 bg-card"><SelectValue placeholder="Iglesia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las iglesias</SelectItem>
            {iglesias.map(i => <SelectItem key={i.idIglesia} value={i.idIglesia}>{i.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="activa">Activa</SelectItem>
            <SelectItem value="inactiva">Inactiva</SelectItem>
            <SelectItem value="en_construccion">En construccion</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sede</TableHead>
              <TableHead>Iglesia</TableHead>
              <TableHead>Ubicacion</TableHead>
              <TableHead>Direccion</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(s => (
              <TableRow key={s.idSede}>
                <TableCell className="text-sm">{s.nombre}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{lookupIglesia(s.idIglesia)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{lookupUbicacion(s.idCiudad)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.direccion || "-"}</TableCell>
                <TableCell><Badge className={`text-xs ${estadoColor(s.estado)}`}>{s.estado}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s.idSede)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleSedeEstado(s.idSede)}>
                      {s.estado === "activa" ? <ToggleRight className="w-3.5 h-3.5 text-green-600" /> : <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No se encontraron sedes</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nueva"} Sede</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm">Nombre *</label><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="mt-1" /></div>
            <div><label className="text-sm">Direccion</label><Input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} className="mt-1" /></div>
            <div><label className="text-sm">Iglesia *</label>
              <Select value={form.idIglesia} onValueChange={v => setForm(f => ({ ...f, idIglesia: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{iglesias.map(i => <SelectItem key={i.idIglesia} value={i.idIglesia}>{i.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm">Ciudad *</label>
              <Select value={form.idCiudad} onValueChange={v => setForm(f => ({ ...f, idCiudad: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{ciudades.map(c => <SelectItem key={c.idCiudad} value={c.idCiudad}>{c.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm">Estado</label>
              <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v as any }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="inactiva">Inactiva</SelectItem>
                  <SelectItem value="en_construccion">En construccion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.nombre.trim() || !form.idCiudad || !form.idIglesia}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
