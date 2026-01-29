
-- ==========================================================
-- UNITED BAYLOR ACADEMY - CLOUD ARCHITECTURE (v7.0)
-- ==========================================================

-- 1. IDENTITY RECALL HUB (Handshake Gate)
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INSTITUTIONAL PERSISTENCE (Dynamic JSON Engine)
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,
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
    target TEXT NOT NULL,              -- Usually the hub_id
    actor TEXT NOT NULL,               -- User email
    details TEXT,
    year TEXT DEFAULT EXTRACT(YEAR FROM NOW())::TEXT
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

-- Enable security gates
ALTER TABLE public.uba_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_audit ENABLE ROW LEVEL SECURITY;

-- POLICY: Allow the login gate to lookup users by email to find their Hub/Role
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

-- POLICY: Audit Trail Visibility (Resolves "no data will be returned" issue)
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
