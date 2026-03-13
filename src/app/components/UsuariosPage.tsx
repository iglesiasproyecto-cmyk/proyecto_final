import React, { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Users, Search, ToggleLeft, ToggleRight, Eye, ShieldCheck, Clock, Mail, Phone } from "lucide-react";

export function UsuariosPage() {
  const { usuarios, usuarioRoles, roles, iglesias, sedes, miembrosMinisterio, ministerios, toggleUsuarioActivo } = useApp();
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  const [filterRol, setFilterRol] = useState("all");
  const [detail, setDetail] = useState<string | null>(null);

  const enriched = useMemo(() => usuarios.map(u => {
    const userRoles = usuarioRoles.filter(ur => ur.idUsuario === u.idUsuario && !ur.fechaFin);
    const roleNames = userRoles.map(ur => {
      const r = roles.find(rl => rl.idRol === ur.idRol);
      const ig = iglesias.find(i => i.idIglesia === ur.idIglesia);
      return { rolNombre: r?.nombre || "—", iglesiaNombre: ig?.nombre || "—" };
    });
    const memberships = miembrosMinisterio.filter(mm => mm.idUsuario === u.idUsuario && !mm.fechaSalida);
    const minNames = memberships.map(mm => {
      const m = ministerios.find(x => x.idMinisterio === mm.idMinisterio);
      return { nombre: m?.nombre || "—", rol: mm.rolEnMinisterio || "—" };
    });
    return { ...u, roleNames, minNames, memberships };
  }), [usuarios, usuarioRoles, roles, iglesias, miembrosMinisterio, ministerios]);

  const filtered = enriched.filter(u => {
    if (search) {
      const q = search.toLowerCase();
      if (!`${u.nombres} ${u.apellidos}`.toLowerCase().includes(q) && !u.correo.toLowerCase().includes(q)) return false;
    }
    if (filterEstado === "activo" && !u.activo) return false;
    if (filterEstado === "inactivo" && u.activo) return false;
    if (filterRol !== "all" && !u.roleNames.some(rn => rn.rolNombre.toLowerCase().includes(filterRol.toLowerCase()))) return false;
    return true;
  });

  const detailUser = detail ? enriched.find(u => u.idUsuario === detail) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Gestión de Usuarios</h1>
        <p className="text-muted-foreground text-sm mt-1">Vista global de todos los usuarios registrados en la plataforma</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl text-primary">{usuarios.length}</p>
          <p className="text-xs text-muted-foreground">Total Usuarios</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl text-green-600">{usuarios.filter(u => u.activo).length}</p>
          <p className="text-xs text-muted-foreground">Activos</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl text-red-600">{usuarios.filter(u => !u.activo).length}</p>
          <p className="text-xs text-muted-foreground">Inactivos</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl text-blue-600">{usuarios.filter(u => u.ultimoAcceso).length}</p>
          <p className="text-xs text-muted-foreground">Con acceso reciente</p>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o correo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card" />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRol} onValueChange={setFilterRol}>
          <SelectTrigger className="w-52 bg-card"><SelectValue placeholder="Rol" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {roles.map(r => <SelectItem key={r.idRol} value={r.nombre}>{r.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

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
                    {u.roleNames.length > 0 ? u.roleNames.map((rn, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{rn.rolNombre}</Badge>
                    )) : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.minNames.length > 0 ? u.minNames.slice(0, 2).map((mn, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{mn.nombre}</Badge>
                    )) : <span className="text-xs text-muted-foreground">—</span>}
                    {u.minNames.length > 2 && <Badge variant="outline" className="text-xs">+{u.minNames.length - 2}</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) : "Nunca"}
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${u.activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setDetail(u.idUsuario)}><Eye className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleUsuarioActivo(u.idUsuario)}>
                      {u.activo ? <ToggleRight className="w-3.5 h-3.5 text-green-600" /> : <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Detalle de Usuario</DialogTitle></DialogHeader>
          {detailUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg text-primary">{detailUser.nombres[0]}{detailUser.apellidos[0]}</div>
                <div>
                  <p className="text-lg">{detailUser.nombres} {detailUser.apellidos}</p>
                  <Badge className={`text-xs ${detailUser.activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{detailUser.activo ? "Activo" : "Inactivo"}</Badge>
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
                {detailUser.roleNames.length > 0 ? detailUser.roleNames.map((rn, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm ml-6 py-0.5">
                    <Badge variant="secondary">{rn.rolNombre}</Badge>
                    <span className="text-muted-foreground text-xs">en {rn.iglesiaNombre}</span>
                  </div>
                )) : <p className="text-xs text-muted-foreground ml-6">Sin roles asignados</p>}
              </div>
              <div>
                <p className="text-sm mb-2">Ministerios:</p>
                {detailUser.minNames.length > 0 ? detailUser.minNames.map((mn, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm ml-6 py-0.5">
                    <Badge variant="outline">{mn.nombre}</Badge>
                    <span className="text-muted-foreground text-xs">({mn.rol})</span>
                  </div>
                )) : <p className="text-xs text-muted-foreground ml-6">Sin ministerios</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
