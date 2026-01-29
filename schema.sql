
-- ==========================================================
-- UNITED BAYLOR ACADEMY - SECURE DATA ARCHITECTURE (v6.0)
-- ==========================================================

-- 1. IDENTITY RECALL HUB (Handshake Gate)
-- Stores the Triplet: email, full_name, node_id
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    role TEXT NOT NULL,                 -- 'school_admin', 'facilitator', 'pupil'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INSTITUTIONAL PERSISTENCE (The Shard Engine)
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,               -- e.g., "HUB-101_settings"
    hub_id TEXT NOT NULL,              -- The School's ID
    payload JSONB NOT NULL,            -- The Dynamic Data
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id)
);

-- 3. SYSTEM AUDIT TRAIL
CREATE TABLE IF NOT EXISTS public.uba_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action TEXT NOT NULL,
    target TEXT NOT NULL,              -- Usually the hub_id
    actor TEXT NOT NULL,               -- Email of the user
    details TEXT,
    year TEXT DEFAULT EXTRACT(YEAR FROM NOW())::TEXT
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) - THE FACILITATOR & ADMIN GATES
-- ==========================================================

ALTER TABLE public.uba_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_audit ENABLE ROW LEVEL SECURITY;

-- POLICY: Identity Handshake (Anonymous Lookup)
-- Allows the login screen to check if a Facilitator/Admin exists before sending OTP
DROP POLICY IF EXISTS "Handshake Lookup" ON public.uba_identities;
CREATE POLICY "Handshake Lookup" ON public.uba_identities 
FOR SELECT TO anon, authenticated 
USING (true);

-- POLICY: Shard Access (The Master Gate)
-- Users can only read/write shards that match the hubId in their login token (JWT)
DROP POLICY IF EXISTS "Institutional Shard Gate" ON public.uba_persistence;
CREATE POLICY "Institutional Shard Gate" ON public.uba_persistence
FOR ALL TO authenticated
USING (
    hub_id = (auth.jwt() -> 'user_metadata' ->> 'hubId')
    OR (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com')
);

-- POLICY: Audit Visibility
DROP POLICY IF EXISTS "Audit Trail Visibility" ON public.uba_audit;
CREATE POLICY "Audit Trail Visibility" ON public.uba_audit
FOR ALL TO authenticated
USING (
    target = (auth.jwt() -> 'user_metadata' ->> 'hubId')
    OR (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com')
);

-- POLICY: Self-Identity Management
DROP POLICY IF EXISTS "Staff Identity Access" ON public.uba_identities;
CREATE POLICY "Staff Identity Access" ON public.uba_identities
FOR ALL TO authenticated
USING (
    hub_id = (auth.jwt() -> 'user_metadata' ->> 'hubId')
    OR (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com')
);

-- ==========================================================
-- HQ BOOTSTRAP (RUN THIS ONCE)
-- ==========================================================
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
VALUES ('leumasgenbo4@gmail.com', 'HQ CONTROLLER', 'MASTER-NODE-01', 'NETWORK', 'school_admin')
ON CONFLICT (email) DO NOTHING;
