-- Create trigger to auto-create hoja_de_vida when a new usuario is created
CREATE OR REPLACE FUNCTION create_hoja_de_vida_on_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create hoja_de_vida entry for new user
  INSERT INTO hoja_de_vida (id_usuario, habilidades, formacion_academica, otros_datos, completa)
  VALUES (NEW.id_usuario, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, FALSE);

  -- Create notification for user to fill their hoja_de_vida
  INSERT INTO notificacion (id_usuario, titulo, mensaje, tipo, leida)
  VALUES (
    NEW.id_usuario,
    'Complete su Hoja de Vida',
    'Bienvenido(a) a IGLESIABD. Por favor, complete su hoja de vida con su información profesional, habilidades y formación académica. Esta información será visible para administradores y líderes del ministerio.',
    'info'::tipo_notificacion,
    FALSE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_hoja_vida_on_new_user ON usuario;

CREATE TRIGGER trigger_create_hoja_vida_on_new_user
AFTER INSERT ON usuario
FOR EACH ROW
EXECUTE FUNCTION create_hoja_de_vida_on_new_user();

-- Create RPC function to create hoja_de_vida for existing users without one
CREATE OR REPLACE FUNCTION create_missing_hojas_de_vida()
RETURNS TABLE (created_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Create hoja_de_vida for users who don't have one
  INSERT INTO hoja_de_vida (id_usuario, habilidades, formacion_academica, otros_datos, completa)
  SELECT u.id_usuario, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, FALSE
  FROM usuario u
  LEFT JOIN hoja_de_vida hdv ON u.id_usuario = hdv.id_usuario
  WHERE hdv.id_hoja_de_vida IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to send notification for incomplete hojas_de_vida
CREATE OR REPLACE FUNCTION send_hoja_de_vida_reminder_notifications()
RETURNS TABLE (sent_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Insert notifications for users with incomplete hojas_de_vida
  INSERT INTO notificacion (id_usuario, titulo, mensaje, tipo, leida)
  SELECT 
    hdv.id_usuario,
    'Recuerde completar su Hoja de Vida',
    'Su hoja de vida está incompleta. Complete toda la información para que administradores y líderes conozcan mejor su perfil profesional.',
    'reminder'::tipo_notificacion,
    FALSE
  FROM hoja_de_vida hdv
  WHERE hdv.completa = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM notificacion n
    WHERE n.id_usuario = hdv.id_usuario
    AND n.tipo = 'reminder'::tipo_notificacion
    AND n.creado_en > NOW() - INTERVAL '7 days'
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
