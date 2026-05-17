import { useState, useMemo } from "react";
import {
  useMinisteriosGlobal,
  useToggleMinisterioEstado,
  useDeleteMinisterio,
  useCreateMinisterio,
} from "@/hooks/useMinisterios";
import { useIglesias, useSedes } from "@/hooks/useIglesias";
import { MinisterioDetailPanel } from "./MinisterioDetailPanel";
import type { MinisterioEnriquecido } from "@/services/ministerios.service";
import type { Iglesia } from "@/types/app.types";
import { Sheet, SheetContent } from "./ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings2, Search, Plus, Building2, ChevronDown,
  Users, UserCog, UsersRound, Power, PowerOff, Trash2,
} from "lucide-react";
import { toast } from "sonner";

type EstadoFilter = "all" | "activo" | "inactivo" | "suspendido";

function CreateMinisterioDialog({
  open,
  onClose,
  iglesias,
}: {
  open: boolean;
  onClose: () => void;
  iglesias: Iglesia[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ iglesiaId: "", sedeId: "", nombre: "", descripcion: "" });
  const { data: sedes = [] } = useSedes(form.iglesiaId ? Number(form.iglesiaId) : undefined);
  const createMutation = useCreateMinisterio();

  const reset = () => {
    setStep(1);
    setForm({ iglesiaId: "", sedeId: "", nombre: "", descripcion: "" });
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!form.nombre.trim() || !form.sedeId) {
      toast.error("Completa nombre y sede");
      return;
    }
    createMutation.mutate(
      { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null, idSede: Number(form.sedeId), estado: "activo" },
      {
        onSuccess: () => { toast.success("Ministerio creado exitosamente"); handleClose(); },
        onError: (e: any) => toast.error(`Error al crear: ${e.message}`),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="w-[90vw] max-w-md sm:max-w-md rounded-2xl sm:rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
            Nuevo Ministerio
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Paso {step} de 2 — {step === 1 ? "Selecciona iglesia" : "Datos del ministry"}
          </p>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3 sm:space-y-4 py-2">
            <div>
              <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Iglesia</label>
              <Select value={form.iglesiaId} onValueChange={(v) => setForm(p => ({ ...p, iglesiaId: v, sedeId: "" }))}>
                <SelectTrigger className="h-10 sm:h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                  <SelectValue placeholder="Selecciona una iglesia" />
                </SelectTrigger>
                <SelectContent>
                  {iglesias.map((ig) => (
                    <SelectItem key={ig.idIglesia} value={ig.idIglesia.toString()}>{ig.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 sm:space-y-4 py-2">
            <div>
              <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Sede</label>
              <Select value={form.sedeId} onValueChange={(v) => setForm(p => ({ ...p, sedeId: v }))}>
                <SelectTrigger className="h-10 sm:h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                  <SelectValue placeholder="Selecciona una sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map((s) => (
                    <SelectItem key={s.idSede} value={s.idSede.toString()}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Nombre del Ministerio</label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej. Alabanza y Adoración"
                className="h-10 sm:h-11 bg-background/50 border-white/10 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Descripción</label>
              <Input
                value={form.descripcion}
                onChange={(e) => setForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Propósito y enfoque del ministry"
                className="h-10 sm:h-11 bg-background/50 border-white/10 rounded-xl text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-2 sm:mt-4 border-t border-border/50 pt-3 sm:pt-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button variant="ghost" className="rounded-xl w-full sm:w-auto" onClick={step === 1 ? handleClose : () => setStep(1)}>
            {step === 1 ? "Cancelar" : "Atrás"}
          </Button>
          {step === 1 ? (
            <Button className="rounded-xl w-full sm:w-auto" onClick={() => setStep(2)} disabled={!form.iglesiaId}>
              Siguiente
            </Button>
          ) : (
            <Button
              className="rounded-xl w-full sm:w-auto"
              onClick={handleSubmit}
              disabled={!form.nombre.trim() || !form.sedeId || createMutation.isPending}
            >
              {createMutation.isPending ? "Creando..." : "Crear"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MinisterioCard({
  m,
  onSelect,
  onToggle,
  onDelete,
  togglePending,
  deletePending,
}: {
  m: MinisterioEnriquecido;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
  togglePending: boolean;
  deletePending: boolean;
}) {
  return (
    <Card
      className={`group relative p-3 sm:p-4 h-full bg-card/40 backdrop-blur-xl border border-border/50 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 rounded-xl sm:rounded-2xl flex flex-col justify-between overflow-hidden ${m.estado !== "activo" ? "opacity-70 grayscale-[20%]" : ""}`}
      onClick={onSelect}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div>
        <div className="relative z-10 flex items-start justify-between mb-2 sm:mb-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <Badge
            variant={m.estado === "activo" ? "default" : "secondary"}
            className={`text-[8px] sm:text-[9px] uppercase tracking-wider font-bold px-1.5 sm:px-2 py-0.5 ${m.estado === 'activo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200' : ''}`}
          >
            {m.estado}
          </Badge>
        </div>

        <div className="relative z-10">
          <h3 className="font-bold text-sm sm:text-[15px] tracking-tight mb-0.5 group-hover:text-primary transition-colors leading-tight">{m.nombre}</h3>
          {m.sedeNombre && (
            <p className="text-[9px] sm:text-[10px] text-primary/70 font-semibold uppercase tracking-wider mb-1 hidden sm:block">{m.sedeNombre}</p>
          )}
          {m.sedeNombre && (
            <p className="text-[9px] sm:text-[10px] text-primary/70 font-semibold uppercase tracking-wider mb-1 sm:hidden truncate">{m.sedeNombre}</p>
          )}
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-[34px] hidden sm:block">{m.descripcion || "Sin descripción asignada."}</p>
          <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed sm:hidden">{m.descripcion || "Sin descripción"}</p>

          <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-accent/60 flex items-center justify-center shrink-0">
                <UserCog className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium text-foreground/80 truncate">{m.liderNombre || "Sin líder"}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 bg-background/50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg border border-white/5">
              <UsersRound className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70" />
              <span className="text-[10px] sm:text-[11px] font-bold text-foreground/80">{m.cantidadMiembros}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-2 sm:mt-3 flex gap-1.5 sm:gap-2 w-full pt-1">
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl transition-all ${m.estado === "activo" ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`}
          disabled={togglePending}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          {m.estado === "activo" ? <PowerOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Power className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 bg-background/50 hover:bg-red-500/10 hover:text-red-500 border border-white/5 text-muted-foreground shrink-0 rounded-lg sm:rounded-xl"
          disabled={deletePending}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </Button>
      </div>
    </Card>
  );
}

export function GlobalMinisteriosPage() {
  const { data: ministerios = [], isLoading } = useMinisteriosGlobal();
  const { data: iglesias = [] } = useIglesias();
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("all");
  const [selectedMin, setSelectedMin] = useState<MinisterioEnriquecido | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; nombre: string } | null>(null);

  const toggleMutation = useToggleMinisterioEstado();
  const deleteMutation = useDeleteMinisterio();

  const grouped = useMemo(() => {
    const filtered = ministerios.filter((m) => {
      const matchSearch = m.nombre.toLowerCase().includes(search.toLowerCase());
      const matchEstado = estadoFilter === "all" || m.estado === estadoFilter;
      return matchSearch && matchEstado;
    });
    const groups = new Map<number, { iglesiaNombre: string; items: MinisterioEnriquecido[] }>();
    filtered.forEach((m) => {
      const igId = m.iglesiaId ?? 0;
      if (!groups.has(igId)) groups.set(igId, { iglesiaNombre: m.iglesiaNombre ?? "Sin iglesia", items: [] });
      groups.get(igId)!.items.push(m);
    });
    return Array.from(groups.entries()).map(([iglesiaId, g]) => ({ iglesiaId, ...g }));
  }, [ministerios, search, estadoFilter]);

  const toggleGroup = (igId: number) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(igId)) next.delete(igId);
      else next.add(igId);
      return next;
    });
  };

  const handleDelete = (id: number, nombre: string) => {
    setConfirmDelete({ id, nombre });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
          <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
            <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 px-3 sm:px-4">
          <Skeleton className="h-10 w-full sm:w-64 rounded-xl" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((j) => <Skeleton key={j} className="h-10 w-16 sm:w-20 rounded-xl" />)}
          </div>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="space-y-3 px-3 sm:px-4">
            <Skeleton className="h-12 w-full sm:w-64 rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((j) => <Skeleton key={j} className="h-44 sm:h-48 rounded-2xl" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const estadoFilters: { value: EstadoFilter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "activo", label: "Activo" },
    { value: "inactivo", label: "Inactivo" },
    { value: "suspendido", label: "Suspendido" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-primary/10 rounded-full blur-[60px] sm:blur-[80px] -z-10 pointer-events-none" />
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <Settings2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-medium uppercase tracking-[0.2em] text-[10px] mb-1">Global</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 leading-none">
              Ministerios
            </h1>
            <p className="text-foreground/60 font-normal text-xs sm:text-sm mt-1">
              {ministerios.length} ministerios en {grouped.length} iglesias
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="w-full sm:w-auto h-10 sm:h-11 rounded-xl font-medium bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white shadow-lg"
        >
          <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
          <span className="hidden xs:inline">Nuevo Ministerio</span>
          <span className="xs:hidden">Nuevo</span>
        </Button>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:max-w-xs lg:max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Buscar ministry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 sm:h-11 bg-background/60 border border-border/40 rounded-xl shadow-sm text-sm"
          />
        </div>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-3 px-3 sm:mx-0 sm:px-0">
          {estadoFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setEstadoFilter(f.value)}
              className={`px-2.5 sm:px-3 h-10 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                estadoFilter === f.value
                  ? "bg-primary text-white border-primary shadow-md"
                  : "bg-background/60 border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {grouped.map((group) => {
          const isCollapsed = collapsedGroups.has(group.iglesiaId);
          return (
            <div key={group.iglesiaId} className="space-y-2 sm:space-y-3">
              <button
                onClick={() => toggleGroup(group.iglesiaId)}
                className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-card/40 backdrop-blur-sm border border-border/40 hover:border-primary/30 hover:bg-card/60 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <span className="flex-1 font-bold text-sm tracking-tight truncate">{group.iglesiaNombre}</span>
                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 sm:px-2 hidden xs:inline">
                  {group.items.length}
                </Badge>
                <span className="xs:hidden text-[10px] font-bold text-muted-foreground">
                  ({group.items.length})
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-300 shrink-0 ${isCollapsed ? "-rotate-90" : ""}`}
                />
              </button>

              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pt-1 sm:pt-2 px-1 sm:px-0">
                      {group.items.map((m, i) => (
                        <motion.div
                          key={m.idMinisterio}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04, ease: "easeOut" }}
                        >
                          <MinisterioCard
                            m={m}
                            onSelect={() => setSelectedMin(m)}
                            onToggle={() => toggleMutation.mutate(m.idMinisterio)}
                            onDelete={() => handleDelete(m.idMinisterio, m.nombre)}
                            togglePending={toggleMutation.isPending}
                            deletePending={deleteMutation.isPending}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {grouped.length === 0 && (
          <div className="py-12 sm:py-20 text-center flex flex-col items-center text-muted-foreground px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-accent/50 flex items-center justify-center mb-3 sm:mb-4">
              <Search className="w-6 h-6 sm:w-8 sm:h-8 opacity-40" />
            </div>
            <p className="font-semibold text-sm">No se encontraron ministerios</p>
            <p className="text-xs mt-1">Prueba con otros términos de búsqueda o crea uno nuevo.</p>
          </div>
        )}
      </div>

      <Sheet open={!!selectedMin} onOpenChange={(open) => !open && setSelectedMin(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl p-4 sm:p-6 overflow-y-auto">
          {selectedMin && (
            <MinisterioDetailPanel min={selectedMin} onBack={() => setSelectedMin(null)} />
          )}
        </SheetContent>
      </Sheet>

      <CreateMinisterioDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        iglesias={iglesias}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return;
          deleteMutation.mutate(confirmDelete.id, {
            onSuccess: () => { toast.success(`Ministerio "${confirmDelete.nombre}" eliminado`); setConfirmDelete(null); },
            onError: (e: any) => { toast.error(`Error: ${e.message}`); setConfirmDelete(null); },
          });
        }}
        title="Eliminar Ministerio"
        description={`¿Estás seguro de que deseas eliminar el ministerio "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText={deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
        isDestructive
      />
    </div>
  );
}