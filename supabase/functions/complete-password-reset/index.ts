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
    const { data: resetToken, error: tokenError } = await supabaseAdmin
      .from('reset_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !resetToken) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 400,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obtener usuario por email
    const { data: usuario, error: usuarioError } = await supabaseAdmin
      .from('usuario')
      .select('auth_user_id')
      .eq('correo', resetToken.email)
      .eq('activo', true)
      .single()

    if (usuarioError || !usuario) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Actualizar contraseña en auth.users
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      usuario.auth_user_id,
      { password: password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return new Response(JSON.stringify({ error: 'Error actualizando contraseña' }), {
        status: 500,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Marcar token como usado
    const { error: updateTokenError } = await supabaseAdmin
      .from('reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id_reset_token', resetToken.id_reset_token)

    if (updateTokenError) {
      console.warn('Error marking token as used:', updateTokenError)
      // No fallar por esto
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Contraseña actualizada exitosamente',
    }), {
      status: 200,
      headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error completing password reset:', error)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
    })
  }
})