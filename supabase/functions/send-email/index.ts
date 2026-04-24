import { serve } from "https://deno.land/std/http/server.ts";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  try {
    const { email, nombre } = await req.json();

    const response = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Registro exitoso",
      html: `
        <h1>Hola ${nombre}</h1>
        <p>Tu registro fue exitoso.</p>
        <p>Bienvenido a nuestra plataforma.</p>
      `,
    });

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error }), {
      status: 500,
    });
  }
});