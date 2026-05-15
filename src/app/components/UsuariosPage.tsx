import { useState } from "react";
import { motion } from "motion/react";
import { useUsuariosEnriquecidos, useRoles, useToggleUsuarioActivo, useInviteUser, useAssignRol, useRemoveRol, useUpdateUsuario, useDeleteUsuarioAsSuperAdmin } from "@/hooks/useUsuarios";
import { useIglesias, useSedesEnriquecidas } from "@/hooks/useIglesias";
import { useMinisterios } from "@/hooks/useMinisterios";
import { useApp } from "@/app/store/AppContext";
import { ROLE_IDS } from "@/app/constants/roles";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Users, Search, ToggleLeft, ToggleRight, Eye, ShieldCheck, Clock, Mail, Phone, UserPlus, ShieldPlus, Pencil, X, Loader2, Trash2, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import { HojaDeVidaModal } from "./hojaDeVida/HojaDeVidaModal";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { TableSkeleton } from "./loading/skeletons";
import { Skeleton } from "./ui/skeleton";

export function UsuariosPage() {
  const { iglesiaActual, rolActual, iglesiasDelUsuario } = useApp();

  const isSuperAdmin = rolActual === "super_admin";
  const isAdminIglesia = rolActual === "admin_iglesia";
  const canManageUsers = isSuperAdmin || isAdminIglesia;

  const { data: enriched = [], isLoading } = useUsuariosEnriquecidos();
  const { data: roles = [] } = useRoles();
  const { data: allIglesias = [] } = useIglesias({ includeInactive: true });
  const iglesias = canManageUsers && !isSuperAdmin ? iglesiasDelUsuario : allIglesias;
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  const [filterRol, setFilterRol] = useState("all");
  const [filterIglesia, setFilterIglesia] = useState<string>("all");
  const [detail, setDetail] = useState<number | null>(null);
  const [showHojaDeVida, setShowHojaDeVida] = useState<number | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showAssignRol, setShowAssignRol] = useState<number | null>(null);
  const [editUser, setEditUser] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nombres: "", apellidos: "", telefono: "" });
  const [deleteUser, setDeleteUser] = useState<number | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [confirmRemoveRol, setConfirmRemoveRol] = useState<{ isOpen: boolean; idUsuarioRol: number; rolNombre: string; source: "usuario_rol" | "usuario_rol_sede" }>({ isOpen: false, idUsuarioRol: 0, rolNombre: "", source: "usuario_rol" });

  const toggleActivoMutation = useToggleUsuarioActivo();
  const inviteMutation = useInviteUser();
  const assignRolMutation = useAssignRol();
  const removeRolMutation = useRemoveRol();
  const updateUsuarioMutation = useUpdateUsuario();
  const deleteUsuarioMutation = useDeleteUsuarioAsSuperAdmin();

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    correo: "",
    nombres: "",
    apellidos: "",
    idIglesia: iglesiaActual?.id ?? 0,
    idRol: 0,
    idSede: 0,
    idMinisterio: 0,
  });
  const resetInviteForm = () => setInviteForm({ correo: "", nombres: "", apellidos: "", idIglesia: iglesiaActual?.id ?? 0, idRol: 0, idSede: 0, idMinisterio: 0 });

  // Assign role form state
  const [assignForm, setAssignForm] = useState({
    idRol: 0,
    idIglesia: iglesiaActual?.id ?? 0,
    idSede: 0,
    idMinisterio: 0,
  });
  const resetAssignForm = () => setAssignForm({ idRol: 0, idIglesia: iglesiaActual?.id ?? 0, idSede: 0, idMinisterio: 0 });

  const { data: sedesInvite = [] } = useSedesEnriquecidas(inviteForm.idIglesia || undefined);
  const { data: sedesAssign = [] } = useSedesEnriquecidas(assignForm.idIglesia || undefined);
  const { data: ministeriosInvite = [] } = useMinisterios(inviteForm.idIglesia || undefined);
  const { data: ministeriosAssign = [] } = useMinisterios(assignForm.idIglesia || undefined);

  const roleNeedsSede = (idRol: number) => [ROLE_IDS.ADMIN_SEDE, ROLE_IDS.LIDER, ROLE_IDS.SERVIDOR].includes(idRol);
  const roleNeedsMinisterio = (idRol: number) => [ROLE_IDS.LIDER, ROLE_IDS.SERVIDOR].includes(idRol);
  const ministeriosInviteFiltered = ministeriosInvite.filter(m => inviteForm.idSede ? m.idSede === inviteForm.idSede : true);
  const ministeriosFiltered = ministeriosAssign.filter(m => assignForm.idSede ? m.idSede === assignForm.idSede : true);

  if (isLoading) return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <div className="flex items-center gap-4 p-4">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <TableSkeleton rows={8} columns={6} showPagination />
    </div>
  );

  const filtered = enriched.filter(u => {
    // If admin_iglesia, only show users from their iglesia and exclude super admins
    if (isAdminIglesia) {
      const hasRoleInMyIglesia = u.roleNames.some(rn => rn.idIglesia === iglesiaActual?.id && rn.rolNombre !== 'Super Administrador');
      if (!hasRoleInMyIglesia) return false;
    }

    if (search) {
      const q = search.toLowerCase().trim();
      const fullName = `${u.nombres} ${u.apellidos}`.toLowerCase();
      const matchesName = fullName.includes(q);
      const matchesEmail = u.correo.toLowerCase().includes(q);
      const matchesPhone = (u.telefono || "").toLowerCase().includes(q);
      const matchesRol = u.roleNames.some(rn => rn.rolNombre.toLowerCase().includes(q));
      const matchesIglesia = u.roleNames.some(rn => rn.iglesiaNombre.toLowerCase().includes(q));
      const matchesMinisterio = u.minNames.some(mn => mn.nombre.toLowerCase().includes(q));
      if (!matchesName && !matchesEmail && !matchesPhone && !matchesRol && !matchesIglesia && !matchesMinisterio) return false;
    }
    if (filterEstado === "activo" && !u.activo) return false;
    if (filterEstado === "inactivo" && u.activo) return false;
    if (filterRol !== "all" && !u.roleNames.some(rn => rn.rolNombre.toLowerCase().includes(filterRol.toLowerCase()))) return false;
    if (filterIglesia !== "all" && !u.roleNames.some(rn => String(rn.idIglesia) === filterIglesia)) return false;
    return true;
  });

  const detailUser = detail ? enriched.find(u => u.idUsuario === detail) : null;
  const assignUser = showAssignRol ? enriched.find(u => u.idUsuario === showAssignRol) : null;
  const deleteTargetUser = deleteUser ? enriched.find(u => u.idUsuario === deleteUser) : null;

  const openEditDialog = (idUsuario: number) => {
    const user = enriched.find(u => u.idUsuario === idUsuario);
    if (!user) return;
    setEditUser(idUsuario);
    setEditForm({
      nombres: user.nombres,
      apellidos: user.apellidos,
      telefono: user.telefono ?? "",
    });
  };

  const handleInvite = () => {
    if (!inviteForm.correo.trim() || !inviteForm.nombres.trim() || !inviteForm.apellidos.trim() || !inviteForm.idRol || !inviteForm.idIglesia) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    if (roleNeedsSede(inviteForm.idRol) && !inviteForm.idSede) {
      toast.error("Debes seleccionar una sede para este rol");
      return;
    }
    if (roleNeedsMinisterio(inviteForm.idRol) && !inviteForm.idMinisterio) {
      toast.error("Debes seleccionar un ministerio para este rol");
      return;
    }
    inviteMutation.mutate(
      {
        correo: inviteForm.correo.trim(),
        nombres: inviteForm.nombres.trim(),
        apellidos: inviteForm.apellidos.trim(),
        idIglesia: inviteForm.idIglesia,
        idRol: inviteForm.idRol,
        idSede: inviteForm.idSede || null,
        idMinisterio: inviteForm.idMinisterio || null,
      },
      {
        onSuccess: (result) => {
          if (result.inviteSent) {
            toast.success("Invitación enviada. El usuario debe revisar su correo para crear contraseña");
          } else if (result.profileReconciled && result.roleAssigned) {
            toast.success("Correo existente recuperado y vinculado. Se asignó el rol correctamente");
          } else if (result.roleAssigned) {
            toast.success("El correo ya existía. Se asignó el rol sin reenviar invitación");
          } else {
            toast.success("El usuario ya tenía ese rol activo en la iglesia seleccionada");
          }
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
    if (roleNeedsSede(assignForm.idRol) && !assignForm.idSede) {
      toast.error("Debes seleccionar una sede para este rol");
      return;
    }
    if (roleNeedsMinisterio(assignForm.idRol) && !assignForm.idMinisterio) {
      toast.error("Debes seleccionar un ministerio para este rol");
      return;
    }
    assignRolMutation.mutate(
      {
        idUsuario: showAssignRol,
        idRol: assignForm.idRol,
        idIglesia: assignForm.idIglesia,
        idSede: assignForm.idSede || null,
        idMinisterio: assignForm.idMinisterio || null,
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

  const handleRemoveRol = (idUsuarioRol: number, rolNombre: string, source: "usuario_rol" | "usuario_rol_sede") => {
    setConfirmRemoveRol({ isOpen: true, idUsuarioRol, rolNombre, source });
  };

  const executeRemoveRol = () => {
    removeRolMutation.mutate({ idUsuarioRol: confirmRemoveRol.idUsuarioRol, source: confirmRemoveRol.source }, {
      onSuccess: () => {
        toast.success(`Rol "${confirmRemoveRol.rolNombre}" removido`);
        setConfirmRemoveRol({ isOpen: false, idUsuarioRol: 0, rolNombre: "", source: "usuario_rol" });
      },
      onError: (err: any) => {
        toast.error(err?.message ?? "No se pudo remover el rol");
      },
    });
  };

  const handleEditUser = () => {
    if (!editUser) return;
    if (!editForm.nombres.trim() || !editForm.apellidos.trim()) {
      toast.error("Nombres y apellidos son obligatorios");
      return;
    }

    updateUsuarioMutation.mutate(
      {
        id: editUser,
        data: {
          nombres: editForm.nombres.trim(),
          apellidos: editForm.apellidos.trim(),
          telefono: editForm.telefono.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Usuario actualizado exitosamente");
          setEditUser(null);
        },
        onError: (err: any) => {
          toast.error(err?.message ?? "No se pudo actualizar el usuario");
        },
      }
    );
  };

  const openDeleteDialog = (idUsuario: number) => {
    setDeleteUser(idUsuario);
    setDeleteConfirmText("");
  };

  const handleDeleteUser = () => {
    if (!deleteTargetUser) return;
    if (deleteConfirmText.trim().toLowerCase() !== deleteTargetUser.correo.trim().toLowerCase()) {
      toast.error("Debes escribir exactamente el correo del usuario para confirmar");
      return;
    }

    deleteUsuarioMutation.mutate(deleteTargetUser.idUsuario, {
      onSuccess: (mode) => {
        if (mode === "hard") {
          toast.success("Usuario eliminado permanentemente");
        } else {
          toast.success("Usuario eliminado (archivado por seguridad de datos)");
        }
        setDeleteUser(null);
        setDeleteConfirmText("");
      },
      onError: (err: any) => {
        toast.error(err?.message ?? "No se pudo eliminar el usuario");
      },
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="flex flex-col gap-6">
        {/* Logo + Título + Botón Invitar Usuario */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <p className="text-primary/80 font-medium uppercase tracking-[0.2em] text-[10px] mb-0.5">Directorio</p>
              <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-foreground leading-tight">Gestión de Usuarios</h1>
            </div>
          </div>
          <Button onClick={() => setShowInvite(true)} className="shrink-0 shadow-md shadow-[#4682b4]/20 rounded-full px-4 sm:px-6 bg-[#4682b4] hover:bg-[#4682b4]/90 text-white h-10 sm:h-11 text-sm sm:text-base">
            <UserPlus className="w-4 h-4 mr-1 sm:mr-2" /> 
            <span className="hidden xs:inline">Invitar Usuario</span>
            <span className="xs:hidden">Invitar</span>
          </Button>
        </div>

        {/* Búsqueda y Filtros */}
        <div className="flex flex-col gap-2">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input placeholder="Buscar por nombre o correo..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 h-10 bg-background/60 border border-border/40 rounded-xl shadow-sm focus-visible:ring-primary/30 focus-visible:border-primary/40 text-sm" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="flex-1 h-10 bg-background/60 border border-border/40 rounded-xl shadow-sm text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRol} onValueChange={setFilterRol}>
            <SelectTrigger className="flex-1 h-10 bg-background/60 border border-border/40 rounded-xl shadow-sm text-sm"><SelectValue placeholder="Rol" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {roles.map(r => <SelectItem key={r.idRol} value={r.nombre}>{r.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterIglesia} onValueChange={setFilterIglesia}>
            <SelectTrigger className="flex-1 h-10 bg-background/60 border border-border/40 rounded-xl shadow-sm text-sm"><SelectValue placeholder="Iglesia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las iglesias</SelectItem>
              {iglesias.map(ig => <SelectItem key={ig.idIglesia} value={String(ig.idIglesia)}>{ig.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" className="h-10 rounded-xl text-xs whitespace-nowrap" onClick={() => { setSearch(""); setFilterEstado("all"); setFilterRol("all"); setFilterIglesia("all"); }}>
            <span className="hidden sm:inline">Limpiar filtros</span>
            <span className="sm:hidden">Limpiar</span>
          </Button>
        </div>
      </motion.div>

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
                    {u.roleNames.length > 0 ? u.roleNames.map((rn) => (
                      <Badge key={`${rn.idRol}-${rn.idIglesia}-${rn.sedeNombre || ''}`} variant="secondary" className="text-xs">
                        {rn.rolNombre}{rn.sedeNombre ? ` · ${rn.sedeNombre}` : ""}
                      </Badge>
                    )) : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.minNames.length > 0 ? u.minNames.slice(0, 2).map((mn) => (
                      <Badge key={mn.nombre} variant="outline" className="text-xs">{mn.nombre}</Badge>
                    )) : <span className="text-xs text-muted-foreground">—</span>}
                    {u.minNames.length > 2 && <Badge variant="outline" className="text-xs">+{u.minNames.length - 2}</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) : "Nunca"}
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${u.activo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200" : "bg-red-100 text-red-800"}`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" title="Ver Hoja de Vida" onClick={() => setShowHojaDeVida(u.idUsuario)}>
                      <FileText className="w-3.5 h-3.5 text-cyan-600" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Ver detalle" onClick={() => setDetail(u.idUsuario)}><Eye className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" title="Editar usuario" onClick={() => openEditDialog(u.idUsuario)}>
                      <Pencil className="w-3.5 h-3.5 text-amber-600" />
                    </Button>
                    {canManageUsers && (
                      <Button variant="ghost" size="sm" title="Asignar rol" onClick={() => { setShowAssignRol(u.idUsuario); resetAssignForm(); }}>
                        <ShieldPlus className="w-3.5 h-3.5 text-[#4682b4] dark:text-[#709dbd]" />
                      </Button>
                    )}
                    {isSuperAdmin && (
                      <Button variant="ghost" size="sm" title="Eliminar usuario" onClick={() => openDeleteDialog(u.idUsuario)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </Button>
                    )}
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
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Search className="w-5 h-5" />
                    <p className="text-sm">No hay usuarios con los filtros actuales</p>
                    <p className="text-xs">Ajusta la búsqueda o limpia los filtros para ver más resultados.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
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
                  <Badge className={`text-xs ${detailUser.activo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200" : "bg-red-100 text-red-800"}`}>{detailUser.activo ? "Activo" : "Inactivo"}</Badge>
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
                {detailUser.roleNames.length > 0 ? detailUser.roleNames.map((rn) => (
                  <div key={`${rn.idRol}-${rn.idIglesia}-${rn.sedeNombre || ''}`} className="flex items-center gap-2 text-sm ml-6 py-0.5">
                    <Badge variant="secondary">{rn.rolNombre}</Badge>
                    <span className="text-muted-foreground text-xs">en {rn.iglesiaNombre}{rn.sedeNombre ? ` · ${rn.sedeNombre}` : ""}</span>
                  </div>
                )) : <p className="text-xs text-muted-foreground ml-6">Sin roles asignados</p>}
              </div>
              <div>
                <p className="text-sm mb-2">Ministerios:</p>
                {detailUser.minNames.length > 0 ? detailUser.minNames.map((mn) => (
                  <div key={mn.nombre} className="flex items-center gap-2 text-sm ml-6 py-0.5">
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
              <label className="text-sm text-muted-foreground mb-1 block">Iglesia {isAdminIglesia && '(Tu iglesia)'} *</label>
              <Select
                value={inviteForm.idIglesia ? String(inviteForm.idIglesia) : ""}
                onValueChange={v => setInviteForm(p => ({ ...p, idIglesia: Number(v), idSede: 0, idMinisterio: 0 }))}
                disabled={isAdminIglesia}
              >
                <SelectTrigger className={`bg-input-background ${isAdminIglesia ? 'opacity-70 cursor-not-allowed' : ''}`}><SelectValue placeholder="Seleccionar iglesia..." /></SelectTrigger>
                <SelectContent>
                  {iglesias.map(ig => (
                    <SelectItem key={ig.idIglesia} value={String(ig.idIglesia)}>
                      {ig.nombre}{ig.estado !== 'activa' ? ' (Inactiva)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Rol inicial *</label>
              <Select
                value={inviteForm.idRol ? String(inviteForm.idRol) : ""}
                onValueChange={v => setInviteForm(p => ({ ...p, idRol: Number(v), idSede: 0, idMinisterio: 0 }))}
              >
                <SelectTrigger className="bg-input-background"><SelectValue placeholder="Seleccionar rol..." /></SelectTrigger>
                <SelectContent>
                  {roles
                    .filter(r => {
                      // Super Admin puede asignar cualquier rol
                      if (isSuperAdmin) return true;
                      // Admin Iglesia no puede asignar Super Admin
                      return r.nombre !== 'Super Administrador';
                    })
                    .map(r => (
                      <SelectItem key={r.idRol} value={String(r.idRol)}>{r.nombre}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {roleNeedsSede(inviteForm.idRol) && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Sede *</label>
                  <Select
                    value={inviteForm.idSede ? String(inviteForm.idSede) : ""}
                    onValueChange={v => setInviteForm(p => ({ ...p, idSede: Number(v), idMinisterio: 0 }))}
                  >
                    <SelectTrigger className="bg-input-background"><SelectValue placeholder="Seleccionar sede..." /></SelectTrigger>
                    <SelectContent>
                      {sedesInvite.map(sd => (
                        <SelectItem key={sd.idSede} value={String(sd.idSede)}>{sd.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {roleNeedsMinisterio(inviteForm.idRol) && inviteForm.idSede && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Ministerio *</label>
                    <Select
                      value={inviteForm.idMinisterio ? String(inviteForm.idMinisterio) : ""}
                      onValueChange={v => setInviteForm(p => ({ ...p, idMinisterio: Number(v) }))}
                    >
                      <SelectTrigger className="bg-input-background"><SelectValue placeholder="Seleccionar ministerio..." /></SelectTrigger>
                      <SelectContent>
                        {ministeriosInviteFiltered.length > 0 ? (
                          ministeriosInviteFiltered.map(m => (
                            <SelectItem key={m.idMinisterio} value={String(m.idMinisterio)}>{m.nombre}</SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">Sin ministerios en esta sede</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground bg-accent/30 px-2 py-1.5 rounded">
                  Para Lider/Servidor la persona debe pertenecer a un ministerio de la sede.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowInvite(false); resetInviteForm(); }}>Cancelar</Button>
            <Button
              onClick={handleInvite}
              disabled={inviteMutation.isPending || !inviteForm.nombres.trim() || !inviteForm.apellidos.trim() || !inviteForm.correo.trim() || !inviteForm.idRol || !inviteForm.idIglesia || (roleNeedsSede(inviteForm.idRol) && !inviteForm.idSede) || (roleNeedsMinisterio(inviteForm.idRol) && !inviteForm.idMinisterio)}
            >
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
                      <RoleRow
                        key={rn.idUsuarioRol || `${rn.idRol}-${rn.idIglesia}-${i}`}
                        idUsuarioRol={rn.idUsuarioRol}
                        source={rn.source}
                        rolNombre={rn.rolNombre}
                        iglesiaNombre={rn.iglesiaNombre}
                        sedeNombre={rn.sedeNombre}
                        onRemove={handleRemoveRol}
                        isRemoving={removeRolMutation.isPending}
                      />
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
                      onValueChange={v => setAssignForm(p => ({ ...p, idRol: Number(v), idSede: 0 }))}
                    >
                      <SelectTrigger className="bg-input-background"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {roles
                          .filter(r => {
                            // Super Admin puede asignar cualquier rol
                            if (isSuperAdmin) return true;
                            // Admin Iglesia no puede asignar Super Admin
                            return r.nombre !== 'Super Administrador';
                          })
                          .map(r => (
                            <SelectItem key={r.idRol} value={String(r.idRol)}>{r.nombre}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Iglesia {isAdminIglesia && '(Tu iglesia)'} *</label>
                    <Select
                      value={assignForm.idIglesia ? String(assignForm.idIglesia) : ""}
                      onValueChange={v => setAssignForm(p => ({ ...p, idIglesia: Number(v), idSede: 0, idMinisterio: 0 }))}
                      disabled={isAdminIglesia}
                    >
                      <SelectTrigger className={`bg-input-background ${isAdminIglesia ? 'opacity-70 cursor-not-allowed' : ''}`}><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {iglesias.map(ig => (
                          <SelectItem key={ig.idIglesia} value={String(ig.idIglesia)}>
                            {ig.nombre}{ig.estado !== 'activa' ? ' (Inactiva)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {roleNeedsSede(assignForm.idRol) && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Sede *</label>
                      <Select
                        value={assignForm.idSede ? String(assignForm.idSede) : ""}
                        onValueChange={v => setAssignForm(p => ({ ...p, idSede: Number(v), idMinisterio: 0 }))}
                      >
                        <SelectTrigger className="bg-input-background"><SelectValue placeholder="Seleccionar sede..." /></SelectTrigger>
                        <SelectContent>
                          {sedesAssign.map(sd => (
                            <SelectItem key={sd.idSede} value={String(sd.idSede)}>{sd.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {roleNeedsMinisterio(assignForm.idRol) && assignForm.idSede && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Ministerio *</label>
                        <Select
                          value={assignForm.idMinisterio ? String(assignForm.idMinisterio) : ""}
                          onValueChange={v => setAssignForm(p => ({ ...p, idMinisterio: Number(v) }))}
                        >
                          <SelectTrigger className="bg-input-background"><SelectValue placeholder="Seleccionar ministerio..." /></SelectTrigger>
                          <SelectContent>
                            {ministeriosFiltered.length > 0 ? (
                              ministeriosFiltered.map(m => (
                                <SelectItem key={m.idMinisterio} value={String(m.idMinisterio)}>{m.nombre}</SelectItem>
                              ))
                            ) : (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">Sin ministerios en esta sede</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground bg-accent/30 px-2 py-1.5 rounded">
                      Para Lider/Servidor la persona debe pertenecer a un ministerio de la sede.
                    </p>
                  </div>
                )}
                <Button className="w-full mt-3" onClick={handleAssignRol} disabled={assignRolMutation.isPending || !assignForm.idRol || !assignForm.idIglesia}>
                  {assignRolMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Asignando...</> : <><ShieldPlus className="w-4 h-4 mr-2" /> Asignar Rol</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ── */}
      <Dialog open={!!editUser} onOpenChange={o => !o && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5" /> Editar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nombres *</label>
                <Input
                  value={editForm.nombres}
                  onChange={e => setEditForm(p => ({ ...p, nombres: e.target.value }))}
                  placeholder="Nombres"
                  className="bg-input-background"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Apellidos *</label>
                <Input
                  value={editForm.apellidos}
                  onChange={e => setEditForm(p => ({ ...p, apellidos: e.target.value }))}
                  placeholder="Apellidos"
                  className="bg-input-background"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Teléfono</label>
              <Input
                value={editForm.telefono}
                onChange={e => setEditForm(p => ({ ...p, telefono: e.target.value }))}
                placeholder="Teléfono"
                className="bg-input-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleEditUser} disabled={updateUsuarioMutation.isPending}>
              {updateUsuarioMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : <><Pencil className="w-4 h-4 mr-2" /> Guardar Cambios</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete User Dialog ── */}
      <Dialog open={!!deleteUser} onOpenChange={o => { if (!o) { setDeleteUser(null); setDeleteConfirmText(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" /> Eliminar Usuario</DialogTitle>
          </DialogHeader>
          {deleteTargetUser && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">
                Esta acción es irreversible para el acceso del usuario. Si existen datos relacionados, se realizará archivado seguro para no romper historial.
              </div>
              <div className="space-y-1">
                <p className="text-sm">Usuario: <strong>{deleteTargetUser.nombres} {deleteTargetUser.apellidos}</strong></p>
                <p className="text-xs text-muted-foreground">Correo de confirmación: {deleteTargetUser.correo}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Escribe el correo para confirmar *</label>
                <Input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteTargetUser.correo}
                  className="bg-input-background"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteUser(null); setDeleteConfirmText(""); }}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUsuarioMutation.isPending || !deleteTargetUser || deleteConfirmText.trim().toLowerCase() !== deleteTargetUser.correo.trim().toLowerCase()}
            >
              {deleteUsuarioMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Eliminando...</> : <><Trash2 className="w-4 h-4 mr-2" /> Eliminar Usuario</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HojaDeVidaModal
        idUsuario={showHojaDeVida}
        isOpen={showHojaDeVida !== null}
        onClose={() => setShowHojaDeVida(null)}
        nombreUsuario={
          showHojaDeVida
            ? enriched.find((u) => u.idUsuario === showHojaDeVida)
                ? `${enriched.find((u) => u.idUsuario === showHojaDeVida)?.nombres} ${enriched.find((u) => u.idUsuario === showHojaDeVida)?.apellidos}`
                : "Usuario"
            : "Usuario"
        }
      />

      <ConfirmDialog
        isOpen={confirmRemoveRol.isOpen}
        onClose={() => setConfirmRemoveRol({ isOpen: false, idUsuarioRol: 0, rolNombre: "", source: "usuario_rol" })}
        onConfirm={executeRemoveRol}
        title="¿Remover Rol?"
        description={`¿Estás seguro de que quieres remover el rol "${confirmRemoveRol.rolNombre}"? El usuario perderá los permisos asociados.`}
      />
    </div>
  );
}

/* ── Helper component for the role row with remove button ── */
function RoleRow({ idUsuarioRol, source, rolNombre, iglesiaNombre, sedeNombre, onRemove, isRemoving }: {
  idUsuarioRol: number
  source: "usuario_rol" | "usuario_rol_sede"
  rolNombre: string
  iglesiaNombre: string
  sedeNombre?: string
  onRemove: (idUsuarioRol: number, rolNombre: string, source: "usuario_rol" | "usuario_rol_sede") => void
  isRemoving: boolean
}) {
  const canRemove = !!idUsuarioRol;

  const handleRemoveClick = async () => {
    if (!idUsuarioRol) return;
    onRemove(idUsuarioRol, rolNombre, source);
  };

  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-accent/30">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">{rolNombre}</Badge>
        <span className="text-xs text-muted-foreground">en {iglesiaNombre}{sedeNombre ? ` · ${sedeNombre}` : ""}</span>
      </div>
      {canRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          disabled={isRemoving}
          onClick={handleRemoveClick}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
