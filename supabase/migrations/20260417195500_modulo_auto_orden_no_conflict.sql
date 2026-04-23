-- Evita conflictos al crear modulos cuando llega un orden repetido.
-- Estrategia:
-- 1) Serializa inserciones por curso con advisory lock transaccional.
-- 2) Si orden viene nulo o ya existe, se reasigna al siguiente disponible.

CREATE OR REPLACE FUNCTION public.modulo_set_safe_orden()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_orden integer;
BEGIN
  PERFORM pg_advisory_xact_lock(NEW.id_curso::bigint);

  IF NEW.orden IS NULL
     OR EXISTS (
       SELECT 1
       FROM public.modulo m
       WHERE m.id_curso = NEW.id_curso
         AND m.orden = NEW.orden
     ) THEN
    SELECT COALESCE(MAX(m.orden), 0) + 1
      INTO v_next_orden
    FROM public.modulo m
    WHERE m.id_curso = NEW.id_curso;

    NEW.orden := v_next_orden;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_modulo_set_safe_orden ON public.modulo;

CREATE TRIGGER trg_modulo_set_safe_orden
BEFORE INSERT ON public.modulo
FOR EACH ROW
EXECUTE FUNCTION public.modulo_set_safe_orden();
