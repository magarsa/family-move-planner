-- ============================================================
-- Family Move Planner — Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to re-run: all statements are idempotent
-- ============================================================

-- Ensure UUID generator is available (safe no-op if already installed)
create extension if not exists pgcrypto;

-- ============================================================
-- Helper: auto-update updated_at on any row change
-- ============================================================
create or replace function trg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Migration 001: Core tables
-- ============================================================

-- Master profile key-value store
create table if not exists profile (
  key         text primary key,
  value       text,
  updated_at  timestamptz default now(),
  updated_by  text
);

-- Decision branches
create table if not exists branches (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  status        text default 'Open' check (status in ('Open', 'In Progress', 'Decided')),
  decision_made text,
  options       jsonb,
  notes         text,
  sort_order    int,
  updated_at    timestamptz default now(),
  updated_by    text
);

-- To-do items
create table if not exists todos (
  id           uuid primary key default gen_random_uuid(),
  text         text not null,
  tier         text not null check (tier in ('Do First', 'Do Soon', 'Do When Ready', 'Later')),
  completed    boolean default false,
  completed_at timestamptz,
  completed_by text,
  branch_id    uuid references branches(id) on delete set null,
  created_at   timestamptz default now(),
  created_by   text,
  sort_order   int
);

-- What-if scenarios
create table if not exists whatifs (
  id         uuid primary key default gen_random_uuid(),
  scenario   text not null,
  branch     text,
  status     text default 'Unplanned' check (status in ('Unplanned', 'Monitoring', 'Triggered', 'Resolved')),
  notes      text,
  updated_at timestamptz default now(),
  updated_by text
);

-- Session notes / journal
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  content    text not null,
  author     text,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index if not exists todos_tier_idx       on todos(tier);
create index if not exists todos_completed_idx  on todos(completed);
create index if not exists todos_branch_id_idx  on todos(branch_id);
create index if not exists branches_status_idx  on branches(status);
create index if not exists notes_created_at_idx on notes(created_at desc);
create index if not exists whatifs_status_idx   on whatifs(status);

-- updated_at triggers for tables that have the column
do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_branches'
  ) then
    create trigger set_updated_at_branches
      before update on branches
      for each row execute function trg_set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_whatifs'
  ) then
    create trigger set_updated_at_whatifs
      before update on whatifs
      for each row execute function trg_set_updated_at();
  end if;
end $$;

-- Enable real-time (idempotent — silently skips if table already in publication)
do $$ begin
  alter publication supabase_realtime add table profile;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table branches;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table todos;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table whatifs;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table notes;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- Migration 002: Properties, Schools & AI Analysis
-- ============================================================

-- House leads / property tracker
create table if not exists properties (
  id              uuid primary key default gen_random_uuid(),
  address         text not null,
  area            text,                   -- e.g. "Fort Mill, SC"
  status          text default 'Considering'
                    check (status in ('Considering', 'Visit Scheduled', 'Visited', 'Offer Made', 'Ruled Out', 'Secured')),
  price           int check (price is null or price >= 0),
  beds            int check (beds is null or beds >= 0),
  baths           numeric(3,1) check (baths is null or baths >= 0),
  sqft            int check (sqft is null or sqft >= 0),
  zillow_url      text,
  notes           text,
  branch_id       uuid references branches(id) on delete set null,
  visit_at        timestamptz,            -- scheduled visit datetime
  visit_notes     text,                   -- post-visit debrief
  ai_analysis     jsonb,                  -- cached Claude analysis
  ai_analyzed_at  timestamptz,
  ai_analyzed_by  text,
  added_by        text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  updated_by      text
);

-- Schools tracker
create table if not exists schools (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  district         text,
  area             text,                  -- suburb/zone
  grades           text,                  -- e.g. "K-5", "6-8", "9-12"
  school_type      text,                  -- "Public", "Private", "Charter", "Magnet"
  greatschools_url text,
  notes            text,
  status           text default 'Researching'
                     check (status in ('Researching', 'Toured', 'Top Choice', 'Ruled Out')),
  ai_analysis      jsonb,
  ai_analyzed_at   timestamptz,
  ai_analyzed_by   text,
  added_by         text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  updated_by       text
);

-- Junction: which schools are near a property
create table if not exists property_schools (
  property_id  uuid references properties(id) on delete cascade,
  school_id    uuid references schools(id) on delete cascade,
  primary key (property_id, school_id)
);

-- Indexes
create index if not exists properties_status_idx    on properties(status);
create index if not exists properties_area_idx      on properties(area);
create index if not exists properties_branch_id_idx on properties(branch_id);
create index if not exists properties_visit_at_idx  on properties(visit_at);
create index if not exists schools_status_idx       on schools(status);
create index if not exists schools_area_idx         on schools(area);

-- updated_at triggers for new tables
do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_properties'
  ) then
    create trigger set_updated_at_properties
      before update on properties
      for each row execute function trg_set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_schools'
  ) then
    create trigger set_updated_at_schools
      before update on schools
      for each row execute function trg_set_updated_at();
  end if;
end $$;

-- Enable real-time (idempotent)
do $$ begin
  alter publication supabase_realtime add table properties;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table schools;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- Migration 003: Contacts & Contact Notes
-- ============================================================

-- People and companies involved in the relocation
create table if not exists contacts (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  role                text,
  company             text,
  phone               text,
  email               text,
  website             text,
  status              text default 'Active'
                        check (status in ('Prospect', 'Active', 'Hired', 'Passed')),
  notes               text,
  linked_property_id  uuid references properties(id) on delete set null,
  added_by            text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  updated_by          text
);

-- Conversation log: calls, emails, estimates, etc.
create table if not exists contact_notes (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references contacts(id) on delete cascade,
  content     text not null,
  note_type   text default 'Note'
                check (note_type in ('Note', 'Call', 'Email', 'Meeting', 'Estimate', 'Other')),
  amount      numeric(12,2),
  note_date   timestamptz default now(),
  added_by    text,
  created_at  timestamptz default now()
);

create index if not exists contacts_role_idx         on contacts(role);
create index if not exists contacts_status_idx       on contacts(status);
create index if not exists contact_notes_contact_idx on contact_notes(contact_id);

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_contacts'
  ) then
    create trigger set_updated_at_contacts
      before update on contacts
      for each row execute function trg_set_updated_at();
  end if;
end $$;

do $$ begin
  alter publication supabase_realtime add table contacts;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table contact_notes;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- Migration 004: Property proximity snapshot
-- ============================================================

-- Cached proximity/area data for each property (populated by lookup-property edge function)
alter table properties add column if not exists proximity jsonb;

-- ============================================================
-- Migration 005: AI Reports
-- ============================================================

create table if not exists reports (
  id            uuid primary key default gen_random_uuid(),
  report_type   text not null,                          -- 'move-overview' | 'home-sale' | 'house-hunt'
  title         text not null,
  html_content  text,                                   -- full generated HTML (null while streaming)
  status        text not null default 'pending',        -- 'pending' | 'generating' | 'complete' | 'error'
  requested_by  text,                                   -- matches your existing updated_by pattern
  generated_by  text default 'claude-sonnet-4-6',
  error_message text,
  metadata      jsonb default '{}',                     -- store token counts, duration, etc.
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- auto-update updated_at (reuses the trg_set_updated_at function defined above)
drop trigger if exists reports_updated_at on reports;
create trigger reports_updated_at
  before update on reports
  for each row execute function trg_set_updated_at();

-- add to realtime so the React app sees status changes live
do $$ begin
  alter publication supabase_realtime add table reports;
exception when duplicate_object then null;
end $$;

-- index for listing by type + date
create index if not exists reports_type_created on reports (report_type, created_at desc);

-- ============================================================
-- Migration 006: Home Sale Planner — sell-side structured data
-- Source: Home Sale Planner report for 6805 Brookview Dr
-- ============================================================


-- ============================================================
-- Section 1: Extend existing tables for multi-property support
-- ============================================================

-- Add property_id to todos so checklist items can be scoped per property
alter table todos add column if not exists property_id uuid references properties(id) on delete set null;

create index if not exists todos_property_id_idx on todos(property_id);


-- ============================================================
-- Section 2: New tables
-- ============================================================

-- Completed improvements / equity-building updates on a property
create table if not exists property_improvements (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references properties(id) on delete cascade,
  name            text not null,
  description     text,
  icon            text,                   -- emoji icon for UI
  value_add_low   int,                    -- dollars, null = non-numeric value
  value_add_high  int,
  value_note      text,                   -- e.g. 'Listing Asset', 'Prevents -$3K–$5K'
  status          text not null default 'Done'
                    check (status in ('Done', 'Needs Action', 'Maintained')),
  sort_order      int,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  updated_by      text
);

-- Readiness scores by category (0–100)
create table if not exists property_readiness_scores (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties(id) on delete cascade,
  category     text not null,
  score        int  not null check (score between 0 and 100),
  note         text,                      -- e.g. 'needs staining', 'not started'
  updated_at   timestamptz default now(),
  updated_by   text
);

-- Selling scenarios (As-Is / Cosmetic Refresh / Full Remodel)
create table if not exists sale_scenarios (
  id                  uuid primary key default gen_random_uuid(),
  property_id         uuid not null references properties(id) on delete cascade,
  scenario_number     int  not null,
  title               text not null,
  description         text,
  is_recommended      boolean default false,
  prep_cost_low       int,                -- dollars
  prep_cost_high      int,
  prep_cost_mid       int,
  sale_price_low      int,
  sale_price_high     int,
  net_proceeds_low    int,
  net_proceeds_high   int,
  warning_note        text,               -- risk/ROI callout shown in UI
  sort_order          int,
  updated_at          timestamptz default now(),
  updated_by          text
);

-- Individual cost line items per scenario
create table if not exists sale_scenario_items (
  id           uuid primary key default gen_random_uuid(),
  scenario_id  uuid not null references sale_scenarios(id) on delete cascade,
  label        text not null,
  cost_low     int,
  cost_high    int,
  cost_fixed   int,                       -- use when cost_low = cost_high (single value)
  is_total     boolean default false,     -- true = summary/total row
  sort_order   int
);

-- High-level timeline phases (Week 1-2, Week 3-4, etc.)
create table if not exists sale_timeline_phases (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references properties(id) on delete cascade,
  phase_number  int  not null,
  week_label    text not null,            -- 'Week 1–2'
  date_range    text,                     -- 'March 15–29'
  title         text not null,
  urgency       text default 'normal'
                  check (urgency in ('urgent', 'normal', 'later', 'done')),
  completed     boolean default false,
  sort_order    int
);

-- Individual tasks within each timeline phase
create table if not exists sale_timeline_tasks (
  id           uuid primary key default gen_random_uuid(),
  phase_id     uuid not null references sale_timeline_phases(id) on delete cascade,
  task_text    text not null,
  completed    boolean default false,
  completed_at timestamptz,
  completed_by text,
  sort_order   int
);


-- ============================================================
-- Section 3: Indexes
-- ============================================================

create index if not exists property_improvements_property_idx   on property_improvements(property_id);
create index if not exists property_readiness_property_idx      on property_readiness_scores(property_id);
create index if not exists sale_scenarios_property_idx          on sale_scenarios(property_id);
create index if not exists sale_scenario_items_scenario_idx     on sale_scenario_items(scenario_id);
create index if not exists sale_timeline_phases_property_idx    on sale_timeline_phases(property_id);
create index if not exists sale_timeline_tasks_phase_idx        on sale_timeline_tasks(phase_id);


-- ============================================================
-- Section 4: updated_at triggers (reuses existing function)
-- ============================================================

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_property_improvements') then
    create trigger set_updated_at_property_improvements
      before update on property_improvements
      for each row execute function trg_set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_property_readiness_scores') then
    create trigger set_updated_at_property_readiness_scores
      before update on property_readiness_scores
      for each row execute function trg_set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_sale_scenarios') then
    create trigger set_updated_at_sale_scenarios
      before update on sale_scenarios
      for each row execute function trg_set_updated_at();
  end if;
end $$;


-- ============================================================
-- Section 5: Realtime
-- ============================================================

do $$ begin
  alter publication supabase_realtime add table property_improvements;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table property_readiness_scores;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table sale_scenarios;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table sale_scenario_items;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table sale_timeline_phases;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table sale_timeline_tasks;
exception when duplicate_object then null;
end $$;


-- ============================================================
-- Section 6: Seed data — 6805 Brookview Dr, Urbandale IA
-- Uses CTEs to thread IDs through all child inserts cleanly.
-- ON CONFLICT guards make this safe to re-run.
-- ============================================================

do $$
declare
  v_property_id         uuid := 'c0ffee01-0000-0000-0000-000000000001';
  v_branch_id           uuid := 'c0ffee01-0000-0000-0000-000000000002';
  v_scenario_1_id       uuid := 'c0ffee01-0000-0000-0000-000000000010';
  v_scenario_2_id       uuid := 'c0ffee01-0000-0000-0000-000000000011';
  v_scenario_3_id       uuid := 'c0ffee01-0000-0000-0000-000000000012';
  v_phase_1_id          uuid := 'c0ffee01-0000-0000-0000-000000000020';
  v_phase_2_id          uuid := 'c0ffee01-0000-0000-0000-000000000021';
  v_phase_3_id          uuid := 'c0ffee01-0000-0000-0000-000000000022';
  v_phase_4_id          uuid := 'c0ffee01-0000-0000-0000-000000000023';
  v_phase_5_id          uuid := 'c0ffee01-0000-0000-0000-000000000024';
begin

  -- ----------------------------------------------------------
  -- 6.1  Property
  -- ----------------------------------------------------------
  insert into properties (
    id, address, area, status, price, beds, baths, sqft, notes
  ) values (
    v_property_id,
    '6805 Brookview Dr, Urbandale, IA 50322',
    'Urbandale, IA',
    'Secured',
    345000,
    3,
    3.0,
    1678,
    'Current home — for sale Spring/Summer 2026. Johnston School District. Built 1992. ' ||
    'As-is est. value $320–$345K; target after prep $345–$370K. Median DOM ~88 days.'
  ) on conflict (id) do nothing;


  -- ----------------------------------------------------------
  -- 6.2  Branch — decision to choose selling scenario
  -- ----------------------------------------------------------
  insert into branches (
    id, title, description, status, sort_order
  ) values (
    v_branch_id,
    'Choose Selling Scenario — 6805 Brookview Dr',
    'Decide between 3 prep paths (As-Is, Cosmetic Refresh, Full Remodel) before listing. ' ||
    'Scenario 2 is recommended for best ROI.',
    'Open',
    1
  ) on conflict (id) do nothing;


  -- ----------------------------------------------------------
  -- 6.3  Completed improvements (Done tab)
  -- ----------------------------------------------------------
  insert into property_improvements (
    id, property_id, name, description, icon,
    value_add_low, value_add_high, value_note, status, sort_order
  ) values
    (gen_random_uuid(), v_property_id,
     'Quartz Countertops + Deep SS Sink',
     'Kitchen upgrade — #1 buyer focus area. Dramatically improves perceived quality.',
     '🍽️', 5000, 10000, null, 'Done', 1),

    (gen_random_uuid(), v_property_id,
     'Full Interior Repaint',
     'Whole house freshly painted. Avg ROI: 107%. Creates move-in ready perception.',
     '🎨', 10000, 20000, null, 'Done', 2),

    (gen_random_uuid(), v_property_id,
     'Front + Backyard Landscaping',
     'Significantly improved curb appeal. Homes with strong curb appeal sell for 7% more.',
     '🌿', 5000, 15000, null, 'Done', 3),

    (gen_random_uuid(), v_property_id,
     'New Backyard Deck (Replaced)',
     'New deck installed. Needs staining — unstained reduces perceived value.',
     '🪵', 6000, 12000, null, 'Needs Action', 4),

    (gen_random_uuid(), v_property_id,
     'Driveway Mudjacked + Sealed',
     'Cracks sealed, concrete lifted. Prevents price reduction during inspection.',
     '🚗', null, null, 'Prevents –$3K–$5K', 'Done', 5),

    (gen_random_uuid(), v_property_id,
     'AC / Furnace — Routinely Maintained',
     'Mechanical condition is top 3 buyer concern. Service records = negotiation protection.',
     '❄️', null, null, 'Avoids –$5K–$15K', 'Maintained', 6),

    (gen_random_uuid(), v_property_id,
     'New Refrigerator (2023) + Microwave (2025)',
     'Newer kitchen appliances noted in listing. Buyers appreciate not having to replace.',
     '🍳', null, null, 'Listing Asset', 'Done', 7);


  -- ----------------------------------------------------------
  -- 6.4  Readiness scores by category
  -- ----------------------------------------------------------
  insert into property_readiness_scores (
    id, property_id, category, score, note
  ) values
    (gen_random_uuid(), v_property_id, 'Kitchen',                90, null),
    (gen_random_uuid(), v_property_id, 'Curb Appeal / Exterior', 85, null),
    (gen_random_uuid(), v_property_id, 'Mechanicals (HVAC)',     95, null),
    (gen_random_uuid(), v_property_id, 'Deck / Outdoor Living',  60, 'needs staining'),
    (gen_random_uuid(), v_property_id, 'Bathrooms',              40, 'dated'),
    (gen_random_uuid(), v_property_id, 'Staging / Presentation', 30, 'not started');


  -- ----------------------------------------------------------
  -- 6.5  Selling scenarios
  -- ----------------------------------------------------------
  insert into sale_scenarios (
    id, property_id, scenario_number, title, description, is_recommended,
    prep_cost_low, prep_cost_high, prep_cost_mid,
    sale_price_low, sale_price_high,
    net_proceeds_low, net_proceeds_high,
    warning_note, sort_order
  ) values
    (v_scenario_1_id, v_property_id, 1,
     'Scenario 1 — Sell As-Is with Basic Prep',
     'Deep clean, stain deck, minor touch-ups, professional photography. No bathroom updates. ' ||
     'Best if you need to list quickly within 4–6 weeks.',
     false,
     2200, 2200, 2200,
     320000, 340000,
     318000, 338000,
     'Dated bathrooms typically draw inspection credits of $10,000–$20,000 from buyers. High risk of low offers.',
     1),

    (v_scenario_2_id, v_property_id, 2,
     'Scenario 2 — Cosmetic Bathroom Refresh',
     'Everything in Scenario 1, PLUS a cosmetic bathroom refresh (new vanity, lighting, mirror, ' ||
     'hardware, paint, re-caulk). No tile demo or gut remodel. Target listing May 2026.',
     true,
     7500, 10500, 9000,
     345000, 370000,
     337000, 362000,
     'ROI: every $1 spent on cosmetic bathroom work returns ~$1.71 in home value. ' ||
     'Net proceeds $15K–$25K better than Scenario 1.',
     2),

    (v_scenario_3_id, v_property_id, 3,
     'Scenario 3 — Full Bathroom Remodel',
     'Full gut remodel of primary bathroom, cosmetic secondary bath, new washer/dryer, ' ||
     'full professional staging. 12–16 weeks to list.',
     false,
     19000, 31000, 25000,
     360000, 385000,
     341000, 366000,
     'You spend $15K–$20K more than Scenario 2 but gain only $10K–$20K more in sale price. ' ||
     'Net proceeds may be the same or lower.',
     3);


  -- ----------------------------------------------------------
  -- 6.6  Scenario line items
  -- ----------------------------------------------------------

  -- Scenario 1
  insert into sale_scenario_items (id, scenario_id, label, cost_fixed, is_total, sort_order) values
    (gen_random_uuid(), v_scenario_1_id, 'Deck staining (professional)',  850,  false, 1),
    (gen_random_uuid(), v_scenario_1_id, 'Professional deep clean',        350,  false, 2),
    (gen_random_uuid(), v_scenario_1_id, 'Pre-listing inspection',         400,  false, 3),
    (gen_random_uuid(), v_scenario_1_id, 'Professional photography',       300,  false, 4),
    (gen_random_uuid(), v_scenario_1_id, 'Minor repairs / touch-ups',      300,  false, 5),
    (gen_random_uuid(), v_scenario_1_id, 'TOTAL PREP INVESTMENT',         2200,  true,  6);

  -- Scenario 2
  insert into sale_scenario_items (id, scenario_id, label, cost_fixed, cost_low, cost_high, is_total, sort_order) values
    (gen_random_uuid(), v_scenario_2_id, 'All Scenario 1 items',                    2200,  null, null,  false, 1),
    (gen_random_uuid(), v_scenario_2_id, 'Primary bathroom cosmetic refresh',        null,  2500, 3500,  false, 2),
    (gen_random_uuid(), v_scenario_2_id, 'Secondary bathroom cosmetic refresh',      null,  1500, 2500,  false, 3),
    (gen_random_uuid(), v_scenario_2_id, 'Exterior touch-ups (door, fixtures)',       300,  null, null,  false, 4),
    (gen_random_uuid(), v_scenario_2_id, 'Professional staging consult',              300,  null, null,  false, 5),
    (gen_random_uuid(), v_scenario_2_id, 'TOTAL PREP INVESTMENT',                    null,  7500, 10500, true,  6);

  -- Scenario 3
  insert into sale_scenario_items (id, scenario_id, label, cost_fixed, cost_low, cost_high, is_total, sort_order) values
    (gen_random_uuid(), v_scenario_3_id, 'Full primary bath gut remodel',    null, 12000, 20000, false, 1),
    (gen_random_uuid(), v_scenario_3_id, 'Secondary bath cosmetic refresh',  null,  2500,  4000, false, 2),
    (gen_random_uuid(), v_scenario_3_id, 'New washer & dryer (optional)',     null,  1200,  2000, false, 3),
    (gen_random_uuid(), v_scenario_3_id, 'All Scenario 1 items',             2200,  null,  null, false, 4),
    (gen_random_uuid(), v_scenario_3_id, 'Full professional staging',         null,  1500,  2500, false, 5),
    (gen_random_uuid(), v_scenario_3_id, 'TOTAL PREP INVESTMENT',             null, 19000, 31000, true,  6);


  -- ----------------------------------------------------------
  -- 6.7  Timeline phases + tasks
  -- ----------------------------------------------------------
  insert into sale_timeline_phases (id, property_id, phase_number, week_label, date_range, title, urgency, sort_order) values
    (v_phase_1_id, v_property_id, 1, 'Week 1–2', 'March 15–29',      '🔴 Immediate Actions — Start This Week',  'urgent', 1),
    (v_phase_2_id, v_property_id, 2, 'Week 3–4', 'March 30–April 12','🔵 Repairs Begin',                        'normal', 2),
    (v_phase_3_id, v_property_id, 3, 'Week 5–6', 'April 13–26',      '🟡 Finishing Touches',                    'later',  3),
    (v_phase_4_id, v_property_id, 4, 'Week 7–8', 'April 27–May 10',  '🟢 Photography + Listing',                'done',   4),
    (v_phase_5_id, v_property_id, 5, 'Ongoing',  'Until Closing',    '📦 Active Listing & Showings',             'normal', 5);

  insert into sale_timeline_tasks (id, phase_id, task_text, sort_order) values
    -- Phase 1
    (gen_random_uuid(), v_phase_1_id, 'Book pre-listing home inspection ($300–$425)', 1),
    (gen_random_uuid(), v_phase_1_id, 'Get 2–3 quotes from deck staining contractors', 2),
    (gen_random_uuid(), v_phase_1_id, 'Get 2–3 quotes from bathroom contractors (cosmetic refresh)', 3),
    (gen_random_uuid(), v_phase_1_id, 'Begin decluttering aggressively — closets, garage, basement', 4),
    (gen_random_uuid(), v_phase_1_id, 'Interview 2–3 local listing agents (ask for Urbandale comps)', 5),
    (gen_random_uuid(), v_phase_1_id, 'Request HVAC service records from maintenance company', 6),
    -- Phase 2
    (gen_random_uuid(), v_phase_2_id, 'Receive and review pre-listing inspection report', 1),
    (gen_random_uuid(), v_phase_2_id, 'Address any inspection findings immediately', 2),
    (gen_random_uuid(), v_phase_2_id, 'Deck staining begins (requires dry weather above 50°F)', 3),
    (gen_random_uuid(), v_phase_2_id, 'Bathroom contractor work begins (allow 2 weeks)', 4),
    (gen_random_uuid(), v_phase_2_id, 'Touch up any interior paint scuffs', 5),
    (gen_random_uuid(), v_phase_2_id, 'Power wash driveway + exterior walkways', 6),
    (gen_random_uuid(), v_phase_2_id, 'Clean gutters, refresh mulch in landscape beds', 7),
    -- Phase 3
    (gen_random_uuid(), v_phase_3_id, 'Bathroom work complete — punch list walk-through', 1),
    (gen_random_uuid(), v_phase_3_id, 'Staging consultation (agent or professional stager)', 2),
    (gen_random_uuid(), v_phase_3_id, 'Remove personal photos, excess furniture, knick-knacks', 3),
    (gen_random_uuid(), v_phase_3_id, 'Professional deep clean of entire home ($300–$450)', 4),
    (gen_random_uuid(), v_phase_3_id, 'Replace all burned-out bulbs (warm white LED throughout)', 5),
    (gen_random_uuid(), v_phase_3_id, 'Front door: paint touch-up, new house numbers, fresh welcome mat', 6),
    (gen_random_uuid(), v_phase_3_id, 'Plant seasonal flowers at front entrance', 7),
    -- Phase 4
    (gen_random_uuid(), v_phase_4_id, 'Book professional photographer (HDR + drone aerial)', 1),
    (gen_random_uuid(), v_phase_4_id, 'Finalize listing price with agent based on April comps', 2),
    (gen_random_uuid(), v_phase_4_id, 'Review and approve MLS listing description', 3),
    (gen_random_uuid(), v_phase_4_id, 'Go live Thursday or Friday for maximum weekend traffic', 4),
    (gen_random_uuid(), v_phase_4_id, 'Plan open house for first weekend', 5),
    (gen_random_uuid(), v_phase_4_id, 'Prepare for showings: neutral scent, all lights on, pets out', 6),
    -- Phase 5
    (gen_random_uuid(), v_phase_5_id, 'Maintain home in show-ready condition daily', 1),
    (gen_random_uuid(), v_phase_5_id, 'Review all showing feedback with agent weekly', 2),
    (gen_random_uuid(), v_phase_5_id, 'Evaluate price reduction if no offers after 2 weeks', 3),
    (gen_random_uuid(), v_phase_5_id, 'Review and negotiate all offers with agent', 4),
    (gen_random_uuid(), v_phase_5_id, 'Respond to inspection requests promptly', 5);


  -- ----------------------------------------------------------
  -- 6.8  Profile key — links Selling view to this property
  -- ----------------------------------------------------------
  insert into profile (key, value)
  values ('sell_property_id', 'c0ffee01-0000-0000-0000-000000000001')
  on conflict (key) do nothing;

end $$;
