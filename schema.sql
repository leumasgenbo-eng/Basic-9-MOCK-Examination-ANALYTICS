
-- ==========================================================
-- SS-map ACADEMY - DATABASE INITIALIZATION SCRIPT
-- ==========================================================

-- 1. PERSISTENCE HUB (Stores all settings, students, and staff data)
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY, -- e.g., 'SMA-2025-1234_settings'
    hub_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID DEFAULT auth.uid()
);

-- 2. IDENTITY REGISTRY (Required for the Pre-OTP Handshake)
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL, -- The specific ID given to the student/staff
    hub_id TEXT NOT NULL,  -- The ID of the school they belong to
    role TEXT NOT NULL     -- 'school_admin', 'facilitator', 'pupil'
);

-- 3. SCHEMA EVOLUTION (Ensure columns exist if table was already created)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uba_identities' AND column_name='hub_id') THEN
        ALTER TABLE public.uba_identities ADD COLUMN hub_id TEXT;
    END IF;
END $$;

-- 4. SECURITY POLICIES
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_identities ENABLE ROW LEVEL SECURITY;

-- Allow public identity matching for the Login Gate
DROP POLICY IF EXISTS "Identity Gate Lookup" ON public.uba_identities;
CREATE POLICY "Identity Gate Lookup" ON public.uba_identities FOR SELECT TO anon, authenticated USING (true);

-- Restrict Hub Access to members of that Hub
DROP POLICY IF EXISTS "Hub Member Access" ON public.uba_persistence;
CREATE POLICY "Hub Member Access" ON public.uba_persistence
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'hubId') = hub_id
        OR (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com'
    );

-- Admin Write Policy
DROP POLICY IF EXISTS "Admin Node Management" ON public.uba_persistence;
CREATE POLICY "Admin Node Management" ON public.uba_persistence
    FOR ALL 
    TO authenticated
    USING (
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'school_admin' AND (auth.jwt() -> 'user_metadata' ->> 'hubId') = hub_id)
        OR (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com'
    );
