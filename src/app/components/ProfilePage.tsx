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
import { User, Mail, Phone, Lock, Building2, Shield, Save, Eye, EyeOff, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

const roleLabels: Record<string, string> = {
  super_admin: "Super Administrador",
  admin_iglesia: "Administrador de Iglesia",
  lider: "Lider de Ministerio",
  servidor: "Servidor",
};

const roleGradients: Record<string, string> = {
  super_admin:   "from-[#709dbd] to-[#4682b4]",
  admin_iglesia: "from-[#709dbd] to-[#4682b4]",
  lider:         "from-[#709dbd] to-[#4682b4]",
  servidor:      "from-[#709dbd] to-[#4682b4]",
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
    <div className="space-y-8 max-w-5xl mx-auto pb-10 px-4">
      {/* Profile Header — Premium Look */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative">
        <div className="p-8 md:p-12 rounded-[50px] bg-card/30 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-[0_32px_64px_rgba(8,112,184,0.15)] flex flex-col md:flex-row items-center md:items-center gap-10 relative overflow-hidden group">
          {/* Enhanced decorative gradients */}
          <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br ${gradient} rounded-full blur-[140px] opacity-25 -mr-40 -mt-40 pointer-events-none group-hover:opacity-40 transition-opacity duration-1000 animate-pulse`} />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#4682b4]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-white/5 dark:bg-black/5 pointer-events-none" />
          
          {/* Avatar Area with Floating Effect */}
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 2 }}
            className="relative shrink-0"
          >
             <div className={`w-40 h-40 rounded-[45px] bg-gradient-to-br ${gradient} p-1 shadow-3xl shadow-blue-900/30`}>
                <div className="w-full h-full rounded-[41px] bg-[#1a2a3d] flex items-center justify-center text-6xl font-black tracking-tighter">
                   <span className={`bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/60`}>
                    {initials}
                   </span>
                </div>
             </div>
             <motion.div 
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               delay={0.5}
               className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-[#1a2a3d] flex items-center justify-center shadow-xl shadow-emerald-500/20"
             >
                <CheckCircle2 className="w-5 h-5 text-white" />
             </motion.div>
          </motion.div>

          <div className="flex-1 z-10 text-center md:text-left space-y-4">
            <div>
              <p className="text-[#4682b4] font-black uppercase tracking-[0.4em] text-[11px] mb-3 opacity-90">Expediente de Usuario</p>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground uppercase italic leading-[0.9] drop-shadow-sm">{fullName}</h1>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 pt-4">
              <Badge className={`px-6 py-2 border-0 bg-gradient-to-r ${gradient} text-white uppercase tracking-[0.2em] font-black text-[11px] rounded-full shadow-2xl shadow-blue-900/40 hover:scale-105 transition-transform`}>
                {roleLabels[rol]}
              </Badge>
              <div className="flex items-center gap-3 text-[14px] font-bold text-foreground/70 bg-white/5 dark:bg-black/20 py-2 px-6 rounded-full border border-white/10 backdrop-blur-xl shadow-inner">
                <Mail className="w-4 h-4 text-[#4682b4]" /> {usuarioActual.correo}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="perfil" className="w-full mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4">
            <TabsList className="bg-card/40 backdrop-blur-2xl border border-white/10 p-2 h-auto rounded-[32px] w-full flex flex-col shadow-2xl shadow-black/5 gap-2">
              <TabsTrigger value="perfil" className="w-full justify-start rounded-2xl px-6 py-4 text-[12px] font-black tracking-widest uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#709dbd] data-[state=active]:to-[#4682b4] data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-900/20 transition-all duration-300">
                <User className="w-4 h-4 mr-3" /> Información
              </TabsTrigger>
              <TabsTrigger value="seguridad" className="w-full justify-start rounded-2xl px-6 py-4 text-[12px] font-black tracking-widest uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#709dbd] data-[state=active]:to-[#4682b4] data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-900/20 transition-all duration-300">
                <Lock className="w-4 h-4 mr-3" /> Seguridad
              </TabsTrigger>
              <TabsTrigger value="iglesias" className="w-full justify-start rounded-2xl px-6 py-4 text-[12px] font-black tracking-widest uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#709dbd] data-[state=active]:to-[#4682b4] data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-900/20 transition-all duration-300">
                <Building2 className="w-4 h-4 mr-3" /> Mi Iglesia
              </TabsTrigger>
              <div className="pt-4 mt-2 border-t border-white/5 px-2">
                <Button variant="ghost" className="w-full justify-start h-14 rounded-2xl px-4 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 font-black text-[12px] uppercase tracking-widest transition-all" onClick={() => logout()}>
                  <EyeOff className="w-4 h-4 mr-3" /> Finalizar Sesión
                </Button>
              </div>
            </TabsList>
          </div>

          <div className="lg:col-span-8">
            <TabsContent value="perfil" className="mt-0">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="p-10 rounded-[40px] bg-card/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-2xl space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#4682b4]/5 rounded-full blur-[80px] pointer-events-none" />
                  
                  <div className="flex items-center gap-4 mb-2 pb-6 border-b border-white/10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg text-white group-hover:scale-110 transition-transform"><User className="w-6 h-6" /></div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-foreground/90 uppercase italic">Mis Datos</h3>
                      <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">Información de contacto y personal</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#4682b4] px-1">Nombres del Usuario</label>
                      <Input value={nombres} onChange={(e) => setNombres(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl text-[14px] px-5 focus-visible:ring-[#4682b4]/30 font-bold" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#4682b4] px-1">Apellidos Paternos</label>
                      <Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl text-[14px] px-5 focus-visible:ring-[#4682b4]/30 font-bold" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#4682b4] px-1 flex items-center gap-2">
                      <Mail className="w-4 h-4" /> E-mail Institucional
                    </label>
                    <div className="relative group">
                      <Input value={usuarioActual.correo} disabled className="bg-muted/10 border-white/5 h-14 rounded-2xl text-[14px] px-5 text-muted-foreground/60 italic" />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                         <Shield className="w-4 h-4 text-muted-foreground/20" />
                      </div>
                    </div>
                    <p className="text-[10px] font-black tracking-widest text-muted-foreground/40 px-1 uppercase leading-none">Protección de identidad: El correo es gestionado por el administrador.</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#4682b4] px-1 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Móvil de Contacto
                    </label>
                    <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl text-[14px] px-5 focus-visible:ring-[#4682b4]/30 font-bold" placeholder="+502 5555-0000" />
                  </div>

                  <div className="pt-8 border-t border-white/10">
                    <Button className="h-14 w-full md:w-auto px-10 rounded-2xl bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white font-black uppercase tracking-widest shadow-2xl shadow-blue-900/30 transition-all hover:-translate-y-1" onClick={handleSaveProfile} disabled={updateUsuarioMutation.isPending}>
                      {updateUsuarioMutation.isPending ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Save className="w-5 h-5 mr-3" />}
                      Guardar Perfil
                    </Button>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="seguridad" className="mt-0">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="p-10 rounded-[40px] bg-card/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-2xl space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#4682b4]/5 rounded-full blur-[80px] pointer-events-none" />
                  
                  <div className="flex items-center gap-4 mb-2 pb-6 border-b border-white/10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg text-white group-hover:scale-110 transition-transform"><Lock className="w-6 h-6" /></div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-foreground/90 uppercase italic">Protección</h3>
                      <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">Gestión de llaves de acceso</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#4682b4] px-1 block">Nueva Clave Maestra</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 8 caracteres alfanuméricos"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pr-14 bg-white/5 border-white/10 h-14 rounded-2xl text-[14px] px-5 focus-visible:ring-[#4682b4]/30 font-bold"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-white/10 hover:text-[#4682b4] transition-all">
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#4682b4] px-1 block">Validar Nueva Clave</label>
                      <Input
                        type="password"
                        placeholder="Debe coincidir exactamente"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-white/5 border-white/10 h-14 rounded-2xl text-[14px] px-5 focus-visible:ring-[#4682b4]/30 font-bold"
                      />
                      {newPassword && confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mt-3 px-1 flex items-center gap-2">
                           <AlertTriangle className="w-3 h-3" /> Error: Las claves no coinciden
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/10">
                    <Button className="h-14 w-full md:w-auto px-10 rounded-2xl bg-gradient-to-r from-[#709dbd] to-[#4682b4] hover:from-[#5b84a1] hover:to-[#3b6d96] text-white font-black uppercase tracking-widest shadow-2xl shadow-blue-900/30 transition-all hover:-translate-y-1" onClick={handleChangePassword} disabled={changingPassword || !newPassword || !confirmPassword}>
                      {changingPassword ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Shield className="w-5 h-5 mr-3" />}
                      Blindar Acceso
                    </Button>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="iglesias" className="mt-0">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="p-10 rounded-[40px] bg-card/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#4682b4]/5 rounded-full blur-[80px] pointer-events-none" />
                  
                  <div className="flex items-center gap-4 mb-2 pb-6 border-b border-white/10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#709dbd] to-[#4682b4] flex items-center justify-center shadow-lg text-white group-hover:scale-110 transition-transform"><Building2 className="w-6 h-6" /></div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-foreground/90 uppercase italic">Conexión</h3>
                      <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">Sedes y Ministerios Autorizados</p>
                    </div>
                  </div>

                  <div className="space-y-4 mt-6">
                    {iglesiasDelUsuario.map((ig) => {
                      const isActive = ig.id === iglesiaActual?.id;
                      return (
                        <div
                          key={ig.id}
                          className={`group flex items-center gap-5 p-5 rounded-3xl cursor-pointer transition-all duration-300 border ${
                            isActive
                              ? "bg-gradient-to-r from-[#709dbd]/10 to-[#4682b4]/5 border-[#4682b4]/40 shadow-blue-900/10"
                              : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                          }`}
                          onClick={() => setIglesiaActual(ig)}
                        >
                          <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center shadow-2xl transition-all duration-500 ${
                            isActive ? "bg-gradient-to-br from-[#709dbd] to-[#4682b4] text-white rotate-3" : "bg-card text-muted-foreground group-hover:scale-110"
                          }`}>
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[16px] truncate tracking-tight ${isActive ? "font-black text-foreground uppercase italic" : "font-bold text-foreground/70"}`}>{ig.nombre}</p>
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mt-1">{isActive ? "Conexión Activa" : "Click para conectar"}</p>
                          </div>
                          {isActive && (
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-8 rounded-[40px] bg-gradient-to-br from-[#709dbd] to-[#4682b4] border border-white/10 shadow-2xl text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-[60px] pointer-events-none -mr-20 -mt-20" />
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg"><Shield className="w-6 h-6 text-white" /></div>
                    <h3 className="text-xl font-black tracking-tight uppercase italic">Estatus</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                      <span className="text-[10px] uppercase font-black tracking-[0.25em] text-white/60 mb-2 block">Rango de Acceso Actual</span>
                      <Badge variant="outline" className="text-[12px] font-black tracking-wider px-4 py-1.5 bg-white/20 text-white border-white/30 rounded-full uppercase italic">{roleLabels[rol]}</Badge>
                    </div>
                    <p className="text-[12px] font-bold text-white/80 leading-relaxed italic pr-8">
                       Tu nivel de seguridad y privilegios son auditados en tiempo real según la congregación en la que estés sirviendo actualmente.
                    </p>
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
