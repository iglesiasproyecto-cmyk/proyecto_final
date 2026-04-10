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
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      correo,
      {
        data: { nombres, apellidos },
        redirectTo: `${Deno.env.get('SITE_URL') ?? ''}/app`,
      }
    )
    if (inviteError) throw inviteError

    // Create usuario record linked to new auth user
    const { data: usuarioData, error: usuarioError } = await supabaseAdmin
      .from('usuario')
      .insert({
        nombres,
        apellidos,
        correo,
        auth_user_id: inviteData.user.id,
        activo: true,
      })
      .select('id_usuario')
      .single()
    if (usuarioError) throw usuarioError

    // Assign rol
    const { error: rolError } = await supabaseAdmin
      .from('usuario_rol')
      .insert({
        id_usuario: usuarioData.id_usuario,
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
