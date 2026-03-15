-- ─────────────────────────────────────────────────────────────────────────────
-- reports table
-- Stores AI-generated HTML reports.  One row per generation run.
-- ─────────────────────────────────────────────────────────────────────────────

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

-- auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reports_updated_at
  before update on reports
  for each row execute function update_updated_at();

-- add to realtime so the React app sees status changes live
alter publication supabase_realtime add table reports;

-- index for listing by type + date
create index reports_type_created on reports (report_type, created_at desc);
