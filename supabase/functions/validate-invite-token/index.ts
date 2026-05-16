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

    const { token } = await req.json()

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), {
        status: 400,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Buscar token válido con nombres de rol e iglesia
    const { data: inviteToken, error } = await supabaseAdmin
      .from('invite_tokens')
      .select(`
        *,
        rol:id_rol ( nombre ),
        iglesia:id_iglesia ( nombre ),
        sede:id_sede ( nombre )
      `)
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !inviteToken) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 400,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Retornar datos del token (sin token mismo por seguridad)
    return new Response(JSON.stringify({
      valid: true,
      inviteData: {
        email: inviteToken.email,
        nombres: inviteToken.nombres,
        apellidos: inviteToken.apellidos,
        id_iglesia: inviteToken.id_iglesia,
        id_rol: inviteToken.id_rol,
        id_sede: inviteToken.id_sede,
        rol: inviteToken.rol,
        iglesia: inviteToken.iglesia,
        sede: inviteToken.sede,
      },
    }), {
      status: 200,
      headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error validating invite token:', error)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
    })
  }
})