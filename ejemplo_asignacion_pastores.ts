// 📚 EJEMPLO COMPLETO: Sistema de Asignación de Pastores
// Demostración del flujo Super Admin vs Admin Iglesia

// =====================================================
// ESCENARIO 1: SUPER ADMIN - ASIGNACIÓN DIRECTA
// =====================================================

// El Super Admin puede hacer asignaciones directamente desde la interfaz
// Ruta: /app/pastores → Pestaña "Asignaciones" → "Nueva Asignación"

const asignacionDirecta = {
  idPastor: 5,        // Pastor Juan Pérez
  idIglesia: 2,       // Iglesia "Comunidad Central"
  esPrincipal: true,  // Pastor Principal
  fechaInicio: "2024-01-15",
  observaciones: "Asignación permanente como pastor principal"
};

// Función que ejecuta el Super Admin
async function asignarPastorDirectamente() {
  const { data, error } = await supabase
    .from('iglesia_pastor')
    .insert({
      id_pastor: asignacionDirecta.idPastor,
      id_iglesia: asignacionDirecta.idIglesia,
      es_principal: asignacionDirecta.esPrincipal,
      fecha_inicio: asignacionDirecta.fechaInicio,
      fecha_fin: null,
      observaciones: asignacionDirecta.observaciones
    })
    .select()
    .single();

  if (error) throw error;

  console.log('✅ Pastor asignado directamente por Super Admin');
  return data;
}

// =====================================================
// ESCENARIO 2: ADMIN IGLESIA - SOLICITUD MEDIANTE NOTIFICACIÓN
// =====================================================

// El Admin de Iglesia solicita asignación al Super Admin
// Ruta: /app/pastores → Pestaña "Asignaciones" → "Solicitar Asignación"

const solicitudAsignacion = {
  idPastor: 7,        // Pastor María González
  idIglesia: 3,       // Iglesia "Renacer Cristiano"
  esPrincipal: false, // Pastor regular
  motivo: "Necesitamos un pastor adicional debido al crecimiento de la congregación. " +
          "La iglesia ha aumentado un 40% en los últimos 6 meses y requerimos apoyo pastoral adicional. " +
          "El pastor González tiene experiencia en ministerios juveniles que necesitamos urgentemente."
};

// Función que ejecuta el Admin de Iglesia
async function solicitarAsignacionPastor() {
  // 1. Buscar Super Admins
  const { data: superAdmins, error: errorAdmins } = await supabase
    .from('usuario_rol')
    .select('id_usuario')
    .eq('id_rol', 1); // Rol Super Admin

  if (errorAdmins) throw errorAdmins;

  // 2. Obtener datos del pastor e iglesia para el mensaje
  const { data: pastor } = await supabase
    .from('pastor')
    .select('nombres, apellidos')
    .eq('id_pastor', solicitudAsignacion.idPastor)
    .single();

  const { data: iglesia } = await supabase
    .from('iglesia')
    .select('nombre')
    .eq('id_iglesia', solicitudAsignacion.idIglesia)
    .single();

  // 3. Obtener datos del admin solicitante (desde contexto de autenticación)
  const adminActual = {
    nombres: "Carlos",
    apellidos: "Rodríguez"
  };

  // 4. Crear notificaciones para todos los Super Admins
  const notificaciones = superAdmins.map(admin => ({
    titulo: `Solicitud de asignación pastoral`,
    mensaje: `El administrador ${adminActual.nombres} ${adminActual.apellidos} solicita asignar al pastor ${pastor.nombres} ${pastor.apellidos} como ${solicitudAsignacion.esPrincipal ? 'pastor principal' : 'pastor'} de la iglesia ${iglesia.nombre}.

Motivo: ${solicitudAsignacion.motivo}

Por favor, revise y apruebe esta solicitud desde la página de gestión de pastores.`,
    tipo: "tarea",
    idUsuario: admin.id_usuario
  }));

  // 5. Enviar todas las notificaciones
  const notificacionesPromises = notificaciones.map(notif =>
    supabase
      .from('notificacion')
      .insert({
        titulo: notif.titulo,
        mensaje: notif.mensaje,
        tipo: notif.tipo,
        id_usuario: notif.idUsuario,
        leida: false
      })
  );

  const results = await Promise.all(notificacionesPromises);

  console.log('✅ Solicitud enviada a', superAdmins.length, 'Super Admins');
  return results;
}

// =====================================================
// ESCENARIO 3: SUPER ADMIN APRUEBA SOLICITUD
// =====================================================

// El Super Admin recibe la notificación y aprueba la solicitud
// Ruta: Dashboard → Notificaciones → Revisar solicitud

async function aprobarSolicitudAsignacion() {
  // El Super Admin ejecuta la asignación después de revisar la solicitud
  const { data, error } = await supabase
    .from('iglesia_pastor')
    .insert({
      id_pastor: solicitudAsignacion.idPastor,
      id_iglesia: solicitudAsignacion.idIglesia,
      es_principal: solicitudAsignacion.esPrincipal,
      fecha_inicio: new Date().toISOString().split('T')[0], // Fecha actual
      fecha_fin: null,
      observaciones: `Aprobado por Super Admin. ${solicitudAsignacion.motivo}`
    })
    .select()
    .single();

  if (error) throw error;

  console.log('✅ Solicitud aprobada - Pastor asignado por Super Admin');
  return data;
}

// =====================================================
// VERIFICACIÓN DE ASIGNACIONES ACTIVAS
// =====================================================

async function verificarAsignacionesActivas() {
  const { data, error } = await supabase
    .from('iglesia_pastor')
    .select(`
      *,
      pastor(nombres, apellidos, correo),
      iglesia(nombre)
    `)
    .is('fecha_fin', null) // Solo asignaciones activas
    .order('fecha_inicio', { ascending: false });

  if (error) throw error;

  console.log('📋 Asignaciones pastorales activas:');
  data.forEach(asignacion => {
    console.log(`- ${asignacion.pastor.nombres} ${asignacion.pastor.apellidos} → ${asignacion.iglesia.nombre} (${asignacion.es_principal ? 'Principal' : 'Regular'})`);
  });

  return data;
}

// =====================================================
// EJECUCIÓN DEL EJEMPLO COMPLETO
// =====================================================

async function demostrarSistemaAsignacionPastores() {
  try {
    console.log('🏛️ DEMOSTRACIÓN: Sistema de Asignación de Pastores\n');

    // 1. Verificar estado inicial
    console.log('📊 Estado inicial:');
    await verificarAsignacionesActivas();

    // 2. Super Admin hace asignación directa
    console.log('\n👑 Escenario 1: Super Admin asigna pastor directamente');
    await asignarPastorDirectamente();

    // 3. Admin Iglesia solicita asignación
    console.log('\n👤 Escenario 2: Admin Iglesia solicita asignación');
    await solicitarAsignacionPastor();

    // 4. Super Admin aprueba solicitud
    console.log('\n✅ Escenario 3: Super Admin aprueba solicitud');
    await aprobarSolicitudAsignacion();

    // 5. Verificar estado final
    console.log('\n📊 Estado final:');
    await verificarAsignacionesActivas();

    console.log('\n🎉 Sistema de asignación de pastores funcionando correctamente!');

  } catch (error) {
    console.error('❌ Error en la demostración:', error);
  }
}

// Ejecutar demostración
// demostrarSistemaAsignacionPastores();