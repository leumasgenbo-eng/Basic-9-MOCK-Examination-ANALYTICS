
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
    target TEXT NOT NULL,              -- Usually the hub_id
    actor TEXT NOT NULL,               -- User email
    details TEXT,
    year TEXT DEFAULT EXTRACT(YEAR FROM NOW())::TEXT
);

-- ==========================================================
-- AUTOMATION: IDENTITY SYNC TRIGGER
-- ==========================================================

-- Function to automatically populate or update uba_identities on auth event
CREATE OR REPLACE FUNCTION public.sync_uba_identity()
RETURNS TRIGGER AS $$
BEGIN
  -- This updates the existing pre-recruited row with the new Auth details if exists
  INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'UBA User'),
    COALESCE(NEW.raw_user_meta_data->>'nodeId', NEW.raw_user_meta_data->>'studentId', 'PENDING_NODE'),
    COALESCE(NEW.raw_user_meta_data->>'hubId', 'PENDING_HUB'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    node_id = EXCLUDED.node_id,
    hub_id = EXCLUDED.hub_id;
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

-- 1. IDENTITY RECALL HUB POLICIES

-- Policy: Public Handshake (Allows Login Portal to check identity before OTP)
DROP POLICY IF EXISTS "Public Identity Handshake" ON public.uba_identities;
CREATE POLICY "Public Identity Handshake" ON public.uba_identities
FOR SELECT TO anon, authenticated
USING (true);

-- Policy: Admin Recruitment (Allows Admins to register pupils/staff)
DROP POLICY IF EXISTS "Admin Recruitment" ON public.uba_identities;
CREATE POLICY "Admin Recruitment" ON public.uba_identities
FOR INSERT TO authenticated
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role' = 'school_admin') 
  AND (hub_id = auth.jwt() -> 'user_metadata' ->> 'hubId')
);

-- Policy: Admin Management (Update/Delete members of their own hub)
DROP POLICY IF EXISTS "Admin Management" ON public.uba_identities;
CREATE POLICY "Admin Management" ON public.uba_identities
FOR ALL TO authenticated
USING (
  (hub_id = (auth.jwt() -> 'user_metadata' ->> 'hubId') AND (auth.jwt() -> 'user_metadata' ->> 'role' = 'school_admin'))
  OR (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com')
);

-- 2. INSTITUTIONAL PERSISTENCE POLICIES (Shard Isolation)

DROP POLICY IF EXISTS "Hub Shard Isolation" ON public.uba_persistence;
CREATE POLICY "Hub Shard Isolation" ON public.uba_persistence
FOR ALL TO authenticated
USING (
    -- HQ/Superadmin sees everything
    (auth.jwt() ->> 'email' = 'leumasgenbo4@gmail.com')
    OR 
    -- School Admins see everything in their Hub
    ((auth.jwt() -> 'user_metadata' ->> 'role' = 'school_admin') 
      AND hub_id = (auth.jwt() -> 'user_metadata' ->> 'hubId'))
    OR
    -- Facilitators see data in their Hub, but ONLY if the payload isn't marked 'admin_only'
    ((auth.jwt() -> 'user_metadata' ->> 'role' = 'facilitator') 
      AND hub_id = (auth.jwt() -> 'user_metadata' ->> 'hubId')
      AND (COALESCE(payload->>'visibility', '') != 'admin_only'))
    OR
    -- Pupils only see their own specific data
    ((auth.jwt() -> 'user_metadata' ->> 'role' = 'pupil') 
      AND user_id = auth.uid())
);

-- 3. AUDIT TRAIL POLICIES

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
