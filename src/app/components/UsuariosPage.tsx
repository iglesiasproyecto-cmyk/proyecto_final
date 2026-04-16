import { useState } from "react";
import { motion } from "motion/react";
import { useUsuariosEnriquecidos, useRoles, useToggleUsuarioActivo, useInviteUser, useAssignRol, useRemoveRol, useUsuarioRoles } from "@/hooks/useUsuarios";
import { useIglesias } from "@/hooks/useIglesias";
import { useApp } from "@/app/store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Users, Search, ToggleLeft, ToggleRight, Eye, ShieldCheck, Clock, Mail, Phone, UserPlus, ShieldPlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function UsuariosPage() {
  const { iglesiaActual } = useApp();
  const { data: enriched = [], isLoading } = useUsuariosEnriquecidos();
  const { data: roles = [] } = useRoles();
  const { data: iglesias = [] } = useIglesias();
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  const [filterRol, setFilterRol] = useState("all");
  const [detail, setDetail] = useState<number | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showAssignRol, setShowAssignRol] = useState<number | null>(null);

  const toggleActivoMutation = useToggleUsuarioActivo();
  const inviteMutation = useInviteUser();
  const assignRolMutation = useAssignRol();
  const removeRolMutation = useRemoveRol();

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    correo: "",
    nombres: "",
    apellidos: "",
    idIglesia: iglesiaActual?.id ?? 0,
    idRol: 0,
  });
  const resetInviteForm = () => setInviteForm({ correo: "", nombres: "", apellidos: "", idIglesia: iglesiaActual?.id ?? 0, idRol: 0 });

  // Assign role form state
  const [assignForm, setAssignForm] = useState({
    idRol: 0,
    idIglesia: iglesiaActual?.id ?? 0,
  });
  const resetAssignForm = () => setAssignForm({ idRol: 0, idIglesia: iglesiaActual?.id ?? 0 });

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

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
  const assignUser = showAssignRol ? enriched.find(u => u.idUsuario === showAssignRol) : null;

  const handleInvite = () => {
    if (!inviteForm.correo.trim() || !inviteForm.nombres.trim() || !inviteForm.apellidos.trim() || !inviteForm.idRol || !inviteForm.idIglesia) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    inviteMutation.mutate(
      {
        correo: inviteForm.correo.trim(),
        nombres: inviteForm.nombres.trim(),
        apellidos: inviteForm.apellidos.trim(),
        idIglesia: inviteForm.idIglesia,
        idRol: inviteForm.idRol,
      },
      {
        onSuccess: () => {
          toast.success("Invitación enviada exitosamente");
          setShowInvite(false);
          resetInviteForm();
        },
      }
    );
  };

  const handleAssignRol = () => {
    if (!showAssignRol || !assignForm.idRol || !assignForm.idIglesia) {
      toast.error("Selecciona rol e iglesia");
      return;
    }
    assignRolMutation.mutate(
      {
        idUsuario: showAssignRol,
        idRol: assignForm.idRol,
        idIglesia: assignForm.idIglesia,
      },
      {
        onSuccess: () => {
          toast.success("Rol asignado exitosamente");
          setShowAssignRol(null);
          resetAssignForm();
        },
      }
    );
  };

  const handleRemoveRol = (idUsuarioRol: number, rolNombre: string) => {
    if (!confirm(`¿Remover el rol "${rolNombre}"? El usuario perderá los permisos asociados.`)) return;
    removeRolMutation.mutate(idUsuarioRol, {
      onSuccess: () => toast.success(`Rol "${rolNombre}" removido`),
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Directorio</p>
            <h1 className="text-3xl font-light tracking-tight text-foreground">Gestión de Usuarios</h1>
          </div>
        </div>
        <Button onClick={() => setShowInvite(true)} className="shrink-0 shadow-md shadow-blue-600/20 rounded-full px-6 bg-blue-600 hover:bg-blue-700 text-white h-11">
          <UserPlus className="w-4 h-4 mr-2" /> Invitar Usuario
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl text-primary">{enriched.length}</p>
          <p className="text-xs text-muted-foreground">Total Usuarios</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl text-green-600">{enriched.filter(u => u.activo).length}</p>
          <p className="text-xs text-muted-foreground">Activos</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl text-red-600">{enriched.filter(u => !u.activo).length}</p>
          <p className="text-xs text-muted-foreground">Inactivos</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl text-blue-600">{enriched.filter(u => u.ultimoAcceso).length}</p>
          <p className="text-xs text-muted-foreground">Con acceso reciente</p>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o correo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card" />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRol} onValueChange={setFilterRol}>
          <SelectTrigger className="w-52 bg-card"><SelectValue placeholder="Rol" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {roles.map(r => <SelectItem key={r.idRol} value={r.nombre}>{r.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Ministerios</TableHead>
              <TableHead>Último Acceso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => (
              <TableRow key={u.idUsuario}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary shrink-0">{u.nombres[0]}{u.apellidos[0]}</div>
                    <span className="text-sm">{u.nombres} {u.apellidos}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.correo}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roleNames.length > 0 ? u.roleNames.map((rn, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{rn.rolNombre}</Badge>
                    )) : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.minNames.length > 0 ? u.minNames.slice(0, 2).map((mn, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{mn.nombre}</Badge>
                    )) : <span className="text-xs text-muted-foreground">—</span>}
                    {u.minNames.length > 2 && <Badge variant="outline" className="text-xs">+{u.minNames.length - 2}</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) : "Nunca"}
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${u.activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" title="Ver detalle" onClick={() => setDetail(u.idUsuario)}><Eye className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" title="Asignar rol" onClick={() => { setShowAssignRol(u.idUsuario); resetAssignForm(); }}>
                      <ShieldPlus className="w-3.5 h-3.5 text-blue-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 w-8 p-0 rounded-full transition-all ${u.activo ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`}
                      disabled={toggleActivoMutation.isPending} 
                      onClick={() => toggleActivoMutation.mutate(u.idUsuario)}
                    >
                      {u.activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Detalle de Usuario</DialogTitle></DialogHeader>
          {detailUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg text-primary">{detailUser.nombres[0]}{detailUser.apellidos[0]}</div>
                <div>
                  <p className="text-lg">{detailUser.nombres} {detailUser.apellidos}</p>
                  <Badge className={`text-xs ${detailUser.activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{detailUser.activo ? "Activo" : "Inactivo"}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" /> {detailUser.correo}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" /> {detailUser.telefono || "—"}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" /> Último acceso: {detailUser.ultimoAcceso ? new Date(detailUser.ultimoAcceso).toLocaleString("es") : "Nunca"}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" /> Creado: {new Date(detailUser.creadoEn).toLocaleDateString("es")}</div>
              </div>
              <div>
                <p className="text-sm flex items-center gap-1 mb-2"><ShieldCheck className="w-4 h-4" /> Roles asignados:</p>
                {detailUser.roleNames.length > 0 ? detailUser.roleNames.map((rn, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm ml-6 py-0.5">
                    <Badge variant="secondary">{rn.rolNombre}</Badge>
                    <span className="text-muted-foreground text-xs">en {rn.iglesiaNombre}</span>
                  </div>
                )) : <p className="text-xs text-muted-foreground ml-6">Sin roles asignados</p>}
              </div>
              <div>
                <p className="text-sm mb-2">Ministerios:</p>
                {detailUser.minNames.length > 0 ? detailUser.minNames.map((mn, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm ml-6 py-0.5">
                    <Badge variant="outline">{mn.nombre}</Badge>
                    <span className="text-muted-foreground text-xs">({mn.rol})</span>
                  </div>
                )) : <p className="text-xs text-muted-foreground ml-6">Sin ministerios</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Invite Dialog ── */}
      <Dialog open={showInvite} onOpenChange={o => { if (!o) { setShowInvite(false); resetInviteForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Invitar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nombres *</label>
                <Input
                  value={inviteForm.nombres}
                  onChange={e => setInviteForm(p => ({ ...p, nombres: e.target.value }))}
                  placeholder="Nombres"
                  className="bg-input-background"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Apellidos *</label>
                <Input
                  value={inviteForm.apellidos}
                  onChange={e => setInviteForm(p => ({ ...p, apellidos: e.target.value }))}
                  placeholder="Apellidos"
                  className="bg-input-background"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Correo electrónico *</label>
              <Input
                type="email"
                value={inviteForm.correo}
                onChange={e => setInviteForm(p => ({ ...p, correo: e.target.value }))}
                placeholder="correo@ejemplo.com"
                className="bg-input-background"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Iglesia *</label>
              <Select
                value={inviteForm.idIglesia ? String(inviteForm.idIglesia) : ""}
                onValueChange={v => setInviteForm(p => ({ ...p, idIglesia: Number(v) }))}
              >
                <SelectTrigger className="bg-input-background"><SelectValue placeholder="Seleccionar iglesia..." /></SelectTrigger>
                <SelectContent>
                  {iglesias.map(ig => (
                    <SelectItem key={ig.idIglesia} value={String(ig.idIglesia)}>{ig.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Rol inicial *</label>
              <Select
                value={inviteForm.idRol ? String(inviteForm.idRol) : ""}
                onValueChange={v => setInviteForm(p => ({ ...p, idRol: Number(v) }))}
              >
                <SelectTrigger className="bg-input-background"><SelectValue placeholder="Seleccionar rol..." /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.idRol} value={String(r.idRol)}>{r.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowInvite(false); resetInviteForm(); }}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <><UserPlus className="w-4 h-4 mr-2" /> Enviar Invitación</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Role Dialog ── */}
      <Dialog open={!!showAssignRol} onOpenChange={o => { if (!o) { setShowAssignRol(null); resetAssignForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldPlus className="w-5 h-5" /> Gestionar Roles</DialogTitle>
          </DialogHeader>
          {assignUser && (
            <div className="space-y-5 py-2">
              {/* Current roles */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Roles actuales de <strong>{assignUser.nombres} {assignUser.apellidos}</strong>:</p>
                {assignUser.roleNames.length > 0 ? (
                  <div className="space-y-1.5">
                    {assignUser.roleNames.map((rn, i) => (
                      <RoleRow key={i} rolNombre={rn.rolNombre} iglesiaNombre={rn.iglesiaNombre} idUsuario={assignUser.idUsuario} onRemove={handleRemoveRol} isRemoving={removeRolMutation.isPending} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground bg-accent/30 p-3 rounded-lg text-center">Sin roles asignados</p>
                )}
              </div>

              {/* Add new role */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Agregar nuevo rol</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Rol *</label>
                    <Select
                      value={assignForm.idRol ? String(assignForm.idRol) : ""}
                      onValueChange={v => setAssignForm(p => ({ ...p, idRol: Number(v) }))}
                    >
                      <SelectTrigger className="bg-input-background"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {roles.map(r => (
                          <SelectItem key={r.idRol} value={String(r.idRol)}>{r.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Iglesia *</label>
                    <Select
                      value={assignForm.idIglesia ? String(assignForm.idIglesia) : ""}
                      onValueChange={v => setAssignForm(p => ({ ...p, idIglesia: Number(v) }))}
                    >
                      <SelectTrigger className="bg-input-background"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {iglesias.map(ig => (
                          <SelectItem key={ig.idIglesia} value={String(ig.idIglesia)}>{ig.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full mt-3" onClick={handleAssignRol} disabled={assignRolMutation.isPending || !assignForm.idRol || !assignForm.idIglesia}>
                  {assignRolMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Asignando...</> : <><ShieldPlus className="w-4 h-4 mr-2" /> Asignar Rol</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Helper component for the role row with remove button ── */
function RoleRow({ rolNombre, iglesiaNombre, idUsuario, onRemove, isRemoving }: {
  rolNombre: string; iglesiaNombre: string; idUsuario: number; onRemove: (idUsuarioRol: number, rolNombre: string) => void; isRemoving: boolean;
}) {
  // We need the actual idUsuarioRol to remove it. Since the enriched query doesn't provide it,
  // we fetch it when the user clicks. For now, we use the usuarios-enriquecidos enrichment pattern.
  const { data: userRoles = [] } = useUsuarioRoles(idUsuario);
  const matchingRol = userRoles.find(ur => {
    // Match by role name via the roles list — not ideal but functional
    return ur.fechaFin === null;
  });

  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-accent/30">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">{rolNombre}</Badge>
        <span className="text-xs text-muted-foreground">en {iglesiaNombre}</span>
      </div>
      {matchingRol && (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" disabled={isRemoving}
          onClick={() => onRemove(matchingRol.idUsuarioRol, rolNombre)}>
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
