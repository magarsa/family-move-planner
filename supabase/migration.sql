-- ============================================================
-- Family Move Planner — Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor → New query
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
create index if not exists todos_tier_idx on todos(tier);
create index if not exists todos_completed_idx on todos(completed);
create index if not exists branches_status_idx on branches(status);
create index if not exists notes_created_at_idx on notes(created_at desc);
create index if not exists whatifs_status_idx on whatifs(status);

-- Enable real-time for all tables
-- (Run this in Supabase Dashboard → Database → Replication → Tables)
-- Or use the SQL below:
alter publication supabase_realtime add table profile;
alter publication supabase_realtime add table branches;
alter publication supabase_realtime add table todos;
alter publication supabase_realtime add table whatifs;
alter publication supabase_realtime add table notes;
