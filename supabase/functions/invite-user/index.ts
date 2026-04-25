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

  if (isBrowserRequest && !isLocalDev && !allowedOrigins.includes(origin!)) {
    return jsonResponse(origin, { message: 'Origin not allowed' }, 403)
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: resolveCorsHeaders(origin) })
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

    const { correo, nombres, apellidos, idIglesia, idRol } = await req.json()

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
      // Invite user via Supabase Auth Admin API.
      // NOTE: The handle_new_user trigger should create the usuario record.
      const inviteOptions = {
        data: { nombres, apellidos },
        redirectTo: `${configuredSiteUrl}/auth/callback?next=/auth/set-password`,
      }

      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        normalizedEmail,
        inviteOptions
      )

      if (inviteError) {
        const msg = inviteError.message?.toLowerCase() ?? ''
        const duplicateLike = msg.includes('duplicate') || msg.includes('already') || msg.includes('exists')
        if (!duplicateLike) throw inviteError

        // In race conditions / previous partial attempts, profile may already exist.
        const { data: dupUsuario, error: dupUsuarioError } = await supabaseAdmin
          .from('usuario')
          .select('id_usuario')
          .eq('correo', normalizedEmail)
          .maybeSingle()
        if (dupUsuarioError) throw dupUsuarioError
        if (dupUsuario) {
          usuarioId = dupUsuario.id_usuario
        } else {
          // User exists in Auth but is missing in public.usuario. Reconcile it here.
          const authUser = await findAuthUserByEmail(supabaseAdmin, normalizedEmail)
          if (!authUser) throw inviteError

          const fallbackNombres = String(nombres).trim() || 'Usuario'
          const fallbackApellidos = String(apellidos).trim() || 'Invitado'

          const { data: insertedUsuario, error: insertedUsuarioError } = await supabaseAdmin
            .from('usuario')
            .insert({
              auth_user_id: authUser.id,
              nombres: fallbackNombres,
              apellidos: fallbackApellidos,
              correo: normalizedEmail,
              contrasena_hash: '',
              activo: true,
            })
            .select('id_usuario')
            .single()

          if (insertedUsuarioError) {
            const retry = await supabaseAdmin
              .from('usuario')
              .select('id_usuario')
              .eq('correo', normalizedEmail)
              .maybeSingle()
            if (retry.error) throw retry.error
            if (!retry.data) throw insertedUsuarioError
            usuarioId = retry.data.id_usuario
          } else {
            usuarioId = insertedUsuario.id_usuario
            profileReconciled = true
          }
        }
      } else {
        inviteSent = true
        const authUserId = inviteData.user.id

        // Poll up to 5 seconds for the trigger to create the usuario record.
        for (let attempt = 0; attempt < 10; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 500))
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
          const { data: fallbackUsuario, error: fallbackUsuarioError } = await supabaseAdmin
            .from('usuario')
            .select('id_usuario')
            .eq('correo', normalizedEmail)
            .maybeSingle()
          if (fallbackUsuarioError) throw fallbackUsuarioError
          if (!fallbackUsuario) {
            throw new Error('No se pudo resolver el perfil de usuario invitado')
          }
          usuarioId = fallbackUsuario.id_usuario
        }
      }
    }

    if (!usuarioId) {
      throw new Error('No se pudo resolver el usuario objetivo')
    }

    const { data: existingAssignment, error: assignmentCheckError } = await supabaseAdmin
      .from('usuario_rol')
      .select('id_usuario_rol')
      .eq('id_usuario', usuarioId)
      .eq('id_rol', idRol)
      .eq('id_iglesia', idIglesia)
      .is('fecha_fin', null)
      .maybeSingle()

    if (assignmentCheckError) throw assignmentCheckError

    let roleAssigned = false
    if (!existingAssignment) {
      const { error: rolError } = await supabaseAdmin
        .from('usuario_rol')
        .insert({
          id_usuario: usuarioId,
          id_rol: idRol,
          id_iglesia: idIglesia,
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
    return jsonResponse(origin, { message }, 500)
  }
})
