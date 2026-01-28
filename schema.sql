
-- UNITED BAYLOR ACADEMY (UBA) - MASTER PERSISTENCE SCHEMA
-- REVISED FOR SHARED INSTITUTIONAL SHARDS

-- 1. THE CORE PERSISTENCE TABLE
CREATE TABLE IF NOT EXISTS public.uba_persistence (
  id TEXT PRIMARY KEY,                       -- Unique Shard ID (e.g., UBA-2025-101_students)
  hub_id TEXT NOT NULL,                      -- The institutional ID (e.g., UBA-2025-101)
  payload JSONB NOT NULL,                    -- Data payload
  last_updated TIMESTAMPTZ DEFAULT NOW(),    -- Sync timestamp
  user_id UUID DEFAULT auth.uid(),           -- Original Creator
  
  CONSTRAINT id_length CHECK (char_length(id) > 2)
);

-- 2. ENABLE SECURITY
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;

-- POLICY: SHARED HUB ACCESS
-- Allows any user (Admin, Facilitator, Pupil) to access records belonging to their specific Hub ID
DROP POLICY IF EXISTS "Hub shard access" ON public.uba_persistence;
CREATE POLICY "Hub shard access" ON public.uba_persistence
FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'hubId') = hub_id 
  OR (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com' -- Master Override
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'hubId') = hub_id 
  OR (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com'
);

-- POLICY: PUBLIC DISCOVERY (For Login Verification)
DROP POLICY IF EXISTS "Registry discovery" ON public.uba_persistence;
CREATE POLICY "Registry discovery" ON public.uba_persistence
FOR SELECT TO anon, authenticated
USING (
  id LIKE 'registry_%' 
  OR id = 'global_advertisements'
);

-- POLICY: ANONYMOUS ONBOARDING
DROP POLICY IF EXISTS "Anonymous onboarding" ON public.uba_persistence;
CREATE POLICY "Anonymous onboarding" ON public.uba_persistence
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 3. PERFORMANCE INDEXING
CREATE INDEX IF NOT EXISTS idx_uba_hub_id ON public.uba_persistence(hub_id);
CREATE INDEX IF NOT EXISTS idx_uba_registry ON public.uba_persistence(id) WHERE id LIKE 'registry_%';
CREATE INDEX IF NOT EXISTS idx_uba_sync_time ON public.uba_persistence(last_updated DESC);

-- 4. REALTIME CONFIGURATION
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
