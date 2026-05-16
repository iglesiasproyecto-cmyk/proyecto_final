import { useState } from "react";
import { useUsuariosEnriquecidos } from "@/hooks/useUsuarios";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { User, Calendar } from "lucide-react";

export function CumpleanosPage() {
  const { data: usuarios = [] } = useUsuariosEnriquecidos();

  const [rangoProximos, setRangoProximos] = useState<number>(() => {
    const saved = localStorage.getItem("cumpleanos_rango");
    return saved ? parseInt(saved, 10) : 7;
  });
  const [tab, setTab] = useState<"hoy" | "proximos" | "todos">("hoy");

  const handleRangoChange = (valor: string) => {
    const num = parseInt(valor, 10);
    setRangoProximos(num);
    localStorage.setItem("cumpleanos_rango", valor);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const usuariosConFecha = usuarios
    .filter((u) => u.activo)
    .map((u, index) => {
      if (u.fechaNacimiento) return u;
      if (!import.meta.env.DEV || index > 5) return u;

      const today = new Date();
      const offsetDays = [0, 2, 5, 9, 14, 25][index] ?? 0;
      const testBirthday = new Date(today);
      testBirthday.setDate(today.getDate() + offsetDays);

      const birthYear = 1990 + (index % 10);
      const simulated = formatDate(new Date(birthYear, testBirthday.getMonth(), testBirthday.getDate()));

      return {
        ...u,
        fechaNacimiento: simulated,
      };
    })
    .filter((u) => u.fechaNacimiento);

  const getDaysUntilBirthday = (fechaNacimiento: string): number => {
    const [, month, day] = fechaNacimiento.split("-").map(Number);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const birthday = new Date(today.getFullYear(), month - 1, day);
    if (birthday < today) {
      birthday.setFullYear(today.getFullYear() + 1);
    }

    const diff = birthday.getTime() - today.getTime();
    return Math.ceil(diff / 86400000);
  };

  const getAge = (fechaNacimiento: string): number => {
    const today = new Date();
    const [year, month, day] = fechaNacimiento.split("-").map(Number);
    let age = today.getFullYear() - year;
    const monthDiff = today.getMonth() - (month - 1);
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
      age--;
    }
    return age;
  };

  const isCumpleanosHoy = (fechaNacimiento: string): boolean => {
    const today = new Date();
    const [, month, day] = fechaNacimiento.split("-").map(Number);
    return today.getMonth() === month - 1 && today.getDate() === day;
  };

  let usuariosFiltrados = usuariosConFecha;
  if (tab === "hoy") {
    usuariosFiltrados = usuariosConFecha.filter((u) => isCumpleanosHoy(u.fechaNacimiento!));
  } else if (tab === "proximos") {
    usuariosFiltrados = usuariosConFecha.filter((u) => {
      const dias = getDaysUntilBirthday(u.fechaNacimiento!);
      return dias > 0 && dias <= rangoProximos;
    });
    usuariosFiltrados.sort((a, b) => getDaysUntilBirthday(a.fechaNacimiento!) - getDaysUntilBirthday(b.fechaNacimiento!));
  } else {
    usuariosFiltrados = usuariosConFecha.slice().sort((a, b) => {
      const [, mesA, diaA] = (a.fechaNacimiento || "").split("-").map(Number);
      const [, mesB, diaB] = (b.fechaNacimiento || "").split("-").map(Number);
      if (mesA !== mesB) return mesA - mesB;
      return diaA - diaB;
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Cumpleaños</h1>
        <p className="text-muted-foreground">Gestiona los cumpleaños de los miembros de tu comunidad</p>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex gap-2 border rounded-lg p-1 bg-muted">
          {(["hoy", "proximos", "todos"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded text-sm font-medium transition ${tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "hoy" ? "Hoy" : t === "proximos" ? "Proximos" : "Todos"}
            </button>
          ))}
        </div>

        {tab === "proximos" && (
          <Select value={String(rangoProximos)} onValueChange={handleRangoChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Rango" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Proximos 7 dias</SelectItem>
              <SelectItem value="15">Proximos 15 dias</SelectItem>
              <SelectItem value="30">Proximos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div>
        {usuariosFiltrados.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              {tab === "hoy"
                ? "No hay cumpleanos hoy"
                : tab === "proximos"
                  ? `No hay cumpleanos en los proximos ${rangoProximos} dias`
                  : "No hay cumpleanos registrados"}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {usuariosFiltrados.map((usuario) => (
              <CumpleanosCard
                key={usuario.idUsuario}
                usuario={usuario}
                diasFaltantes={getDaysUntilBirthday(usuario.fechaNacimiento!)}
                edad={getAge(usuario.fechaNacimiento!)}
                esHoy={isCumpleanosHoy(usuario.fechaNacimiento!)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CumpleanosCardProps {
  usuario: { idUsuario: number; nombres: string; apellidos: string; correo: string };
  diasFaltantes: number;
  edad: number;
  esHoy: boolean;
}

function CumpleanosCard({ usuario, diasFaltantes, edad, esHoy }: CumpleanosCardProps) {
  return (
    <Card className={`p-4 ${esHoy ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20" : ""}`}>
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{usuario.nombres} {usuario.apellidos}</p>
              <p className="text-sm text-muted-foreground">{usuario.correo}</p>
            </div>
            {esHoy && <Badge variant="default" className="bg-amber-500 text-white">HOY</Badge>}
          </div>
          <div className="mt-3 flex gap-2 text-sm">
            <span className="text-muted-foreground">Cumplira {edad} anos</span>
            {diasFaltantes > 0 && (
              <span className="text-primary font-medium">en {diasFaltantes} dia{diasFaltantes > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
