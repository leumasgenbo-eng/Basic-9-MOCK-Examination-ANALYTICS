-- ==========================================================
-- 1. TABLE ARCHITECTURE
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    role TEXT NOT NULL,                  -- 'school_admin', 'facilitator', 'pupil'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,
    hub_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.uba_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action TEXT NOT NULL,
    target TEXT NOT NULL,                -- The hub_id
    actor TEXT NOT NULL,                 -- User email
    details TEXT,
    year TEXT DEFAULT EXTRACT(YEAR FROM NOW())::TEXT
);

-- ==========================================================
-- 2. BI-DIRECTIONAL SYNC AUTOMATION
-- ==========================================================

-- TRIGGER A: Auth -> Database (When user signs up/logs in)
CREATE OR REPLACE FUNCTION public.sync_uba_identity()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_uba_identity();

-- TRIGGER B: Database -> Auth (Ensures token_hub never stays NULL)
CREATE OR REPLACE FUNCTION public.backfill_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || 
    jsonb_build_object(
      'hubId', NEW.hub_id,
      'role', NEW.role,
      'full_name', NEW.full_name
    )
  WHERE email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_identity_update_sync_auth ON public.uba_identities;
CREATE TRIGGER on_identity_update_sync_auth
  AFTER UPDATE OF hub_id, role, full_name ON public.uba_identities
  FOR EACH ROW EXECUTE FUNCTION public.backfill_auth_metadata();

-- ==========================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==========================================================

ALTER TABLE public.uba_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_audit ENABLE ROW LEVEL SECURITY;

-- --- IDENTITY POLICIES ---

DROP POLICY IF EXISTS "Public Identity Handshake" ON public.uba_identities;
CREATE POLICY "Public Identity Handshake" ON public.uba_identities FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anon School Registration" ON public.uba_identities;
CREATE POLICY "Anon School Registration" ON public.uba_identities FOR INSERT TO anon WITH CHECK (role = 'school_admin');

-- Recruitment Fix: Uses COALESCE to handle initial session lag
DROP POLICY IF EXISTS "Admin Recruitment" ON public.uba_identities;
CREATE POLICY "Admin Recruitment" ON public.uba_identities
FOR INSERT TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com') OR 
  (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'school_admin') 
    AND (hub_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'hubId', hub_id))
  )
);

DROP POLICY IF EXISTS "Admin Management" ON public.uba_identities;
CREATE POLICY "Admin Management" ON public.uba_identities
FOR ALL TO authenticated
USING (
  (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com') OR 
  ((hub_id = auth.jwt() -> 'user_metadata' ->> 'hubId') AND (auth.jwt() -> 'user_metadata' ->> 'role' = 'school_admin'))
);

-- --- PERSISTENCE POLICIES ---

DROP POLICY IF EXISTS "Hub Shard Isolation" ON public.uba_persistence;
CREATE POLICY "Hub Shard Isolation" ON public.uba_persistence
FOR ALL TO authenticated
USING (
    (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com') OR
    (user_id = auth.uid()) OR 
    ((auth.jwt() -> 'user_metadata' ->> 'role' = 'school_admin') AND hub_id = (auth.jwt() -> 'user_metadata' ->> 'hubId')) OR
    ((auth.jwt() -> 'user_metadata' ->> 'role' = 'facilitator') AND hub_id = (auth.jwt() -> 'user_metadata' ->> 'hubId') AND (COALESCE(payload->>'visibility', '') != 'admin_only')) OR
    ((auth.jwt() -> 'user_metadata' ->> 'role' = 'pupil') AND user_id = auth.uid())
);

-- --- AUDIT POLICIES ---

DROP POLICY IF EXISTS "Audit Visibility" ON public.uba_audit;
CREATE POLICY "Audit Visibility" ON public.uba_audit
FOR ALL TO authenticated
USING (
    (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com') OR (target = (auth.jwt() -> 'user_metadata' ->> 'hubId'))
);

-- ==========================================================
-- 4. REPAIR & INITIALIZATION
-- ==========================================================

-- Repairing your specific School Admin accounts
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"hubId": "NETWORK", "role": "school_admin"}'::jsonb WHERE email = 'leumasgenbo4@gmail.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"hubId": "SMA-2025-8891", "role": "school_admin"}'::jsonb WHERE email = 'leumasgenbo2009@gmail.com';

INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
VALUES ('leumasgenbo4@gmail.com', 'HQ CONTROLLER', 'MASTER-NODE-01', 'NETWORK', 'school_admin')
ON CONFLICT (email) DO UPDATE SET hub_id = 'NETWORK', role = 'school_admin';