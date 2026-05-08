import { useRoles } from "@/hooks/useUsuarios";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Settings2, ShieldCheck } from "lucide-react";

export function CatalogosPage() {
  const { data: roles = [], isLoading } = useRoles();

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-xl shadow-blue-900/30 shrink-0">
            <Settings2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-primary/80 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Configuraciones</p>
            <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground">Catálogos del Sistema</h1>
            <p className="text-muted-foreground text-[13px] font-bold mt-1">Gestiona los catálogos y tablas de referencia de la plataforma</p>
          </div>
        </div>
      </div>

      <Card className="p-5 bg-card/40 backdrop-blur-xl border border-white/10 shadow-sm rounded-3xl flex items-start gap-3">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 text-[#4682b4]"><ShieldCheck /></div>
          <div>
            <p className="text-sm font-bold text-foreground">Tipología de eventos desactivada</p>
            <p className="text-sm text-muted-foreground mt-1">La pantalla de eventos ahora usa un campo de texto opcional para describir el evento. No se mantiene catálogo de tipos de evento.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {roles.map((r) => (
          <div key={r.idRol} className="group flex flex-col p-5 rounded-3xl bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all cursor-default">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#709dbd]/20 to-[#4682b4]/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform mb-4"><ShieldCheck className="w-6 h-6 text-[#4682b4]" /></div>
            </div>
            <div>
              <p className="text-[16px] font-black text-foreground/90 group-hover:text-[#4682b4] transition-colors tracking-tight">{r.nombre}</p>
              <p className="text-[12px] font-medium text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">{r.descripcion}</p>
            </div>
            <div className="mt-8 flex items-center justify-between pt-4 border-t border-white/5">
              <Badge variant="outline" className="text-[9px] px-2 py-0 border-[#4682b4]/20 bg-[#4682b4]/5 text-[#4682b4] dark:text-[#709dbd] uppercase tracking-widest font-bold">Rol Base</Badge>
              <span className="text-[10px] text-muted-foreground font-black tracking-widest uppercase opacity-50">ID: {r.idRol}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
