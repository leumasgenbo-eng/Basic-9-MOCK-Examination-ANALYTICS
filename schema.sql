
-- ==========================================================
-- 1. CORE TABLE STRUCTURE
-- ==========================================================

-- Identity Registry: Maps emails to institutional shards and roles
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    role TEXT NOT NULL,                  -- 'school_admin', 'facilitator', 'pupil'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Persistence Hub: JSON Shards (Settings, Students, Facilitators)
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,                 -- e.g., 'SMA-2025-001_settings'
    hub_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id)
);

-- Global Audit Ledger: Tracks all master actions
CREATE TABLE IF NOT EXISTS public.uba_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    actor TEXT NOT NULL,
    details TEXT,
    year TEXT DEFAULT EXTRACT(YEAR FROM NOW())::TEXT
);

-- ==========================================================
-- 2. BI-DIRECTIONAL SYNC AUTOMATION (LOOP-PROOF)
-- ==========================================================

-- TRIGGER A: Auth Metadata -> Database (Sync on Handshake)
-- CRITICAL: SECURITY DEFINER allows the trigger to bypass RLS during user creation
CREATE OR REPLACE FUNCTION public.sync_uba_identity()
RETURNS TRIGGER AS $$
BEGIN
  -- CIRCUIT BREAKER: Stop if the database already matches the incoming metadata
  IF EXISTS (
    SELECT 1 FROM public.uba_identities 
    WHERE email = NEW.email 
    AND full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
    AND hub_id = COALESCE(NEW.raw_user_meta_data->>'hubId', 'PENDING_HUB')
    AND role = COALESCE(NEW.raw_user_meta_data->>'role', 'pupil')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'UBA User'),
    COALESCE(NEW.raw_user_meta_data->>'nodeId', NEW.raw_user_meta_data->>'studentId', NEW.raw_user_meta_data->>'facilitatorId', 'PENDING_NODE'),
    COALESCE(NEW.raw_user_meta_data->>'hubId', 'PENDING_HUB'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'pupil')
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    node_id = CASE WHEN public.uba_identities.node_id = 'PENDING_NODE' THEN EXCLUDED.node_id ELSE public.uba_identities.node_id END,
    hub_id = CASE WHEN public.uba_identities.hub_id = 'PENDING_HUB' THEN EXCLUDED.hub_id ELSE public.uba_identities.hub_id END,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER B: Database -> Auth (Self-Healing Metadata Back-Sync)
CREATE OR REPLACE FUNCTION public.backfill_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = NEW.email 
    AND raw_user_meta_data->>'hubId' = NEW.hub_id 
    AND raw_user_meta_data->>'role' = NEW.role
    AND raw_user_meta_data->>'full_name' = NEW.full_name
  ) THEN
    RETURN NEW;
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'hubId', NEW.hub_id,
      'role', NEW.role,
      'full_name', NEW.full_name,
      'nodeId', NEW.node_id
    )
  WHERE email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_uba_identity();

DROP TRIGGER IF EXISTS on_identity_update_sync_auth ON public.uba_identities;
CREATE TRIGGER on_identity_update_sync_auth
  AFTER UPDATE OF hub_id, role, full_name ON public.uba_identities
  FOR EACH ROW EXECUTE FUNCTION public.backfill_auth_metadata();

-- ==========================================================
-- 3. ROW LEVEL SECURITY (RLS) - HARDENED
-- ==========================================================

ALTER TABLE public.uba_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_audit ENABLE ROW LEVEL SECURITY;

-- --- UBA_IDENTITIES POLICIES ---
DROP POLICY IF EXISTS "Global Identity Handshake" ON public.uba_identities;
CREATE POLICY "Global Identity Handshake" ON public.uba_identities FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "SuperAdmin Identity Override" ON public.uba_identities;
CREATE POLICY "SuperAdmin Identity Override" ON public.uba_identities FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com');

DROP POLICY IF EXISTS "Admin Recruitment Access" ON public.uba_identities;
CREATE POLICY "Admin Recruitment Access" ON public.uba_identities FOR INSERT TO authenticated
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role' = 'school_admin') 
  AND (hub_id = (auth.jwt() -> 'user_metadata' ->> 'hubId'))
);

-- --- UBA_PERSISTENCE POLICIES ---
DROP POLICY IF EXISTS "SuperAdmin Global Persistence" ON public.uba_persistence;
CREATE POLICY "SuperAdmin Global Persistence" ON public.uba_persistence FOR ALL TO authenticated
USING (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com');

DROP POLICY IF EXISTS "Institutional Hub Shard Isolation" ON public.uba_persistence;
CREATE POLICY "Institutional Hub Shard Isolation" ON public.uba_persistence FOR ALL TO authenticated
USING (
    (hub_id = (auth.jwt() -> 'user_metadata' ->> 'hubId')) OR
    (user_id = auth.uid())
);

-- ==========================================================
-- 4. MASTER BOOTSTRAP (SUPERADMIN REPAIR)
-- ==========================================================

-- Seed the Master Identity Shard
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
VALUES ('leumasgenbo4@gmail.com', 'HQ CONTROLLER', 'MASTER-NODE-01', 'NETWORK', 'school_admin')
ON CONFLICT (email) DO UPDATE SET hub_id = 'NETWORK', role = 'school_admin', full_name = 'HQ CONTROLLER';

-- Direct Auth Metadata Injection for SuperAdmin
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object(
    'hubId', 'NETWORK', 
    'role', 'school_admin', 
    'full_name', 'HQ CONTROLLER',
    'nodeId', 'MASTER-NODE-01'
) 
WHERE email = 'leumasgenbo4@gmail.com';
