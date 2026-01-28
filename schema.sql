
-- 1. ENSURE CORE TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID DEFAULT auth.uid()
);

-- 2. SAFE COLUMN INJECTION (Fixes "column hub_id does not exist" error)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uba_persistence' AND column_name='hub_id') THEN
        ALTER TABLE public.uba_persistence ADD COLUMN hub_id TEXT;
        -- Optional: Populate existing rows with a placeholder if needed
        UPDATE public.uba_persistence SET hub_id = split_part(id, '_', 1) WHERE hub_id IS NULL;
    END IF;
END $$;

-- 3. APPLY SECURITY POLICIES
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institution Shard Access" ON public.uba_persistence;
CREATE POLICY "Institution Shard Access" ON public.uba_persistence
    FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'hubId') = hub_id
        OR (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com'
    )
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'hubId') = hub_id
        OR (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com'
    );

DROP POLICY IF EXISTS "Registry Transparency" ON public.uba_persistence;
CREATE POLICY "Registry Transparency" ON public.uba_persistence
    FOR SELECT
    TO anon, authenticated
    USING (id LIKE 'registry_%');

DROP POLICY IF EXISTS "Initial Handshake" ON public.uba_persistence;
CREATE POLICY "Initial Handshake" ON public.uba_persistence
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
