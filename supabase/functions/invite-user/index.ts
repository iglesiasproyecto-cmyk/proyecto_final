import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { correo, nombres, apellidos, idIglesia, idRol } = await req.json()

    if (!correo || !nombres || !apellidos || !idIglesia || !idRol) {
      return new Response(JSON.stringify({ message: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Invite user via Supabase Auth Admin API
    // NOTE: The handle_new_user trigger automatically creates the usuario record.
    // We must NOT insert manually — that would cause a duplicate.
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      correo,
      {
        data: { nombres, apellidos },
        redirectTo: `${Deno.env.get('SITE_URL') ?? ''}/app`,
      }
    )
    if (inviteError) throw inviteError

    const authUserId = inviteData.user.id

    // Poll up to 5 seconds for the trigger to create the usuario record
    let usuarioId: number | null = null
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 500))
      const { data: rows } = await supabaseAdmin
        .from('usuario')
        .select('id_usuario')
        .eq('auth_user_id', authUserId)
        .limit(1)
      if (rows && rows.length > 0) {
        usuarioId = rows[0].id_usuario
        break
      }
    }

    if (!usuarioId) {
      // Trigger did not fire in time — create the record manually as fallback
      const { data: newUsuario, error: usuarioError } = await supabaseAdmin
        .from('usuario')
        .insert({ nombres, apellidos, correo, auth_user_id: authUserId, activo: true, contrasena_hash: '' })
        .select('id_usuario')
        .single()
      if (usuarioError) throw usuarioError
      usuarioId = newUsuario.id_usuario
    }

    // Assign rol
    const { error: rolError } = await supabaseAdmin
      .from('usuario_rol')
      .insert({
        id_usuario: usuarioId,
        id_rol: idRol,
        id_iglesia: idIglesia,
        fecha_inicio: new Date().toISOString().split('T')[0],
      })
    if (rolError) throw rolError

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error'
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
