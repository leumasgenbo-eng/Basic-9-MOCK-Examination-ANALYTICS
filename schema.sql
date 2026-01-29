
-- ==========================================================
-- UNITED BAYLOR ACADEMY - CLOUD ARCHITECTURE (v7.1)
-- ==========================================================

-- 1. IDENTITY RECALL HUB (Handshake Gate)
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    role TEXT NOT NULL,                 -- 'school_admin', 'facilitator', 'pupil'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INSTITUTIONAL PERSISTENCE (Dynamic JSON Engine)
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,               -- e.g., "HUB-101_settings"
    hub_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id)
);

-- 3. SYSTEM AUDIT TRAIL
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
-- AUTOMATION: IDENTITY SYNC TRIGGER
-- ==========================================================

-- Function to automatically populate uba_identities on signup/metadata update
CREATE OR REPLACE FUNCTION public.sync_uba_identity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'UBA User'),
    COALESCE(NEW.raw_user_meta_data->>'nodeId', 'PENDING_NODE'),
    COALESCE(NEW.raw_user_meta_data->>'hubId', 'PENDING_HUB'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    node_id = EXCLUDED.node_id,
    hub_id = EXCLUDED.hub_id,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the function to the Supabase Auth system
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_uba_identity();

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE public.uba_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_audit ENABLE ROW LEVEL SECURITY;

-- POLICY: Public Identity Handshake (Allows Login Recall)
DROP POLICY IF EXISTS "Public Identity Handshake" ON public.uba_identities;
CREATE POLICY "Public Identity Handshake" ON public.uba_identities
FOR SELECT TO anon, authenticated
USING (true);

-- POLICY: Shard Isolation (Institutional Data access)
DROP POLICY IF EXISTS "Hub Shard Isolation" ON public.uba_persistence;
CREATE POLICY "Hub Shard Isolation" ON public.uba_persistence
FOR ALL TO authenticated
USING (
    hub_id = (auth.jwt() -> 'user_metadata' ->> 'hubId')
    OR (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com')
);

-- POLICY: Audit Trail Visibility
DROP POLICY IF EXISTS "Audit Visibility" ON public.uba_audit;
CREATE POLICY "Audit Visibility" ON public.uba_audit
FOR ALL TO authenticated
USING (
    target = (auth.jwt() -> 'user_metadata' ->> 'hubId')
    OR (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com')
);

-- HQ INITIALIZATION
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
VALUES ('leumasgenbo4@gmail.com', 'HQ CONTROLLER', 'MASTER-NODE-01', 'NETWORK', 'school_admin')
ON CONFLICT (email) DO NOTHING;
