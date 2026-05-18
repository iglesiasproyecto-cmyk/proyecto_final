DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'hoja_de_vida'
  ) THEN
    RAISE EXCEPTION 'tabla hoja_de_vida no existe';
  END IF;
END $$;

ALTER TABLE public.hoja_de_vida
  ADD COLUMN IF NOT EXISTS resumen_profesional TEXT,
  ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT,
  ADD COLUMN IF NOT EXISTS completa BOOLEAN,
  ADD COLUMN IF NOT EXISTS completada_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ;

DO $$
DECLARE
  v_habilidades_tipo TEXT;
  v_formacion_tipo TEXT;
BEGIN
  SELECT data_type
  INTO v_habilidades_tipo
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'hoja_de_vida'
    AND column_name = 'habilidades';

  IF v_habilidades_tipo = 'text' THEN
    EXECUTE $sql$
      ALTER TABLE public.hoja_de_vida
      ALTER COLUMN habilidades TYPE JSONB USING
      CASE
        WHEN habilidades IS NULL OR btrim(habilidades) = '' THEN '[]'::jsonb
        WHEN left(btrim(habilidades), 1) = '[' THEN habilidades::jsonb
        ELSE to_jsonb(string_to_array(habilidades, ','))
      END
    $sql$;
  ELSIF v_habilidades_tipo = 'jsonb' THEN
    UPDATE public.hoja_de_vida
    SET habilidades = COALESCE(habilidades, '[]'::jsonb)
    WHERE habilidades IS NULL;
  END IF;

  SELECT data_type
  INTO v_formacion_tipo
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'hoja_de_vida'
    AND column_name = 'formacion_academica';

  IF v_formacion_tipo = 'text' THEN
    EXECUTE $sql$
      ALTER TABLE public.hoja_de_vida
      ALTER COLUMN formacion_academica TYPE JSONB USING
      CASE
        WHEN formacion_academica IS NULL OR btrim(formacion_academica) = '' THEN '[]'::jsonb
        WHEN left(btrim(formacion_academica), 1) = '[' THEN formacion_academica::jsonb
        ELSE to_jsonb(ARRAY[formacion_academica])
      END
    $sql$;
  ELSIF v_formacion_tipo = 'jsonb' THEN
    UPDATE public.hoja_de_vida
    SET formacion_academica = COALESCE(formacion_academica, '[]'::jsonb)
    WHERE formacion_academica IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hoja_de_vida'
      AND column_name = 'perfil_profesional'
  ) THEN
    UPDATE public.hoja_de_vida
    SET resumen_profesional = COALESCE(resumen_profesional, perfil_profesional)
    WHERE resumen_profesional IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hoja_de_vida'
      AND column_name = 'otros_datos'
  ) THEN
    UPDATE public.hoja_de_vida
    SET foto_perfil_url = COALESCE(
      foto_perfil_url,
      CASE
        WHEN jsonb_typeof(otros_datos) = 'object' THEN NULLIF(otros_datos ->> 'foto_perfil_url', '')
        ELSE NULL
      END
    )
    WHERE foto_perfil_url IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hoja_de_vida'
      AND column_name = 'updated_at'
  ) THEN
    UPDATE public.hoja_de_vida
    SET actualizado_en = COALESCE(actualizado_en, updated_at)
    WHERE actualizado_en IS NULL;
  END IF;

  UPDATE public.hoja_de_vida
  SET actualizado_en = COALESCE(actualizado_en, NOW()),
      completa = COALESCE(completa, FALSE),
      habilidades = COALESCE(habilidades, '[]'::jsonb),
      formacion_academica = COALESCE(formacion_academica, '[]'::jsonb);
END $$;

ALTER TABLE public.hoja_de_vida
  ALTER COLUMN completa SET DEFAULT FALSE,
  ALTER COLUMN actualizado_en SET DEFAULT NOW(),
  ALTER COLUMN completa SET NOT NULL,
  ALTER COLUMN actualizado_en SET NOT NULL;
