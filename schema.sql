-- 1. IDENTITY RECALL HUB
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    role TEXT NOT NULL,                  -- 'school_admin', 'facilitator', 'pupil'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INSTITUTIONAL PERSISTENCE
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

-- ==========================================================
-- AUTOMATION: IDENTITY SYNC TRIGGER (Facilitator Aware)
-- ==========================================================

CREATE OR REPLACE FUNCTION public.sync_uba_identity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'UBA User'),
    -- Fix: Now correctly checks for facilitatorId during recruitment
    COALESCE(
        NEW.raw_user_meta_data->>'nodeId', 
        NEW.raw_user_meta_data->>'studentId', 
        NEW.raw_user_meta_data->>'facilitatorId', 
        'PENDING_NODE'
    ),
    COALESCE(NEW.raw_user_meta_data->>'hubId', 'PENDING_HUB'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'pupil')
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    -- Prevent overwriting PENDING values with new login data
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

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE public.uba_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_audit ENABLE ROW LEVEL SECURITY;

-- 1. IDENTITY RECALL HUB POLICIES

CREATE POLICY "Public Identity Handshake" ON public.uba_identities FOR SELECT TO anon, authenticated USING (true);

-- Anonymous Enrollment (For School Admins only)
CREATE POLICY "Anon School Registration" ON public.uba_identities FOR INSERT TO anon WITH CHECK (role = 'school_admin');

-- FIXED Admin Recruitment: Ensures Admin can only add to their OWN hub (Fixes Enrollment Fault)
DROP POLICY IF EXISTS "Admin Recruitment" ON public.uba_identities;
CREATE POLICY "Admin Recruitment" ON public.uba_identities
FOR INSERT TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com') OR 
  ((auth.jwt() -> 'user_metadata' ->> 'role' = 'school_admin') AND (hub_id = auth.jwt() -> 'user_metadata' ->> 'hubId'))
);

-- Admin Management (Update/Delete)
DROP POLICY IF EXISTS "Admin Management" ON public.uba_identities;
CREATE POLICY "Admin Management" ON public.uba_identities
FOR ALL TO authenticated
USING (
  (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com') OR 
  ((hub_id = auth.jwt() -> 'user_metadata' ->> 'hubId') AND (auth.jwt() -> 'user_metadata' ->> 'role' = 'school_admin'))
);

-- 2. INSTITUTIONAL PERSISTENCE POLICIES (Facilitator Visibility)

DROP POLICY IF EXISTS "Hub Shard Isolation" ON public.uba_persistence;
CREATE POLICY "Hub Shard Isolation" ON public.uba_persistence
FOR ALL TO authenticated
USING (
    (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com') OR
    (user_id = auth.uid()) OR 
    ((auth.jwt() -> 'user_metadata' ->> 'role' = 'school_admin') AND hub_id = (auth.jwt() -> 'user_metadata' ->> 'hubId')) OR
    -- Facilitator visibility logic
    ((auth.jwt() -> 'user_metadata' ->> 'role' = 'facilitator') AND hub_id = (auth.jwt() -> 'user_metadata' ->> 'hubId') AND (COALESCE(payload->>'visibility', '') != 'admin_only')) OR
    ((auth.jwt() -> 'user_metadata' ->> 'role' = 'pupil') AND user_id = auth.uid())
);

-- 3. AUDIT TRAIL POLICIES
DROP POLICY IF EXISTS "Audit Visibility" ON public.uba_audit;
CREATE POLICY "Audit Visibility" ON public.uba_audit
FOR ALL TO authenticated
USING (
    (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com') OR (target = (auth.jwt() -> 'user_metadata' ->> 'hubId'))
);

-- HQ INITIALIZATION
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
VALUES ('leumasgenbo4@gmail.com', 'HQ CONTROLLER', 'MASTER-NODE-01', 'NETWORK', 'school_admin')
ON CONFLICT (email) DO NOTHING;