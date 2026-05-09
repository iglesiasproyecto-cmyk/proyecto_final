import { serve } from "https://deno.land/std/http/server.ts";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";

serve(async (req) => {
  try {
    const { email, nombre, subject, html } = await req.json();

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: subject ?? "Bienvenido a IGLESIABD",
      html: html ?? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0c2340;">
          <h1 style="color: #1a7fa8;">IGLESIABD</h1>
          <h2>Hola ${nombre ?? ""},</h2>
          <p>Tu registro fue exitoso. Bienvenido a IGLESIABD.</p>
        </div>
      `,
    });

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
    });
  }
});
