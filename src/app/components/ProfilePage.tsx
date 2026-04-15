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
  super_admin: "from-red-500 to-orange-500",
  admin_iglesia: "from-indigo-500 to-blue-500",
  lider: "from-amber-500 to-yellow-500",
  servidor: "from-cyan-500 to-sky-500",
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
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className={`h-24 bg-gradient-to-r ${gradient} relative`}>
            <div className="absolute inset-0 bg-black/10" />
          </div>
          <div className="px-6 pb-5 -mt-10 relative">
            <div className="flex items-end gap-4">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-2xl border-4 border-card shadow-xl`}>
                {initials}
              </div>
              <div className="flex-1 pb-1">
                <h1 className="text-xl">{fullName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="default" className="text-xs">{roleLabels[rol]}</Badge>
                  <span className="text-xs text-muted-foreground">{usuarioActual.correo}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil"><User className="w-4 h-4 mr-1.5" /> Perfil</TabsTrigger>
          <TabsTrigger value="seguridad"><Lock className="w-4 h-4 mr-1.5" /> Seguridad</TabsTrigger>
          <TabsTrigger value="iglesias"><Building2 className="w-4 h-4 mr-1.5" /> Mis Iglesias</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 mt-4 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-primary" />
                <h3>Informacion Personal</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Nombres</label>
                  <Input value={nombres} onChange={(e) => setNombres(e.target.value)} className="bg-input-background h-11" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Apellidos</label>
                  <Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} className="bg-input-background h-11" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Correo electronico
                </label>
                <Input value={usuarioActual.correo} disabled className="bg-muted h-11" />
                <p className="text-xs text-muted-foreground mt-1.5">El correo no puede modificarse</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Telefono
                </label>
                <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="bg-input-background h-11" placeholder="+502 5555-0000" />
              </div>
              <div className="pt-2 flex gap-3">
                <Button className="h-10" onClick={handleSaveProfile} disabled={updateUsuarioMutation.isPending}>
                  {updateUsuarioMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar Cambios
                </Button>
                <Button variant="outline" className="h-10" onClick={() => logout()}>
                  Cerrar Sesion
                </Button>
              </div>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="seguridad">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 mt-4 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-primary" />
                <h3>Cambiar Contrasena</h3>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Nueva contrasena</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10 bg-input-background h-11"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Confirmar nueva contrasena</label>
                <Input
                  type="password"
                  placeholder="Repite la nueva contrasena"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-input-background h-11"
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
              )}
              <div className="pt-2">
                <Button className="h-10" onClick={handleChangePassword} disabled={changingPassword || !newPassword || !confirmPassword}>
                  {changingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                  Actualizar Contrasena
                </Button>
              </div>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="iglesias">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h3>Mis Iglesias</h3>
              </div>
              <p className="text-sm text-muted-foreground">Selecciona la iglesia activa para tu sesion actual.</p>
              <div className="space-y-2">
                {iglesiasDelUsuario.map((ig) => {
                  const isActive = ig.id === iglesiaActual?.id;
                  return (
                    <div
                      key={ig.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                          : "border-transparent bg-accent/30 hover:bg-accent/50 hover:border-border"
                      }`}
                      onClick={() => setIglesiaActual(ig)}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        isActive ? "bg-primary text-white shadow-md" : "bg-primary/10 text-primary"
                      }`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{ig.nombre}</p>
                      </div>
                      {isActive && (
                        <Badge variant="default" className="text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Activa
                        </Badge>
                      )}
                    </div>
                  );
                })}
                {iglesiasDelUsuario.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No hay iglesias disponibles</p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-primary" />
                <h3>Roles y Permisos</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-3 rounded-xl bg-accent/30">
                  <span className="text-muted-foreground">Rol actual</span>
                  <Badge variant="secondary">{roleLabels[rol]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Los roles se asignan por iglesia y sede a traves de la tabla UsuarioRol.
                </p>
              </div>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
