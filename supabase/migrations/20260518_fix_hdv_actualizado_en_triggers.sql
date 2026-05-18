DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'hoja_de_vida'
  ) THEN
    RAISE EXCEPTION 'tabla requerida no existe: public.hoja_de_vida';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'usuario'
  ) THEN
    RAISE EXCEPTION 'tabla requerida no existe: public.usuario';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'sede'
  ) THEN
    RAISE EXCEPTION 'tabla requerida no existe: public.sede';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ministerio'
  ) THEN
    RAISE EXCEPTION 'tabla requerida no existe: public.ministerio';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'hoja_de_vida_revision'
  ) THEN
    RAISE EXCEPTION 'tabla requerida no existe: public.hoja_de_vida_revision';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'hoja_de_vida_disponibilidad'
  ) THEN
    RAISE EXCEPTION 'tabla requerida no existe: public.hoja_de_vida_disponibilidad';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_actualizado_en_hdv_decision_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.actualizado_en := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_actualizado_en_hdv_revision ON public.hoja_de_vida_revision;
DROP TRIGGER IF EXISTS trg_set_actualizado_en_hdv_revision ON public.hoja_de_vida_revision;

CREATE TRIGGER trg_set_actualizado_en_hdv_revision
BEFORE UPDATE ON public.hoja_de_vida_revision
FOR EACH ROW
EXECUTE FUNCTION public.set_actualizado_en_hdv_decision_tables();

DROP TRIGGER IF EXISTS set_actualizado_en_hdv_disponibilidad ON public.hoja_de_vida_disponibilidad;
DROP TRIGGER IF EXISTS trg_set_actualizado_en_hdv_disponibilidad ON public.hoja_de_vida_disponibilidad;

CREATE TRIGGER trg_set_actualizado_en_hdv_disponibilidad
BEFORE UPDATE ON public.hoja_de_vida_disponibilidad
FOR EACH ROW
EXECUTE FUNCTION public.set_actualizado_en_hdv_decision_tables();
