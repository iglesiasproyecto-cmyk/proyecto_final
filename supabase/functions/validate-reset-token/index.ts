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

    // Buscar token válido
    const { data: resetToken, error } = await supabaseAdmin
      .from('reset_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !resetToken) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Token inválido o expirado'
      }), {
        status: 200,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Retornar datos del token
    return new Response(JSON.stringify({
      valid: true,
      email: resetToken.email,
    }), {
      status: 200,
      headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error validating reset token:', error)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
    })
  }
})