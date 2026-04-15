import { useState } from "react";
import { useUsuariosEnriquecidos, useRoles, useToggleUsuarioActivo } from "@/hooks/useUsuarios";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { motion } from "motion/react";
import { Users, Search, ToggleLeft, ToggleRight, Eye, ShieldCheck, Clock, Mail, Phone, Church, MonitorPlay, X } from "lucide-react";

export function UsuariosPage() {
  const { data: enriched = [], isLoading } = useUsuariosEnriquecidos();
  const { data: roles = [] } = useRoles();
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  const [filterRol, setFilterRol] = useState("all");
  const [detail, setDetail] = useState<number | null>(null);

  const toggleActivoMutation = useToggleUsuarioActivo();

  if (isLoading) return (
    <div className="max-w-7xl mx-auto flex items-center justify-center p-12">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Cargando usuarios...</p>
      </div>
    </div>
  );

  const filtered = enriched.filter(u => {
    if (search) {
      const q = search.toLowerCase();
      if (!`${u.nombres} ${u.apellidos}`.toLowerCase().includes(q) && !u.correo.toLowerCase().includes(q)) return false;
    }
    if (filterEstado === "activo" && !u.activo) return false;
    if (filterEstado === "inactivo" && u.activo) return false;
    if (filterRol !== "all" && !u.roleNames.some(rn => rn.rolNombre.toLowerCase().includes(filterRol.toLowerCase()))) return false;
    return true;
  });

  const detailUser = detail ? enriched.find(u => u.idUsuario === detail) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Directorio</p>
            <h1 className="text-3xl font-light tracking-tight text-foreground">Gestión de Usuarios</h1>
          </div>
        </div>
      </motion.div>

      {/* STATS ROW */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/20 shadow-sm dark:border-white/10 dark:bg-card/20 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1">
          <p className="text-3xl font-light text-primary">{enriched.length}</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Totales</p>
        </div>
        <div className="p-5 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/20 shadow-sm dark:border-white/10 dark:bg-card/20 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1">
          <p className="text-3xl font-light text-emerald-600 dark:text-emerald-400">{enriched.filter(u => u.activo).length}</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Activos</p>
        </div>
        <div className="p-5 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/20 shadow-sm dark:border-white/10 dark:bg-card/20 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1">
          <p className="text-3xl font-light text-amber-500 dark:text-amber-400">{enriched.filter(u => !u.activo).length}</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Inactivos</p>
        </div>
        <div className="p-5 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/20 shadow-sm dark:border-white/10 dark:bg-card/20 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1">
          <p className="text-3xl font-light text-blue-600 dark:text-blue-400">{enriched.filter(u => u.ultimoAcceso).length}</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Con Acceso</p>
        </div>
      </motion.div>

      {/* ACTION BAR */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <div className="p-3 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/20 shadow-sm flex flex-col md:flex-row gap-3 dark:border-white/10 dark:bg-card/20">
          <div className="relative flex-1 md:max-w-md">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o correo..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-11 bg-white/50 dark:bg-black/20 border-transparent focus-visible:ring-cyan-600/20 h-11 rounded-xl" 
            />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-full md:w-48 bg-white/50 dark:bg-black/20 border-transparent h-11 rounded-xl focus:ring-cyan-600/20">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Estados</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRol} onValueChange={setFilterRol}>
            <SelectTrigger className="w-full md:w-56 bg-white/50 dark:bg-black/20 border-transparent h-11 rounded-xl focus:ring-cyan-600/20">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Roles</SelectItem>
              {roles.map(r => <SelectItem key={r.idRol} value={r.nombre}>{r.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* TABLE */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <div className="rounded-2xl bg-card/50 backdrop-blur-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden dark:border-white/10 dark:bg-card/20">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Usuario</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Contacto</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Roles / Ministerios</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Último Acceso</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70">Estado</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-primary/70 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(u => (
                  <TableRow key={u.idUsuario} className={`transition-colors hover:bg-white/40 dark:hover:bg-white/5 border-border/40 ${!u.activo ? 'opacity-70' : ''}`}>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary shadow-sm border border-primary/10 shrink-0">
                           {u.nombres[0]}{u.apellidos[0]}
                        </div>
                        <div className="font-medium text-foreground">{u.nombres} {u.apellidos}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                       <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> <span className="truncate max-w-[150px]">{u.correo}</span></span>
                          {u.telefono && <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> {u.telefono}</span>}
                       </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1">
                          {u.roleNames.length > 0 ? u.roleNames.slice(0, 2).map((rn, i) => (
                            <Badge key={i} variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold tracking-wide">{rn.rolNombre}</Badge>
                          )) : <span className="text-[11px] text-muted-foreground italic tracking-wide">Sin rol</span>}
                          {u.roleNames.length > 2 && <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">+{u.roleNames.length - 2}</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {u.minNames.length > 0 ? u.minNames.slice(0, 2).map((mn, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] text-muted-foreground border-border/50 uppercase">{mn.nombre}</Badge>
                          )) : null}
                          {u.minNames.length > 2 && <Badge variant="outline" className="text-[10px]">+ {u.minNames.length - 2}</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm text-foreground/80 font-medium">
                        {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) : "Nunca"}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={`font-semibold tracking-wide border ${u.activo ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {u.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setDetail(u.idUsuario)}>
                           <Eye className="w-3.5 h-3.5 text-foreground/70" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-black/5 dark:hover:bg-white/10" disabled={toggleActivoMutation.isPending} onClick={() => toggleActivoMutation.mutate(u.idUsuario)} title={u.activo ? "Desactivar" : "Activar"}>
                          {u.activo ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                     <TableCell colSpan={6} className="text-center py-16">
                        <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-base font-medium text-foreground">No se encontraron usuarios</p>
                        <p className="text-sm text-muted-foreground mt-1">Prueba con otros términos de búsqueda o filtros</p>
                     </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>

      {/* DETAIL DIALOG */}
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl overflow-hidden p-0 border border-white/20 shadow-2xl">
          <div className="px-6 py-4 bg-muted/30 border-b border-border/40">
             <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground"><Eye className="w-5 h-5 text-cyan-600" /> Detalle de Usuario</DialogTitle></DialogHeader>
          </div>
          {detailUser && (
            <div className="px-6 py-5 space-y-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl font-light text-primary shadow-inner border border-primary/10">
                   {detailUser.nombres[0]}{detailUser.apellidos[0]}
                </div>
                <div>
                  <p className="text-xl font-medium text-foreground">{detailUser.nombres} {detailUser.apellidos}</p>
                  <Badge className={`mt-1.5 font-semibold tracking-wide border ${detailUser.activo ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"}`}>
                    {detailUser.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm p-4 rounded-xl bg-card border border-border/40">
                <div className="flex items-center gap-2.5 text-foreground/80"><Mail className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="truncate">{detailUser.correo}</span></div>
                <div className="flex items-center gap-2.5 text-foreground/80"><Phone className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="truncate">{detailUser.telefono || "Sin teléfono"}</span></div>
                <div className="flex items-center gap-2.5 text-foreground/80"><MonitorPlay className="w-4 h-4 text-muted-foreground shrink-0" /> Últ. acceso: {detailUser.ultimoAcceso ? new Date(detailUser.ultimoAcceso).toLocaleDateString("es", { day: '2-digit', month: 'short', year: 'numeric' }) : "Nunca"}</div>
                <div className="flex items-center gap-2.5 text-foreground/80"><Clock className="w-4 h-4 text-muted-foreground shrink-0" /> Creado: {new Date(detailUser.creadoEn).toLocaleDateString("es", { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-2 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Roles en Iglesias</p>
                  <div className="space-y-2">
                    {detailUser.roleNames.length > 0 ? detailUser.roleNames.map((rn, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                        <span className="text-sm font-medium text-primary">{rn.rolNombre}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Church className="w-3 h-3"/> {rn.iglesiaNombre}</span>
                      </div>
                    )) : <p className="text-xs text-muted-foreground italic">No tiene roles asignados</p>}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Ministerios</p>
                  <div className="flex flex-wrap gap-2">
                    {detailUser.minNames.length > 0 ? detailUser.minNames.map((mn, i) => (
                      <Badge key={i} variant="outline" className="px-3 py-1.5 bg-white dark:bg-black/20 text-xs text-foreground/80">
                         {mn.nombre} <span className="text-primary ml-1.5 opacity-70">({mn.rol})</span>
                      </Badge>
                    )) : <p className="text-xs text-muted-foreground italic">No pertenece a ministerios</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex justify-end">
            <Button variant="ghost" onClick={() => setDetail(null)} className="rounded-full px-5"><X className="w-4 h-4 mr-1.5" /> Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
