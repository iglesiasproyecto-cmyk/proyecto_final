import { supabase } from '@/lib/supabaseClient';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Servicio centralizado para el envío de correos mediante la Edge Function de Supabase `send-email`.
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Fallback al anon key si no hay sesión activa (ej. llamados desde cron o procesos bg),
    // aunque en general se espera que exista un token para invocar la Edge Function.
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

    const res = await fetch('https://heibyjbvfiokmduwwawm.supabase.co/functions/v1/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, subject, html }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[EmailService] HTTP Error ${res.status}:`, errorText);
      return false;
    }

    console.log(`[EmailService] Correo enviado exitosamente a: ${to}`);
    return true;
  } catch (error) {
    console.error('[EmailService] Error inesperado al enviar el correo:', error);
    // Retornamos false para no romper la ejecución principal de la app
    return false;
  }
}
