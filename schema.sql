
-- ==========================================================
-- SS-map ACADEMY - COMPREHENSIVE DATABASE SCHEMA & STATE MAP
-- ==========================================================
-- This schema represents the dual-layer architecture:
-- 1. Identity Layer: Handles Recall Handshake (Login)
-- 2. Persistence Layer: Handles all institutional data nodes
-- ==========================================================

-- ----------------------------------------------------------
-- TABLE 1: uba_identities (THE LOGIN RECALL HUB)
-- ----------------------------------------------------------
-- CRITICAL: This table is consulted during the Login Portal "Identity Recall" step.
-- The "Triple-Handshake" validates Email, Name, and Node ID.

CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,             -- User Email (Used for OTP dispatch)
    full_name TEXT NOT NULL,            -- HANDSHAKE FIELD 1: Exact legal name (Uppercase)
    node_id TEXT NOT NULL,              -- HANDSHAKE FIELD 2: System ID (Hub ID, FAC-ID, or Pupil Index)
    hub_id TEXT NOT NULL,               -- The parent institution ID (links users to their academy)
    role TEXT NOT NULL                  -- 'school_admin', 'facilitator', 'pupil'
);

-- RECALL DATA MAP:
-- School Admin: node_id = Institutional Hub ID (e.g., SMA-2025-4812)
-- Facilitator:  node_id = Staff Enrolled ID (e.g., FAC-721)
-- Pupil:        node_id = Pupil Index ID (e.g., 101)

-- ----------------------------------------------------------
-- TABLE 2: uba_persistence (INSTITUTIONAL SHARD STORAGE)
-- ----------------------------------------------------------
-- This table stores all application data in JSONB payloads.

CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,               -- Shard Unique Key (e.g., "SMA-ID_settings")
    hub_id TEXT NOT NULL,              -- Parent Institutional ID
    payload JSONB NOT NULL,            -- Document Data (Objects/Arrays)
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID DEFAULT auth.uid()    -- Owner ID (Supabase Auth link)
);

-- DATA STATE DOCUMENTATION (Payload Shapes):
-- id: "[HUB_ID]_settings"     -> payload: GlobalSettings Object
-- id: "[HUB_ID]_students"     -> payload: StudentData Array []
-- id: "[HUB_ID]_facilitators" -> payload: Record<string, StaffAssignment>
-- id: "registry_[HUB_ID]"     -> payload: SchoolRegistryEntry Array []
-- id: "forward_[HUB_ID]"      -> payload: ForwardingData Object (Feedback/Payments)
-- id: "serialization_[HUB_ID]_[MOCK]" -> payload: SerializationData Object
-- id: "master_bank_[SUBJECT]" -> payload: MasterQuestion Array []
-- id: "likely_[SUB]_[FAC]"    -> payload: MasterQuestion Array [] (Facilitator Drafts)
-- id: "global_advertisements" -> payload: { message: string, author: string }
-- id: "audit"                 -> payload: SystemAuditEntry Array []

-- ----------------------------------------------------------
-- SECURITY POLICIES (Row Level Security)
-- ----------------------------------------------------------
ALTER TABLE public.uba_persistence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_identities ENABLE ROW LEVEL SECURITY;

-- 1. Identity Gate Policy: Allows the Login Portal to lookup particulars before sending OTP.
DROP POLICY IF EXISTS "Identity Gate Lookup" ON public.uba_identities;
CREATE POLICY "Identity Gate Lookup" ON public.uba_identities FOR SELECT TO anon, authenticated USING (true);

-- 2. Persistence Shard Access: Users can only see shards belonging to their hub_id (via JWT metadata).
DROP POLICY IF EXISTS "Hub Member Access" ON public.uba_persistence;
CREATE POLICY "Hub Member Access" ON public.uba_persistence
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'hubId') = hub_id
        OR (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com'
    );

-- 3. High Command Policy (SuperAdmin): Master email has full bypass to all shards.
DROP POLICY IF EXISTS "SuperAdmin Master Access" ON public.uba_persistence;
CREATE POLICY "SuperAdmin Master Access" ON public.uba_persistence
    FOR ALL
    TO authenticated
    USING ( (auth.jwt() ->> 'email') = 'leumasgenbo4@gmail.com' );

-- ----------------------------------------------------------
-- SAMPLE INITIAL STATE (For Reference)
-- ----------------------------------------------------------
/*
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role) 
VALUES ('leumasgenbo4@gmail.com', 'HQ CONTROLLER', 'UBA-HQ-MASTER', 'NETWORK', 'school_admin');

-- Example of a School Admin Shard Entry:
-- id: "SMA-2025-1001_settings"
-- hub_id: "SMA-2025-1001"
-- payload: { "schoolName": "SS-map ACADEMY", "schoolAddress": "...", ... }
*/
