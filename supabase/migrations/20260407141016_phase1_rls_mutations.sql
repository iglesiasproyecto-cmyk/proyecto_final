DO $$ BEGIN
  CREATE POLICY "Authenticated insert iglesia"
    ON public.iglesia FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update iglesia"
    ON public.iglesia FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete iglesia"
    ON public.iglesia FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert sede"
    ON public.sede FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update sede"
    ON public.sede FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete sede"
    ON public.sede FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert pastor"
    ON public.pastor FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update pastor"
    ON public.pastor FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated delete pastor"
    ON public.pastor FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated insert iglesia_pastor"
    ON public.iglesia_pastor FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated update iglesia_pastor"
    ON public.iglesia_pastor FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
