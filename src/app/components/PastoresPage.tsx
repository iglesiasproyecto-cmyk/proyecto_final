import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { UserCheck, Plus, Pencil, Trash2, Search, Link2, Church, Mail, Phone } from "lucide-react";

export function PastoresPage() {
  const { pastores, iglesiaPastores, iglesias, usuarios, addPastor, updatePastor, addIglesiaPastor, removeIglesiaPastor } = useApp();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pastores");
  const [dialogPastor, setDialogPastor] = useState(false);
  const [dialogAsign, setDialogAsign] = useState(false);
  const [editingPastor, setEditingPastor] = useState<string | null>(null);
  const [formP, setFormP] = useState({ nombres: "", apellidos: "", correo: "", telefono: "", idUsuario: "" });
  const [formA, setFormA] = useState({ idIglesia: "", idPastor: "", esPrincipal: false, fechaInicio: "", observaciones: "" });
  const [confirmDeleteAsign, setConfirmDeleteAsign] = useState<{ id: string; pastorName: string; iglesiaName: string } | null>(null);

  const openAddPastor = () => { setFormP({ nombres: "", apellidos: "", correo: "", telefono: "", idUsuario: "" }); setEditingPastor(null); setDialogPastor(true); };
  const openEditPastor = (id: string) => {
    const p = pastores.find(x => x.idPastor === id); if (!p) return;
    setFormP({ nombres: p.nombres, apellidos: p.apellidos, correo: p.correo, telefono: p.telefono || "", idUsuario: p.idUsuario || "" });
    setEditingPastor(id); setDialogPastor(true);
  };
  const handleSubmitPastor = () => {
    if (!formP.nombres.trim() || !formP.apellidos.trim() || !formP.correo.trim()) return;
    if (editingPastor) updatePastor(editingPastor, { nombres: formP.nombres, apellidos: formP.apellidos, correo: formP.correo, telefono: formP.telefono || null, idUsuario: formP.idUsuario || null });
    else addPastor({ nombres: formP.nombres, apellidos: formP.apellidos, correo: formP.correo, telefono: formP.telefono || null, idUsuario: formP.idUsuario || null });
    setDialogPastor(false);
  };

  const openAsign = () => { setFormA({ idIglesia: "", idPastor: "", esPrincipal: false, fechaInicio: new Date().toISOString().split("T")[0], observaciones: "" }); setDialogAsign(true); };
  const handleSubmitAsign = () => {
    if (!formA.idIglesia || !formA.idPastor || !formA.fechaInicio) return;
    addIglesiaPastor({ idIglesia: formA.idIglesia, idPastor: formA.idPastor, esPrincipal: formA.esPrincipal, fechaInicio: formA.fechaInicio, fechaFin: null, observaciones: formA.observaciones || null });
    setDialogAsign(false);
  };

  const getIglesiasForPastor = (idPastor: string) => {
    return iglesiaPastores.filter(ip => ip.idPastor === idPastor && !ip.fechaFin).map(ip => {
      const ig = iglesias.find(i => i.idIglesia === ip.idIglesia);
      return { ...ip, iglesiaNombre: ig?.nombre || "—" };
    });
  };

  const filteredPastores = pastores.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q) || p.correo.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2"><UserCheck className="w-6 h-6 text-primary" /> Gestión de Pastores</h1>
          <p className="text-muted-foreground text-sm mt-1">Administra pastores y sus asignaciones a iglesias (Tablas: Pastor, IglesiaPastor)</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card">
          <TabsTrigger value="pastores">Pastores ({pastores.length})</TabsTrigger>
          <TabsTrigger value="asignaciones">Asignaciones ({iglesiaPastores.filter(ip => !ip.fechaFin).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pastores" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar pastores..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card" />
            </div>
            <Button onClick={openAddPastor}><Plus className="w-4 h-4 mr-2" /> Nuevo Pastor</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredPastores.map(p => {
              const asignaciones = getIglesiasForPastor(p.idPastor);
              const linkedUser = p.idUsuario ? usuarios.find(u => u.idUsuario === p.idUsuario) : null;
              return (
                <Card key={p.idPastor} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm text-primary">{p.nombres[0]}{p.apellidos[0]}</div>
                      <div>
                        <p className="text-sm">{p.nombres} {p.apellidos}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Mail className="w-3 h-3" /> {p.correo}
                        </div>
                        {p.telefono && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="w-3 h-3" /> {p.telefono}</div>}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openEditPastor(p.idPastor)}><Pencil className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {asignaciones.map(a => (
                      <Badge key={a.idIglesiaPastor} variant={a.esPrincipal ? "default" : "secondary"} className="text-xs">
                        <Church className="w-3 h-3 mr-1" /> {a.iglesiaNombre} {a.esPrincipal && "(Principal)"}
                      </Badge>
                    ))}
                    {asignaciones.length === 0 && <span className="text-xs text-muted-foreground italic">Sin asignaciones activas</span>}
                  </div>
                  {linkedUser && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-blue-600"><Link2 className="w-3 h-3" /> Vinculado a usuario: {linkedUser.nombres} {linkedUser.apellidos}</div>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="asignaciones" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openAsign}><Plus className="w-4 h-4 mr-2" /> Nueva Asignación</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pastor</TableHead>
                  <TableHead>Iglesia</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {iglesiaPastores.filter(ip => !ip.fechaFin).map(ip => {
                  const pa = pastores.find(p => p.idPastor === ip.idPastor);
                  const ig = iglesias.find(i => i.idIglesia === ip.idIglesia);
                  return (
                    <TableRow key={ip.idIglesiaPastor}>
                      <TableCell className="text-sm">{pa ? `${pa.nombres} ${pa.apellidos}` : "—"}</TableCell>
                      <TableCell className="text-sm">{ig?.nombre || "—"}</TableCell>
                      <TableCell>{ip.esPrincipal ? <Badge className="bg-green-100 text-green-800 text-xs">Sí</Badge> : <span className="text-xs text-muted-foreground">No</span>}</TableCell>
                      <TableCell className="text-xs">{ip.fechaInicio}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-48 truncate">{ip.observaciones || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => {
                          const paName = pa ? `${pa.nombres} ${pa.apellidos}` : "Pastor";
                          const igName = ig?.nombre || "Iglesia";
                          setConfirmDeleteAsign({ id: ip.idIglesiaPastor, pastorName: paName, iglesiaName: igName });
                        }}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Pastor */}
      <Dialog open={dialogPastor} onOpenChange={setDialogPastor}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingPastor ? "Editar" : "Nuevo"} Pastor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm">Nombres *</label><Input value={formP.nombres} onChange={e => setFormP(f => ({ ...f, nombres: e.target.value }))} className="mt-1" /></div>
              <div><label className="text-sm">Apellidos *</label><Input value={formP.apellidos} onChange={e => setFormP(f => ({ ...f, apellidos: e.target.value }))} className="mt-1" /></div>
            </div>
            <div><label className="text-sm">Correo *</label><Input type="email" value={formP.correo} onChange={e => setFormP(f => ({ ...f, correo: e.target.value }))} className="mt-1" /></div>
            <div><label className="text-sm">Teléfono</label><Input value={formP.telefono} onChange={e => setFormP(f => ({ ...f, telefono: e.target.value }))} className="mt-1" /></div>
            <div><label className="text-sm">Vincular a Usuario (opcional)</label>
              <Select value={formP.idUsuario || "none"} onValueChange={v => setFormP(f => ({ ...f, idUsuario: v === "none" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vincular</SelectItem>
                  {usuarios.map(u => <SelectItem key={u.idUsuario} value={u.idUsuario}>{u.nombres} {u.apellidos} ({u.correo})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPastor(false)}>Cancelar</Button>
            <Button onClick={handleSubmitPastor} disabled={!formP.nombres.trim() || !formP.apellidos.trim() || !formP.correo.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Asignación */}
      <Dialog open={dialogAsign} onOpenChange={setDialogAsign}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nueva Asignación Pastor-Iglesia</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm">Pastor *</label>
              <Select value={formA.idPastor} onValueChange={v => setFormA(f => ({ ...f, idPastor: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{pastores.map(p => <SelectItem key={p.idPastor} value={p.idPastor}>{p.nombres} {p.apellidos}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm">Iglesia *</label>
              <Select value={formA.idIglesia} onValueChange={v => setFormA(f => ({ ...f, idIglesia: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{iglesias.map(i => <SelectItem key={i.idIglesia} value={i.idIglesia}>{i.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm">Fecha Inicio *</label><Input type="date" value={formA.fechaInicio} onChange={e => setFormA(f => ({ ...f, fechaInicio: e.target.value }))} className="mt-1" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formA.esPrincipal} onChange={e => setFormA(f => ({ ...f, esPrincipal: e.target.checked }))} className="rounded" />
              <label className="text-sm">Es pastor principal</label>
            </div>
            <div><label className="text-sm">Observaciones</label><Input value={formA.observaciones} onChange={e => setFormA(f => ({ ...f, observaciones: e.target.value }))} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAsign(false)}>Cancelar</Button>
            <Button onClick={handleSubmitAsign} disabled={!formA.idIglesia || !formA.idPastor || !formA.fechaInicio}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteAsign} onOpenChange={(open) => !open && setConfirmDeleteAsign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Asignación</AlertDialogTitle>
            <AlertDialogDescription>
              Se removera la asignacion de {confirmDeleteAsign?.pastorName} de {confirmDeleteAsign?.iglesiaName}. Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmDeleteAsign) { removeIglesiaPastor(confirmDeleteAsign.id); setConfirmDeleteAsign(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}