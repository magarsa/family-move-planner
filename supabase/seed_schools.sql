-- ============================================================
-- Charlotte Area Schools — Family Move Planner
-- Supabase Seed Script
-- Covers: Indian Land, Fort Mill, Tega Cay, Waxhaw
-- Generated: March 2026
--
-- Schema notes:
--   • schools table already exists (migration.sql Migration 002)
--     Columns used: name, district, area, grades, school_type,
--                   greatschools_url, notes
--   • school_checklist_items is a new table created below
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: school_checklist_items  (new — does not exist yet)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_checklist_items (
  id             SERIAL PRIMARY KEY,
  phase_number   INT NOT NULL,
  phase_label    TEXT NOT NULL,
  phase_sublabel TEXT,
  task_text      TEXT NOT NULL,
  task_note      TEXT,
  link           TEXT,
  is_complete    BOOLEAN DEFAULT FALSE,
  sort_order     INT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INSERT: PUBLIC ELEMENTARY SCHOOLS
-- school_type values match app convention: 'Public'
-- address/phone preserved in notes field
-- ============================================================

-- Indian Land, SC — Lancaster County School District
INSERT INTO schools (name, school_type, grades, district, area, greatschools_url, notes) VALUES
(
  'Indian Land Elementary School', 'Public', 'K-5',
  'Lancaster County School District', 'Indian Land',
  'http://iles.lancastercsd.com/',
  '4137 Dobys Bridge Rd, Indian Land SC 29707 | (803) 548-2916'
),
(
  'Harrisburg Elementary School', 'Public', 'K-5',
  'Lancaster County School District', 'Indian Land',
  'http://hes.lancastercsd.com/',
  '10251 Harrisburg Rd, Indian Land SC 29707 | (803) 396-3737'
);

-- Fort Mill, SC — Fort Mill School District
INSERT INTO schools (name, school_type, grades, district, area, greatschools_url, notes) VALUES
(
  'Fort Mill Elementary School', 'Public', 'K-5',
  'Fort Mill School District', 'Fort Mill',
  'http://fmes.fortmillschools.org/',
  '192 Springfield Pkwy, Fort Mill SC 29715 | (803) 547-7546'
),
(
  'Riverview Elementary School', 'Public', 'K-5',
  'Fort Mill School District', 'Fort Mill',
  'http://rves.fortmillschools.org/',
  '1300 Spratt St, Fort Mill SC 29715 | (803) 548-4677'
),
(
  'River Trail Elementary School', 'Public', 'K-5',
  'Fort Mill School District', 'Fort Mill',
  'http://rtes.fortmillschools.org/',
  '1016 Fort Mill Pkwy, Fort Mill SC 29715 | (803) 835-7555'
),
(
  'Sugar Creek Elementary School', 'Public', 'K-5',
  'Fort Mill School District', 'Fort Mill',
  'http://sces.fortmillschools.org/',
  '1599 Farm House Dr, Fort Mill SC 29715 | (803) 835-0150'
),
(
  'Springfield Elementary School', 'Public', 'K-5',
  'Fort Mill School District', 'Fort Mill',
  'http://sfes.fortmillschools.org/',
  '1691 Springfield Pkwy, Fort Mill SC 29715 | (803) 548-8150'
),
(
  'Doby''s Bridge Elementary School', 'Public', 'K-5',
  'Fort Mill School District', 'Fort Mill',
  'http://dbes.fortmillschools.org/',
  '1000 Dragon Way, Fort Mill SC 29715 | (803) 835-5200'
);

-- Tega Cay, SC — Fort Mill School District
INSERT INTO schools (name, school_type, grades, district, area, greatschools_url, notes) VALUES
(
  'Tega Cay Elementary School', 'Public', 'K-5',
  'Fort Mill School District', 'Tega Cay',
  'http://tces.fortmillschools.org/',
  '2185 Gold Hill Rd, Fort Mill SC 29708 | (803) 548-8282'
);

-- Waxhaw, NC — Union County Public Schools
INSERT INTO schools (name, school_type, grades, district, area, greatschools_url, notes) VALUES
(
  'Waxhaw Elementary School', 'Public', 'K-5',
  'Union County Public Schools', 'Waxhaw',
  'https://www.ucps.k12.nc.us/Domain/53',
  '1101 Old Providence Rd, Waxhaw NC 28173 | (704) 290-1590'
),
(
  'New Town Elementary School', 'Public', 'K-5',
  'Union County Public Schools', 'Waxhaw',
  'https://www.ucps.k12.nc.us/newtown',
  '1100 Waxhaw Indian Trail Rd S, Waxhaw NC 28173 | (704) 290-1525'
),
(
  'Kensington Elementary School', 'Public', 'K-5',
  'Union County Public Schools', 'Waxhaw',
  'https://www.ucps.k12.nc.us/Page/31',
  '8701 Kensington Dr, Waxhaw NC 28173 | (704) 290-1500'
),
(
  'Rea View Elementary School', 'Public', 'K-5',
  'Union County Public Schools', 'Waxhaw',
  'https://www.ucps.k12.nc.us/reaview',
  '320 Reid Dairy Rd, Waxhaw NC 28173 | (704) 290-1524'
),
(
  'Western Union Elementary School', 'Public', 'K-5',
  'Union County Public Schools', 'Waxhaw',
  'https://www.ucps.k12.nc.us/Domain/58',
  '4111 Western Union School Rd, Waxhaw NC 28173 | (704) 843-2153'
),
(
  'Marvin Elementary School', 'Public', 'K-5',
  'Union County Public Schools', 'Waxhaw',
  'https://www.ucps.k12.nc.us/Domain/21',
  '9700 Marvin School Rd, Waxhaw NC 28173 | (704) 296-6357 | Serves Marvin/Waxhaw border area'
);

-- ============================================================
-- INSERT: CHARTER & MAGNET SCHOOLS
-- school_type: 'Charter', 'Private', 'Magnet'
-- ============================================================

-- SC Public Charter Schools (York County / near Fort Mill)
INSERT INTO schools (name, school_type, grades, district, area, greatschools_url, notes) VALUES
(
  'Ascent Classical Academy', 'Charter', 'K-12',
  'Independent Charter', 'Fort Mill',
  'https://fortmill.ascentclassical.org/',
  '505 University Dr, Rock Hill SC 29730 | (839) 293-6550 | Classical education model. Open to any SC resident. ~15 min from Fort Mill.'
),
(
  'York Preparatory Academy', 'Charter', 'K-12',
  'Independent Charter', 'Fort Mill',
  'http://www.yorkprepsc.org/',
  '1047 Golden Gate Ct, Rock Hill SC 29732 | (803) 324-4400 | Open to any SC resident. ~20 min from Fort Mill/Tega Cay.'
),
(
  'Riverwalk Academy', 'Charter', 'K-8',
  'Independent Charter', 'Fort Mill',
  'http://www.riverwalkacademy.com/',
  '5750 Mt Gallant Rd, Rock Hill SC 29732 | (803) 327-8400 | Open to any SC resident. ~20 min from Fort Mill/Tega Cay.'
);

-- NC Charter, Private & Magnet (Waxhaw area)
INSERT INTO schools (name, school_type, grades, district, area, greatschools_url, notes) VALUES
(
  'Monroe Charter Academy', 'Charter', 'K-8',
  'Independent Charter', 'Waxhaw',
  'https://monroecharteracademy.org/',
  '7513 Broomes Old Mill Rd, Waxhaw NC 28173 | (980) 210-3627 | No address required to apply; lottery enrollment.'
),
(
  'Thales Academy Waxhaw K-8', 'Private', 'K-8',
  'Independent (Private)', 'Waxhaw',
  'http://www.thalesacademy.org/',
  '8012 New Town Rd, Waxhaw NC 28173 | (704) 256-5370 | Low-tuition private school (~$5K/yr). Strong academic reputation locally.'
),
(
  'Union Preparatory Academy at Indian Trail', 'Magnet', 'K-8',
  'Union County Public Schools', 'Waxhaw',
  'http://indiantrailcharter.org/',
  '2324 Younts Rd, Indian Trail NC 28079 | (704) 893-3607 | UCPS IB Programme magnet. Requires Union County NC address to apply. Lottery enrollment. ~15-20 min from south Waxhaw.'
);

-- ============================================================
-- INSERT: SCHOOL SEARCH CHECKLIST
-- ============================================================

INSERT INTO school_checklist_items (phase_number, phase_label, phase_sublabel, task_text, task_note, link, sort_order) VALUES

-- Phase 1: Right Now
(1, 'Right Now', 'March 2026 — Most Time-Sensitive',
  'Apply to Ascent Classical Academy (Fort Mill, SC)',
  'SC charter — open to any SC resident. Apply before lottery closes.',
  'https://fortmill.ascentclassical.org/', 1),

(1, 'Right Now', 'March 2026 — Most Time-Sensitive',
  'Apply to York Preparatory Academy (Rock Hill, SC)',
  'SC charter — open to any SC resident.',
  'http://www.yorkprepsc.org/', 2),

(1, 'Right Now', 'March 2026 — Most Time-Sensitive',
  'Apply to Riverwalk Academy (Rock Hill, SC)',
  'SC charter — K-8, open enrollment.',
  'http://www.riverwalkacademy.com/', 3),

(1, 'Right Now', 'March 2026 — Most Time-Sensitive',
  'Apply to Monroe Charter Academy (Waxhaw, NC)',
  'NC charter — no address required to apply.',
  'https://monroecharteracademy.org/', 4),

(1, 'Right Now', 'March 2026 — Most Time-Sensitive',
  'Check lottery deadlines for all charter schools',
  'Deadlines vary — check each school website this week.', NULL, 5),

-- Phase 2: Decide SC vs NC
(2, 'Step 1', 'Decide: SC Side or NC Side',
  'Compare Fort Mill SD vs. Union County Public Schools',
  'Fort Mill SD = top-ranked in SC. UCPS = well-regarded in NC with magnet options.', NULL, 6),

(2, 'Step 1', 'Decide: SC Side or NC Side',
  'Decide if IB magnet track (Union Prep Academy, NC) is a priority',
  'Requires Union County NC address — must commit to NC side first.', NULL, 7),

(2, 'Step 1', 'Decide: SC Side or NC Side',
  'Research SC vs NC cost of living, taxes, and commute differences',
  'SC has no state income tax on Social Security; consider property tax differences.', NULL, 8),

-- Phase 3: Research Schools
(3, 'Step 2', 'Research Schools Before Neighborhoods',
  'Look up schools on GreatSchools.org and Niche.com',
  'Read parent reviews, not just star ratings.',
  'https://www.greatschools.org/', 9),

(3, 'Step 2', 'Research Schools Before Neighborhoods',
  'Use Fort Mill SD address lookup tool to check school zoning',
  'Two houses on the same street can feed different schools.',
  'https://www.fortmillschools.org/', 10),

(3, 'Step 2', 'Research Schools Before Neighborhoods',
  'Use UCPS school finder for Waxhaw-area addresses',
  'Verify zoning before falling in love with a house.',
  'https://www.ucps.k12.nc.us/', 11),

(3, 'Step 2', 'Research Schools Before Neighborhoods',
  'Shortlist 2–3 schools you''d be happy with',
  'Include a zoned public school backup AND a charter option.', NULL, 12),

-- Phase 4: Anchor House Search
(4, 'Step 3', 'Anchor Your House Search to a School',
  'For zoned school: search homes only within that attendance zone',
  'Cross-reference every address with the district lookup tool.', NULL, 13),

(4, 'Step 3', 'Anchor Your House Search to a School',
  'For charter school: open up neighborhood search within reasonable commute',
  'Open enrollment = more housing flexibility.', NULL, 14),

(4, 'Step 3', 'Anchor Your House Search to a School',
  'If pursuing UCPS magnet: confirm house is in Union County, NC',
  'Union Prep Academy (Indian Trail) is ~15–20 min from south Waxhaw.', NULL, 15),

(4, 'Step 3', 'Anchor Your House Search to a School',
  'Tell your realtor that school zoning is a priority filter',
  'A good local realtor in this market will know the zones well.', NULL, 16),

-- Phase 5: Visit
(5, 'Step 4', 'Visit Schools & Neighborhoods',
  'Schedule tours at your top 2–3 schools',
  'Contact schools directly — most welcome prospective families.', NULL, 17),

(5, 'Step 4', 'Visit Schools & Neighborhoods',
  'Plan a dedicated trip to the area combining school tours + house showings',
  'Maximize the trip: tour schools in the morning, view homes in the afternoon.', NULL, 18),

(5, 'Step 4', 'Visit Schools & Neighborhoods',
  'Meet the principal or a teacher during each tour',
  'Culture and leadership tell you more than any ratings website.', NULL, 19),

-- Phase 6: Enroll
(6, 'Step 5', 'Finalize Housing & Enroll',
  'Secure housing (close or sign lease)',
  'You will need a local address to complete enrollment.', NULL, 20),

(6, 'Step 5', 'Finalize Housing & Enroll',
  'Enroll in zoned school OR accept charter/magnet lottery spot',
  'If you won a charter lottery, confirm your spot at this stage.', NULL, 21),

(6, 'Step 5', 'Finalize Housing & Enroll',
  'Gather enrollment documents: birth certificate, immunization records, proof of address',
  'Requirements are similar across SC and NC districts.', NULL, 22),

(6, 'Step 5', 'Finalize Housing & Enroll',
  'Register for kindergarten by district deadline',
  'Fort Mill SD and UCPS typically open kindergarten registration in spring.', NULL, 23);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Count by type
SELECT school_type, COUNT(*) AS total FROM schools GROUP BY school_type ORDER BY total DESC;

-- Count by area
SELECT area, COUNT(*) AS total FROM schools GROUP BY area ORDER BY area;

-- All checklist items by phase
SELECT phase_number, phase_label, COUNT(*) AS tasks
FROM school_checklist_items
GROUP BY phase_number, phase_label
ORDER BY phase_number;
