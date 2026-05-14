// supabase/functions/set-tenant-claims/index.ts
// Zero external imports — uses fetch() against Supabase REST API directly.
// This avoids esm.sh import resolution failures in the Edge Runtime.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Get authenticated user
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: SUPABASE_ANON_KEY,
      },
    })
    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const user = await userRes.json()

    // 2. Resolve internal usuario_id (avoids DB bypass query on every request)
    const usuarioRes = await fetch(
      `${SUPABASE_URL}/rest/v1/usuario?select=id_usuario&auth_user_id=eq.${user.id}&activo=eq.true&limit=1`,
      {
        headers: {
          Authorization: authHeader,
          apikey: SUPABASE_ANON_KEY,
        },
      }
    )
    const usuarioRows: any[] = usuarioRes.ok ? await usuarioRes.json() : []
    const usuarioId: number | null = usuarioRows.length > 0 ? Number(usuarioRows[0].id_usuario) : null

    // 3. Get user roles via RPC
    const rolesRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_my_roles`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    const roles: any[] = rolesRes.ok ? (await rolesRes.json()) : []

    const activeRoles = roles.filter((r: any) => !r.fecha_fin)
    const roleNames: string[] = activeRoles.map((r: any) =>
      String(r.rol_nombre ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    )

    let role = 'servidor'
    let tenantId: number | null = null
    let sedeId: number | null = null
    let ministerioIds: number[] = []

    if (roleNames.includes('super administrador')) {
      role = 'super_admin'
      tenantId = null
    } else if (roleNames.some((n) => n.includes('administrador de iglesia'))) {
      role = 'admin_iglesia'
      const iglesiaRole = activeRoles.find((r: any) =>
        String(r.rol_nombre ?? '').toLowerCase().includes('administrador de iglesia') && r.iglesia_id
      )
      tenantId = iglesiaRole?.iglesia_id ? Number(iglesiaRole.iglesia_id) : null
    } else if (roleNames.some((n) => n.includes('administrador de sede'))) {
      role = 'admin_sede'
      const sedeRole = activeRoles.find((r: any) =>
        String(r.rol_nombre ?? '').toLowerCase().includes('administrador de sede') && r.sede_id
      )
      tenantId = sedeRole?.iglesia_id ? Number(sedeRole.iglesia_id) : null
      sedeId = sedeRole?.sede_id ? Number(sedeRole.sede_id) : null
    } else if (roleNames.some((n) => n.includes('lider'))) {
      role = 'lider'
      const liderRole = activeRoles.find((r: any) => r.iglesia_id)
      tenantId = liderRole?.iglesia_id ? Number(liderRole.iglesia_id) : null
      const minsRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_my_ministerios`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const mins: any[] = minsRes.ok ? (await minsRes.json()) : []
      ministerioIds = mins.map((m: any) => Number(m.id))
    } else {
      role = 'servidor'
      const servidorRole = activeRoles.find((r: any) => r.iglesia_id)
      tenantId = servidorRole?.iglesia_id ? Number(servidorRole.iglesia_id) : null
      const minsRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_my_ministerios`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const mins: any[] = minsRes.ok ? (await minsRes.json()) : []
      ministerioIds = mins.map((m: any) => Number(m.id))
    }

    // 4. Update app_metadata using service role
    const claimsAt = Math.floor(Date.now() / 1000)
    const appMetadata: Record<string, unknown> = { role, claims_at: claimsAt }
    if (usuarioId !== null) appMetadata.usuario_id = usuarioId
    if (tenantId !== null) appMetadata.tenant_id = tenantId
    if (sedeId !== null) appMetadata.sede_id = sedeId
    if (ministerioIds.length > 0) appMetadata.ministerio_ids = ministerioIds

    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ app_metadata: appMetadata }),
    })

    if (!updateRes.ok) {
      const err = await updateRes.text()
      console.error('Error updating app_metadata:', err)
      return new Response(JSON.stringify({ error: 'Failed to update claims' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ ok: true, role, tenant_id: tenantId, claims_at: claimsAt }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
