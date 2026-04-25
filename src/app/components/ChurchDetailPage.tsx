import { useParams, useNavigate } from "react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { useIglesiaEnriquecidaById, useSedes, usePastoresPorIglesia, useAdminsPorIglesia, useSedePastores, useUpdateIglesia } from "@/hooks/useIglesias";
import { useApp } from "../store/AppContext";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Building2, ArrowLeft, MapPin, Calendar, Globe, Church,
  Users, Mail, Phone, MapPinned, Loader2, ShieldCheck
} from "lucide-react";

const estadoLabels: Record<string, string> = {
  activa: "Activa",
  inactiva: "Inactiva",
  fusionada: "Fusionada",
  cerrada: "Cerrada",
};

const estadoBadgeColors: Record<string, string> = {
  activa: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200",
  inactiva: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200",
  fusionada: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200",
  cerrada: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200",
};

const sedeEstadoLabels: Record<string, string> = {
  activa: "Activa",
  inactiva: "Inactiva",
  en_construccion: "En construcción",
};

export function ChurchDetailPage() {
  const { idIglesia } = useParams<{ idIglesia: string }>();
  const navigate = useNavigate();
  const { rolActual, iglesiaActual } = useApp();
  const id = Number(idIglesia);

  // Estado para edición
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    descripcion: "",
    telefono: "",
    email: "",
    sitio_web: "",
    direccion: ""
  });

  const { data: iglesia, isLoading: loadingIglesia } = useIglesiaEnriquecidaById(id);
  const { data: sedes = [], isLoading: loadingSedes } = useSedes(id);
  const { data: pastores = [], isLoading: loadingPastores } = usePastoresPorIglesia(id);
  const { data: admins = [], isLoading: loadingAdmins } = useAdminsPorIglesia(id);
  const { data: sedePastores = [], isLoading: loadingSedePastores } = useSedePastores();

  const updateIglesiaMutation = useUpdateIglesia();

  const isLoading = loadingIglesia || loadingSedes || loadingPastores || loadingAdmins || loadingSedePastores;

  // Verificar permisos de edición
  const canEditIglesia = rolActual === "super_admin" ||
    (rolActual === "admin_iglesia" && iglesiaActual?.id === id);

  // Funciones de edición
  const openEditDialog = () => {
    if (!iglesia) return;
    setEditForm({
      descripcion: iglesia.descripcion || "",
      telefono: iglesia.telefono || "",
      email: iglesia.email || "",
      sitio_web: iglesia.sitio_web || "",
      direccion: iglesia.direccion || ""
    });
    setEditDialog(true);
  };

  const handleSaveEdit = () => {
    updateIglesiaMutation.mutate(
      {
        id,
        data: editForm
      },
      {
        onSuccess: () => {
          setEditDialog(false);
          // Refrescar datos
          window.location.reload();
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm font-medium">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  if (!iglesia) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Building2 className="w-16 h-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold text-foreground">Iglesia no encontrada</h2>
        <p className="text-sm text-muted-foreground">La iglesia que buscas no existe o fue eliminada.</p>
        <Button onClick={() => navigate("/app/iglesias")} variant="outline" className="rounded-full">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver al listado
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/app/iglesias")}
          className="mb-4 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Volver al listado
        </Button>

        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <Building2 className="w-10 h-10 text-white" />
          </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold tracking-tight">{iglesia.nombre}</h1>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold tracking-wide ${estadoBadgeColors[iglesia.estado] ?? ""}`}
                >
                  {estadoLabels[iglesia.estado] ?? iglesia.estado}
                </Badge>
                {canEditIglesia && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openEditDialog}
                    className="h-7 px-3 text-xs border-[#4682b4]/30 text-[#4682b4] hover:bg-[#4682b4]/10"
                  >
                    ✏️ Editar Iglesia
                  </Button>
                )}
              </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary/70" />
                Ubicación no disponible
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary/70" />
                Fundación no disponible
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard icon={<Church className="w-5 h-5 text-blue-500" />} label="Sedes" value={sedes.length} />
        <StatCard icon={<Users className="w-5 h-5 text-emerald-500" />} label="Pastores" value={pastores.length} />
        <StatCard icon={<ShieldCheck className="w-5 h-5 text-purple-500" />} label="Admins" value={admins.length} />
        <StatCard icon={<Globe className="w-5 h-5 text-indigo-500" />} label="Estado" value={iglesia.estado} />
      </motion.div>

      {/* Sedes */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Church className="w-5 h-5 text-primary" /> Sedes
          </h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {sedes.length} {sedes.length === 1 ? "sede" : "sedes"}
          </span>
        </div>

        {sedes.length === 0 ? (
          <EmptyState message="No hay sedes registradas para esta iglesia." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sedes.map((sede, i) => (
              <motion.div
                key={sede.idSede}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                className="relative overflow-hidden rounded-2xl bg-card/40 backdrop-blur-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 transition-all hover:shadow-lg hover:bg-card/60"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#709dbd]/20 to-[#4682b4]/5 flex items-center justify-center border border-primary/10">
                      <Church className="w-5 h-5 text-primary/80" />
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${sede.estado === "activa" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : sede.estado === "en_construccion" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}
                    >
                      {sedeEstadoLabels[sede.estado] ?? sede.estado}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{sede.nombre}</h3>
                  {sede.direccion && (
                    <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {sede.direccion}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Administradores */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Administradores
          </h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {admins.length} {admins.length === 1 ? "admin" : "admins"}
          </span>
        </div>

        {admins.length === 0 ? (
          <EmptyState message="No hay administradores asignados a esta iglesia." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {admins.map((admin, i) => (
              <motion.div
                key={admin.idUsuario}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                className="relative overflow-hidden rounded-2xl bg-card/40 backdrop-blur-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 transition-all hover:shadow-lg hover:bg-card/60"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                      {admin.nombres.charAt(0)}{admin.apellidos.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{admin.nombres} {admin.apellidos}</h3>
                      <p className="text-xs text-muted-foreground">Administrador de Iglesia</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <a href={`mailto:${admin.correo}`} className="hover:text-primary transition-colors">{admin.correo}</a>
                    </p>
                    {admin.telefono && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <a href={`tel:${admin.telefono}`} className="hover:text-primary transition-colors">{admin.telefono}</a>
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                        Activo
                      </span>
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Pastores */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Pastores por Sede
          </h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {pastores.length} {pastores.length === 1 ? "pastor" : "pastores"}
          </span>
        </div>

        {sedes.length === 0 ? (
          <EmptyState message="No hay sedes en esta iglesia." />
        ) : (
          <div className="space-y-6">
            {sedes.map((sede, sedeIndex) => {
              // Filtrar pastores asignados a esta sede
              const pastoresDeSede = sedePastores
                .filter(sp => sp.idSede === sede.idSede && sp.fechaFin === null)
                .map(sp => pastores.find(p => p.idPastor === sp.idPastor))
                .filter(Boolean);

              return (
                <motion.div
                  key={sede.idSede}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 + sedeIndex * 0.1 }}
                  className="border border-border rounded-2xl p-6 bg-card/30"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center border border-primary/10">
                      <Church className="w-5 h-5 text-primary/80" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{sede.nombre}</h3>
                      <p className="text-sm text-muted-foreground">
                        {pastoresDeSede.length} {pastoresDeSede.length === 1 ? "pastor asignado" : "pastores asignados"}
                      </p>
                    </div>
                  </div>

                  {pastoresDeSede.length === 0 ? (
                    <EmptyState message={`No hay pastores asignados a la sede "${sede.nombre}".`} />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pastoresDeSede.map((pastor, i) => (
                        <motion.div
                          key={pastor!.idPastor}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                          className="relative overflow-hidden rounded-xl bg-card/40 backdrop-blur-2xl border border-white/20 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-4 transition-all hover:shadow-md hover:bg-card/60"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50 pointer-events-none" />
                          <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                {pastor!.nombres.charAt(0)}{pastor!.apellidos.charAt(0)}
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground text-sm">{pastor!.nombres} {pastor!.apellidos}</h3>
                                <p className="text-xs text-muted-foreground">Pastor</p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <Mail className="w-3 h-3 shrink-0" />
                                <a href={`mailto:${pastor!.correo}`} className="hover:text-primary transition-colors truncate">{pastor!.correo}</a>
                              </p>
                              {pastor!.telefono && (
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                  <Phone className="w-3 h-3 shrink-0" />
                                  <a href={`tel:${pastor!.telefono}`} className="hover:text-primary transition-colors">{pastor!.telefono}</a>
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card/40 backdrop-blur-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-4 transition-all hover:shadow-lg hover:bg-card/60">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50 pointer-events-none" />
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-white/5 flex items-center justify-center border border-white/30 dark:border-white/10">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </div>

      {/* Modal de edición de iglesia */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#4682b4]" />
              Editar Iglesia
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium text-foreground">{iglesia?.nombre}</p>
              <p className="text-xs text-muted-foreground">Modificando datos de la iglesia</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">
                  Descripción
                </label>
                <Textarea
                  value={editForm.descripcion}
                  onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Descripción de la iglesia..."
                  className="min-h-[80px] bg-input-background focus-visible:ring-[#4682b4]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">
                    Teléfono
                  </label>
                  <Input
                    value={editForm.telefono}
                    onChange={e => setEditForm(f => ({ ...f, telefono: e.target.value }))}
                    placeholder="+57 300 123 4567"
                    className="bg-input-background focus-visible:ring-[#4682b4]/30"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="contacto@iglesia.com"
                    className="bg-input-background focus-visible:ring-[#4682b4]/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">
                  Sitio Web
                </label>
                <Input
                  value={editForm.sitio_web}
                  onChange={e => setEditForm(f => ({ ...f, sitio_web: e.target.value }))}
                  placeholder="https://www.iglesia.com"
                  className="bg-input-background focus-visible:ring-[#4682b4]/30"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1.5 block">
                  Dirección Principal
                </label>
                <Input
                  value={editForm.direccion}
                  onChange={e => setEditForm(f => ({ ...f, direccion: e.target.value }))}
                  placeholder="Dirección de la iglesia..."
                  className="bg-input-background focus-visible:ring-[#4682b4]/30"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateIglesiaMutation.isPending}
                className="bg-[#4682b4] hover:bg-[#4682b4]/90"
              >
                {updateIglesiaMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-10 text-center rounded-2xl bg-card/30 border border-dashed border-border">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}