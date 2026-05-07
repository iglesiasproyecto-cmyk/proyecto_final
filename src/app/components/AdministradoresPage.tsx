// src/app/components/AdministradoresPage.tsx
import { useState } from "react";
import { useIglesiasEnriquecidas } from "@/hooks/useIglesias";

export function AdministradoresPage() {
  const { data: iglesias = [], isLoading } = useIglesiasEnriquecidas();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administradores de Iglesia</h1>
        <p className="text-muted-foreground mt-1">
          Asigna y gestiona los administradores de cada iglesia.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {iglesias.map((iglesia) => (
              <div key={iglesia.idIglesia} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                <div>
                  <p className="font-medium text-foreground">{iglesia.nombre}</p>
                  <p className="text-sm text-muted-foreground">{iglesia.ciudadNombre ?? "Sin ciudad"}</p>
                </div>
              </div>
            ))}
            {iglesias.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">No hay iglesias registradas.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
