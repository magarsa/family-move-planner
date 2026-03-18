-- ============================================================
-- Migration 007: Row Level Security (RLS) Policies
-- Run this in: Supabase Dashboard → SQL Editor → New query
--
-- This is a shared-data family app (2 users, all data is shared).
-- Policy: only authenticated users can read/write any data.
-- Unauthenticated (anon) access is blocked on all tables.
-- ============================================================

-- ----------------------
-- profile
-- ----------------------
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON profile
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- branches
-- ----------------------
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON branches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- todos
-- ----------------------
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON todos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- whatifs
-- ----------------------
ALTER TABLE whatifs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON whatifs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- notes
-- ----------------------
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- properties
-- ----------------------
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON properties
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- schools
-- ----------------------
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON schools
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- property_schools (junction)
-- ----------------------
ALTER TABLE property_schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON property_schools
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- contacts
-- ----------------------
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- contact_notes
-- ----------------------
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON contact_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- reports
-- ----------------------
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- property_improvements
-- ----------------------
ALTER TABLE property_improvements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON property_improvements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- property_readiness_scores
-- ----------------------
ALTER TABLE property_readiness_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON property_readiness_scores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- sale_scenarios
-- ----------------------
ALTER TABLE sale_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON sale_scenarios
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- sale_scenario_items
-- ----------------------
ALTER TABLE sale_scenario_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON sale_scenario_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- sale_timeline_phases
-- ----------------------
ALTER TABLE sale_timeline_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON sale_timeline_phases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- sale_timeline_tasks
-- ----------------------
ALTER TABLE sale_timeline_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON sale_timeline_tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- deadlines
-- ----------------------
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON deadlines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------
-- offers
-- ----------------------
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON offers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
