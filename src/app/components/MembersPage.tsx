import { useEffect, useMemo, useState } from "react";
import { useMinisterios, useMiembrosMinisterioEnriquecidos, useCreateMiembroMinisterio, useDeleteMiembroMinisterio, useMinisteriosIdsDeUsuario } from "@/hooks/useMinisterios";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { AnimatedCard } from "./ui/AnimatedCard";
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
  lider: "bg-[#4682b4]/10 text-[#4682b4] border-[#4682b4]/20",
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

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Directorio</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">
              Miembros
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Gestiona los miembros de los ministerios y sus roles
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-0 md:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Buscar miembro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-background/60 border border-border/40 rounded-xl shadow-sm focus-visible:ring-primary/30 focus-visible:border-primary/40 text-sm"
            />
          </div>

          {/* Filtro de ministerio */}
          <div className="flex items-center gap-2 bg-background/60 border border-border/40 rounded-xl px-3 h-10 shadow-sm shrink-0">
            <Filter className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
            <select
              value={effectiveMinisterioId}
              onChange={(e) => setSelectedMinisterioId(Number(e.target.value))}
              disabled={isLider}
              className="text-sm bg-transparent border-0 outline-none text-foreground/80 min-w-0 cursor-pointer [&_option]:bg-white [&_option]:text-gray-900 dark:[&_option]:bg-gray-800 dark:[&_option]:text-gray-100"
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
            className="h-10 rounded-xl font-medium shrink-0 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white shadow-lg shadow-cyan-600/30 hover:shadow-cyan-500/40 transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Agregar
          </Button>
        </div>
      </motion.div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Miembros", value: filtered.length, icon: <Users className="w-5 h-5" />, color: "from-[#709dbd] to-[#4682b4]", delay: 0 },
          { label: "Activos Ahora", value: activeCount, icon: <ShieldCheck className="w-5 h-5" />, color: "from-emerald-500/80 to-teal-600/80", delay: 1 },
          { label: "Líderes de Red", value: leaderCount, icon: <User className="w-5 h-5" />, color: "from-[#709dbd] to-[#4682b4]", delay: 2 },
        ].map((stat, idx) => (
          <AnimatedCard key={stat.label} index={idx} className="p-4 group">
            <div className="flex justify-between items-start mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg text-white`}>
                {stat.icon}
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px] py-0 tracking-widest uppercase">Estadística</Badge>
            </div>
            <div>
              <p className="text-4xl font-light tracking-tight text-foreground">{stat.value}</p>
              <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">{stat.label}</p>
            </div>
          </AnimatedCard>
        ))}
      </div>


      {/* Lista de miembros — Tabla Glass */}
      <AnimatedCard index={4} className="overflow-hidden p-0">
        {/* Cabecera de tabla */}
        <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-white/5 bg-white/5 dark:bg-black/20">
          {["Miembro", "Contacto", "Rol", "Estado", ""].map((col) => (
            <span key={col} className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">{col}</span>
          ))}
        </div>

        <div className="divide-y divide-white/5">
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
                  transition={{ delay: i * 0.02 }}
                  className="group flex flex-col md:grid md:grid-cols-[2fr_2fr_1fr_1fr_auto] gap-3 md:gap-4 items-start md:items-center px-6 py-5 hover:bg-white/5 transition-all duration-300"
                >
                  {/* Avatar + nombre */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        {inicial}
                      </div>
                      {mm.activo && (
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-card" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold truncate group-hover:text-blue-500 transition-colors uppercase tracking-tight">{name}</p>
                      <p className="text-xs text-muted-foreground truncate md:hidden">{email}</p>
                    </div>
                  </div>

                  {/* Contacto */}
                  <div className="hidden md:flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-blue-500/50" />
                      <span className="truncate">{email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-blue-500/50" />
                      <span>{phone}</span>
                    </div>
                  </div>

                  {/* Rol */}
                  <div>
                    <Badge variant="outline" className={`${rolColors[rol] ?? rolColors.servidor} border-0 bg-[#4682b4]/10 text-[#4682b4] dark:text-[#709dbd] text-[10px] uppercase font-black tracking-widest px-2.5 py-1 flex items-center gap-1.5 w-fit rounded-lg`}>
                      {rolIcons[rol] ?? rolIcons.servidor}
                      {rolLabels[rol] ?? rol}
                    </Badge>
                  </div>

                  {/* Estado */}
                  <div>
                    <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-1 border-0 rounded-lg ${mm.activo ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-400"}`}>
                      {mm.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>

                  {/* Acciones */}
                  <div className="flex md:justify-end">
                    <button
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-all duration-300 opacity-0 group-hover:opacity-100"
                      onClick={() => handleDeleteMiembro(mm.idMiembroMinisterio, name)}
                      disabled={deleteMiembroMutation.isPending}
                      title="Eliminar miembro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Estado vacío */}
        {filtered.length === 0 && (
          <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center shadow-inner">
              <Inbox className="w-10 h-10 opacity-20" />
            </div>
            <div className="text-center">
              <p className="font-bold text-lg uppercase tracking-widest opacity-80">Sin miembros</p>
              <p className="text-xs mt-1 max-w-[200px]">
                {search ? "No encontramos resultados para tu búsqueda." : "Aún no hay miembros en este ministerio."}
              </p>
            </div>
          </div>
        )}
      </AnimatedCard>


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
                    className={`h-11 rounded-xl border text-sm font-semibold transition-all ${inviteForm.rolEnMinisterio === r ? "bg-[#4682b4]/10 border-[#4682b4]/30 text-[#4682b4]" : "bg-background/50 border-white/10 text-muted-foreground hover:text-foreground"}`}
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
