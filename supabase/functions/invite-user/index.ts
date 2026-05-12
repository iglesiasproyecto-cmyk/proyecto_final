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

    const { correo, nombres, apellidos, idIglesia, idRol, idSede } = await req.json()

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

    const { data: callerRoles, error: callerRolesError } = await supabaseAdmin
      .from('usuario_rol')
      .select('id_iglesia, rol:rol!inner(nombre)')
      .eq('id_usuario', callerUsuario.id_usuario)
      .is('fecha_fin', null)

    if (callerRolesError) throw callerRolesError

    const activeRoles = (callerRoles ?? []) as Array<{ id_iglesia: number; rol: { nombre: string } }>
    const isSuperAdmin = activeRoles.some((r) => r.rol?.nombre === 'Super Administrador')
    const managedIglesias = new Set(
      activeRoles
        .filter((r) => r.rol?.nombre === 'Super Administrador' || r.rol?.nombre === 'Administrador de Iglesia')
        .map((r) => r.id_iglesia)
    )

    if (!isSuperAdmin && !managedIglesias.has(idIglesia)) {
      return jsonResponse(origin, { message: 'No autorizado para gestionar esa iglesia' }, 403)
    }

    const { data: targetRole, error: targetRoleError } = await supabaseAdmin
      .from('rol')
      .select('nombre')
      .eq('id_rol', idRol)
      .single()

    if (targetRoleError || !targetRole) {
      return jsonResponse(origin, { message: 'Rol inválido' }, 400)
    }

    if (!isSuperAdmin && targetRole.nombre === 'Super Administrador') {
      return jsonResponse(origin, { message: 'No autorizado para asignar ese rol' }, 403)
    }

    const sedeRequiredRoles = new Set(['Administrador de Sede', 'Líder', 'Servidor'])
    const isSedeRole = sedeRequiredRoles.has(targetRole.nombre)
    const requiresMinisterio = targetRole.nombre === 'Líder' || targetRole.nombre === 'Servidor'
    const sedeId = Number(idSede)

    if (isSedeRole && (!sedeId || Number.isNaN(sedeId))) {
      return jsonResponse(origin, { message: 'Debes seleccionar una sede para este rol' }, 400)
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
      // Generar token custom para invitación
      const crypto = await import('https://deno.land/std@0.208.0/crypto/mod.ts')
      const token = crypto.getRandomValues(new Uint8Array(32))
      const tokenString = Array.from(token, byte => byte.toString(16).padStart(2, '0')).join('')

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
          to: normalizedEmail,
          subject: emailSubject,
          html: emailBody,
        },
      })

      if (emailError) {
        console.error('Error sending email:', emailError)
        // Limpiar token si falló el email
        await supabaseAdmin.from('invite_tokens').delete().eq('id_invite_token', inviteToken.id_invite_token)
        return jsonResponse(origin, { message: 'Error enviando email de invitación' }, 500)
      }

      inviteSent = true
    }

    if (!usuarioId) {
      throw new Error('No se pudo resolver el usuario objetivo')
    }

    if (requiresMinisterio) {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('miembro_ministerio')
        .select('id_miembro_ministerio, ministerio!inner(id_sede)')
        .eq('id_usuario', usuarioId)
        .is('fecha_salida', null)
        .eq('ministerio.id_sede', sedeId)
        .limit(1)

      if (membershipError) throw membershipError
      if (!membership || membership.length === 0) {
        return jsonResponse(origin, { message: 'El usuario debe pertenecer a un ministerio de la sede para este rol' }, 400)
      }
    }

    const assignmentTable = isSedeRole ? 'usuario_rol_sede' : 'usuario_rol'
    const assignmentIdColumn = isSedeRole ? 'id_usuario_rol_sede' : 'id_usuario_rol'

    const { data: existingAssignment, error: assignmentCheckError } = await supabaseAdmin
      .from(assignmentTable)
      .select(assignmentIdColumn)
      .eq('id_usuario', usuarioId)
      .eq('id_rol', idRol)
      .eq('id_iglesia', idIglesia)
      .is('fecha_fin', null)
      .maybeSingle()

    if (assignmentCheckError) throw assignmentCheckError

    let roleAssigned = false
    if (!existingAssignment) {
      const { error: rolError } = await supabaseAdmin
        .from(assignmentTable)
        .insert({
          id_usuario: usuarioId,
          id_rol: idRol,
          id_iglesia: idIglesia,
          id_sede: isSedeRole ? sedeId : null,
          fecha_inicio: new Date().toISOString().split('T')[0],
        })
      if (rolError) throw rolError
      roleAssigned = true
    }

    return jsonResponse(origin, {
      success: true,
      inviteSent,
      profileReconciled,
      roleAssigned,
      userAlreadyExisted: !inviteSent,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const details = error instanceof Error ? error.stack : String(error)
    console.error('[invite-user] ERROR:', message, details)
    return jsonResponse(origin, { message, details }, 500)
  }
})
