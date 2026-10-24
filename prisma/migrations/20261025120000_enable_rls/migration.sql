-- Close Supabase's public Data API (PostgREST) on every table in the public schema.
-- Row Level Security with no policies denies the anon and authenticated API roles,
-- while the app's own connection (the table owner, via Prisma) and the
-- service_role key bypass RLS, so the website and the mobile API are unaffected.
-- Tables added later must enable RLS in their own migration (see rls.test.ts).
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END
$$;
