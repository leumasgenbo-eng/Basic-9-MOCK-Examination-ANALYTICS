
-- ==========================================================
-- UNITED BAYLOR ACADEMY - MASTER DATA SCHEMA (v5.0)
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

-- 2. INSTITUTIONAL PERSISTENCE (Dynamic Shard Engine)
-- Uses JSONB to capture all submitted data dynamically
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
    target TEXT NOT NULL,
    actor TEXT NOT NULL,
    details TEXT,
    year TEXT DEFAULT EXTRACT(YEAR FROM NOW())::TEXT
);

-- SECURITY & ROW LEVEL ACCESS (RLS)
ALTER TABLE public.uba_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_audit ENABLE ROW LEVEL SECURITY;

-- POLICY: Identity Recall (Allows Login Portal to find users before PIN)
DROP POLICY IF EXISTS "Allow Identity Recall" ON public.uba_identities;
CREATE POLICY "Allow Identity Recall" ON public.uba_identities 
FOR SELECT TO anon, authenticated 
USING (true);

-- POLICY: Shard Isolation (Institutions cannot see each other's data)
DROP POLICY IF EXISTS "Institutional Shard Isolation" ON public.uba_persistence;
CREATE POLICY "Institutional Shard Isolation" ON public.uba_persistence
FOR ALL TO authenticated
USING (
    hub_id = (auth.jwt() -> 'user_metadata' ->> 'hubId')
    OR (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com')
);

-- POLICY: Audit Trail Access
DROP POLICY IF EXISTS "Audit Access authenticated" ON public.uba_audit;
CREATE POLICY "Audit Access authenticated" ON public.uba_audit
FOR ALL TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'hubId') = target
    OR (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com')
);

-- HQ BOOTSTRAP
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
VALUES ('leumasgenbo4@gmail.com', 'HQ CONTROLLER', 'MASTER-NODE-01', 'NETWORK', 'school_admin')
ON CONFLICT (email) DO NOTHING;
