import { useState } from "react";
import { useSedesEnriquecidas, useIglesias, useCreateSede, useUpdateSede, useToggleSedeEstado, useDeleteSede, useSedePastores, usePastoresEnriquecidos, usePastoresPorSede, useCreateSedePastor, useCreatePastor } from "@/hooks/useIglesias";
import { useApp } from "@/app/store/AppContext";
import { usePaisesEnhanced, useDepartamentosEnhanced, useCiudadesEnhanced } from "@/hooks/useGeografiaEnhanced";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton";
import { CardSkeleton } from "./loading/skeletons";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { AnimatedCard } from "./ui/AnimatedCard";
import {
  Building2,
  Church,
  Eye,
  Globe,
  MapPin,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Save,
  Search,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";

export function SedesPage() {
  const [search, setSearch] = useState("");
  const [filterIglesia, setFilterIglesia] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [dialog, setDialog] = useState(false);
  const [dialogPastor, setDialogPastor] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [selectedSede, setSelectedSede] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number; nombre: string }>({ isOpen: false, id: 0, nombre: "" });
  const [form, setForm] = useState({ nombre: "", direccion: "", idCiudad: 0, idDepartamento: 0, idPais: 0, idIglesia: 0, estado: "activa" as "activa" | "inactiva" | "en_construccion" });
  const [pastorForm, setPastorForm] = useState({
    idSede: 0,
    idPastor: 0,
    esPrincipal: true,
    fechaInicio: new Date().toISOString().split('T')[0],
    observaciones: "",
    crearNuevoPastor: false,
    nuevoPastor: { nombres: "", apellidos: "", correo: "", telefono: "" }
  });

  const { iglesiaActual, rolActual } = useApp();
  const queryIglesiaId = rolActual === "super_admin"
    ? (filterIglesia === "all" ? undefined : Number(filterIglesia))
    : iglesiaActual?.id;
  const { data: sedes = [], isLoading } = useSedesEnriquecidas(queryIglesiaId);
  const { data: iglesias = [] } = useIglesias();
  const { data: paises = [] } = usePaisesEnhanced();
  const { data: departamentos = [] } = useDepartamentosEnhanced(form.idPais || undefined);
  const departamentoSeleccionado = departamentos.find(d => d.idDepartamentoGeo === form.idDepartamento);
  const { data: ciudades = [] } = useCiudadesEnhanced(form.idDepartamento || undefined, departamentoSeleccionado?.nombre);
  const { data: sedePastores = [] } = useSedePastores();
  const { data: pastores = [] } = usePastoresEnriquecidos();

  const createSedeMutation = useCreateSede();
  const updateSedeMutation = useUpdateSede();
  const toggleSedeMutation = useToggleSedeEstado();
  const deleteSedeMutation = useDeleteSede();
  const createSedePastorMutation = useCreateSedePastor();
  const createPastorMutation = useCreatePastor();

  if (isLoading) return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <div className="flex items-center gap-4 p-4">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <CardSkeleton items={6} columns={3} showImage showActions />
    </div>
  );

  const openAdd = () => {
    const defaultIglesiaId = iglesiaActual?.id ?? (iglesias.length === 1 ? iglesias[0].idIglesia : 0);
    setForm({ nombre: "", direccion: "", idCiudad: 0, idDepartamento: 0, idPais: 0, idIglesia: defaultIglesiaId, estado: "activa" });
    setEditing(null);
    setDialog(true);
  };
  
  const openEdit = (id: number) => {
    const s = sedes.find(x => x.idSede === id); if (!s) return;
    setForm({ nombre: s.nombre, direccion: s.direccion || "", idCiudad: s.idCiudad || 0, idDepartamento: s.idDepartamentoGeo || 0, idPais: s.idPais || 0, idIglesia: s.idIglesia, estado: s.estado });
    setEditing(id); setDialog(true);
  };

  const handleSubmit = () => {
    if (!form.nombre.trim() || !form.idCiudad || !form.idIglesia || !form.idPais || !form.idDepartamento) {
      toast.error("Completa nombre, iglesia, país, departamento y ciudad para guardar la sede");
      return;
    }
    if (editing) updateSedeMutation.mutate(
      { id: editing, data: { nombre: form.nombre, direccion: form.direccion || null, idCiudad: form.idCiudad, idIglesia: form.idIglesia, estado: form.estado } },
      {
        onSuccess: () => {
          toast.success("Sede actualizada");
          setEditing(null);
          setDialog(false);
        },
        onError: (err: any) => {
          toast.error(err?.message ?? "No se pudo actualizar la sede");
        },
      }
    );
    else createSedeMutation.mutate(
      { nombre: form.nombre, direccion: form.direccion || null, idCiudad: form.idCiudad, idIglesia: form.idIglesia, estado: form.estado },
      {
        onSuccess: (nuevaSede) => {
          toast.success("Sede creada correctamente");
          setEditing(null);
          setDialog(false);
          // Abrir diálogo para asignar pastor a la nueva sede
          setPastorForm(prev => ({ ...prev, idSede: nuevaSede.idSede }));
          setDialogPastor(true);
        },
        onError: (err: any) => {
          toast.error(err?.message ?? "No se pudo crear la sede");
        },
      }
    );
  };

  const handleDeleteSede = (id: number, nombre: string) => {
    setConfirmDelete({ isOpen: true, id, nombre });
  };

  const lookupIglesia = (idIglesia: number) => iglesias.find(i => i.idIglesia === idIglesia)?.nombre || "-";

  const handleAsignarPastor = async () => {
    if (!pastorForm.idSede) return;

    let idPastor = pastorForm.idPastor;

    // Si se selecciona crear nuevo pastor
    if (pastorForm.crearNuevoPastor) {
      if (!pastorForm.nuevoPastor.nombres.trim() || !pastorForm.nuevoPastor.apellidos.trim() || !pastorForm.nuevoPastor.correo.trim()) {
        toast.error("Completa nombre, apellido y correo del nuevo pastor");
        return;
      }

      try {
        const nuevoPastor = await createPastorMutation.mutateAsync({
          nombres: pastorForm.nuevoPastor.nombres.trim(),
          apellidos: pastorForm.nuevoPastor.apellidos.trim(),
          correo: pastorForm.nuevoPastor.correo.trim(),
          telefono: pastorForm.nuevoPastor.telefono.trim() || null,
          idUsuario: null
        });
        idPastor = nuevoPastor.idPastor;
      } catch (error) {
        toast.error("Error al crear el pastor");
        return;
      }
    }

    if (!idPastor) {
      toast.error("Selecciona un pastor existente o crea uno nuevo");
      return;
    }

    // Asignar pastor a la sede
    try {
      await createSedePastorMutation.mutateAsync({
        idSede: pastorForm.idSede,
        idPastor: idPastor,
        esPrincipal: pastorForm.esPrincipal,
        fechaInicio: pastorForm.fechaInicio,
        fechaFin: null,
        observaciones: pastorForm.observaciones || null
      });

      toast.success("Pastor asignado correctamente a la sede");
      setDialogPastor(false);
      setPastorForm({
        idSede: 0,
        idPastor: 0,
        esPrincipal: true,
        fechaInicio: new Date().toISOString().split('T')[0],
        observaciones: "",
        crearNuevoPastor: false,
        nuevoPastor: { nombres: "", apellidos: "", correo: "", telefono: "" }
      });
    } catch (error) {
      toast.error("Error al asignar el pastor");
    }
  };
  const estadoColor = (e: string) => e === "activa" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200" : e === "inactiva" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200";
  const estadoLabel = (e: string) => e === "activa" ? "Activa" : e === "inactiva" ? "Inactiva" : "En Construcción";

  const filtered = sedes.filter(s => {
    if (search && !s.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    // For super admin the iglesia filter is applied at query-level above.
    if (rolActual !== "super_admin" && filterIglesia !== "all" && s.idIglesia !== Number(filterIglesia)) return false;
    if (filterEstado !== "all" && s.estado !== filterEstado) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="flex flex-col gap-6">
        {/* Logo + Título + Botón Nueva Sede */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-primary/80 font-medium uppercase tracking-[0.2em] text-[10px] mb-0.5">Estructura</p>
              <h1 className="text-4xl font-light tracking-tight text-foreground leading-tight">Gestión de Sedes</h1>
            </div>
          </div>
          <Button onClick={openAdd} className="shrink-0 shadow-md shadow-[#4682b4]/20 rounded-full px-6 bg-[#4682b4] hover:bg-[#4682b4]/90 text-white h-11">
            <Plus className="w-4 h-4 mr-2" /> Nueva Sede
          </Button>
        </div>

        {/* Búsqueda y Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input 
              placeholder="Buscar sedes..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-10 h-10 bg-background/60 border border-border/40 rounded-xl shadow-sm focus-visible:ring-primary/30 focus-visible:border-primary/40 text-sm" 
            />
          </div>
          <Select value={filterIglesia} onValueChange={setFilterIglesia}>
            <SelectTrigger className="w-56 h-10 bg-background/60 border border-border/40 rounded-xl shadow-sm text-sm">
              <SelectValue placeholder="Iglesia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {iglesias.map(i => <SelectItem key={i.idIglesia} value={String(i.idIglesia)}>{i.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-48 h-10 bg-background/60 border border-border/40 rounded-xl shadow-sm text-sm">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="activa">Activa</SelectItem>
              <SelectItem value="inactiva">Inactiva</SelectItem>
              <SelectItem value="en_construccion">En Construcción</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" className="h-10 rounded-xl text-xs whitespace-nowrap" onClick={() => { setSearch(""); setFilterIglesia("all"); setFilterEstado("all"); }}>
            <span className="hidden sm:inline">Limpiar</span>
            <span className="sm:hidden">Limpiar</span>
          </Button>
        </div>
      </motion.div>

      {/* KPI Stats Row (Bento style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AnimatedCard index={0} className="p-3 sm:p-5">
           <div className="flex justify-between items-start mb-2 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shadow-lg">
                 <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-0">Total</Badge>
           </div>
           <p className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">{sedes.length}</p>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Sedes</p>
        </AnimatedCard>
        <AnimatedCard index={1} className="p-3 sm:p-5">
           <div className="flex justify-between items-start mb-2 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shadow-lg">
                 <Power className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-0">OK</Badge>
           </div>
           <p className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">{sedes.filter(s => s.estado === 'activa').length}</p>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Activas</p>
        </AnimatedCard>
        <AnimatedCard index={2} className="p-3 sm:p-5">
           <div className="flex justify-between items-start mb-2 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shadow-lg">
                 <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-0">Geo</Badge>
           </div>
           <p className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">{new Set(sedes.map(s => s.idCiudad)).size}</p>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Ciudades</p>
        </AnimatedCard>
        <AnimatedCard index={3} className="p-3 sm:p-5">
           <div className="flex justify-between items-start mb-2 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center text-white shadow-lg">
                 <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-0">Staff</Badge>
           </div>
           <p className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">{sedes.reduce((acc, s) => acc + (s.cantidadMinisterios || 0), 0)}</p>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Min.</p>
        </AnimatedCard>
      </div>

      {/* GRID PRINCIPAL de Sedes (Bento Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filtered.map((s, idx) => (
          <AnimatedCard 
            key={s.idSede} 
            index={idx} 
            className={`group p-4 sm:p-6 flex flex-col justify-between ${s.estado !== 'activa' ? 'opacity-80 grayscale-[0.3]' : ''}`}
          >
            <div>
              <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[20px] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Building2 className={`w-5 h-5 sm:w-6 sm:h-6 ${s.estado === 'activa' ? 'text-[#4682b4]' : 'text-muted-foreground'}`} />
                </div>
                <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest border-0 py-1 px-2 sm:px-3 rounded-lg shadow-sm ${estadoColor(s.estado)}`}>
                  {estadoLabel(s.estado)}
                </Badge>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground group-hover:text-[#4682b4] transition-colors line-clamp-1 uppercase italic leading-none">{s.nombre}</h3>
                <p className="text-[11px] font-bold text-[#4682b4]/70 uppercase tracking-widest truncate">{lookupIglesia(s.idIglesia)}</p>
              </div>

              <div className="mt-4 sm:mt-5 space-y-3 pt-3 sm:pt-4 border-t border-white/5">
                <div className="flex items-center gap-3 text-[13px] text-muted-foreground/80 font-medium">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{s.ciudadNombre || "Ciudad no def."}</span>
                </div>
                {s.direccion && (
                  <p className="text-[11px] text-muted-foreground/60 italic line-clamp-1 pl-10">
                    {s.direccion}
                  </p>
                )}
              </div>

              {/* Información del Pastor Asignado */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-3 text-[13px]">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <UserCheck className="w-3.5 h-3.5 text-[#4682b4]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {(() => {
                      // Buscar asignación actual para esta sede
                      const asignacionActual = sedePastores.find(sp =>
                        sp.idSede === s.idSede &&
                        sp.fechaFin === null
                      );
                      const pastorAsignado = asignacionActual
                        ? pastores.find(p => p.idPastor === asignacionActual.idPastor)
                        : null;

                      return pastorAsignado ? (
                        <div>
                          <p className="font-medium text-foreground/90 truncate">
                            {pastorAsignado.nombres} {pastorAsignado.apellidos}
                          </p>
                          <p className="text-[11px] text-muted-foreground/60">
                            Asignado desde {asignacionActual.fechaInicio}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-muted-foreground/70">Sin pastor asignado</p>
                          <p className="text-[11px] text-muted-foreground/50">Usa "Editar" para asignar</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className="h-8 px-3 rounded-lg bg-[#4682b4]/10 border border-[#4682b4]/20 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#4682b4]" />
                    <span className="text-xs font-black text-[#4682b4]">{s.cantidadMinisterios}</span>
                 </div>
              </div>

              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-[#4682b4]/10" onClick={() => setSelectedSede(s.idSede)} title="Ver detalle">
                  <Eye className="w-4 h-4 text-[#4682b4]" />
                </Button>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-black/5 dark:hover:bg-white/10" onClick={() => openEdit(s.idSede)}>
                  <Pencil className="w-4 h-4 text-foreground/70" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-9 w-9 p-0 rounded-xl transition-all ${s.estado === "activa" ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`} 
                  onClick={() => toggleSedeMutation.mutate(s.idSede)} 
                >
                  {s.estado === "activa" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-red-500/10 text-red-500" onClick={() => handleDeleteSede(s.idSede, s.nombre)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-24 text-center rounded-[40px] bg-card/30 backdrop-blur-3xl border border-white/10 shadow-xl">
          <MapPin className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-foreground/80 tracking-tight">Expediente Vacío</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">No se encontraron sedes activas con los criterios de búsqueda actuales.</p>
        </div>
      )}

      {/* DIALOG DETAIL */}
      {(() => {
        const sedeDetail = sedes.find(s => s.idSede === selectedSede);
        if (!sedeDetail) return null;
        const iglesia = iglesias.find(i => i.idIglesia === sedeDetail.idIglesia);
        const pastorLink = sedePastores.find(sp => sp.idSede === sedeDetail.idSede && sp.esPrincipal);
        const pastor = pastorLink ? pastores.find(p => p.idPastor === pastorLink.idPastor) : null;
        return (
          <Dialog open={!!selectedSede} onOpenChange={() => setSelectedSede(null)}>
            <DialogContent className="sm:max-w-md max-h-[90vh] rounded-2xl overflow-hidden p-0 border border-white/20 shadow-2xl">
              <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#4682b4] to-[#709dbd] border-b border-white/10">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                    <Building2 className="w-5 h-5" /> 
                    Detalle
                  </DialogTitle>
                </DialogHeader>
              </div>
              <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 overflow-y-auto max-h-[60vh]">
                <div className="text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#4682b4]/20 to-[#709dbd]/10 border border-[#4682b4]/20 flex items-center justify-center mx-auto mb-3">
                    <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-[#4682b4]" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground uppercase italic">{sedeDetail.nombre}</h3>
                  <Badge variant="outline" className={`mt-2 text-[9px] font-black uppercase tracking-widest border-0 py-1 px-2 sm:px-3 rounded-lg shadow-sm ${estadoColor(sedeDetail.estado)}`}>
                    {estadoLabel(sedeDetail.estado)}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                    <div className="w-9 h-9 rounded-lg bg-[#4682b4]/10 flex items-center justify-center shrink-0">
                      <Church className="w-4 h-4 text-[#4682b4]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Iglesia Madre</p>
                      <p className="text-sm font-semibold text-foreground">{iglesia?.nombre || "No asignada"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pastor Líder</p>
                      <p className="text-sm font-semibold text-foreground">{pastor ? `${pastor.nombres} ${pastor.apellidos || ""}` : "Sin pastor asignado"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ubicación</p>
                      <p className="text-sm font-semibold text-foreground">{sedeDetail.ciudadNombre || "Ciudad no definida"}</p>
                      {sedeDetail.direccion && <p className="text-xs text-muted-foreground italic">{sedeDetail.direccion}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ministerios</p>
                      <p className="text-sm font-semibold text-foreground">{sedeDetail.cantidadMinisterios || 0} operativos</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex justify-end">
                <Button variant="ghost" onClick={() => setSelectedSede(null)} className="rounded-full px-5"><X className="w-4 h-4 mr-1.5" /> Cerrar</Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: 0, nombre: "" })}
        onConfirm={() => deleteSedeMutation.mutate(confirmDelete.id)}
        title="¿Eliminar Sede?"
        description={`¿Estás seguro de que quieres eliminar la sede "${confirmDelete.nombre}"? Esta acción es irreversible.`}
      />

      {/* MODAL (Diálogo de Creación / Edición) */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] rounded-2xl overflow-hidden p-0 border border-white/20 shadow-2xl">
          <div className="px-4 sm:px-6 py-4 bg-muted/30 border-b border-border/40">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                {editing ? <Pencil className="w-5 h-5 text-[#4682b4]" /> : <Plus className="w-5 h-5 text-[#4682b4]" />}
                {editing ? "Editar Sede" : "Nueva Sede"}
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="px-4 sm:px-6 py-4 space-y-4 overflow-y-auto max-h-[60vh]">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Nombre <span className="text-destructive">*</span></label>
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="bg-input-background focus-visible:ring-[#4682b4]/30" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Dirección</label>
              <Input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} className="bg-input-background focus-visible:ring-[#4682b4]/30" placeholder="Ej. Calle 123" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Iglesia <span className="text-destructive">*</span></label>
                <Select value={form.idIglesia ? String(form.idIglesia) : ""} onValueChange={v => setForm(f => ({ ...f, idIglesia: Number(v) }))}>
                  <SelectTrigger className="bg-input-background focus:ring-[#4682b4]/30"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{iglesias.map(i => <SelectItem key={i.idIglesia} value={String(i.idIglesia)}>{i.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">País <span className="text-destructive">*</span></label>
                <Select value={form.idPais ? String(form.idPais) : ""} onValueChange={v => setForm(f => ({ ...f, idPais: Number(v), idDepartamento: 0, idCiudad: 0 }))}>
                  <SelectTrigger className="bg-input-background focus:ring-[#4682b4]/30"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{paises.map(p => <SelectItem key={p.idPais} value={String(p.idPais)}>{p.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Departamento <span className="text-destructive">*</span></label>
                <Select value={form.idDepartamento ? String(form.idDepartamento) : ""} onValueChange={v => setForm(f => ({ ...f, idDepartamento: Number(v), idCiudad: 0 }))} disabled={!form.idPais}>
                  <SelectTrigger className={`bg-input-background focus:ring-[#4682b4]/30 ${!form.idPais ? "opacity-50 cursor-not-allowed" : ""}`}><SelectValue placeholder={form.idPais ? "Seleccionar" : "Elige país"} /></SelectTrigger>
                  <SelectContent>{departamentos.map(d => <SelectItem key={d.idDepartamentoGeo} value={String(d.idDepartamentoGeo)}>{d.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Ciudad <span className="text-destructive">*</span></label>
                <Select value={form.idCiudad ? String(form.idCiudad) : ""} onValueChange={v => setForm(f => ({ ...f, idCiudad: Number(v) }))} disabled={!form.idDepartamento}>
                  <SelectTrigger className={`bg-input-background focus:ring-[#4682b4]/30 ${!form.idDepartamento ? "opacity-50 cursor-not-allowed" : ""}`}><SelectValue placeholder={form.idDepartamento ? "Seleccionar" : "Elige departamento"} /></SelectTrigger>
                  <SelectContent>
                    {ciudades.map(c => (
                      <SelectItem key={c.idCiudad} value={String(c.idCiudad)}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Estado Inicial</label>
              <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v as "activa" | "inactiva" | "en_construccion" }))}>
                <SelectTrigger className="bg-input-background focus:ring-[#4682b4]/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="inactiva">Inactiva</SelectItem>
                  <SelectItem value="en_construccion">En Construcción</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gestión de Pastor Asignado */}
            {editing && (
              <div className="border-t border-border/40 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="w-4 h-4 text-[#4682b4]" />
                  <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70">Pastor Asignado</label>
                </div>

                {(() => {
                  // Buscar asignación actual para esta sede
                  const asignacionActual = sedePastores.find(sp =>
                    sp.idSede === editing &&
                    sp.fechaFin === null
                  );
                  const pastorActual = asignacionActual
                    ? pastores.find(p => p.idPastor === asignacionActual.idPastor)
                    : null;

                  return (
                    <div className="space-y-3">
                      {pastorActual ? (
                        <div className="p-3 bg-[#4682b4]/5 border border-[#4682b4]/20 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#4682b4]/10 flex items-center justify-center">
                                <UserCheck className="w-4 h-4 text-[#4682b4]" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{pastorActual.nombres} {pastorActual.apellidos}</p>
                                <p className="text-xs text-muted-foreground">Pastor asignado desde {asignacionActual.fechaInicio}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPastorForm({
                                  idSede: editing,
                                  idPastor: 0,
                                  esPrincipal: true,
                                  fechaInicio: new Date().toISOString().split('T')[0],
                                  observaciones: "",
                                  crearNuevoPastor: false,
                                  nuevoPastor: { nombres: "", apellidos: "", correo: "", telefono: "" }
                                });
                                setDialogPastor(true);
                              }}
                              className="text-xs"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Cambiar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-amber-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">Sin pastor asignado</p>
                                <p className="text-xs text-muted-foreground">Esta sede necesita un pastor</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPastorForm({
                                  idSede: editing,
                                  idPastor: 0,
                                  esPrincipal: true,
                                  fechaInicio: new Date().toISOString().split('T')[0],
                                  observaciones: "",
                                  crearNuevoPastor: false,
                                  nuevoPastor: { nombres: "", apellidos: "", correo: "", telefono: "" }
                                });
                                setDialogPastor(true);
                              }}
                              className="text-xs border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Asignar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="px-4 sm:px-6 py-4 bg-muted/20 border-t border-border/40 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <Button variant="ghost" onClick={() => setDialog(false)} className="rounded-full px-5 w-full sm:w-auto"><X className="w-4 h-4 mr-1.5" /> Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.nombre.trim() || !form.idCiudad || !form.idIglesia || !form.idPais || !form.idDepartamento} className="rounded-full px-5 bg-[#4682b4] hover:bg-[#4682b4]/90 shadow-blue-900/20 w-full sm:w-auto"><Save className="w-4 h-4 mr-1.5" /> Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Asignar Pastor a Sede */}
      <Dialog open={dialogPastor} onOpenChange={setDialogPastor}>
        <DialogContent className="sm:max-w-lg rounded-3xl bg-card/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Asignar Pastor a Sede
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Cada sede debe tener un pastor asignado para su funcionamiento.
            </p>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* Selector de pastor existente o crear nuevo */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-white/50 dark:bg-black/10">
                <input
                  type="radio"
                  id="pastor-existente"
                  name="tipo-pastor"
                  checked={!pastorForm.crearNuevoPastor}
                  onChange={() => setPastorForm(f => ({ ...f, crearNuevoPastor: false }))}
                  className="rounded border-border text-[#4682b4] focus:ring-[#4682b4]/30"
                />
                <label htmlFor="pastor-existente" className="text-sm font-medium cursor-pointer">
                  Seleccionar pastor existente
                </label>
              </div>

              {!pastorForm.crearNuevoPastor && (
                <div>
                  <Select value={pastorForm.idPastor ? String(pastorForm.idPastor) : ""} onValueChange={v => setPastorForm(f => ({ ...f, idPastor: Number(v) }))}>
                    <SelectTrigger className="bg-input-background focus:ring-[#4682b4]/30">
                      <SelectValue placeholder="Seleccionar Pastor" />
                    </SelectTrigger>
                    <SelectContent>
                      {pastores.map(p => (
                        <SelectItem key={p.idPastor} value={String(p.idPastor)}>
                          {p.nombres} {p.apellidos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-white/50 dark:bg-black/10">
                <input
                  type="radio"
                  id="pastor-nuevo"
                  name="tipo-pastor"
                  checked={pastorForm.crearNuevoPastor}
                  onChange={() => setPastorForm(f => ({ ...f, crearNuevoPastor: true, idPastor: 0 }))}
                  className="rounded border-border text-[#4682b4] focus:ring-[#4682b4]/30"
                />
                <label htmlFor="pastor-nuevo" className="text-sm font-medium cursor-pointer">
                  Crear nuevo pastor
                </label>
              </div>

              {pastorForm.crearNuevoPastor && (
                <div className="space-y-3 p-4 rounded-xl border border-dashed border-[#4682b4]/30 bg-[#4682b4]/5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Nombres *</label>
                      <Input
                        value={pastorForm.nuevoPastor.nombres}
                        onChange={(e) => setPastorForm(f => ({ ...f, nuevoPastor: { ...f.nuevoPastor, nombres: e.target.value } }))}
                        placeholder="Juan Carlos"
                        className="bg-input-background focus-visible:ring-[#4682b4]/30"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Apellidos *</label>
                      <Input
                        value={pastorForm.nuevoPastor.apellidos}
                        onChange={(e) => setPastorForm(f => ({ ...f, nuevoPastor: { ...f.nuevoPastor, apellidos: e.target.value } }))}
                        placeholder="Pérez García"
                        className="bg-input-background focus-visible:ring-[#4682b4]/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Correo Electrónico *</label>
                    <Input
                      type="email"
                      value={pastorForm.nuevoPastor.correo}
                      onChange={(e) => setPastorForm(f => ({ ...f, nuevoPastor: { ...f.nuevoPastor, correo: e.target.value } }))}
                      placeholder="pastor@email.com"
                      className="bg-input-background focus-visible:ring-[#4682b4]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Teléfono</label>
                    <Input
                      value={pastorForm.nuevoPastor.telefono}
                      onChange={(e) => setPastorForm(f => ({ ...f, nuevoPastor: { ...f.nuevoPastor, telefono: e.target.value } }))}
                      placeholder="+57 300 123 4567"
                      className="bg-input-background focus-visible:ring-[#4682b4]/30"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Configuración de asignación */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Fecha Inicio *</label>
                <Input
                  type="date"
                  value={pastorForm.fechaInicio}
                  onChange={(e) => setPastorForm(f => ({ ...f, fechaInicio: e.target.value }))}
                  className="bg-input-background focus-visible:ring-[#4682b4]/30"
                />
              </div>
              <div className="flex flex-col justify-end pb-2">
                <div className="flex items-center gap-2.5 p-2 rounded-xl border border-border/50 bg-white/50 dark:bg-black/10">
                  <input
                    type="checkbox"
                    id="es-principal-sede"
                    checked={pastorForm.esPrincipal}
                    onChange={(e) => setPastorForm(f => ({ ...f, esPrincipal: e.target.checked }))}
                    className="rounded border-border text-[#4682b4] focus:ring-[#4682b4]/30 w-4 h-4"
                  />
                  <label htmlFor="es-principal-sede" className="text-xs font-semibold text-foreground/80 cursor-pointer">
                    Pastor Principal de la Sede
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">Observaciones</label>
              <textarea
                value={pastorForm.observaciones}
                onChange={(e) => setPastorForm(f => ({ ...f, observaciones: e.target.value }))}
                placeholder="Notas adicionales sobre la asignación..."
                className="w-full h-20 rounded-xl border border-white/10 bg-background/50 p-4 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-[#4682b4]/20 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-white/10 pt-4">
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={() => {
                setDialogPastor(false);
                setPastorForm({
                  idSede: 0,
                  idPastor: 0,
                  esPrincipal: true,
                  fechaInicio: new Date().toISOString().split('T')[0],
                  observaciones: "",
                  crearNuevoPastor: false,
                  nuevoPastor: { nombres: "", apellidos: "", correo: "", telefono: "" }
                });
              }}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl px-8"
              onClick={handleAsignarPastor}
              disabled={createPastorMutation.isPending || createSedePastorMutation.isPending}
            >
              {createPastorMutation.isPending || createSedePastorMutation.isPending ? 'Asignando...' : 'Asignar Pastor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
