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

    const { email } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email requerido' }), {
        status: 400,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Verificar que el usuario existe
    const { data: usuario, error: usuarioError } = await supabaseAdmin
      .from('usuario')
      .select('id_usuario, nombres, apellidos')
      .eq('correo', normalizedEmail)
      .eq('activo', true)
      .single()

    if (usuarioError || !usuario) {
      // No revelar si el usuario existe o no por seguridad
      return new Response(JSON.stringify({
        success: true,
        message: 'Si el email existe en nuestro sistema, recibirás instrucciones para restablecer tu contraseña.'
      }), {
        status: 200,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generar token custom para reset password
    const crypto = await import('https://deno.land/std@0.208.0/crypto/mod.ts')
    const token = crypto.getRandomValues(new Uint8Array(32))
    const tokenString = Array.from(token, byte => byte.toString(16).padStart(2, '0')).join('')

    // Insertar token en reset_tokens (necesitamos crear esta tabla también)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora
    const { error: tokenError } = await supabaseAdmin
      .from('reset_tokens')
      .insert({
        token: tokenString,
        email: normalizedEmail,
        expires_at: expiresAt.toISOString(),
      })

    if (tokenError) {
      console.error('Error creating reset token:', tokenError)
      return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
        status: 500,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obtener SITE_URL
    const siteUrl = Deno.env.get('SITE_URL')
    if (!siteUrl) {
      return new Response(JSON.stringify({ error: 'Configuración del servidor incompleta' }), {
        status: 500,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Enviar email con enlace custom
    const resetUrl = `${siteUrl}/auth/reset-password?token=${tokenString}`
    const emailSubject = `Restablecer contraseña - IGLESIABD`
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a7fa8;">Restablecer Contraseña</h2>
        <p>Hola ${usuario.nombres} ${usuario.apellidos},</p>
        <p>Has solicitado restablecer tu contraseña para IGLESIABD.</p>
        <p>Para crear una nueva contraseña, haz clic en el siguiente enlace:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #1a7fa8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Restablecer Contraseña
          </a>
        </p>
        <p>Este enlace expirará en 1 hora por razones de seguridad.</p>
        <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          IGLESIABD - Sistema de Gestión Eclesiástica
        </p>
      </div>
    `

    // Usar la función send-email para enviar el email
    const { error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
      body: {
        to: normalizedEmail,
        subject: emailSubject,
        html: emailBody,
      },
    })

    if (emailError) {
      console.error('Error sending email:', emailError)
      // Limpiar token si falló el email
      await supabaseAdmin.from('reset_tokens').delete().eq('token', tokenString)
      return new Response(JSON.stringify({ error: 'Error enviando email' }), {
        status: 500,
        headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Si el email existe en nuestro sistema, recibirás instrucciones para restablecer tu contraseña.'
    }), {
      status: 200,
      headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error requesting password reset:', error)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...baseCorsHeaders, 'Content-Type': 'application/json' }
    })
  }
})