import { useEffect, useMemo, useState } from "react";
import { useMinisterios, useMiembrosMinisterioEnriquecidos, useCreateMiembroMinisterio, useDeleteMiembroMinisterio, useMinisteriosIdsDeUsuario } from "@/hooks/useMinisterios";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Mail, Phone, Filter, Inbox, Trash2, Users, ShieldCheck, User } from "lucide-react";

const rolLabels: Record<string, string> = { lider: "Líder", servidor: "Servidor" };
const rolIcons: Record<string, React.ReactNode> = {
  lider: <ShieldCheck className="w-3 h-3" />,
  servidor: <User className="w-3 h-3" />,
};
const rolColors: Record<string, string> = {
  lider: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  servidor: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export function MembersPage() {
  const { rolActual, usuarioActual } = useApp();
  const isLider = rolActual === "lider";
  const { data: ministerios = [], isLoading: ministeriosLoading } = useMinisterios();
  const { data: ministeriosIdsUsuario = [] } = useMinisteriosIdsDeUsuario(usuarioActual?.idUsuario);
  const { data: usuarios = [] } = useUsuarios();
  const [search, setSearch] = useState("");
  const [selectedMinisterioId, setSelectedMinisterioId] = useState<number>(0);
  const [showInvite, setShowInvite] = useState(false);

  const ministerioIdsLider = useMemo(() => new Set(ministeriosIdsUsuario), [ministeriosIdsUsuario]);
  const ministeriosVisibles = useMemo(() => {
    if (!isLider) return ministerios;
    return ministerios.filter((m) => ministerioIdsLider.has(m.idMinisterio));
  }, [isLider, ministerios, ministerioIdsLider]);

  useEffect(() => {
    if (!isLider) return;
    const firstId = ministeriosVisibles[0]?.idMinisterio ?? 0;
    if (selectedMinisterioId !== firstId) setSelectedMinisterioId(firstId);
  }, [isLider, ministeriosVisibles, selectedMinisterioId]);

  const effectiveMinisterioId = isLider ? (selectedMinisterioId || ministeriosVisibles[0]?.idMinisterio || 0) : selectedMinisterioId;
  const { data: miembros = [], isLoading: miembrosLoading } = useMiembrosMinisterioEnriquecidos(effectiveMinisterioId || undefined);
  const createMiembroMutation = useCreateMiembroMinisterio();
  const deleteMiembroMutation = useDeleteMiembroMinisterio();
  const [inviteForm, setInviteForm] = useState({ idUsuario: 0, rolEnMinisterio: "servidor" });
  const [inviteUserSearch, setInviteUserSearch] = useState("");

  const isLoading = ministeriosLoading || miembrosLoading;

  if (isLoading) return (
    <div className="flex items-center justify-center h-48 text-muted-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm">Cargando miembros...</span>
      </div>
    </div>
  );

  const filtered = miembros.filter((mm) => {
    const name = (mm.usuarioNombre || mm.nombreCompleto || "").toLowerCase();
    const email = (mm.usuarioCorreo || mm.correo || "").toLowerCase();
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  const activeMemberIds = new Set(
    miembros.filter((m) => m.activo).map((m) => m.idUsuario)
  );

  const selectableUsuarios = usuarios
    .filter((u) => u.activo)
    .filter((u) => !activeMemberIds.has(u.idUsuario))
    .filter((u) => {
      const full = `${u.nombres} ${u.apellidos}`.toLowerCase();
      const email = (u.correo || "").toLowerCase();
      const q = inviteUserSearch.toLowerCase().trim();
      if (!q) return true;
      return full.includes(q) || email.includes(q);
    });

  function handleDeleteMiembro(id: number, nombre: string) {
    if (!confirm(`¿Eliminar a "${nombre}" del ministerio?`)) return;
    deleteMiembroMutation.mutate(id);
  }

  const handleInvite = () => {
    if (!inviteForm.idUsuario || !effectiveMinisterioId) return;
    createMiembroMutation.mutate(
      {
        idUsuario: inviteForm.idUsuario,
        idMinisterio: effectiveMinisterioId,
        rolEnMinisterio: inviteForm.rolEnMinisterio || null,
        fechaIngreso: new Date().toISOString().split('T')[0],
      },
      {
        onSuccess: () => {
          setShowInvite(false);
          setInviteForm({ idUsuario: 0, rolEnMinisterio: "servidor" });
          setInviteUserSearch("");
        },
      }
    );
  };

  const activeCount = filtered.filter(m => m.activo).length;
  const leaderCount = filtered.filter(m => m.rolEnMinisterio === "lider").length;
  const showMinisterioColumn = !isLider && selectedMinisterioId === 0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header unificado con controles */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-72 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none -z-10" />

        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">
            Miembros
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Gestiona los miembros de los ministerios y sus roles
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-0 md:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Buscar miembro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-background/50 border-white/5 rounded-xl text-sm"
            />
          </div>

          {/* Filtro de ministerio */}
          <div className="flex items-center gap-2 bg-background/50 border border-white/5 rounded-xl px-3 h-10 shrink-0">
            <Filter className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
            <select
              value={effectiveMinisterioId}
              onChange={(e) => setSelectedMinisterioId(Number(e.target.value))}
              disabled={isLider}
              className="text-sm bg-transparent border-0 outline-none text-foreground/80 min-w-0 cursor-pointer"
            >
              {!isLider && <option value={0}>Todos los ministerios</option>}
              {ministeriosVisibles.map((m) => <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>)}
            </select>
          </div>

          <Button
            onClick={() => {
              if (!effectiveMinisterioId) {
                alert("Selecciona un ministerio en el filtro antes de agregar un miembro.");
                return;
              }
              setShowInvite(true);
            }}
            className="h-10 rounded-xl font-medium shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Agregar
          </Button>
        </div>
      </motion.div>

      {/* Métricas rápidas */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: "Total", value: filtered.length, icon: <Users className="w-4 h-4" />, color: "text-primary" },
          { label: "Activos", value: activeCount, icon: <ShieldCheck className="w-4 h-4" />, color: "text-emerald-400" },
          { label: "Líderes", value: leaderCount, icon: <User className="w-4 h-4" />, color: "text-blue-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className={`${stat.color} bg-current/10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 opacity-80`} style={{ backgroundColor: "currentColor", opacity: 1 }}>
              <div className={`${stat.color}`}>{stat.icon}</div>
            </div>
            <div>
              <p className="text-xl font-black tracking-tight leading-none">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Lista de miembros — Tabla Glass */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-sm p-0">
          {/* Cabecera de tabla */}
          <div className={`hidden md:grid ${showMinisterioColumn ? "grid-cols-[2fr_1.3fr_2fr_1fr_1fr_auto]" : "grid-cols-[2fr_2fr_1fr_1fr_auto]"} gap-4 px-5 py-3 border-b border-border/40 bg-card/20`}>
            {[(showMinisterioColumn ? ["Miembro", "Ministerio", "Contacto", "Rol", "Estado", ""] : ["Miembro", "Contacto", "Rol", "Estado", ""])].flat().map((col) => (
              <span key={col} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{col}</span>
            ))}
          </div>

          <div className="divide-y divide-border/30">
            <AnimatePresence>
              {filtered.map((mm, i) => {
                const name = mm.usuarioNombre || mm.nombreCompleto || "Sin nombre";
                const email = mm.usuarioCorreo || mm.correo || "";
                const phone = mm.telefono || "—";
                const rol = mm.rolEnMinisterio || "servidor";
                const inicial = name.charAt(0).toUpperCase();

                return (
                  <motion.div
                    key={mm.idMiembroMinisterio}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.03 }}
                    className={`group flex flex-col md:grid ${showMinisterioColumn ? "md:grid-cols-[2fr_1.3fr_2fr_1fr_1fr_auto]" : "md:grid-cols-[2fr_2fr_1fr_1fr_auto]"} gap-3 md:gap-4 items-start md:items-center px-5 py-4 hover:bg-accent/20 transition-all duration-200`}
                  >
                    {/* Avatar + nombre */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center text-primary font-bold text-sm shadow-inner group-hover:scale-105 transition-transform">
                          {inicial}
                        </div>
                        {mm.activo && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{name}</p>
                        <p className="text-xs text-muted-foreground truncate md:hidden">
                          {showMinisterioColumn ? `${mm.ministerioNombre || "Sin ministerio"} · ${email}` : email}
                        </p>
                      </div>
                    </div>

                    {/* Ministerio */}
                    {showMinisterioColumn && (
                      <div className="hidden md:block min-w-0">
                        <p className="text-xs text-foreground/85 font-medium truncate">{mm.ministerioNombre || "Sin ministerio"}</p>
                      </div>
                    )}

                    {/* Contacto */}
                    <div className="hidden md:flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                        <Mail className="w-3 h-3 shrink-0 text-primary/40" />
                        <span className="truncate">{email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3 shrink-0 text-primary/40" />
                        <span>{phone}</span>
                      </div>
                    </div>

                    {/* Rol */}
                    <div>
                      <Badge variant="outline" className={`${rolColors[rol] ?? rolColors.servidor} border text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 flex items-center gap-1 w-fit`}>
                        {rolIcons[rol] ?? rolIcons.servidor}
                        {rolLabels[rol] ?? rol}
                      </Badge>
                    </div>

                    {/* Estado */}
                    <div>
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border ${mm.activo ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                        {mm.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>

                    {/* Acciones */}
                    <div className="flex md:justify-end">
                      <button
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                        onClick={() => handleDeleteMiembro(mm.idMiembroMinisterio, name)}
                        disabled={deleteMiembroMutation.isPending}
                        title="Eliminar miembro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Estado vacío */}
          {filtered.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <div className="w-16 h-16 rounded-2xl bg-accent/40 flex items-center justify-center">
                <Inbox className="w-7 h-7 opacity-40" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Sin miembros registrados</p>
                <p className="text-xs mt-0.5">
                  {search ? "Intenta con otros términos de búsqueda." : "Usa el botón Agregar para añadir el primero."}
                </p>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Dialog agregar miembro */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Agregar Miembro
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">Asocia un usuario existente a un ministerio con un rol definido.</p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Usuario</label>
              <Input
                value={inviteUserSearch}
                onChange={(e) => setInviteUserSearch(e.target.value)}
                placeholder="Buscar por nombre o correo"
                className="h-11 bg-background/50 border-white/10 rounded-xl text-sm mb-2"
              />
              <select
                value={inviteForm.idUsuario || ""}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, idUsuario: Number(e.target.value) }))}
                className="w-full h-11 px-3 bg-background/50 border border-white/10 rounded-xl text-sm outline-none"
              >
                <option value="" disabled>Selecciona un usuario</option>
                {selectableUsuarios.map((u) => (
                  <option key={u.idUsuario} value={u.idUsuario}>
                    {u.nombres} {u.apellidos} - {u.correo}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-2">
                {selectableUsuarios.length} usuario(s) disponible(s) para este ministerio.
              </p>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Rol en el Ministerio</label>
              <div className="grid grid-cols-2 gap-2">
                {["servidor", "lider"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setInviteForm(p => ({ ...p, rolEnMinisterio: r }))}
                    className={`h-11 rounded-xl border text-sm font-semibold transition-all ${inviteForm.rolEnMinisterio === r ? "bg-primary/10 border-primary/30 text-primary" : "bg-background/50 border-white/10 text-muted-foreground hover:text-foreground"}`}
                  >
                    {rolLabels[r]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 pt-4 border-t border-border/50">
            <Button variant="ghost" className="rounded-xl" onClick={() => setShowInvite(false)}>Cancelar</Button>
            <Button
              className="rounded-xl"
              onClick={handleInvite}
              disabled={!inviteForm.idUsuario || !effectiveMinisterioId || createMiembroMutation.isPending}
            >
              {createMiembroMutation.isPending ? "Agregando..." : "Agregar Miembro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
