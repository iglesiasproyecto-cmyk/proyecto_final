import { useState } from "react";
import { useApp } from "../store/AppContext";
import { useUpdateUsuario } from "@/hooks/useUsuarios";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { motion } from "motion/react";
import { toast } from "sonner";
import { User, Mail, Phone, Lock, Building2, Shield, Save, Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";

const roleLabels: Record<string, string> = {
  super_admin: "Super Administrador",
  admin_iglesia: "Administrador de Iglesia",
  lider: "Lider de Ministerio",
  servidor: "Servidor",
};

const roleGradients: Record<string, string> = {
  super_admin:   "from-slate-400 to-slate-600",
  admin_iglesia: "from-slate-400 to-slate-600",
  lider:         "from-slate-400 to-slate-600",
  servidor:      "from-slate-400 to-slate-600",
};

export function ProfilePage() {
  const { usuarioActual, logout, rolActual, iglesiaActual, setIglesiaActual, iglesiasDelUsuario } = useApp();
  const updateUsuarioMutation = useUpdateUsuario();

  // Profile form state
  const [nombres, setNombres] = useState(usuarioActual?.nombres ?? "");
  const [apellidos, setApellidos] = useState(usuarioActual?.apellidos ?? "");
  const [telefono, setTelefono] = useState(usuarioActual?.telefono ?? "");

  // Password form state
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  if (!usuarioActual) return null;
  const fullName = `${usuarioActual.nombres} ${usuarioActual.apellidos}`;
  const initials = `${usuarioActual.nombres.charAt(0)}${usuarioActual.apellidos.charAt(0)}`;
  const rol = rolActual;
  const gradient = roleGradients[rol] || "from-gray-500 to-gray-600";

  const handleSaveProfile = () => {
    updateUsuarioMutation.mutate(
      { id: usuarioActual.idUsuario, data: { nombres, apellidos, telefono: telefono || null } },
      {
        onSuccess: () => toast.success("Perfil actualizado correctamente"),
        onError: (err) => toast.error(`Error al guardar: ${err.message}`),
      }
    );
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Contraseña actualizada correctamente");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="p-8 rounded-3xl bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${gradient} rounded-full blur-[100px] opacity-20 -mr-10 -mt-10 pointer-events-none`} />
          <div className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${gradient} p-[2px] shadow-lg shrink-0`}>
             <div className="w-full h-full rounded-[22px] bg-card flex items-center justify-center text-4xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/50">
               {initials}
             </div>
          </div>
          <div className="flex-1 pb-1 z-10 text-center sm:text-left mt-2 sm:mt-0">
            <h1 className="text-3xl font-light tracking-tight text-foreground">{fullName}</h1>
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-3">
              <Badge variant="outline" className="px-3 py-1 border-0 bg-muted/50 text-foreground uppercase tracking-widest font-bold text-[10px]">{roleLabels[rol]}</Badge>
              <span className="text-[13px] font-medium text-muted-foreground flex items-center gap-1.5"><Mail className="w-4 h-4" /> {usuarioActual.correo}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="perfil" className="mt-8">
        <TabsList className="bg-card/40 backdrop-blur-xl border border-white/10 p-1.5 h-auto rounded-2xl w-full sm:w-auto inline-flex shadow-xl shadow-black/5 flex-wrap gap-1">
          <TabsTrigger value="perfil" className="rounded-xl px-5 py-2.5 text-[11px] font-semibold tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"><User className="w-4 h-4 mr-2" /> Perfil</TabsTrigger>
          <TabsTrigger value="seguridad" className="rounded-xl px-5 py-2.5 text-[11px] font-semibold tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"><Lock className="w-4 h-4 mr-2" /> Seguridad</TabsTrigger>
          <TabsTrigger value="iglesias" className="rounded-xl px-5 py-2.5 text-[11px] font-semibold tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"><Building2 className="w-4 h-4 mr-2" /> Mis Iglesias</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="p-8 rounded-3xl bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-xl mt-6 space-y-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center shadow-inner"><User className="w-5 h-5 text-slate-500" /></div>
                <h3 className="text-lg font-bold tracking-tight text-foreground/90">Información Personal</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Nombres</label>
                  <Input value={nombres} onChange={(e) => setNombres(e.target.value)} className="bg-card/30 border-white/10 h-12 rounded-xl text-[13px] px-4 focus-visible:ring-slate-500/30" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Apellidos</label>
                  <Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} className="bg-card/30 border-white/10 h-12 rounded-xl text-[13px] px-4 focus-visible:ring-slate-500/30" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Correo electrónico
                </label>
                <Input value={usuarioActual.correo} disabled className="bg-muted/50 border-0 h-12 rounded-xl text-[13px] px-4 text-muted-foreground" />
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 px-1 mt-1">El correo no puede modificarse</p>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Teléfono
                </label>
                <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="bg-card/30 border-white/10 h-12 rounded-xl text-[13px] px-4 focus-visible:ring-slate-500/30" placeholder="+502 5555-0000" />
              </div>
              <div className="pt-6 mt-4 border-t border-white/5 flex gap-3">
                <Button className="h-11 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white shadow-lg transition-all" onClick={handleSaveProfile} disabled={updateUsuarioMutation.isPending}>
                  {updateUsuarioMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar Cambios
                </Button>
                <Button variant="outline" className="h-11 px-6 rounded-xl border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all font-semibold" onClick={() => logout()}>
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="seguridad">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="p-8 rounded-3xl bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-xl mt-6 space-y-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center shadow-inner"><Lock className="w-5 h-5 text-slate-500" /></div>
                <h3 className="text-lg font-bold tracking-tight text-foreground/90">Cambiar Contraseña</h3>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1 block">Nueva contraseña</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10 bg-card/30 border-white/10 h-12 rounded-xl text-[13px] px-4 focus-visible:ring-slate-500/30"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-slate-500/10 hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1 block">Confirmar nueva contraseña</label>
                  <Input
                    type="password"
                    placeholder="Repite la nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-card/30 border-white/10 h-12 rounded-xl text-[13px] px-4 focus-visible:ring-slate-500/30"
                  />
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mt-2 px-1">Las contraseñas no coinciden</p>
                  )}
                </div>
              </div>
              <div className="pt-6 mt-4 border-t border-white/5">
                <Button className="h-11 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white shadow-lg transition-all disabled:opacity-100 disabled:cursor-not-allowed" onClick={handleChangePassword} disabled={changingPassword || !newPassword || !confirmPassword}>
                  {changingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                  Actualizar Contraseña
                </Button>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="iglesias">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="p-8 rounded-3xl bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center shadow-inner"><Building2 className="w-5 h-5 text-slate-500" /></div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground/90">Mis Iglesias</h3>
                </div>
                <p className="text-[12px] font-medium text-muted-foreground mb-4">Selecciona la iglesia activa para tu sesión actual.</p>
                <div className="space-y-3">
                  {iglesiasDelUsuario.map((ig) => {
                    const isActive = ig.id === iglesiaActual?.id;
                    return (
                      <div
                        key={ig.id}
                        className={`group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                          isActive
                            ? "bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800 shadow-md shadow-cyan-500/20 transform scale-[1.02]"
                            : "bg-card/20 border border-white/5 hover:bg-slate-500/5 hover:border-slate-500/20"
                        }`}
                        onClick={() => setIglesiaActual(ig)}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-inner transition-colors ${
                          isActive ? "bg-gradient-to-br from-cyan-600 to-blue-700 text-white" : "bg-card text-muted-foreground group-hover:text-slate-500 group-hover:scale-110 transition-transform"
                        }`}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[14px] truncate ${isActive ? "font-bold text-foreground" : "font-semibold text-foreground/80 group-hover:text-foreground"}`}>{ig.nombre}</p>
                        </div>
                        {isActive && (
                          <Badge variant="outline" className="text-[9px] uppercase tracking-widest flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 py-0.5 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" /> Activa
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                  {iglesiasDelUsuario.length === 0 && (
                    <p className="text-[12px] font-medium text-muted-foreground text-center py-6 bg-card/20 rounded-2xl border border-white/5">No hay iglesias disponibles</p>
                  )}
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-xl h-fit">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center shadow-inner"><Shield className="w-5 h-5 text-slate-500" /></div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground/90">Roles y Permisos</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="flex flex-col gap-2 p-5 rounded-2xl bg-card/30 border border-white/5 shadow-sm">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Rol activo actual</span>
                    <Badge variant="outline" className="w-fit text-[11px] font-bold tracking-wider px-3 py-1 bg-slate-500/10 text-foreground border-slate-500/20">{roleLabels[rol]}</Badge>
                  </div>
                  <p className="text-[12px] font-medium text-muted-foreground leading-relaxed px-1">
                    Los roles se asignan por iglesia y sede a través de la configuración de roles del sistema. Tu nivel de acceso depende de la iglesia seleccionada.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
