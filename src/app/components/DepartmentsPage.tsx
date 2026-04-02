import { useState } from "react";
import { useMinisterios, useMiembrosMinisterio } from "@/hooks/useMinisterios";
import type { Ministerio } from "@/types/app.types";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { motion } from "motion/react";
import { Users, Plus, Search, Power, PowerOff, BookOpen, UserCog, UsersRound } from "lucide-react";

const rolLabels: Record<string, string> = { lider: "Líder", servidor: "Servidor" };
const rolColors: Record<string, string> = { lider: "bg-indigo-100 text-indigo-700", servidor: "bg-gray-100 text-gray-700" };

function MinisterioDetail({ min, onBack }: { min: Ministerio; onBack: () => void }) {
  const { data: minMembers = [] } = useMiembrosMinisterio(min.idMinisterio);
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-primary hover:underline text-sm">&larr; Ministerios</button>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="w-6 h-6 text-primary" /></div>
          <div>
            <h1>{min.nombre}</h1>
            <p className="text-muted-foreground text-sm">{min.descripcion}</p>
          </div>
        </div>
        <Badge variant={min.estado === "activo" ? "default" : "secondary"} className="self-start">{min.estado === "activo" ? "Activo" : "Inactivo"}</Badge>
      </div>

      <Tabs defaultValue="miembros">
        <TabsList>
          <TabsTrigger value="miembros"><UsersRound className="w-4 h-4 mr-1" /> Miembros</TabsTrigger>
          <TabsTrigger value="config"><UserCog className="w-4 h-4 mr-1" /> Configuración</TabsTrigger>
        </TabsList>
        <TabsContent value="miembros">
          <Card className="p-5 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3>Miembros del Ministerio ({minMembers.length})</h3>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
            </div>
            <div className="space-y-2">
              {minMembers.map((mm) => (
                <div key={mm.idMiembroMinisterio} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">{(mm.nombreCompleto || "?").charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{mm.nombreCompleto}</p>
                    <p className="text-xs text-muted-foreground">{mm.correo}</p>
                  </div>
                  <Badge variant="outline" className={`${rolColors[mm.rolEnMinisterio || "servidor"]} border-0 text-xs`}>{rolLabels[mm.rolEnMinisterio || "servidor"] || mm.rolEnMinisterio}</Badge>
                  <Badge variant={mm.activo ? "secondary" : "outline"} className="text-xs">{mm.activo ? "Activo" : "Inactivo"}</Badge>
                </div>
              ))}
              {minMembers.length === 0 && <p className="text-center text-muted-foreground py-4">No hay miembros en este ministerio</p>}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="config">
          <Card className="p-5 mt-4 space-y-4">
            <div><label className="text-sm">Nombre del Ministerio</label><Input value={min.nombre} className="mt-1" readOnly /></div>
            <div><label className="text-sm">Descripción</label><Input value={min.descripcion || ""} className="mt-1" readOnly /></div>
            <div><label className="text-sm">Líder Asignado</label><Input value={min.liderNombre || ""} className="mt-1" readOnly /></div>
            <div><label className="text-sm">Estado</label><Input value={min.estado} className="mt-1" readOnly /></div>
            <Button variant="outline">Guardar Cambios</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function DepartmentsPage() {
  const { data: ministerios = [], isLoading } = useMinisterios();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMin, setSelectedMin] = useState<number | null>(null);

  // Stub mutations — Phase 3
  const toggleMinisterioEstado = (_id: number) => { /* Phase 3 */ };

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  const filtered = ministerios.filter((m) => m.nombre.toLowerCase().includes(search.toLowerCase()));
  const min = selectedMin ? ministerios.find((m) => m.idMinisterio === selectedMin) : null;

  if (selectedMin && min) {
    return <MinisterioDetail min={min} onBack={() => setSelectedMin(null)} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>Ministerios</h1>
          <p className="text-muted-foreground text-sm">Gestiona la estructura organizativa de la iglesia</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0"><Plus className="w-4 h-4 mr-2" /> Nuevo Ministerio</Button>
      </motion.div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar ministerio..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card h-11" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m, i) => (
          <motion.div key={m.idMinisterio} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className={`p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${m.estado !== "activo" ? "opacity-60" : ""}`} onClick={() => setSelectedMin(m.idMinisterio)}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
                <Badge variant={m.estado === "activo" ? "default" : "secondary"} className="text-[10px]">{m.estado === "activo" ? "Activo" : "Inactivo"}</Badge>
              </div>
              <h3 className="mb-1">{m.nombre}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{m.descripcion}</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground"><UserCog className="w-3.5 h-3.5" /><span className="text-xs">{m.liderNombre}</span></div>
                <div className="flex items-center gap-1 text-muted-foreground"><UsersRound className="w-3.5 h-3.5" /><span className="text-xs">{m.cantidadMiembros}</span></div>
              </div>
              <div className="mt-3 pt-3 border-t flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); }}><BookOpen className="w-4 h-4 mr-1" /> Aula</Button>
                <Button variant={m.estado === "activo" ? "ghost" : "default"} size="sm" onClick={(e) => { e.stopPropagation(); toggleMinisterioEstado(m.idMinisterio); }}>
                  {m.estado === "activo" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo Ministerio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm">Nombre</label><Input placeholder="Nombre del ministerio" className="mt-1" /></div>
            <div><label className="text-sm">Descripción</label><Input placeholder="Descripción breve" className="mt-1" /></div>
            <div><label className="text-sm">Líder Asignado</label><Input placeholder="Seleccionar miembro" className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => setShowCreate(false)}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
