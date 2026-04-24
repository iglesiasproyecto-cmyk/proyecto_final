import { useState } from "react";
import {
  usePastoresEnriquecidos, useIglesias, useIglesiaPastores,
  useCreatePastor, useUpdatePastor, useDeletePastor,
  useCreateIglesiaPastor, useCloseIglesiaPastor,
} from "@/hooks/useIglesias";
import { useUsuarios } from "@/hooks/useUsuarios";
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
import { motion } from "motion/react";
import { UserCheck, Plus, Pencil, Trash2, Search, Link2, Church, Mail, Phone, Save, X, Eye, Calendar } from "lucide-react";

function GlassCard({ children, index = 0 }: { children: React.ReactNode; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
      className="h-full"
    >
      <div 
        className="h-full relative overflow-hidden rounded-2xl bg-card/40 backdrop-blur-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300 dark:border-white/10 dark:bg-card/20 hover:shadow-lg hover:bg-card/60 hover:-translate-y-1"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
        <div className="relative z-10 p-5 flex flex-col h-full">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

export function PastoresPage() {
  const { data: pastores = [], isLoading } = usePastoresEnriquecidos();
  const { data: iglesiaPastores = [] } = useIglesiaPastores();
  const { data: iglesias = [] } = useIglesias();
  const { data: usuarios = [] } = useUsuarios();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pastores");
  const [dialogPastor, setDialogPastor] = useState(false);
  const [dialogAsign, setDialogAsign] = useState(false);
  const [editingPastor, setEditingPastor] = useState<number | null>(null);
  const [formP, setFormP] = useState({ nombres: "", apellidos: "", correo: "", telefono: "", idUsuario: 0 });
  const [formA, setFormA] = useState({ idIglesia: 0, idPastor: 0, esPrincipal: false, fechaInicio: "", observaciones: "" });
  const [confirmDeleteAsign, setConfirmDeleteAsign] = useState<{ id: number; pastorName: string; iglesiaName: string } | null>(null);
  const [selectedPastor, setSelectedPastor] = useState<number | null>(null);

  const createPastorMutation = useCreatePastor();
  const updatePastorMutation = useUpdatePastor();
  const deletePastorMutation = useDeletePastor();
  const createAsignMutation = useCreateIglesiaPastor();
  const closeAsignMutation = useCloseIglesiaPastor();

  if (isLoading) return (
    <div className="max-w-7xl mx-auto flex items-center justify-center p-12">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Cargando pastores...</p>
      </div>
    </div>
  );

  const handleDeletePastor = (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar pastor "${nombre}"? Esta acción es irreversible.`)) return;
    deletePastorMutation.mutate(id);
  };

  const openAddPastor = () => { setFormP({ nombres: "", apellidos: "", correo: "", telefono: "", idUsuario: 0 }); setEditingPastor(null); setDialogPastor(true); };
  const openEditPastor = (id: number) => {
    const p = pastores.find(x => x.idPastor === id); if (!p) return;
    setFormP({ nombres: p.nombres, apellidos: p.apellidos, correo: p.correo, telefono: p.telefono || "", idUsuario: p.idUsuario || 0 });
    setEditingPastor(id); setDialogPastor(true);
  };
  const handleSubmitPastor = () => {
    if (!formP.nombres.trim() || !formP.apellidos.trim() || !formP.correo.trim()) return;
    if (editingPastor) updatePastorMutation.mutate(
      { id: editingPastor, data: { nombres: formP.nombres, apellidos: formP.apellidos, correo: formP.correo, telefono: formP.telefono || null, idUsuario: formP.idUsuario || null } },
      { onSuccess: () => setDialogPastor(false) }
    );
    else createPastorMutation.mutate(
      { nombres: formP.nombres, apellidos: formP.apellidos, correo: formP.correo, telefono: formP.telefono || null, idUsuario: formP.idUsuario || null },
      { onSuccess: () => setDialogPastor(false) }
    );
  };

  const openAsign = () => { setFormA({ idIglesia: 0, idPastor: 0, esPrincipal: false, fechaInicio: new Date().toISOString().split("T")[0], observaciones: "" }); setDialogAsign(true); };
  const handleSubmitAsign = () => {
    if (!formA.idIglesia || !formA.idPastor || !formA.fechaInicio) return;
    createAsignMutation.mutate(
      { idIglesia: formA.idIglesia, idPastor: formA.idPastor, esPrincipal: formA.esPrincipal, fechaInicio: formA.fechaInicio, fechaFin: null, observaciones: formA.observaciones || null },
      { onSuccess: () => setDialogAsign(false) }
    );
  };

  const getIglesiasForPastor = (idPastor: number) => {
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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Estructura</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">Gestión de Pastores</h1>
          </div>
        </div>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex justify-start">
          <TabsList className="bg-card/40 backdrop-blur-xl border border-white/20 dark:border-white/10 dark:bg-card/20 rounded-2xl h-14 px-1.5 shadow-sm">
            <TabsTrigger value="pastores" className="rounded-xl data-[state=active]:bg-[#4682b4] data-[state=active]:shadow-sm h-11 px-6 font-medium text-sm transition-all text-muted-foreground data-[state=active]:text-white">
              Directorio ({pastores.length})
            </TabsTrigger>
            <TabsTrigger value="asignaciones" className="rounded-xl data-[state=active]:bg-[#4682b4] data-[state=active]:shadow-sm h-11 px-6 font-medium text-sm transition-all text-muted-foreground data-[state=active]:text-white">
              Asignaciones ({iglesiaPastores.filter(ip => !ip.fechaFin).length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pastores" className="space-y-6 mt-6">
          {/* ACTION BAR */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="p-3 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/20 shadow-sm flex flex-col sm:flex-row justify-between gap-3 dark:border-white/10 dark:bg-card/20">
              <div className="relative flex-1 md:max-w-md">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Buscar pastores por nombre o correo..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="pl-11 bg-white/50 dark:bg-black/20 border-transparent focus-visible:ring-[#4682b4]/20 h-11 rounded-xl" 
                />
              </div>
              <Button onClick={openAddPastor} className="shrink-0 shadow-md shadow-blue-900/20 rounded-full px-6 bg-[#4682b4] hover:bg-[#4682b4]/90 shadow-blue-900/20">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Pastor
              </Button>
            </div>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {filteredPastores.map((p, i) => {
              const asignaciones = getIglesiasForPastor(p.idPastor);
              const linkedUser = p.idUsuario ? usuarios.find(u => u.idUsuario === p.idUsuario) : null;
              return (
                <GlassCard key={p.idPastor} index={i}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#709dbd]/20 to-[#4682b4]/10 text-[#4682b4] dark:text-[#709dbd] border-[#4682b4]/10 flex items-center justify-center font-bold">
                        {p.nombres[0]}{p.apellidos[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{p.nombres} {p.apellidos}</p>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <p className="flex items-center gap-1.5 text-xs font-medium text-primary/70"><Mail className="w-3 h-3" /> <span className="truncate">{p.correo}</span></p>
                          {p.telefono && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="w-3 h-3" /> {p.telefono}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    {p.iglesiasActivas.length > 0 && (
                      <div className="p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-2">Miembro en:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.iglesiasActivas.map((nombre, i) => (
                            <Badge key={i} variant="secondary" className="bg-white/60 dark:bg-black/20 text-xs font-medium border-0 tracking-wide text-muted-foreground">
                              <Church className="w-3 h-3 mr-1.5 opacity-70" /> {nombre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#4682b4]/60 dark:text-[#709dbd]/60 mb-2">Asignaciones de Liderazgo:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {asignaciones.map(a => (
                          <Badge key={a.idIglesiaPastor} variant={a.esPrincipal ? "default" : "outline"} className={`text-[11px] font-semibold border ${a.esPrincipal ? "bg-[#4682b4] hover:bg-[#4682b4]/90 border-[#4682b4] shadow-sm" : "bg-card border-[#4682b4]/30 text-[#4682b4] dark:border-[#4682b4]/20 dark:text-[#709dbd]"}`}>
                            <Church className="w-3 h-3 mr-1.5 opacity-80" /> {a.iglesiaNombre} {a.esPrincipal && "(Principal)"}
                          </Badge>
                        ))}
                        {asignaciones.length === 0 && <span className="text-xs text-muted-foreground italic px-1">Sin asignaciones de liderazgo</span>}
                      </div>
                    </div>

                    {linkedUser && (
                      <div className="flex items-center gap-2 pt-2 px-1">
                        <div className="w-6 h-6 rounded-full bg-[#4682b4]/10 flex items-center justify-center shrink-0">
                          <Link2 className="w-3 h-3 text-[#4682b4] dark:text-[#709dbd]" />
                        </div>
                        <p className="text-[11px] font-medium text-[#4682b4] dark:text-[#709dbd] truncate">Usuario: {linkedUser.nombres} {linkedUser.apellidos}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/40 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-[#4682b4]/10" onClick={() => setSelectedPastor(p.idPastor)} title="Ver detalle">
                      <Eye className="w-4 h-4 text-[#4682b4]" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-black/5 dark:hover:bg-white/10" onClick={() => openEditPastor(p.idPastor)}>
                      <Pencil className="w-4 h-4 text-foreground/70" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10" onClick={() => handleDeletePastor(p.idPastor, `${p.nombres} ${p.apellidos}`)} disabled={deletePastorMutation.isPending}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </GlassCard>
              );
            })}
            
            {filteredPastores.length === 0 && (
              <div className="col-span-full py-16 text-center rounded-3xl bg-card/30 border border-dashed border-border mt-4">
                <UserCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-base font-medium text-foreground">No se encontraron pastores</p>
                <p className="text-sm text-muted-foreground mt-1">Prueba con otros nombres o correos</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="asignaciones" className="space-y-4 mt-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="flex justify-end mb-4">
              <Button onClick={openAsign} className="shadow-md shadow-primary/20 rounded-full px-6 bg-[#4682b4] hover:bg-[#4682b4]/90 shadow-blue-900/20">
                <Plus className="w-4 h-4 mr-2" /> Nueva Asignación
              </Button>
            </div>
            
            <div className="rounded-2xl bg-card/50 backdrop-blur-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden dark:border-white/10 dark:bg-card/20">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Dignatario Pastor</TableHead>
                      <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Iglesia Destino</TableHead>
                      <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Pastor Principal</TableHead>
                      <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Fecha Inicio</TableHead>
                      <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Observaciones</TableHead>
                      <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {iglesiaPastores.filter(ip => !ip.fechaFin).map(ip => {
                      const pa = pastores.find(p => p.idPastor === ip.idPastor);
                      const ig = iglesias.find(i => i.idIglesia === ip.idIglesia);
                      return (
                        <TableRow key={ip.idIglesiaPastor} className="transition-colors hover:bg-white/40 dark:hover:bg-white/5 border-border/40">
                          <TableCell className="py-4 font-medium text-foreground">{pa ? `${pa.nombres} ${pa.apellidos}` : "—"}</TableCell>
                          <TableCell className="py-4 text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Church className="w-3.5 h-3.5"/>{ig?.nombre || "—"}</TableCell>
                          <TableCell className="py-4">{ip.esPrincipal ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 tracking-wide font-semibold">SÍ P. PRINCIPAL</Badge> : <span className="text-xs font-medium text-muted-foreground ml-2">No</span>}</TableCell>
                          <TableCell className="py-4 text-xs font-medium text-foreground/80">{new Date(ip.fechaInicio).toLocaleDateString("es", { month: "short", year: "numeric", day: "numeric" })}</TableCell>
                          <TableCell className="py-4 text-xs text-muted-foreground max-w-48 truncate">{ip.observaciones || "—"}</TableCell>
                          <TableCell className="py-4 text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 text-destructive" onClick={() => {
                              const paName = pa ? `${pa.nombres} ${pa.apellidos}` : "Pastor";
                              const igName = ig?.nombre || "Iglesia";
                              setConfirmDeleteAsign({ id: ip.idIglesiaPastor, pastorName: paName, iglesiaName: igName });
                            }}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {iglesiaPastores.filter(ip => !ip.fechaFin).length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">Sin asignaciones de pastores activas</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Dialog Pastor */}
      <Dialog open={dialogPastor} onOpenChange={setDialogPastor}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border border-white/20 shadow-2xl">
          <div className="px-6 py-4 bg-muted/30 border-b border-border/40">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">{editingPastor ? <Pencil className="w-5 h-5 text-[#4682b4]" /> : <Plus className="w-5 h-5 text-[#4682b4]" />} {editingPastor ? "Editar Pastor" : "Registrar Nuevo Pastor"}</DialogTitle></DialogHeader>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Nombres <span className="text-destructive">*</span></label><Input value={formP.nombres} onChange={e => setFormP(f => ({ ...f, nombres: e.target.value }))} className="bg-input-background focus-visible:ring-[#4682b4]/30" /></div>
              <div><label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Apellidos <span className="text-destructive">*</span></label><Input value={formP.apellidos} onChange={e => setFormP(f => ({ ...f, apellidos: e.target.value }))} className="bg-input-background focus-visible:ring-[#4682b4]/30" /></div>
            </div>
            <div><label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Correo Electrónico <span className="text-destructive">*</span></label><Input type="email" value={formP.correo} onChange={e => setFormP(f => ({ ...f, correo: e.target.value }))} className="bg-input-background focus-visible:ring-[#4682b4]/30" /></div>
            <div><label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Teléfono Móvil</label><Input value={formP.telefono} onChange={e => setFormP(f => ({ ...f, telefono: e.target.value }))} className="bg-input-background focus-visible:ring-[#4682b4]/30" /></div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block flex items-center gap-1.5"><Link2 className="w-3 h-3 text-[#4682b4]" /> Vincular a Usuario Sist. (Opcional)</label>
              <Select value={formP.idUsuario ? String(formP.idUsuario) : "none"} onValueChange={v => setFormP(f => ({ ...f, idUsuario: v === "none" ? 0 : Number(v) }))}>
                <SelectTrigger className="bg-input-background focus:ring-[#4682b4]/30"><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vincular</SelectItem>
                  {usuarios.map(u => <SelectItem key={u.idUsuario} value={String(u.idUsuario)}>{u.nombres} {u.apellidos} ({u.correo})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDialogPastor(false)} className="rounded-full px-5"><X className="w-4 h-4 mr-1.5" /> Cancelar</Button>
            <Button onClick={handleSubmitPastor} disabled={!formP.nombres.trim() || !formP.apellidos.trim() || !formP.correo.trim()} className="rounded-full px-5 bg-[#4682b4] hover:bg-[#4682b4]/90 shadow-blue-900/20"><Save className="w-4 h-4 mr-1.5" /> Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Asignación */}
      <Dialog open={dialogAsign} onOpenChange={setDialogAsign}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border border-white/20 shadow-2xl">
          <div className="px-6 py-4 bg-muted/30 border-b border-border/40">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground"><Plus className="w-5 h-5 text-[#4682b4]" /> Nueva Asignación de Liderazgo</DialogTitle></DialogHeader>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Dignatario Pastor <span className="text-destructive">*</span></label>
              <Select value={formA.idPastor ? String(formA.idPastor) : ""} onValueChange={v => setFormA(f => ({ ...f, idPastor: Number(v) }))}>
                <SelectTrigger className="bg-input-background focus:ring-[#4682b4]/30"><SelectValue placeholder="Seleccionar Pastor" /></SelectTrigger>
                <SelectContent>{pastores.map(p => <SelectItem key={p.idPastor} value={String(p.idPastor)}>{p.nombres} {p.apellidos}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Iglesia Destino <span className="text-destructive">*</span></label>
              <Select value={formA.idIglesia ? String(formA.idIglesia) : ""} onValueChange={v => setFormA(f => ({ ...f, idIglesia: Number(v) }))}>
                <SelectTrigger className="bg-input-background focus:ring-[#4682b4]/30"><SelectValue placeholder="Seleccionar Iglesia" /></SelectTrigger>
                <SelectContent>{iglesias.map(i => <SelectItem key={i.idIglesia} value={String(i.idIglesia)}>{i.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Fecha Inicio <span className="text-destructive">*</span></label>
                  <Input type="date" value={formA.fechaInicio} onChange={e => setFormA(f => ({ ...f, fechaInicio: e.target.value }))} className="bg-input-background focus-visible:ring-[#4682b4]/30" />
               </div>
               <div className="flex flex-col justify-end pb-2">
                 <div className="flex items-center gap-2.5 p-2 rounded-xl border border-border/50 bg-white/50 dark:bg-black/10">
                   <input type="checkbox" id="es-principal" checked={formA.esPrincipal} onChange={e => setFormA(f => ({ ...f, esPrincipal: e.target.checked }))} className="rounded border-border text-[#4682b4] focus:ring-[#4682b4]/30 w-4 h-4" />
                   <label htmlFor="es-principal" className="text-xs font-semibold text-foreground/80 cursor-pointer">Pastor Principal</label>
                 </div>
               </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Observaciones Adicionales</label>
              <Input value={formA.observaciones} onChange={e => setFormA(f => ({ ...f, observaciones: e.target.value }))} className="bg-input-background focus-visible:ring-blue-600/30" placeholder="Ej. Encargado temporal, nombramiento 2024..." />
            </div>
          </div>
          <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDialogAsign(false)} className="rounded-full px-5"><X className="w-4 h-4 mr-1.5" /> Cancelar</Button>
            <Button onClick={handleSubmitAsign} disabled={!formA.idIglesia || !formA.idPastor || !formA.fechaInicio} className="rounded-full px-5 bg-[#4682b4] hover:bg-[#4682b4]/90 shadow-blue-900/20"><Save className="w-4 h-4 mr-1.5" /> Misionar Pastor</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!selectedPastor} onOpenChange={() => setSelectedPastor(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          {(() => {
            const p = pastores.find(x => x.idPastor === selectedPastor);
            if (!p) return null;
            const asignaciones = getIglesiasForPastor(p.idPastor);
            const linkedUser = p.idUsuario ? usuarios.find(u => u.idUsuario === p.idUsuario) : null;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white text-lg font-bold shadow-lg">
                      {p.nombres[0]}{p.apellidos[0]}
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold tracking-tight">{p.nombres} {p.apellidos}</DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Pastor</p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-5 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 text-[#4682b4]" />
                      <span className="truncate">{p.correo}</span>
                    </div>
                    {p.telefono && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4 text-[#4682b4]" />
                        <span>{p.telefono}</span>
                      </div>
                    )}
                  </div>

                  {linkedUser && (
                    <div className="p-3 rounded-xl bg-[#4682b4]/5 border border-[#4682b4]/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#4682b4]/60 mb-1">Usuario vinculado</p>
                      <p className="text-sm font-medium">{linkedUser.nombres} {linkedUser.apellidos}</p>
                      <p className="text-xs text-muted-foreground">{linkedUser.correo}</p>
                    </div>
                  )}

                  {asignaciones.length > 0 && (
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Iglesias asignadas</p>
                      <div className="space-y-2">
                        {asignaciones.map(a => (
                          <div key={a.idIglesiaPastor} className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/5">
                            <div className="flex items-center gap-2">
                              <Church className="w-4 h-4 text-[#4682b4]" />
                              <span className="text-sm font-medium">{a.iglesiaNombre}</span>
                            </div>
                            {a.esPrincipal && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-wider">Principal</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.iglesiasActivas.length > 0 && (
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">También miembro en</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.iglesiasActivas.map((nombre, i) => (
                          <Badge key={i} variant="secondary" className="bg-white/60 dark:bg-black/20 text-xs font-medium border-0 tracking-wide text-muted-foreground">
                            <Church className="w-3 h-3 mr-1.5 opacity-70" /> {nombre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter className="border-t border-border/50 pt-4">
                  <Button variant="ghost" className="rounded-xl" onClick={() => setSelectedPastor(null)}>Cerrar</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteAsign} onOpenChange={(open) => !open && setConfirmDeleteAsign(null)}>
        <AlertDialogContent className="rounded-2xl border border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Remover Asignación</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              ¿Seguro que deseas terminar la asignación de <strong className="text-foreground">{confirmDeleteAsign?.pastorName}</strong> en la iglesia <strong className="text-foreground">{confirmDeleteAsign?.iglesiaName}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmDeleteAsign) { closeAsignMutation.mutate(confirmDeleteAsign.id); setConfirmDeleteAsign(null); } }}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
            >
              Remover Asignación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
