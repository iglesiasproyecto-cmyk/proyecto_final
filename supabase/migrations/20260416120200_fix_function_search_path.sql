-- Hardening: fijar search_path en funciones reportadas por security advisor.

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_proc p
		JOIN pg_namespace n ON n.oid = p.pronamespace
		WHERE n.nspname = 'public' AND p.proname = 'trigger_set_updated_at' AND p.pronargs = 0
	) THEN
		ALTER FUNCTION public.trigger_set_updated_at() SET search_path = public;
	END IF;
END
$$;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_proc p
		JOIN pg_namespace n ON n.oid = p.pronamespace
		WHERE n.nspname = 'public' AND p.proname = 'is_admin_iglesia' AND p.pronargs = 0
	) THEN
		ALTER FUNCTION public.is_admin_iglesia() SET search_path = public;
	END IF;
END
$$;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_proc p
		JOIN pg_namespace n ON n.oid = p.pronamespace
		WHERE n.nspname = 'public' AND p.proname = 'is_lider' AND p.pronargs = 0
	) THEN
		ALTER FUNCTION public.is_lider() SET search_path = public;
	END IF;
END
$$;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_proc p
		JOIN pg_namespace n ON n.oid = p.pronamespace
		WHERE n.nspname = 'public' AND p.proname = 'get_user_ministerios' AND p.pronargs = 0
	) THEN
		ALTER FUNCTION public.get_user_ministerios() SET search_path = public;
	END IF;
END
$$;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_proc p
		JOIN pg_namespace n ON n.oid = p.pronamespace
		WHERE n.nspname = 'public' AND p.proname = 'is_admin_of_iglesia' AND p.pronargs = 1
	) THEN
		ALTER FUNCTION public.is_admin_of_iglesia(bigint) SET search_path = public;
	END IF;
END
$$;
