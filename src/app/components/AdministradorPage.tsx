import { useState } from "react";
import { useIglesiasEnriquecidas, useSedesEnriquecidas } from "@/hooks/useIglesias";
import { useUsuariosEnriquecidos, useAssignRol, useRemoveRol, useAdminSedesAsignaciones, useAssignAdminSede, useRemoveAdminSede } from "@/hooks/useUsuarios";
import { useQueryClient } from "@tanstack/react-query";
import { ROLE_IDS } from "@/app/constants/roles";
import type { UsuarioEnriquecido } from "@/services/usuarios.service";
import { Skeleton } from "./ui/skeleton";
import { Building2, MapPin, Users, Plus, X, Search, Crown, ShieldCheck, UserMinus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const ID_ROL_ADMIN_IGLESIA = ROLE_IDS.ADMIN_IGLESIA;

interface AdminEntry {
  idUsuarioRol: number;
  idUsuario: number;
  nombre: string;
  correo: string;
}

interface AdminSedeEntry {
  idAdminSedeAsignacion: number;
  idUsuario: number;
  nombre: string;
  correo: string;
}

// ── Avatar initials helper ───────────────────────────────────────────────────
function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`${size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs"} shrink-0 rounded-full bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white font-bold`}>
      {initials}
    </div>
  );
}

// ── User Picker Panel ────────────────────────────────────────────────────────
function UserPicker({ candidates, onSelect, onClose, isLoading }: {
  candidates: UsuarioEnriquecido[];
  onSelect: (u: UsuarioEnriquecido) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [search, setSearch] = useState("");
  const filtered = candidates.filter(u => {
    const q = search.toLowerCase();
    return !q || u.nombres.toLowerCase().includes(q) || u.apellidos.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q);
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="pt-4 mt-4 border-t border-border/30 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <input
            autoFocus
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-background/60 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
        <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {search ? "Sin resultados para tu búsqueda" : "No hay usuarios disponibles"}
            </p>
          ) : (
            filtered.map(u => (
              <button
                key={u.idUsuario}
                onClick={() => { onSelect(u); onClose(); }}
                disabled={isLoading}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-primary/5 hover:border-primary/20 border border-transparent text-left text-sm transition-all group/candidate disabled:opacity-50"
              >
                <Avatar name={`${u.nombres} ${u.apellidos}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{u.nombres} {u.apellidos}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.correo}</p>
                </div>
                <Plus className="h-4 w-4 text-primary opacity-0 group-hover/candidate:opacity-100 transition-opacity shrink-0" />
              </button>
            ))
          )}
        </div>
        <button onClick={onClose} className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors">
          Cancelar
        </button>
      </div>
    </motion.div>
  );
}

// ── Unified Admin Card ───────────────────────────────────────────────────────
function AdminCard({
  icon,
  title,
  subtitle,
  admins,
  candidates,
  onAssign,
  onRemove,
  isAssigning,
  isRemoving,
  adminKey,
  removeKey,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  admins: { id: number; idUsuario: number; nombre: string; correo: string }[];
  candidates: UsuarioEnriquecido[];
  onAssign: (u: UsuarioEnriquecido) => void;
  onRemove: (id: number) => void;
  isAssigning: boolean;
  isRemoving: boolean;
  adminKey: string;
  removeKey: string;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl bg-card/45 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:border-white/10 dark:bg-card/20 hover:border-border/80 transition-all duration-300 hover:translate-y-[-2px]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-105 transition-transform duration-300">
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-foreground leading-tight">{title}</h3>
              {subtitle && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-muted-foreground/60" />
                  <span className="text-xs text-muted-foreground">{subtitle}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/10 text-xs font-semibold text-primary">
            <Users className="h-3 w-3" />
            <span>{admins.length}</span>
          </div>
        </div>

        {/* Admins list */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Administradores</span>
            {!showPicker && (
              <button
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-lg hover:bg-primary/5"
              >
                <Plus className="h-3 w-3" />
                Asignar
              </button>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {admins.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl bg-muted/20 border border-dashed border-border/50 p-5 text-center"
              >
                <Crown className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Sin administrador</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Haz clic en "Asignar" para agregar uno</p>
              </motion.div>
            ) : (
              admins.map(a => (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex items-center justify-between rounded-xl bg-muted/20 border border-border/30 px-3 py-2.5 hover:border-border/60 transition-colors group/admin"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={a.nombre} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate leading-tight">{a.nombre}</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{a.correo}</p>
                    </div>
                  </div>

                  {/* Remove with confirm */}
                  <AnimatePresence mode="wait">
                    {confirmRemove === a.id ? (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-1 shrink-0"
                      >
                        <button
                          onClick={() => { onRemove(a.id); setConfirmRemove(null); }}
                          disabled={isRemoving}
                          className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors border border-rose-500/20"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmRemove(null)}
                          className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="remove-btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setConfirmRemove(a.id)}
                        className="opacity-0 group-hover/admin:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-all shrink-0"
                        title="Remover administrador"
                      >
                        <UserMinus className="h-4 w-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Inline picker */}
        <AnimatePresence>
          {showPicker && (
            <UserPicker
              candidates={candidates}
              onSelect={onAssign}
              onClose={() => setShowPicker(false)}
              isLoading={isAssigning}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-border/30">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/30">
        {count} {count === 1 ? "registro" : "registros"}
      </span>
    </div>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-border/30 bg-card/40 p-5 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export function AdministradorPage() {
  const { data: iglesias = [], isLoading: loadingIglesias } = useIglesiasEnriquecidas();
  const { data: sedes = [], isLoading: loadingSedes } = useSedesEnriquecidas();
  const { data: usuarios = [], isLoading: loadingUsuarios } = useUsuariosEnriquecidos();
  const { data: adminSedesAsignaciones = [], isLoading: loadingAdminSedes } = useAdminSedesAsignaciones();

  const qc = useQueryClient();
  const assignRol = useAssignRol();
  const removeRol = useRemoveRol();
  const assignAdminSede = useAssignAdminSede();
  const removeAdminSede = useRemoveAdminSede();

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAssignIglesia = (u: UsuarioEnriquecido, idIglesia: number) => {
    assignRol.mutate(
      { idUsuario: u.idUsuario, idRol: ID_ROL_ADMIN_IGLESIA, idIglesia },
      {
        onSuccess: () => {
          toast.success(`${u.nombres} asignado como administrador`);
          qc.invalidateQueries({ queryKey: ["iglesias-enriquecidas"] });
          qc.invalidateQueries({ queryKey: ["admins-por-iglesia"] });
        },
        onError: () => toast.error("No se pudo asignar el administrador"),
      }
    );
  };

  const handleRemoveIglesia = (idUsuarioRol: number) => {
    removeRol.mutate({ idUsuarioRol, source: "usuario_rol" }, {
      onSuccess: () => {
        toast.success("Administrador removido");
        qc.invalidateQueries({ queryKey: ["iglesias-enriquecidas"] });
        qc.invalidateQueries({ queryKey: ["admins-por-iglesia"] });
      },
      onError: () => toast.error("No se pudo remover el administrador"),
    });
  };

  const handleAssignSede = (u: UsuarioEnriquecido, idSede: number, idIglesia: number) => {
    assignAdminSede.mutate(
      { idUsuario: u.idUsuario, idSede, idIglesia },
      {
        onSuccess: () => {
          toast.success(`${u.nombres} asignado como administrador de sede`);
          qc.invalidateQueries({ queryKey: ["sedes-enriquecidas"] });
          qc.invalidateQueries({ queryKey: ["admin-sedes-asignaciones"] });
          qc.invalidateQueries({ queryKey: ["usuarios-enriquecidos"] });
        },
        onError: () => toast.error("No se pudo asignar el administrador"),
      }
    );
  };

  const handleRemoveSede = (idAdminSedeAsignacion: number) => {
    removeAdminSede.mutate(idAdminSedeAsignacion, {
      onSuccess: () => {
        toast.success("Administrador removido");
        qc.invalidateQueries({ queryKey: ["sedes-enriquecidas"] });
        qc.invalidateQueries({ queryKey: ["admin-sedes-asignaciones"] });
        qc.invalidateQueries({ queryKey: ["usuarios-enriquecidos"] });
      },
      onError: () => toast.error("No se pudo remover el administrador"),
    });
  };

  // ── Derive admins by iglesia ─────────────────────────────────────────────
  const adminsByIglesia = new Map<number, AdminEntry[]>();
  for (const ig of iglesias) adminsByIglesia.set(ig.idIglesia, []);
  for (const u of usuarios) {
    for (const r of u.roleNames) {
      if (r.idRol === ID_ROL_ADMIN_IGLESIA && r.fechaFin === null && adminsByIglesia.has(r.idIglesia)) {
        adminsByIglesia.get(r.idIglesia)!.push({
          idUsuarioRol: r.idUsuarioRol,
          idUsuario: u.idUsuario,
          nombre: `${u.nombres} ${u.apellidos}`,
          correo: u.correo,
        });
      }
    }
  }

  // ── Derive admins by sede ────────────────────────────────────────────────
  const adminsBySede = new Map<number, AdminSedeEntry[]>();
  for (const s of sedes) adminsBySede.set(s.idSede, []);
  for (const a of adminSedesAsignaciones) {
    if (a.idRol === ROLE_IDS.ADMIN_SEDE && a.fechaFin === null && adminsBySede.has(a.idSede)) {
      adminsBySede.get(a.idSede)!.push({
        idAdminSedeAsignacion: a.idAdminSedeAsignacion,
        idUsuario: a.idUsuario,
        nombre: a.nombreCompleto,
        correo: a.correo,
      });
    }
  }

  const isLoading = loadingIglesias || loadingSedes || loadingUsuarios || loadingAdminSedes;

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-10">

      {/* ── Page header ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-[#1a7fa8] shrink-0" />
          Administrador
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Gestiona los administradores de iglesias y sedes desde un solo lugar. Haz clic en una tarjeta para asignar o remover.
        </p>
      </motion.div>

      {/* ── Iglesias section ── */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
        <SectionHeader
          icon={<Building2 className="h-4 w-4" />}
          title="Administradores de Iglesias"
          count={iglesias.length}
        />
        {isLoading ? (
          <GridSkeleton />
        ) : iglesias.length === 0 ? (
          <div className="rounded-2xl border border-border/30 bg-card/40 p-10 text-center text-muted-foreground">
            No hay iglesias registradas.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {iglesias.map(ig => {
              const currentAdmins = adminsByIglesia.get(ig.idIglesia) ?? [];
              const currentAdminIds = new Set(currentAdmins.map(a => a.idUsuario));
              const candidates = usuarios.filter(u => u.activo && !currentAdminIds.has(u.idUsuario));
              return (
                <AdminCard
                  key={ig.idIglesia}
                  icon={<Building2 className="h-5 w-5" />}
                  title={ig.nombre}
                  subtitle={ig.ciudadNombre}
                  admins={currentAdmins.map(a => ({ id: a.idUsuarioRol, idUsuario: a.idUsuario, nombre: a.nombre, correo: a.correo }))}
                  candidates={candidates}
                  onAssign={u => handleAssignIglesia(u, ig.idIglesia)}
                  onRemove={handleRemoveIglesia}
                  isAssigning={assignRol.isPending}
                  isRemoving={removeRol.isPending}
                  adminKey="idUsuarioRol"
                  removeKey="idUsuarioRol"
                />
              );
            })}
          </div>
        )}
      </motion.section>

      {/* ── Sedes section ── */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
        <SectionHeader
          icon={<MapPin className="h-4 w-4" />}
          title="Administradores de Sedes"
          count={sedes.length}
        />
        {isLoading ? (
          <GridSkeleton />
        ) : sedes.length === 0 ? (
          <div className="rounded-2xl border border-border/30 bg-card/40 p-10 text-center text-muted-foreground">
            No hay sedes registradas.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sedes.map(sede => {
              const currentAdmins = adminsBySede.get(sede.idSede) ?? [];
              const currentAdminIds = new Set(currentAdmins.map(a => a.idUsuario));
              const candidates = usuarios.filter(u =>
                u.activo &&
                !currentAdminIds.has(u.idUsuario) &&
                u.roleNames.some(r => r.idIglesia === sede.idIglesia)
              );
              return (
                <AdminCard
                  key={sede.idSede}
                  icon={<MapPin className="h-5 w-5" />}
                  title={sede.nombre}
                  subtitle={sede.ciudadNombre}
                  admins={currentAdmins.map(a => ({ id: a.idAdminSedeAsignacion, idUsuario: a.idUsuario, nombre: a.nombre, correo: a.correo }))}
                  candidates={candidates}
                  onAssign={u => handleAssignSede(u, sede.idSede, sede.idIglesia)}
                  onRemove={handleRemoveSede}
                  isAssigning={assignAdminSede.isPending}
                  isRemoving={removeAdminSede.isPending}
                  adminKey="idAdminSedeAsignacion"
                  removeKey="idAdminSedeAsignacion"
                />
              );
            })}
          </div>
        )}
      </motion.section>
    </div>
  );
}
