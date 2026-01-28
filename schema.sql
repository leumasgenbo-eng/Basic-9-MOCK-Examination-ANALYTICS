
-- UNITED BAYLOR ACADEMY (UBA) - MASTER PERSISTENCE SCHEMA
-- Execute this in the Supabase SQL Editor to prepare your database.

-- 1. THE CORE PERSISTENCE TABLE
CREATE TABLE IF NOT EXISTS public.uba_persistence (
  id TEXT PRIMARY KEY,                       -- Unique Shard ID
  payload JSONB NOT NULL,                    -- Data payload
  last_updated TIMESTAMPTZ DEFAULT NOW(),    -- Sync timestamp
  user_id UUID DEFAULT auth.uid(),           -- Ownership
  
  CONSTRAINT id_length CHECK (char_length(id) > 2)
);

-- 2. ENABLE SECURITY
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;

-- POLICY: PUBLIC & PRE-AUTH DISCOVERY (Crucial for Login Portal)
-- This allows the login screen to verify IDs and Passkeys before the user is signed in.
DROP POLICY IF EXISTS "Registry discovery" ON public.uba_persistence;
CREATE POLICY "Registry discovery" ON public.uba_persistence
FOR SELECT TO anon, authenticated
USING (
  id LIKE 'registry_%' 
  OR id LIKE '%_facilitators' 
  OR id LIKE '%_students' 
  OR id = 'global_advertisements'
);

-- POLICY: INSTITUTIONAL PRIVATE DATA
-- Only the school owner (or HQ Admin) can modify their specific data.
DROP POLICY IF EXISTS "Institutional isolation" ON public.uba_persistence;
CREATE POLICY "Institutional isolation" ON public.uba_persistence
FOR ALL TO authenticated
USING (
  auth.uid() = user_id 
  OR (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com' -- Master Override
)
WITH CHECK (
  auth.uid() = user_id 
  OR (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com'
);

-- POLICY: ANONYMOUS ONBOARDING
-- Allows new schools to register their initial profile.
DROP POLICY IF EXISTS "Anonymous onboarding" ON public.uba_persistence;
CREATE POLICY "Anonymous onboarding" ON public.uba_persistence
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 3. PERFORMANCE INDEXING
CREATE INDEX IF NOT EXISTS idx_uba_user_id ON public.uba_persistence(user_id);
CREATE INDEX IF NOT EXISTS idx_uba_registry ON public.uba_persistence(id) WHERE id LIKE 'registry_%';
CREATE INDEX IF NOT EXISTS idx_uba_sync_time ON public.uba_persistence(last_updated DESC);

-- 4. REALTIME CONFIGURATION
-- This enables the live marquee and instant updates across devices.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'uba_persistence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.uba_persistence;
  END IF;
EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'Realtime already configured.';
END $$;

-- 5. INITIAL SYSTEM NODES
INSERT INTO public.uba_persistence (id, payload, last_updated)
VALUES ('global_advertisements', '{"message": "SYSTEM ONLINE: WELCOME TO SS-MAP NETWORK", "author": "HQ"}', NOW())
ON CONFLICT (id) DO NOTHING;
