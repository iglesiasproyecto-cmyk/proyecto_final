// src/app/components/AdministradoresPage.tsx
import { useState } from "react";
import { useIglesiasEnriquecidas } from "@/hooks/useIglesias";
import { useUsuariosEnriquecidos, useAssignRol, useRemoveRol } from "@/hooks/useUsuarios";
import { useRoles } from "@/hooks/useUsuarios";
import { ROLE_IDS } from "@/app/constants/roles";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "./ui/skeleton";
import { CardSkeleton } from "./ContentSkeletons";
import type { UsuarioEnriquecido } from "@/services/usuarios.service";

const ID_ROL_ADMIN_IGLESIA = ROLE_IDS.ADMIN_IGLESIA;

interface AdminEntry {
  idUsuarioRol: number;
  idUsuario: number;
  nombre: string;
  correo: string;
}

function IglesiaAdminCard({
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
  idIglesia: number;
  nombre: string;
  ciudad: string;
  admins: AdminEntry[];
  allUsers: UsuarioEnriquecido[];
  onAssign: (idUsuario: number, idIglesia: number) => void;
  onRemove: (idUsuarioRol: number) => void;
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
              key={a.idUsuarioRol}
              className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{a.nombre}</p>
                <p className="text-xs text-muted-foreground">{a.correo}</p>
              </div>
              <button
                onClick={() => onRemove(a.idUsuarioRol)}
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
                    onAssign(u.idUsuario, idIglesia);
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

export function AdministradoresPage() {
  const { data: iglesias = [], isLoading: loadingIglesias } = useIglesiasEnriquecidas();
  const { data: usuarios = [], isLoading: loadingUsuarios } = useUsuariosEnriquecidos();

  const qc = useQueryClient();

  const assignRol = useAssignRol();
  const removeRol = useRemoveRol();

  const handleAssign = (idUsuario: number, idIglesia: number) => {
    assignRol.mutate(
      { idUsuario, idRol: ID_ROL_ADMIN_IGLESIA, idIglesia },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["iglesias-enriquecidas"] });
          qc.invalidateQueries({ queryKey: ["admins-por-iglesia"] });
        },
      }
    );
  };

  const handleRemove = (idUsuarioRol: number) => {
    removeRol.mutate({ idUsuarioRol, source: 'usuario_rol' }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["iglesias-enriquecidas"] });
        qc.invalidateQueries({ queryKey: ["admins-por-iglesia"] });
      },
    });
  };

  // Derive admins per iglesia from usuarios data (avoids N queries)
  const adminsByIglesia = new Map<number, AdminEntry[]>();
  for (const iglesia of iglesias) {
    adminsByIglesia.set(iglesia.idIglesia, []);
  }
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

  const isLoading = loadingIglesias || loadingUsuarios;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administradores de Iglesia</h1>
        <p className="text-muted-foreground mt-1">
          Asigna y gestiona los administradores de cada iglesia.
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
      ) : iglesias.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No hay iglesias registradas.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {iglesias.map((iglesia) => (
            <IglesiaAdminCard
              key={iglesia.idIglesia}
              idIglesia={iglesia.idIglesia}
              nombre={iglesia.nombre}
              ciudad={iglesia.ciudadNombre}
              admins={adminsByIglesia.get(iglesia.idIglesia) ?? []}
              allUsers={usuarios}
              onAssign={handleAssign}
              onRemove={handleRemove}
              isAssigning={assignRol.isPending}
              isRemoving={removeRol.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
