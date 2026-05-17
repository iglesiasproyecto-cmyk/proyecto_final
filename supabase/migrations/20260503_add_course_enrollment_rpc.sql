-- Migration: Add RPC function for course enrollment with proper validations
-- Created: 2026-05-03

-- Function to enroll users in courses with comprehensive validations
CREATE OR REPLACE FUNCTION inscribir_usuarios_curso(
  p_id_aula_curso bigint,
  p_user_ids bigint[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_user_id bigint;
  v_curso_record record;
  v_ministerio_id bigint;
  v_caller_is_creator boolean := false;
  v_caller_is_leader boolean := false;
  v_processed_count integer := 0;
  v_reactivated_count integer := 0;
  v_user_record record;
  v_existing_enrollment record;
BEGIN
  -- 1. Get caller user ID from auth
  SELECT id_usuario INTO v_caller_user_id
  FROM usuario
  WHERE auth_user_id = auth.uid();

  IF v_caller_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Usuario no encontrado'
    );
  END IF;

  -- 2. Validate course exists and get ministerio
  SELECT
    ac.id_aula_curso,
    ac.id_usuario_creador,
    m.id_ministerio
  INTO v_curso_record
  FROM aula_curso ac
  JOIN ministerio m ON ac.id_ministerio = m.id_ministerio
  WHERE ac.id_aula_curso = p_id_aula_curso;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Curso no encontrado'
    );
  END IF;

  v_ministerio_id := v_curso_record.id_ministerio;

  -- 3. Check caller permissions
  -- Is creator?
  IF v_curso_record.id_usuario_creador = v_caller_user_id THEN
    v_caller_is_creator := true;
  END IF;

  -- Is leader of the ministerio?
  SELECT EXISTS(
    SELECT 1
    FROM miembro_ministerio mm
    WHERE mm.id_usuario = v_caller_user_id
      AND mm.id_ministerio = v_ministerio_id
      AND mm.rol_en_ministerio = 'lider'
      AND mm.fecha_salida IS NULL
  ) INTO v_caller_is_leader;

  IF NOT (v_caller_is_creator OR v_caller_is_leader) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No tienes permisos para inscribir usuarios en este curso'
    );
  END IF;

  -- 4. Process each user
  FOREACH v_user_record IN ARRAY p_user_ids
  LOOP
    -- Validate target user exists and is active
    SELECT id_usuario INTO v_user_record.id_usuario
    FROM usuario
    WHERE id_usuario = v_user_record.id_usuario AND activo = true;

    IF NOT FOUND THEN
      RAISE WARNING 'Usuario % no encontrado o inactivo, saltando', v_user_record.id_usuario;
      CONTINUE;
    END IF;

    -- Validate target user belongs to the ministerio
    IF NOT EXISTS(
      SELECT 1
      FROM miembro_ministerio mm
      WHERE mm.id_usuario = v_user_record.id_usuario
        AND mm.id_ministerio = v_ministerio_id
        AND mm.fecha_salida IS NULL
    ) THEN
      RAISE WARNING 'Usuario % no pertenece al ministerio del curso, saltando', v_user_record.id_usuario;
      CONTINUE;
    END IF;

    -- Check for existing active enrollment
    SELECT * INTO v_existing_enrollment
    FROM aula_inscripcion
    WHERE id_aula_curso = p_id_aula_curso
      AND id_usuario = v_user_record.id_usuario;

    IF FOUND THEN
      IF v_existing_enrollment.activo THEN
        -- Already active, skip
        RAISE WARNING 'Usuario % ya está inscrito activamente, saltando', v_user_record.id_usuario;
        CONTINUE;
      ELSE
        -- Inactive, reactivate
        UPDATE aula_inscripcion
        SET activo = true, inscrito_en = now()
        WHERE id_aula_inscripcion = v_existing_enrollment.id_aula_inscripcion;

        v_reactivated_count := v_reactivated_count + 1;
      END IF;
    ELSE
      -- New enrollment
      INSERT INTO aula_inscripcion (
        id_aula_curso,
        id_usuario,
        activo,
        inscrito_en
      ) VALUES (
        p_id_aula_curso,
        v_user_record.id_usuario,
        true,
        now()
      );

      v_processed_count := v_processed_count + 1;
    END IF;
  END LOOP;

  -- Return success with counts
  RETURN json_build_object(
    'success', true,
    'message', format(
      'Proceso completado: %s nuevos inscritos, %s reactivados',
      v_processed_count,
      v_reactivated_count
    ),
    'processed_count', v_processed_count,
    'reactivated_count', v_reactivated_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION inscribir_usuarios_curso(bigint, bigint[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION inscribir_usuarios_curso(bigint, bigint[]) IS
'RPC function to enroll users in courses with proper permission validation. Only course creators or ministerio leaders can enroll users from their ministerio.';