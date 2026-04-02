import { useState } from "react";
import { useRoles } from "@/hooks/useUsuarios";
import { useTiposEvento } from "@/hooks/useEventos";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Settings2, Plus, Pencil, Trash2, ShieldCheck, Calendar } from "lucide-react";
import { Textarea } from "./ui/textarea";

export function CatalogosPage() {
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: tiposEvento = [], isLoading: tiposLoading } = useTiposEvento();
  const isLoading = rolesLoading || tiposLoading;
  const [tab, setTab] = useState("tipos_evento");
  const [dialogTE, setDialogTE] = useState(false);
  const [editingTE, setEditingTE] = useState<number | null>(null);
  const [formTE, setFormTE] = useState({ nombre: "", descripcion: "" });
  const [confirmDeleteTE, setConfirmDeleteTE] = useState<{ id: number; name: string } | null>(null);

  // Stub mutations — Phase 3
  const addTipoEvento = (_nombre: string, _descripcion: string) => { /* Phase 3 */ };
  const updateTipoEvento = (_id: number, _nombre: string, _descripcion: string) => { /* Phase 3 */ };
  const deleteTipoEvento = (_id: number) => { /* Phase 3 */ };

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  const openAddTE = () => { setFormTE({ nombre: "", descripcion: "" }); setEditingTE(null); setDialogTE(true); };
  const openEditTE = (id: number) => {
    const te = tiposEvento.find(x => x.idTipoEvento === id); if (!te) return;
    setFormTE({ nombre: te.nombre, descripcion: te.descripcion || "" });
    setEditingTE(id); setDialogTE(true);
  };
  const handleSubmitTE = () => {
    if (!formTE.nombre.trim()) return;
    if (editingTE) updateTipoEvento(editingTE, formTE.nombre.trim(), formTE.descripcion.trim());
    else addTipoEvento(formTE.nombre.trim(), formTE.descripcion.trim());
    setDialogTE(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="flex items-center gap-2"><Settings2 className="w-6 h-6 text-primary" /> Catálogos del Sistema</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestiona los catálogos y tablas de referencia de la plataforma</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card">
          <TabsTrigger value="tipos_evento"><Calendar className="w-3.5 h-3.5 mr-1.5" /> Tipos de Evento ({tiposEvento.length})</TabsTrigger>
          <TabsTrigger value="roles"><ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Roles ({roles.length})</TabsTrigger>
        </TabsList>

        {/* Tipos de Evento */}
        <TabsContent value="tipos_evento" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Define los tipos de evento disponibles para todas las iglesias (Tabla: TipoEvento)</p>
            <Button onClick={openAddTE}><Plus className="w-4 h-4 mr-2" /> Nuevo Tipo</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposEvento.map(te => (
                  <TableRow key={te.idTipoEvento}>
                    <TableCell className="text-sm">{te.nombre}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-64 truncate">{te.descripcion || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(te.creadoEn).toLocaleDateString("es")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEditTE(te.idTipoEvento)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDeleteTE({ id: te.idTipoEvento, name: te.nombre })}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Roles (read-only) */}
        <TabsContent value="roles" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">Roles definidos en el sistema (Tabla: Rol). Los roles son fijos en el MVP.</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map(r => (
              <Card key={r.idRol} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-primary" /></div>
                    <div>
                      <p className="text-sm">{r.nombre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.descripcion}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">Rol activo</Badge>
                  <span className="text-[10px] text-muted-foreground">ID: {r.idRol}</span>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog TipoEvento */}
      <Dialog open={dialogTE} onOpenChange={setDialogTE}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingTE ? "Editar" : "Nuevo"} Tipo de Evento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm">Nombre *</label><Input value={formTE.nombre} onChange={e => setFormTE(f => ({ ...f, nombre: e.target.value }))} className="mt-1" /></div>
            <div><label className="text-sm">Descripción</label><Textarea value={formTE.descripcion} onChange={e => setFormTE(f => ({ ...f, descripcion: e.target.value }))} className="mt-1" rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTE(false)}>Cancelar</Button>
            <Button onClick={handleSubmitTE} disabled={!formTE.nombre.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteTE} onOpenChange={(open) => !open && setConfirmDeleteTE(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Tipo de Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara permanentemente el tipo "{confirmDeleteTE?.name}". Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmDeleteTE) { deleteTipoEvento(confirmDeleteTE.id); setConfirmDeleteTE(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
