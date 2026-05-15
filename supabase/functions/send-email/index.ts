Deno.serve(async (req) => {
  try {
    const { email, nombre, subject, html } = await req.json()

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) {
      console.error('[send-email] RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { Resend } = await import('npm:resend')
    const resend = new Resend(apiKey)
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev'

    const response = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: subject ?? 'Bienvenido a IGLESIABD',
      html: html ?? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0c2340;">
          <h1 style="color: #1a7fa8;">IGLESIABD</h1>
          <h2>Hola ${nombre ?? ''},</h2>
          <p>Tu registro fue exitoso. Bienvenido a IGLESIABD.</p>
        </div>
      `,
    })

    console.log('[send-email] Sent to:', email, '| id:', (response as any)?.id)

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[send-email] Error:', String(error))
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
