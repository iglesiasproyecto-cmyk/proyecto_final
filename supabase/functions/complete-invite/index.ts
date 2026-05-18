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

    const { token, password, telefono } = await req.json()

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

    // Buscar si ya existe el usuario en auth por email
    let authUserId: string
    const existingAuthUser = await (async () => {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (error) return null
      return data.users.find((u) => u.email?.toLowerCase() === inviteToken.email.toLowerCase()) ?? null
    })()

    if (existingAuthUser) {
      // Usuario ya existe en auth — actualizar contraseña y continuar
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAuthUser.id,
        { password, email_confirm: true }
      )
      if (updateError) {
        console.error('Error updating auth user:', updateError)
        return new Response(JSON.stringify({ error: 'Error actualizando contraseña del usuario' }), {
          status: 500,
          headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' },
        })
      }
      authUserId = existingAuthUser.id
    } else {
      // Crear nuevo usuario en auth.users
      const { data: authUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: inviteToken.email,
        password,
        email_confirm: true,
        user_metadata: { nombres: inviteToken.nombres, apellidos: inviteToken.apellidos },
      })
      if (signUpError || !authUser.user) {
        console.error('Error creating auth user:', signUpError)
        return new Response(JSON.stringify({ error: signUpError?.message ?? 'Error creando usuario de autenticación' }), {
          status: 500,
          headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' },
        })
      }
      authUserId = authUser.user.id
    }

    // Buscar si ya existe el perfil en tabla usuario
    const { data: existingUsuario } = await supabaseAdmin
      .from('usuario')
      .select('id_usuario')
      .eq('correo', inviteToken.email)
      .maybeSingle()

    let usuarioId: number
    if (existingUsuario) {
      // Actualizar perfil con todos los datos del invite token
      await supabaseAdmin
        .from('usuario')
        .update({
          auth_user_id: authUserId,
          activo: true,
          nombres: inviteToken.nombres,
          apellidos: inviteToken.apellidos,
          fecha_nacimiento: inviteToken.fecha_nacimiento || null,
          ...(telefono ? { telefono } : {}),
        })
        .eq('id_usuario', existingUsuario.id_usuario)
      usuarioId = existingUsuario.id_usuario
    } else {
      // Insertar nuevo perfil en tabla usuario
      const { data: usuario, error: usuarioError } = await supabaseAdmin
        .from('usuario')
        .insert({
          auth_user_id: authUserId,
          nombres: inviteToken.nombres,
          apellidos: inviteToken.apellidos,
          correo: inviteToken.email,
          activo: true,
          fecha_nacimiento: inviteToken.fecha_nacimiento || null,
          ...(telefono ? { telefono } : {}),
        })
        .select('id_usuario')
        .single()

      if (usuarioError || !usuario) {
        console.error('Error creating usuario:', usuarioError)
        if (!existingAuthUser) await supabaseAdmin.auth.admin.deleteUser(authUserId)
        return new Response(JSON.stringify({ error: usuarioError?.message ?? 'Error creando perfil de usuario' }), {
          status: 500,
          headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' },
        })
      }
      usuarioId = usuario.id_usuario
    }

    // Asignar rol — no bloquear si falla (usuario ya puede autenticarse)
    const { error: rolError } = await supabaseAdmin.rpc('assign_role_with_ministerio', {
      p_id_usuario:    usuarioId,
      p_id_rol:        inviteToken.id_rol,
      p_id_iglesia:    inviteToken.id_iglesia,
      p_id_sede:       inviteToken.id_sede ?? null,
      p_id_ministerio: inviteToken.id_ministerio ?? null,
    })
    if (rolError) {
      console.error('[complete-invite] Role assignment error (non-fatal):', rolError.message)
    }

    // Marcar token como usado (no bloquear si falla)
    const { error: updateTokenError } = await supabaseAdmin
      .from('invite_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id_invite_token', inviteToken.id_invite_token)
    if (updateTokenError) {
      console.warn('[complete-invite] Token mark-used error (non-fatal):', updateTokenError.message)
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Cuenta creada exitosamente',
      userId: usuarioId,
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