-- Hardens public functions against search_path hijacking by pinning
-- search_path to empty. Both function bodies already use fully-qualified
-- references, so no behavioral change is expected.
--
-- Addresses advisor lint: function_search_path_mutable (0011).

ALTER FUNCTION public.aula_recursos_modulo_id_from_name(text)
  SET search_path = '';

ALTER FUNCTION public.modulo_set_safe_orden()
  SET search_path = '';
