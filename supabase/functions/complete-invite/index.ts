import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const baseCorsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: baseCorsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: baseCorsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { token, password } = await req.json()

    if (!token || !password) {
      return new Response(JSON.stringify({ error: 'Token y contraseña requeridos' }), {
        status: 400,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validar token
    const { data: inviteToken, error: tokenError } = await supabaseAdmin
      .from('invite_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !inviteToken) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 400,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Crear usuario en auth.users
    const { data: authUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: inviteToken.email,
      password: password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        nombres: inviteToken.nombres,
        apellidos: inviteToken.apellidos,
      },
    })

    if (signUpError || !authUser.user) {
      console.error('Error creating auth user:', signUpError)
      return new Response(JSON.stringify({ error: 'Error creando usuario de autenticación' }), {
        status: 500,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Insertar en tabla usuario
    const { data: usuario, error: usuarioError } = await supabaseAdmin
      .from('usuario')
      .insert({
        auth_user_id: authUser.user.id,
        nombres: inviteToken.nombres,
        apellidos: inviteToken.apellidos,
        correo: inviteToken.email,
        activo: true,
      })
      .select('id_usuario')
      .single()

    if (usuarioError || !usuario) {
      console.error('Error creating usuario:', usuarioError)
      // Limpiar auth user si falló
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return new Response(JSON.stringify({ error: 'Error creando perfil de usuario' }), {
        status: 500,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Asignar rol e insertar en miembro_ministerio si aplica (atómico via RPC)
    const { error: rolError } = await supabaseAdmin.rpc('assign_role_with_ministerio', {
      p_id_usuario:    usuario.id_usuario,
      p_id_rol:        inviteToken.id_rol,
      p_id_iglesia:    inviteToken.id_iglesia,
      p_id_sede:       inviteToken.id_sede ?? null,
      p_id_ministerio: inviteToken.id_ministerio ?? null,
    })

    if (rolError) {
      console.error('Error assigning role:', rolError)
      // Limpiar si falló
      await supabaseAdmin.from('usuario').delete().eq('id_usuario', usuario.id_usuario)
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return new Response(JSON.stringify({ error: 'Error asignando rol' }), {
        status: 500,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Marcar token como usado
    const { error: updateTokenError } = await supabaseAdmin
      .from('invite_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id_invite_token', inviteToken.id_invite_token)

    if (updateTokenError) {
      console.warn('Error marking token as used:', updateTokenError)
      // No fallar por esto
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Usuario creado exitosamente',
      userId: usuario.id_usuario,
    }), {
      status: 200,
      headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error completing invite:', error)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
    })
  }
})