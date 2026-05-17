export const EmailTemplate = `
<div style="font-family: Inter, system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0c2340; background-color: #f0f7ff;">
  <div style="text-align: center; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
    <div style="display: inline-block; padding: 10px 20px; background-color: #ffffff; border-radius: 50%; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <h1 style="color: #1a7fa8; font-size: 28px; margin: 0; font-weight: bold;">
        Lumen
      </h1>
    </div>
    <p style="color: #64748b; margin: 12px 0 0; font-size: 16px;">
      Sistema de Gestión Eclesiástica
    </p>
  </div>
  
  <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
    <h2 style="color: #0c2340; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Has sido invitado
    </h2>
    
    <p style="color: #334155; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
      <strong>¡Hola {{firstName}}!</strong> Has sido invitado a unirte a <strong>Lumen</strong>. 
      Haz clic en el siguiente enlace para aceptar la invitación y crear tu contraseña:
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{invitationUrl}}" 
         style="background-color: #1a7fa8; color: white; padding: 12px 24px; text-decoration: none; 
                border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
        Aceptar invitación
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">
      Si no esperabas esta invitación, puedes ignorar este correo.
    </p>
  </div>
  
  <div style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px; 
       padding-top: 20px; border-top: 1px solid #e2e8f0;">
    Lumen — Sistema de Gestión Eclesiástica<br/>
    © ${new Date().getFullYear()} - Todos los derechos reservados
  </div>
</div>
`;