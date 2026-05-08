import { useState } from "react";
import { useSedesEnriquecidas } from "@/hooks/useIglesias";
import { useUsuariosEnriquecidos, useAdminSedesAsignaciones, useAssignAdminSede, useRemoveAdminSede } from "@/hooks/useUsuarios";
import { useQueryClient } from "@tanstack/react-query";
import { ROLE_IDS } from "@/app/constants/roles";
import type { UsuarioEnriquecido } from "@/services/usuarios.service";

interface AdminSedeEntry {
  idAdminSedeAsignacion: number;
  idUsuario: number;
  nombre: string;
  correo: string;
}

function SedeAdminCard({
  idSede,
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
  nombre: string;
  ciudad: string;
  admins: AdminSedeEntry[];
  allUsers: UsuarioEnriquecido[];
  onAssign: (idUsuario: number, idSede: number) => void;
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
    const q = search.toLowerCase();
    return (
      !q ||
      u.nombres.toLowerCase().includes(q) ||
      u.apellidos.toLowerCase().includes(q) ||
      u.correo.toLowerCase().includes(q)
    );
  });

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <p className="font-semibold text-foreground">{nombre}</p>
          <p className="text-sm text-muted-foreground">{ciudad || "Sin ciudad"}</p>
        </div>
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="text-sm font-medium text-primary hover:underline"
        >
          {showPicker ? "Cancelar" : "+ Asignar admin"}
        </button>
      </div>

      {/* Current admins */}
      <div className="p-4 space-y-2">
        {admins.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sin administrador asignado</p>
        ) : (
          admins.map((a) => (
            <div
              key={a.idAdminSedeAsignacion}
              className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{a.nombre}</p>
                <p className="text-xs text-muted-foreground">{a.correo}</p>
              </div>
              <button
                onClick={() => onRemove(a.idAdminSedeAsignacion)}
                disabled={isRemoving}
                className="text-xs text-destructive hover:underline disabled:opacity-50"
              >
                Remover
              </button>
            </div>
          ))
        )}
      </div>

      {/* User picker */}
      {showPicker && (
        <div className="border-t p-4 space-y-3">
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                No hay usuarios disponibles
              </p>
            ) : (
              candidates.map((u) => (
                <button
                  key={u.idUsuario}
                  onClick={() => {
                    onAssign(u.idUsuario, idSede);
                    setShowPicker(false);
                    setSearch("");
                  }}
                  disabled={isAssigning}
                  className="w-full text-left rounded-md px-3 py-2 hover:bg-muted text-sm disabled:opacity-50"
                >
                  <span className="font-medium">{u.nombres} {u.apellidos}</span>
                  <span className="text-muted-foreground ml-2">{u.correo}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminSedesPage() {
  const { data: sedes = [], isLoading: loadingSedes } = useSedesEnriquecidas();
  const { data: usuarios = [], isLoading: loadingUsuarios } = useUsuariosEnriquecidos();
  const { data: adminSedesAsignaciones = [], isLoading: loadingAdminSedes } = useAdminSedesAsignaciones();

  const qc = useQueryClient();

  const assignAdminSede = useAssignAdminSede();
  const removeAdminSede = useRemoveAdminSede();

  const handleAssign = (idUsuario: number, idSede: number) => {
    assignAdminSede.mutate(
      { idUsuario, idSede },
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
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
