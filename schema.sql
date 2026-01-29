
-- 1. CORE PERSISTENCE TABLE
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,
    hub_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID DEFAULT auth.uid()
);

-- 2. IDENTITY REGISTRY TABLE (For Pre-OTP Matching)
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    role TEXT NOT NULL
);

-- 3. ENABLE RLS
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_identities ENABLE ROW LEVEL SECURITY;

-- 4. PERSISTENCE POLICIES
DROP POLICY IF EXISTS "Hub Read Access" ON public.uba_persistence;
CREATE POLICY "Hub Read Access" ON public.uba_persistence
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'hubId') = hub_id
        OR (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com'
    );

DROP POLICY IF EXISTS "Admin Write Access" ON public.uba_persistence;
CREATE POLICY "Admin Write Access" ON public.uba_persistence
    FOR ALL 
    TO authenticated
    USING (
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'school_admin' AND (auth.jwt() -> 'user_metadata' ->> 'hubId') = hub_id)
        OR (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com'
    )
    WITH CHECK (
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'school_admin' AND (auth.jwt() -> 'user_metadata' ->> 'hubId') = hub_id)
        OR (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com'
    );

DROP POLICY IF EXISTS "Pupil Deny Write" ON public.uba_persistence;
CREATE POLICY "Pupil Deny Write" ON public.uba_persistence
    FOR UPDATE
    TO authenticated
    USING ( (auth.jwt() -> 'user_metadata' ->> 'role') != 'pupil' );

DROP POLICY IF EXISTS "Registry Select" ON public.uba_persistence;
CREATE POLICY "Registry Select" ON public.uba_persistence
    FOR SELECT
    TO anon, authenticated
    USING (id LIKE 'registry_%');

-- 5. IDENTITY POLICIES
DROP POLICY IF EXISTS "Identity Verify Access" ON public.uba_identities;
CREATE POLICY "Identity Verify Access" ON public.uba_identities
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Identity Manage Access" ON public.uba_identities;
CREATE POLICY "Identity Manage Access" ON public.uba_identities
    FOR ALL
    TO authenticated
    USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'school_admin' OR (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com' );
