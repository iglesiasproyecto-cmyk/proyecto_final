import { useState } from "react";
import { useRoles } from "@/hooks/useUsuarios";
import { useTiposEvento, useCreateTipoEvento, useUpdateTipoEvento, useDeleteTipoEvento } from "@/hooks/useEventos";
import { motion } from "motion/react";
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

  const createTEMutation = useCreateTipoEvento();
  const updateTEMutation = useUpdateTipoEvento();
  const deleteTEMutation = useDeleteTipoEvento();

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  const openAddTE = () => { setFormTE({ nombre: "", descripcion: "" }); setEditingTE(null); setDialogTE(true); };
  const openEditTE = (id: number) => {
    const te = tiposEvento.find(x => x.idTipoEvento === id); if (!te) return;
    setFormTE({ nombre: te.nombre, descripcion: te.descripcion || "" });
    setEditingTE(id); setDialogTE(true);
  };
  const handleSubmitTE = () => {
    if (!formTE.nombre.trim()) return;
    if (editingTE) {
      updateTEMutation.mutate(
        { id: editingTE, nombre: formTE.nombre.trim(), descripcion: formTE.descripcion.trim() || null },
        { onSuccess: () => setDialogTE(false) }
      );
    } else {
      createTEMutation.mutate(
        { nombre: formTE.nombre.trim(), descripcion: formTE.descripcion.trim() || null },
        { onSuccess: () => setDialogTE(false) }
      );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
            <Settings2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Configuraciones</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">Catálogos del Sistema</h1>
            <p className="text-muted-foreground text-[11px] font-medium mt-1">Gestiona los catálogos y tablas de referencia de la plataforma</p>
          </div>
        </div>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList className="bg-card/40 backdrop-blur-xl border border-border/50 p-1.5 h-auto rounded-2xl w-full sm:w-auto inline-flex shadow-xl shadow-black/5">
          <TabsTrigger value="tipos_evento" className="rounded-xl px-5 py-2.5 text-[11px] font-semibold tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"><Calendar className="w-4 h-4 mr-2" /> Tipos de Evento ({tiposEvento.length})</TabsTrigger>
          <TabsTrigger value="roles" className="rounded-xl px-5 py-2.5 text-[11px] font-semibold tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"><ShieldCheck className="w-4 h-4 mr-2" /> Roles ({roles.length})</TabsTrigger>
        </TabsList>

        {/* Tipos de Evento */}
        <TabsContent value="tipos_evento" className="space-y-6 mt-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-card/20 p-5 rounded-3xl border border-border/50 backdrop-blur-xl shadow-sm">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground tracking-tight">Registro de Tipos</h3>
              <p className="text-[12px] font-medium text-muted-foreground mt-0.5">Define los tipos de evento disponibles para todas las iglesias (Tabla: TipoEvento)</p>
            </div>
            <Button onClick={openAddTE} className="bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white shadow-lg shadow-cyan-600/30 rounded-xl px-6 hover:scale-105 transition-all text-xs font-semibold h-11 tracking-wide"><Plus className="w-4 h-4 mr-2" /> Nuevo Tipo</Button>
          </div>

          <div className="rounded-3xl bg-card/40 backdrop-blur-2xl border border-border/50 shadow-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-blue-600/5">
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 p-5">Nombre</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 p-5">Descripción</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 p-5">Creado</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 p-5 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposEvento.map(te => (
                  <TableRow key={te.idTipoEvento} className="group hover:bg-blue-600/5 border-white/5 transition-colors">
                    <TableCell className="p-5">
                      <span className="text-[14px] font-black tracking-tight text-foreground/90 group-hover:text-blue-600 transition-colors py-1">{te.nombre}</span>
                    </TableCell>
                    <TableCell className="p-5 text-[12px] font-medium text-muted-foreground max-w-[16rem] xl:max-w-md truncate">{te.descripcion || "—"}</TableCell>
                    <TableCell className="p-5">
                      <Badge variant="outline" className="text-[10px] bg-muted/30 border-0 font-medium tracking-wide">{new Date(te.creadoEn).toLocaleDateString("es")}</Badge>
                    </TableCell>
                    <TableCell className="p-5 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-600/10 hover:text-blue-700 hover:rotate-12 transition-all shadow-sm bg-background/50" onClick={() => openEditTE(te.idTipoEvento)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-600 hover:-rotate-12 transition-all shadow-sm bg-background/50" onClick={() => setConfirmDeleteTE({ id: te.idTipoEvento, name: te.nombre })}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {tiposEvento.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <p className="text-[13px] font-medium text-muted-foreground">No se encontraron tipos de evento</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Roles (read-only) */}
        <TabsContent value="roles" className="space-y-6 mt-8">
          <div className="flex flex-col bg-card/20 p-5 rounded-3xl border border-white/10 backdrop-blur-xl shadow-sm">
            <h3 className="text-sm font-bold text-foreground tracking-tight">Roles del Sistema</h3>
            <p className="text-[12px] font-medium text-muted-foreground mt-0.5">Definidos en el sistema (Tabla: Rol). Los roles base son fijos para la correcta seguridad del MVP.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {roles.map(r => (
              <div key={r.idRol} className="group flex flex-col h-full p-5 rounded-3xl bg-card/40 backdrop-blur-2xl border border-border/50 dark:border-white/5 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600/20 to-blue-600/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform mb-4"><ShieldCheck className="w-6 h-6 text-blue-600" /></div>
                <div className="flex-1">
                  <p className="text-[16px] font-black text-foreground/90 group-hover:text-blue-600 transition-colors tracking-tight">{r.nombre}</p>
                  <p className="text-[12px] font-medium text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">{r.descripcion}</p>
                </div>
                <div className="mt-8 flex items-center justify-between gap-3 pt-4 border-t border-white/5">
                  <Badge variant="outline" className="text-[9px] px-2 py-0 border-blue-600/20 bg-blue-600/5 text-blue-700 dark:text-blue-400 uppercase tracking-widest font-bold">Rol Base</Badge>
                  <span className="text-[10px] text-muted-foreground font-black tracking-widest uppercase opacity-50">ID: {r.idRol}</span>
                </div>
              </div>
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
            <Button variant="outline" className="rounded-xl border-white/10" onClick={() => setDialogTE(false)}>Cancelar</Button>
            <Button onClick={handleSubmitTE} disabled={!formTE.nombre.trim()} className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 shadow-lg text-white">Guardar</Button>
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
              onClick={() => { if (confirmDeleteTE) { deleteTEMutation.mutate(confirmDeleteTE.id, { onSuccess: () => setConfirmDeleteTE(null) }); } }}
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
