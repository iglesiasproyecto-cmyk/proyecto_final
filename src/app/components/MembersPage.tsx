import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { motion } from "motion/react";
import { Users, Plus, Search, Mail, Phone, Filter, Inbox } from "lucide-react";

const rolLabels: Record<string, string> = { lider: "Líder", servidor: "Servidor" };
const rolColors: Record<string, string> = { lider: "bg-indigo-100 text-indigo-700", servidor: "bg-gray-100 text-gray-700" };

export function MembersPage() {
  const { miembrosMinisterio, ministerios, user } = useApp();
  const [search, setSearch] = useState("");
  const [minFilter, setMinFilter] = useState("all");
  const [showInvite, setShowInvite] = useState(false);

  if (!user) return null;
  const role = user.rol;

  let baseMembers = miembrosMinisterio;
  let availableMins = ministerios.filter((m) => m.idIglesia === user.idIglesiaActiva);
  let canInvite = false;
  let pageTitle = "Miembros";
  let pageSubtitle = "Gestiona los miembros";
  let showMinFilter = true;

  if (role === "admin_iglesia") {
    baseMembers = miembrosMinisterio.filter((mm) => {
      const min = ministerios.find((m) => m.idMinisterio === mm.idMinisterio);
      return min && min.idIglesia === user.idIglesiaActiva;
    });
    canInvite = true;
    pageTitle = "Miembros de la Iglesia";
    pageSubtitle = "Gestiona todos los miembros y sus roles en la iglesia";
  } else if (role === "lider") {
    baseMembers = miembrosMinisterio.filter((mm) => mm.idMinisterio === user.idMinisterio);
    availableMins = ministerios.filter((m) => m.idMinisterio === user.idMinisterio);
    canInvite = true;
    showMinFilter = false;
    const min = ministerios.find((m) => m.idMinisterio === user.idMinisterio);
    pageTitle = `Miembros — ${min?.nombre || "Ministerio"}`;
    pageSubtitle = "Gestiona los miembros de tu ministerio";
  } else {
    baseMembers = [];
  }

  const filtered = baseMembers.filter((mm) => {
    const matchSearch = (mm.nombreCompleto || "").toLowerCase().includes(search.toLowerCase()) || (mm.correo || "").toLowerCase().includes(search.toLowerCase());
    const matchMin = minFilter === "all" || mm.idMinisterio === minFilter;
    return matchSearch && matchMin;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1>{pageTitle}</h1><p className="text-muted-foreground text-sm">{pageSubtitle}</p></div>
        {canInvite && (
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="w-4 h-4 mr-2" /> {role === "admin_iglesia" ? "Invitar Miembro" : "Agregar Miembro"}
          </Button>
        )}
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o correo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card" />
        </div>
        {showMinFilter && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select value={minFilter} onChange={(e) => setMinFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-card">
              <option value="all">Todos los ministerios</option>
              {availableMins.map((m) => <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Miembro</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Contacto</th>
                {showMinFilter && <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Ministerio</th>}
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Rol</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mm) => {
                const min = ministerios.find((m) => m.idMinisterio === mm.idMinisterio);
                return (
                  <tr key={mm.idMiembroMinisterio} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm shrink-0">{(mm.nombreCompleto || "?").charAt(0)}</div>
                        <div>
                          <p className="text-sm">{mm.nombreCompleto}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{mm.correo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="w-3 h-3" /> {mm.correo}</div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="w-3 h-3" /> {mm.telefono}</div>
                      </div>
                    </td>
                    {showMinFilter && <td className="px-4 py-3"><span className="text-sm">{min?.nombre || "—"}</span></td>}
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`${rolColors[mm.rolEnMinisterio || "servidor"]} border-0 text-xs`}>{rolLabels[mm.rolEnMinisterio || "servidor"] || mm.rolEnMinisterio}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={mm.activo ? "secondary" : "outline"} className="text-xs">{mm.activo ? "Activo" : "Inactivo"}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Inbox className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground text-sm">No se encontraron miembros</p>
          </div>
        )}
      </Card>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{role === "admin_iglesia" ? "Invitar Miembro a la Iglesia" : "Agregar Miembro al Ministerio"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm">Nombre completo</label><Input placeholder="Nombre del miembro" className="mt-1" /></div>
            <div><label className="text-sm">Correo electrónico</label><Input placeholder="correo@ejemplo.com" className="mt-1" /></div>
            <div><label className="text-sm">Teléfono</label><Input placeholder="+502 5555-0000" className="mt-1" /></div>
            {role === "admin_iglesia" && (
              <div>
                <label className="text-sm">Ministerio</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1">
                  {availableMins.filter((m) => m.estado === "activo").map((m) => <option key={m.idMinisterio} value={m.idMinisterio}>{m.nombre}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm">Rol en Ministerio</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm bg-card mt-1">
                <option value="servidor">Servidor</option>
                {role === "admin_iglesia" && <option value="lider">Líder</option>}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancelar</Button>
            <Button onClick={() => setShowInvite(false)}>{role === "admin_iglesia" ? "Invitar" : "Agregar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}