import { useState } from "react";
import { useSedesEnriquecidas } from "@/hooks/useIglesias";
import { useUsuariosEnriquecidos, useAdminSedesAsignaciones, useAssignAdminSede, useRemoveAdminSede } from "@/hooks/useUsuarios";
import { useQueryClient } from "@tanstack/react-query";
import { ROLE_IDS } from "@/app/constants/roles";
import type { UsuarioEnriquecido } from "@/services/usuarios.service";
import { Building2, MapPin, Users, Plus, X, Search, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "./ui/skeleton";
import { CardSkeleton } from "./ContentSkeletons";

interface AdminSedeEntry {
  idAdminSedeAsignacion: number;
  idUsuario: number;
  nombre: string;
  correo: string;
}

function SedeAdminCard({
  idSede,
  idIglesia,
  nombre,
  ciudad,
  admins,
  allUsers,
  onAssign,
  onRemove,
  isAssigning,
  isRemoving,
}: {
  idSede: number;
  idIglesia: number;
  nombre: string;
  ciudad: string;
  admins: AdminSedeEntry[];
  allUsers: UsuarioEnriquecido[];
  onAssign: (idUsuario: number, idSede: number, idIglesia: number) => void;
  onRemove: (idAdminSedeAsignacion: number) => void;
  isAssigning: boolean;
  isRemoving: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");

  const adminIds = new Set(admins.map((a) => a.idUsuario));

  const candidates = allUsers.filter((u) => {
    if (!u.activo) return false;
    if (adminIds.has(u.idUsuario)) return false;
    const belongsToIglesia = u.roleNames.some((r) => r.idIglesia === idIglesia);
    if (!belongsToIglesia) return false;
    const q = search.toLowerCase();
    return (
      !q ||
      u.nombres.toLowerCase().includes(q) ||
      u.apellidos.toLowerCase().includes(q) ||
      u.correo.toLowerCase().includes(q)
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground leading-tight">{nombre}</h3>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{ciudad || "Sin ciudad"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 text-xs font-medium text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{admins.length}</span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Administradores</span>
            <button
              onClick={() => setShowPicker((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {showPicker ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showPicker ? "Cancelar" : "Agregar"}
            </button>
          </div>
          
          <AnimatePresence>
            {admins.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-lg bg-muted/30 border border-dashed border-border/60 p-4 text-center"
              >
                <Crown className="h-5 w-5 mx-auto text-muted-foreground/50 mb-1" />
                <p className="text-sm text-muted-foreground">Sin administrador asignado</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Haz clic en "Agregar" para asignar</p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {admins.map((a) => (
                  <motion.div
                    key={a.idAdminSedeAsignacion}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between rounded-lg bg-gradient-to-r from-secondary/30 to-transparent px-3 py-2.5 border border-border/40 hover:border-primary/20 transition-colors group/admin"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                        {a.nombre.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.nombre}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{a.correo}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(a.idAdminSedeAsignacion)}
                      disabled={isRemoving}
                      className="opacity-0 group-hover/admin:opacity-100 text-xs text-destructive hover:text-destructive/80 transition-all p-1.5 rounded-md hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-border/50 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar usuario por nombre o correo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-border/50 bg-background pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {candidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {search ? "No se encontraron usuarios" : "No hay usuarios disponibles"}
                    </p>
                  ) : (
                    candidates.map((u) => (
                      <button
                        key={u.idUsuario}
                        onClick={() => {
                          onAssign(u.idUsuario, idSede, idIglesia);
                          setShowPicker(false);
                          setSearch("");
                        }}
                        disabled={isAssigning}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-secondary/50 text-left text-sm transition-all hover:translate-x-1 disabled:opacity-50 disabled:cursor-not-allowed group/candidate"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium">
                          {u.nombres.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{u.nombres} {u.apellidos}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.correo}</p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover/candidate:opacity-100 transition-opacity" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function AdminSedesPage() {
  const { data: sedes = [], isLoading: loadingSedes } = useSedesEnriquecidas();
  const { data: usuarios = [], isLoading: loadingUsuarios } = useUsuariosEnriquecidos();
  const { data: adminSedesAsignaciones = [], isLoading: loadingAdminSedes } = useAdminSedesAsignaciones();

  const qc = useQueryClient();

  const assignAdminSede = useAssignAdminSede();
  const removeAdminSede = useRemoveAdminSede();

  const handleAssign = (idUsuario: number, idSede: number, idIglesia: number) => {
    assignAdminSede.mutate(
      { idUsuario, idSede, idIglesia },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["sedes-enriquecidas"] });
          qc.invalidateQueries({ queryKey: ["admin-sedes-asignaciones"] });
          qc.invalidateQueries({ queryKey: ["usuarios-enriquecidos"] });
        },
      }
    );
  };

  const handleRemove = (idAdminSedeAsignacion: number) => {
    removeAdminSede.mutate(idAdminSedeAsignacion, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["sedes-enriquecidas"] });
        qc.invalidateQueries({ queryKey: ["admin-sedes-asignaciones"] });
        qc.invalidateQueries({ queryKey: ["usuarios-enriquecidos"] });
      },
    });
  };

  // Derive admins per sede from adminSedesAsignaciones data
  const adminsBySede = new Map<number, AdminSedeEntry[]>();
  for (const sede of sedes) {
    adminsBySede.set(sede.idSede, []);
  }
  for (const asignacion of adminSedesAsignaciones) {
    if (asignacion.idRol === ROLE_IDS.ADMIN_SEDE && asignacion.fechaFin === null) {
      if (adminsBySede.has(asignacion.idSede)) {
        adminsBySede.get(asignacion.idSede)!.push({
          idAdminSedeAsignacion: asignacion.idAdminSedeAsignacion,
          idUsuario: asignacion.idUsuario,
          nombre: asignacion.nombreCompleto,
          correo: asignacion.correo,
        });
      }
    }
  }

  const isLoading = loadingSedes || loadingUsuarios || loadingAdminSedes;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administradores de Sede</h1>
        <p className="text-muted-foreground mt-1">
          Asigna y gestiona los administradores de cada sede.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <CardSkeleton items={6} columns={3} showActions />
        </div>
      ) : sedes.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No hay sedes registradas.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sedes.map((sede) => (
            <SedeAdminCard
              key={sede.idSede}
              idSede={sede.idSede}
              idIglesia={sede.idIglesia}
              nombre={sede.nombre}
              ciudad={sede.ciudadNombre}
              admins={adminsBySede.get(sede.idSede) ?? []}
              allUsers={usuarios}
              onAssign={handleAssign}
              onRemove={handleRemove}
              isAssigning={assignAdminSede.isPending}
              isRemoving={removeAdminSede.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
