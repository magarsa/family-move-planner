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
