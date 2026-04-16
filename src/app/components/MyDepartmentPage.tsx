import { useMinisterios, useMiembrosMinisterio } from "@/hooks/useMinisterios";
import { useEventos } from "@/hooks/useEventos";
import { useCursos } from "@/hooks/useCursos";
import { useApp } from "../store/AppContext";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Users, Mail, CalendarDays, BookOpen, Crown, User, Plus } from "lucide-react";
import { useNavigate } from "react-router";

const rolLabels: Record<string, string> = { lider: "Líder", servidor: "Servidor" };
const rolColors: Record<string, string> = { lider: "bg-indigo-100 text-indigo-700", servidor: "bg-gray-100 text-gray-700" };
const rolIcons: Record<string, React.ReactNode> = { lider: <Crown className="w-3.5 h-3.5" />, servidor: <User className="w-3.5 h-3.5" /> };

export function MyDepartmentPage() {
  const { usuarioActual } = useApp();
  const navigate = useNavigate();
  const { data: ministerios = [], isLoading } = useMinisterios();
  const min = ministerios[0] ?? null;
  const { data: minMembers = [] } = useMiembrosMinisterio(min?.idMinisterio ?? 0);
  const { data: eventos = [] } = useEventos();
  const { data: cursos = [] } = useCursos(min?.idMinisterio);

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;
  if (!min) return <div className="p-8 text-muted-foreground">No se encontró ministerio asignado.</div>;

  const upcomingEvents = eventos
    .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime())
    .slice(0, 3);

  const totalModulos = cursos.reduce((sum, c) => sum + (c.modulos?.length || 0), 0);
  const activeMembers = minMembers.filter((mm) => mm.activo);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl shrink-0">{min.nombre.charAt(0)}</div>
        <div className="flex-1">
          <h1>{min.nombre}</h1>
          <p className="text-muted-foreground text-sm mt-1">{min.descripcion}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Badge variant="secondary" className="text-xs"><Crown className="w-3 h-3 mr-1" /> Líder: {min.liderNombre}</Badge>
            <Badge variant="outline" className="text-xs"><Users className="w-3 h-3 mr-1" /> {activeMembers.length} miembros activos</Badge>
            <Badge variant="outline" className="text-xs">Estado: {min.estado}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/app/eventos")}>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3"><CalendarDays className="w-5 h-5" /></div>
          <p className="text-2xl">{upcomingEvents.length}</p>
          <p className="text-xs text-muted-foreground">Próximos eventos</p>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/app/aula")}>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><BookOpen className="w-5 h-5" /></div>
          <p className="text-2xl">{cursos.length}</p>
          <p className="text-xs text-muted-foreground">Cursos de formación</p>
        </Card>
        <Card className="p-4">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3"><Users className="w-5 h-5" /></div>
          <p className="text-2xl">{activeMembers.length}</p>
          <p className="text-xs text-muted-foreground">Miembros activos</p>
        </Card>
        <Card className="p-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3"><BookOpen className="w-5 h-5" /></div>
          <p className="text-2xl">{totalModulos}</p>
          <p className="text-xs text-muted-foreground">Módulos totales</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Equipo del Ministerio</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("/app/miembros")}><Plus className="w-4 h-4 mr-1" /> Gestionar</Button>
          </div>
          <div className="space-y-2">
            {activeMembers.sort((a, b) => {
              const order = ["lider", "servidor"];
              return order.indexOf(a.rolEnMinisterio || "servidor") - order.indexOf(b.rolEnMinisterio || "servidor");
            }).map((mm) => (
              <div key={mm.idMiembroMinisterio} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${mm.idUsuario === usuarioActual?.idUsuario ? "bg-primary/5 border border-primary/20" : "bg-accent/30"}`}>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm shrink-0">{(mm.nombreCompleto || "?").charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm truncate">{mm.nombreCompleto}</p>
                    {mm.idUsuario === usuarioActual?.idUsuario && <Badge variant="default" className="text-[10px] px-1.5 py-0">Tú</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {mm.correo}</span>
                </div>
                <Badge variant="outline" className={`${rolColors[mm.rolEnMinisterio || "servidor"]} border-0 text-xs flex items-center gap-1`}>
                  {rolIcons[mm.rolEnMinisterio || "servidor"]} {rolLabels[mm.rolEnMinisterio || "servidor"]}
                </Badge>
              </div>
            ))}
            {activeMembers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin miembros activos</p>}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Próximos Eventos</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("/app/eventos")}><Plus className="w-4 h-4 mr-1" /> Nuevo</Button>
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((ev) => (
              <div key={ev.idEvento} className="flex items-start gap-3 p-3 rounded-lg bg-accent/30">
                <div className="w-12 text-center shrink-0">
                  <p className="text-xs text-muted-foreground">{new Date(ev.fechaInicio).toLocaleDateString("es", { month: "short" })}</p>
                  <p className="text-lg">{new Date(ev.fechaInicio).getDate()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{ev.nombre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ev.sedeNombre || ev.tipoEventoNombre}</p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">{ev.idMinisterio ? "Min." : "Global"}</Badge>
              </div>
            ))}
            {upcomingEvents.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay eventos próximos</p>}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Aula de Formación</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("/app/aula")}>Ir al aula</Button>
          </div>
          <div className="space-y-2">
            {cursos.map((curso, idx) => (
              <div key={curso.idCurso} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/app/aula")}>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm shrink-0">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{curso.nombre}</p>
                  <p className="text-xs text-muted-foreground">{curso.modulos?.length || 0} módulos{curso.duracionHoras ? ` · ${curso.duracionHoras}h` : ""}</p>
                </div>
              </div>
            ))}
            {cursos.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin cursos disponibles</p>}
          </div>
          {totalModulos > 0 && <p className="text-xs text-muted-foreground mt-3 text-center">{cursos.length} cursos · {totalModulos} módulos en total</p>}
        </Card>
      </div>
    </div>
  );
}
