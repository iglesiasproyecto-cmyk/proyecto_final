import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const baseCorsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

function resolveCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return baseCorsHeaders

  // Permitir desarrollo local automáticamente
  const isLocalDev = origin.startsWith('http://127.0.0.1:') ||
                     origin.startsWith('http://localhost:') ||
                     origin === 'http://127.0.0.1' ||
                     origin === 'http://localhost'

  if (isLocalDev || allowedOrigins.includes(origin)) {
    return {
      ...baseCorsHeaders,
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
    }
  }

  return baseCorsHeaders
}

function jsonResponse(
  origin: string | null,
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...resolveCorsHeaders(origin),
      'Content-Type': 'application/json',
    },
  })
}

function normalizeBaseUrl(url?: string | null): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null

  // Accept both "example.com" and "https://example.com" formats.
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(withProtocol)
    return parsed.origin
  } catch {
    return null
  }
}

async function findAuthUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string
) {
  const normalized = email.trim().toLowerCase()
  const perPage = 200

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const users = data?.users ?? []
    const match = users.find((u) => (u.email ?? '').toLowerCase() === normalized)
    if (match) return match

    if (users.length < perPage) break
  }

  return null
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const isBrowserRequest = Boolean(origin)

  // Permitir desarrollo local automáticamente
  const isLocalDev = origin && (
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('http://localhost:') ||
    origin === 'http://127.0.0.1' ||
    origin === 'http://localhost'
  )

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: resolveCorsHeaders(origin) })
  }

  if (isBrowserRequest && !isLocalDev && !allowedOrigins.includes(origin!)) {
    return jsonResponse(origin, { message: 'Origin not allowed' }, 403)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse(origin, { message: 'Unauthorized' }, 401)
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
      return jsonResponse(origin, { message: 'Unauthorized' }, 401)
    }

    const { correo, nombres, apellidos, idIglesia, idRol, idSede, idMinisterio, fechaNacimiento } = await req.json()

    if (!correo || !nombres || !apellidos || !idIglesia || !idRol) {
      return jsonResponse(origin, { message: 'Missing required fields' }, 400)
    }

    const configuredSiteUrl = normalizeBaseUrl(Deno.env.get('SITE_URL'))
    if (!configuredSiteUrl) {
      return jsonResponse(
        origin,
        { message: 'Server misconfigured: SITE_URL is required for invitations' },
        500
      )
    }

    const normalizedEmail = String(correo).trim().toLowerCase()

    const { data: callerUsuario, error: callerUsuarioError } = await supabaseAdmin
      .from('usuario')
      .select('id_usuario')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (callerUsuarioError || !callerUsuario) {
      return jsonResponse(origin, { message: 'Caller profile not found' }, 403)
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    )

    const sedeId = Number(idSede)
    const ministerioId = idMinisterio ? Number(idMinisterio) : null

    const { data: isAuthorized, error: authzError } = await supabaseClient.rpc(
      'can_assign_role_scoped',
      {
        p_target_role_id: idRol,
        p_id_iglesia: idIglesia,
        p_id_sede: sedeId || null,
        p_id_ministerio: ministerioId || null,
      }
    )

    if (authzError) {
      console.error('Authorization check error:', authzError)
      return jsonResponse(origin, { message: 'Error verificando autorizacion' }, 500)
    }

    if (!isAuthorized) {
      return jsonResponse(origin, { message: 'No estas autorizado para invitar/asignar en esta iglesia/sede/ministerio' }, 403)
    }

    const { data: targetRole, error: targetRoleError } = await supabaseAdmin
      .from('rol')
      .select('nombre')
      .eq('id_rol', idRol)
      .single()

    if (targetRoleError || !targetRole) {
      return jsonResponse(origin, { message: 'Rol inválido' }, 400)
    }

    // Redundant, can_assign_role_scoped checks this, but let's leave it just in case
    const isSuperAdmin = await supabaseClient.rpc('is_super_admin').then(r => r.data === true)
    if (!isSuperAdmin && targetRole.nombre === 'Super Administrador') {
      return jsonResponse(origin, { message: 'No autorizado para asignar ese rol' }, 403)
    }

    const sedeRequiredRoles = new Set(['Administrador de Sede', 'Líder', 'Servidor'])
    const isSedeRole = sedeRequiredRoles.has(targetRole.nombre)
    const requiresMinisterio = targetRole.nombre === 'Líder' || targetRole.nombre === 'Servidor'

    if (isSedeRole && (!sedeId || Number.isNaN(sedeId))) {
      return jsonResponse(origin, { message: 'Debes seleccionar una sede para este rol' }, 400)
    }

    if (requiresMinisterio && (!ministerioId || Number.isNaN(ministerioId))) {
      return jsonResponse(origin, { message: 'Debes seleccionar un ministerio para este rol' }, 400)
    }

    // First, check if the app profile already exists to keep this flow idempotent.
    const { data: existingUsuario, error: existingUsuarioError } = await supabaseAdmin
      .from('usuario')
      .select('id_usuario, auth_user_id, activo')
      .eq('correo', normalizedEmail)
      .maybeSingle()
    if (existingUsuarioError) throw existingUsuarioError

    let usuarioId: number | null = existingUsuario?.id_usuario ?? null
    let inviteSent = false
    let profileReconciled = false

    if (!usuarioId) {
      // Generar token custom para invitación (crypto es global en Deno)
      const tokenBytes = globalThis.crypto.getRandomValues(new Uint8Array(32))
      const tokenString = Array.from(tokenBytes, (byte: number) => byte.toString(16).padStart(2, '0')).join('')

      // Insertar token en invite_tokens
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
      const { data: inviteToken, error: tokenError } = await supabaseAdmin
        .from('invite_tokens')
        .insert({
          token: tokenString,
          email: normalizedEmail,
          nombres: nombres,
          apellidos: apellidos,
          id_iglesia: idIglesia,
          id_rol: idRol,
          id_sede: isSedeRole ? sedeId : null,
          id_ministerio: requiresMinisterio ? ministerioId : null,
          fecha_nacimiento: fechaNacimiento || null,
          expires_at: expiresAt.toISOString(),
        })
        .select('id_invite_token')
        .single()

      if (tokenError) {
        console.error('Error creating invite token:', tokenError)
        return jsonResponse(origin, { message: 'Error creando token de invitación' }, 500)
      }

      // Enviar email con enlace custom
      const inviteUrl = `${configuredSiteUrl}/auth/accept-invite?token=${tokenString}`
      const emailSubject = `Invitación a IGLESIABD - ${nombres} ${apellidos}`
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a7fa8;">Invitación a IGLESIABD</h2>
          <p>Hola ${nombres} ${apellidos},</p>
          <p>Has sido invitado a unirte a IGLESIABD como ${targetRole.nombre}.</p>
          <p>Para completar tu registro, haz clic en el siguiente enlace:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #1a7fa8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Aceptar Invitación
            </a>
          </p>
          <p>Este enlace expirará en 7 días.</p>
          <p>Si no esperabas esta invitación, puedes ignorar este mensaje.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            IGLESIABD - Sistema de Gestión Eclesiástica
          </p>
        </div>
      `

      // Usar la función send-email para enviar el email
      const { error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
        body: {
          email: normalizedEmail,
          subject: emailSubject,
          html: emailBody,
        },
      })

      if (emailError) {
        const errBody = (emailError as any)?.context ? await (emailError as any).context.json().catch(() => null) : null
        const errDetail = errBody?.error ?? emailError?.message ?? 'Error desconocido'
        console.error('Error sending email:', errDetail)
        await supabaseAdmin.from('invite_tokens').delete().eq('id_invite_token', inviteToken.id_invite_token)
        return jsonResponse(origin, { message: `Error enviando email: ${errDetail}` }, 500)
      }

      inviteSent = true

      // Early return for new users — role will be assigned when they accept the invite via complete-invite
      return jsonResponse(origin, {
        success: true,
        inviteSent: true,
        profileReconciled: false,
        roleAssigned: false,
        userAlreadyExisted: false,
      })
    }

    // Existing user path — update fecha_nacimiento if provided
    if (usuarioId && fechaNacimiento) {
      const { error: updateError } = await supabaseAdmin
        .from('usuario')
        .update({ fecha_nacimiento: fechaNacimiento })
        .eq('id_usuario', usuarioId)

      if (updateError) {
        console.error('Error updating user fecha_nacimiento:', updateError)
      }
    }

    // Assign role directly via RPC
    const { error: rpcError } = await supabaseAdmin.rpc(
      'assign_role_with_ministerio',
      {
        p_id_usuario:    usuarioId,
        p_id_rol:        idRol,
        p_id_iglesia:    idIglesia,
        p_id_sede:       isSedeRole ? sedeId : null,
        p_id_ministerio: requiresMinisterio ? ministerioId : null,
      }
    )
    if (rpcError) throw rpcError

    return jsonResponse(origin, {
      success: true,
      inviteSent: false,
      profileReconciled: false,
      roleAssigned: true,
      userAlreadyExisted: true,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const details = error instanceof Error ? error.stack : String(error)
    console.error('[invite-user] ERROR:', message, details)
    return jsonResponse(origin, { message, details }, 500)
  }
})
