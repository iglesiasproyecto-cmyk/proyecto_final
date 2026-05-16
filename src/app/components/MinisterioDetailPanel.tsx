import { useState } from "react";
import {
  useMiembrosMinisterioEnriquecidos,
  useCreateMiembroMinisterio,
} from "@/hooks/useMinisterios";
import { useCanManageMinisterio } from "@/hooks/useMinisterioRole";
import { useUsuariosEnriquecidos } from "@/hooks/useUsuarios";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { MinisterioEnriquecido } from "@/services/ministerios.service";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Users, Plus, UserCog, UsersRound } from "lucide-react";
import { toast } from "sonner";

const rolLabels: Record<string, string> = { lider: "Líder", servidor: "Servidor" };
const rolColors: Record<string, string> = {
  lider: "bg-indigo-100 text-indigo-700",
  servidor: "bg-gray-100 text-gray-700",
};

function normalizeRol(rol?: string | null) {
  const normalized = `${rol ?? ""}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (normalized.includes('lider')) return 'lider'
  return 'servidor'
}

export function MinisterioDetailPanel({
  min,
  onBack,
}: {
  min: MinisterioEnriquecido
  onBack: () => void
}) {
  const { data: minMembers = [] } = useMiembrosMinisterioEnriquecidos(min.idMinisterio);
  const { data: allUsers = [] } = useUsuariosEnriquecidos();
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ idUsuario: "", rolEnMinisterio: "servidor" });
  const createMemberMutation = useCreateMiembroMinisterio();
  const canManageMembers = useCanManageMinisterio(min.idMinisterio);

  const availableUsers = allUsers.filter(
    (user) => !minMembers.some((member) => member.idUsuario === user.idUsuario)
  );

  const handleAddMember = () => {
    if (!memberForm.idUsuario) { toast.error('Por favor selecciona un usuario'); return; }
    createMemberMutation.mutate(
      {
        idUsuario: parseInt(memberForm.idUsuario),
        idMinisterio: min.idMinisterio,
        rolEnMinisterio: memberForm.rolEnMinisterio,
        fechaIngreso: new Date().toISOString().split('T')[0],
      },
      {
        onSuccess: () => {
          toast.success('Miembro agregado exitosamente');
          setShowAddMember(false);
          setMemberForm({ idUsuario: "", rolEnMinisterio: "servidor" });
        },
        onError: (error: any) => toast.error(`Error al agregar miembro: ${error.message}`),
      }
    );
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto motion-preset-fade px-4 md:px-0">
      <div className="bg-card/40 backdrop-blur-xl border border-border/50 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10 pointer-events-none" />
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-background/50 border border-white/5 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors hover:-translate-x-1 shrink-0"
          >
            &larr;
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-none mb-1">{min.nombre}</h1>
              <p className="text-muted-foreground text-xs hidden sm:block">{min.descripcion}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge
            variant={min.estado === "activo" ? "default" : "secondary"}
            className={`px-2 sm:px-3 py-1 text-[10px] uppercase font-bold tracking-widest ${min.estado === 'activo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200' : ''}`}
          >
            {min.estado === "activo" ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="miembros" className="w-full">
        <TabsList className="bg-card/40 backdrop-blur-md border border-border/50 p-1 rounded-xl mb-4 w-fit mx-auto sm:mx-0 flex">
          <TabsTrigger value="miembros" className="rounded-lg text-xs font-medium px-3 sm:px-4">
            <UsersRound className="w-4 h-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Directorio</span>
            <span className="sm:hidden">Team</span> ({minMembers.length})
          </TabsTrigger>
          <TabsTrigger value="config" className="rounded-lg text-xs font-medium px-3 sm:px-4">
            <UserCog className="w-4 h-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="miembros" className="outline-none">
          <Card className="bg-card/40 backdrop-blur-xl border border-border/50 p-0 overflow-hidden shadow-sm rounded-2xl">
            <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/20">
              <div>
                <h3 className="font-bold text-sm">Equipo Ministerial</h3>
                <p className="text-xs text-muted-foreground">Gestiona los servidores y líderes asignados a esta área.</p>
              </div>
              {canManageMembers && (
                <Button size="sm" className="h-9 rounded-xl text-xs transition-colors shadow-sm" onClick={() => setShowAddMember(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar Miembro
                </Button>
              )}
            </div>
            <div className="divide-y divide-border/30">
              {minMembers.map((mm) => (
                <div key={mm.idMiembroMinisterio} className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#709dbd]/10 to-[#4682b4]/5 flex items-center justify-center text-primary text-xs font-bold ring-2 ring-background shadow-inner">
                      {(mm.nombreCompleto || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{mm.nombreCompleto}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{mm.correo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0 justify-end">
                    <Badge variant="outline" className={`${rolColors[normalizeRol(mm.rolEnMinisterio)]} border-white/10 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5`}>
                      {rolLabels[normalizeRol(mm.rolEnMinisterio)] || mm.rolEnMinisterio}
                    </Badge>
                    <Badge
                      variant={mm.activo ? "secondary" : "outline"}
                      className={`text-[10px] ${mm.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200' : 'bg-background/50 border-white/5'}`}
                    >
                      {mm.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
              ))}
              {minMembers.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                  <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center mb-3">
                    <UsersRound className="w-6 h-6 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">Ministerio sin equipo</p>
                  <p className="text-xs">Usa el botón superior para añadir personas.</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="outline-none">
          <Card className="bg-card/40 backdrop-blur-xl border-white/10 p-6 shadow-sm rounded-2xl max-w-2xl">
            <div className="space-y-5">
              <div>
                <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Nombre del Ministerio</label>
                <Input value={min.nombre} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" readOnly />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Descripción del Propósito</label>
                <Input value={min.descripcion || ""} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" readOnly />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Líder Asignado</label>
                  <Input value={min.liderNombre || "No asignado"} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm" readOnly />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Estado del Ministerio</label>
                  <Input value={min.estado} className="h-11 bg-background/50 border-white/10 rounded-xl text-sm capitalize" readOnly />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {canManageMembers && (
        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogContent className="sm:max-w-md rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                Agregar Miembro
              </DialogTitle>
              <p className="text-sm text-muted-foreground">Agregar un nuevo servidor al ministry {min.nombre}</p>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Seleccionar Usuario</label>
                <Select value={memberForm.idUsuario} onValueChange={(v) => setMemberForm(p => ({ ...p, idUsuario: v }))}>
                  <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                    <SelectValue placeholder="Selecciona un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.idUsuario} value={user.idUsuario.toString()}>
                        {user.nombres} {user.apellidos} ({user.correo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Rol en el Ministerio</label>
                <Select value={memberForm.rolEnMinisterio} onValueChange={(v) => setMemberForm(p => ({ ...p, rolEnMinisterio: v }))}>
                  <SelectTrigger className="h-11 bg-background/50 border-white/10 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servidor">Servidor</SelectItem>
                    <SelectItem value="lider">Líder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-2 border-t border-border/50 pt-4">
              <Button variant="ghost" className="rounded-xl" onClick={() => { setShowAddMember(false); setMemberForm({ idUsuario: "", rolEnMinisterio: "servidor" }); }}>
                Cancelar
              </Button>
              <Button
                variant="default"
                className="rounded-xl"
                onClick={handleAddMember}
                disabled={!memberForm.idUsuario || createMemberMutation.isPending}
              >
                {createMemberMutation.isPending ? "Agregando..." : "Agregar Miembro"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}