// supabase/functions/set-tenant-claims/index.ts
// Called after login and when permissions change.
// Reads the user's role from DB via get_my_roles() and writes app_metadata to their JWT.
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
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Client with the user's JWT to read their own data
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Read roles from DB — get_my_roles() returns { rol_nombre, iglesia_id, ... }
    const { data: roles, error: rolesError } = await supabaseUser.rpc('get_my_roles')
    if (rolesError) {
      console.error('Error fetching roles:', rolesError)
    }

    const activeRoles = (roles ?? []).filter((r: any) => !r.fecha_fin)

    // Normalize role names (strip accents, lowercase)
    const roleNames: string[] = activeRoles.map((r: any) =>
      String(r.rol_nombre ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    )

    let role = 'servidor'
    let tenantId: number | null = null
    let ministerioIds: number[] = []

    if (roleNames.includes('super administrador')) {
      role = 'super_admin'
      tenantId = null
    } else if (roleNames.some((n) => n.includes('administrador'))) {
      role = 'admin_iglesia'
      const iglesiaRole = activeRoles.find((r: any) =>
        String(r.rol_nombre ?? '').toLowerCase().includes('administrador') && r.iglesia_id
      )
      tenantId = iglesiaRole?.iglesia_id ? Number(iglesiaRole.iglesia_id) : null
    } else if (roleNames.some((n) => n.includes('lider'))) {
      role = 'lider'
      const liderRole = activeRoles.find((r: any) => r.iglesia_id)
      tenantId = liderRole?.iglesia_id ? Number(liderRole.iglesia_id) : null
      const { data: mins } = await supabaseUser.rpc('get_my_ministerios')
      ministerioIds = (mins ?? []).map((m: any) => Number(m.id))
    } else {
      role = 'servidor'
      const servidorRole = activeRoles.find((r: any) => r.iglesia_id)
      tenantId = servidorRole?.iglesia_id ? Number(servidorRole.iglesia_id) : null
      const { data: mins } = await supabaseUser.rpc('get_my_ministerios')
      ministerioIds = (mins ?? []).map((m: any) => Number(m.id))
    }

    // Update app_metadata using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const claimsAt = Math.floor(Date.now() / 1000)
    const appMetadata: Record<string, unknown> = { role, claims_at: claimsAt }
    if (tenantId !== null) appMetadata.tenant_id = tenantId
    if (ministerioIds.length > 0) appMetadata.ministerio_ids = ministerioIds

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: appMetadata,
    })

    if (updateError) {
      console.error('Error updating app_metadata:', updateError)
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
