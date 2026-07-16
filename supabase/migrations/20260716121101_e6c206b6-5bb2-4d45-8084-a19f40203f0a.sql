alter table public.profiles
  add column if not exists daily_briefing_enabled boolean not null default true;

create table if not exists public.daily_briefing_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  briefing_date date not null,
  task_count integer not null default 0,
  top_task text,
  created_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);

grant select on public.daily_briefing_log to authenticated;
grant all on public.daily_briefing_log to service_role;

alter table public.daily_briefing_log enable row level security;

create policy "Users can view own briefing log"
  on public.daily_briefing_log
  for select
  to authenticated
  using (auth.uid() = user_id);