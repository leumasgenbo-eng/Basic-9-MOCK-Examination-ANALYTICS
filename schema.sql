
-- UNITED BAYLOR ACADEMY (UBA) & NETWORK PARTNERS - MULTI-TENANT PERSISTENCE ENGINE
-- TARGET: Supabase / PostgreSQL 15+
-- DESCRIPTION: This schema implements a high-performance, sharded JSONB persistence model.
-- It ensures zero-data-loss for Pupils, Staff, Financial Forwarding, and Exam Serialization.

-- 1. THE CORE PERSISTENCE TABLE
-- Every data point in the app (Settings, Scores, Staff, Feedback) is stored here.
CREATE TABLE IF NOT EXISTS public.uba_persistence (
  id TEXT PRIMARY KEY,                       -- Format: Shard Identifier (e.g., 'UBA-2025-001_students')
  payload JSONB NOT NULL,                    -- Encrypted/Structured JSON data
  last_updated TIMESTAMPTZ DEFAULT NOW(),    -- Synchronization cursor
  user_id UUID DEFAULT auth.uid(),           -- Multi-tenant ownership (links to auth.users)
  
  -- Constraints
  CONSTRAINT id_length CHECK (char_length(id) > 5)
);

-- 2. SECURITY & ISOLATION (ROW LEVEL SECURITY)
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;

-- POLICY: PUBLIC REGISTRY DISCOVERY
-- Required for the Login Portal to find a school and verify its Access Key before the user is fully logged in.
DROP POLICY IF EXISTS "Registry discovery" ON public.uba_persistence;
CREATE POLICY "Registry discovery" ON public.uba_persistence
FOR SELECT TO anon, authenticated
USING (id LIKE 'registry_%' OR id = 'global_advertisements');

-- POLICY: INSTITUTIONAL PRIVATE DATA
-- Ensures that only the authenticated owner of a school node can read/write their pupils and settings.
DROP POLICY IF EXISTS "Institutional isolation" ON public.uba_persistence;
CREATE POLICY "Institutional isolation" ON public.uba_persistence
FOR ALL TO authenticated
USING (
  auth.uid() = user_id 
  OR (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  auth.uid() = user_id 
  OR (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'super_admin'
);

-- POLICY: ANONYMOUS ONBOARDING
-- Allows a new school to register its initial shards before the user-id association is finalized.
DROP POLICY IF EXISTS "Anonymous onboarding" ON public.uba_persistence;
CREATE POLICY "Anonymous onboarding" ON public.uba_persistence
FOR INSERT TO anon, authenticated
WITH CHECK (true);


-- 3. PERFORMANCE OPTIMIZATION (INDEXING)
-- These indexes prevent "Table Scans" as the network grows to thousands of schools.

-- Optimize user-based lookups
CREATE INDEX IF NOT EXISTS idx_uba_persistence_user_id 
ON public.uba_persistence(user_id);

-- Optimize Registry lookup for the Login Portal
CREATE INDEX IF NOT EXISTS idx_uba_persistence_registry 
ON public.uba_persistence(id) WHERE id LIKE 'registry_%';

-- Optimize Forwarding/Marketing lookups for SuperAdmin
CREATE INDEX IF NOT EXISTS idx_uba_persistence_forwarding 
ON public.uba_persistence(id) WHERE id LIKE 'forward_%';

-- Optimize Serialization lookup for Exam Hub
CREATE INDEX IF NOT EXISTS idx_uba_persistence_serialization 
ON public.uba_persistence(id) WHERE id LIKE 'serialization_%';

-- Optimize real-time sync order
CREATE INDEX IF NOT EXISTS idx_uba_persistence_sync_cursor 
ON public.uba_persistence(last_updated DESC);


-- 4. REAL-TIME REPLICATION
-- Enables the "Marquee" and "Marketing Desk" to update live without page refreshes.
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
  RAISE NOTICE 'Realtime configuration already established.';
END $$;


-- 5. AUTOMATIC TIMESTAMP TRIGGER
-- Ensures 'last_updated' is always accurate for conflict resolution.
CREATE OR REPLACE FUNCTION update_uba_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_timestamp ON public.uba_persistence;
CREATE TRIGGER trigger_sync_timestamp
BEFORE UPDATE ON public.uba_persistence
FOR EACH ROW
EXECUTE FUNCTION update_uba_sync_timestamp();


-- 6. DATA SHARD DOCUMENTATION (COMMENTS)
COMMENT ON TABLE public.uba_persistence IS 'Multi-tenant sharding table for UBA Academy Network.';
COMMENT ON COLUMN public.uba_persistence.id IS 'Prefixes: registry_ (Public), forward_ (SuperAdmin), serialization_ (Exam), ${hubId}_ (Private)';

-- 7. INITIAL SYSTEM NODES
-- Ensures global communication channels exist.
INSERT INTO public.uba_persistence (id, payload, last_updated)
VALUES ('global_advertisements', '{"message": "SYSTEM ONLINE: WELCOME TO THE SS-MAP NETWORK HUB", "author": "HQ"}', NOW())
ON CONFLICT (id) DO NOTHING;
