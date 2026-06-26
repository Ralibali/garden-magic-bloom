begin;

create unique index if not exists gro_usage_user_date_key
  on public.gro_usage (user_id, usage_date);

create or replace function public.consume_gro_quota(
  p_user_id uuid,
  p_usage_date date,
  p_limit integer default 3
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;
  if p_limit < 1 then
    raise exception 'limit must be positive';
  end if;

  insert into public.gro_usage (user_id, usage_date, message_count, created_at, updated_at)
  values (p_user_id, p_usage_date, 1, now(), now())
  on conflict (user_id, usage_date)
  do update
    set message_count = public.gro_usage.message_count + 1,
        updated_at = now()
    where public.gro_usage.message_count < p_limit
  returning message_count into v_count;

  return v_count;
end;
$$;

revoke all on function public.consume_gro_quota(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.consume_gro_quota(uuid, date, integer) to service_role;

create unique index if not exists reminder_settings_user_id_key
  on public.reminder_settings (user_id);

create or replace function public.merge_reminder_settings(p_patch jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_settings jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.reminder_settings (user_id, settings, updated_at)
  values (auth.uid(), coalesce(p_patch, '{}'::jsonb), now())
  on conflict (user_id)
  do update
    set settings = coalesce(public.reminder_settings.settings::jsonb, '{}'::jsonb) || coalesce(excluded.settings::jsonb, '{}'::jsonb),
        updated_at = now()
  returning settings::jsonb into v_settings;

  return v_settings;
end;
$$;

revoke all on function public.merge_reminder_settings(jsonb) from public, anon;
grant execute on function public.merge_reminder_settings(jsonb) to authenticated;

create table if not exists public.garden_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  reminder_type text not null default 'other' check (reminder_type in ('sowing', 'transplant', 'watering', 'other')),
  due_date date not null,
  done boolean not null default false,
  bed text,
  source_action_id text,
  source_pest_log_id uuid references public.pest_logs(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists garden_reminders_user_due_idx
  on public.garden_reminders (user_id, done, due_date);

create unique index if not exists garden_reminders_open_source_action_key
  on public.garden_reminders (user_id, source_action_id)
  where source_action_id is not null and done = false;

alter table public.garden_reminders enable row level security;

create policy "Users can read their own reminders"
  on public.garden_reminders for select
  using (auth.uid() = user_id);

create policy "Users can create their own reminders"
  on public.garden_reminders for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reminders"
  on public.garden_reminders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own reminders"
  on public.garden_reminders for delete
  using (auth.uid() = user_id);

insert into public.garden_reminders (
  id,
  user_id,
  title,
  reminder_type,
  due_date,
  done,
  bed,
  source_action_id,
  source_pest_log_id,
  created_at,
  completed_at,
  updated_at
)
select
  case
    when item->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (item->>'id')::uuid
    else gen_random_uuid()
  end,
  settings.user_id,
  left(coalesce(nullif(item->>'title', ''), 'Påminnelse'), 240),
  case when item->>'type' in ('sowing', 'transplant', 'watering', 'other') then item->>'type' else 'other' end,
  coalesce(nullif(item->>'date', '')::date, current_date),
  coalesce((item->>'done')::boolean, false),
  nullif(item->>'bed', ''),
  nullif(item->>'source_action_id', ''),
  case
    when item->>'source_pest_log_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (item->>'source_pest_log_id')::uuid
    else null
  end,
  coalesce(nullif(item->>'created_at', '')::timestamptz, now()),
  nullif(item->>'completed_at', '')::timestamptz,
  now()
from public.reminder_settings as settings
cross join lateral jsonb_array_elements(coalesce(settings.settings::jsonb->'reminders', '[]'::jsonb)) as item
on conflict (id) do nothing;

update public.reminder_settings
set settings = coalesce(settings::jsonb, '{}'::jsonb) - 'reminders',
    updated_at = now()
where coalesce(settings::jsonb, '{}'::jsonb) ? 'reminders';

create or replace function public.sync_garden_reminders_json(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reminders jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'id', id,
        'title', title,
        'type', reminder_type,
        'date', due_date,
        'done', done,
        'bed', bed,
        'created_at', created_at,
        'completed_at', completed_at,
        'source_action_id', source_action_id,
        'source_pest_log_id', source_pest_log_id
      ))
      order by done asc, due_date asc, created_at asc
    ),
    '[]'::jsonb
  ) into v_reminders
  from public.garden_reminders
  where user_id = p_user_id;

  insert into public.reminder_settings (user_id, settings, updated_at)
  values (p_user_id, jsonb_build_object('reminders', v_reminders), now())
  on conflict (user_id)
  do update
    set settings = jsonb_set(coalesce(public.reminder_settings.settings::jsonb, '{}'::jsonb), '{reminders}', v_reminders, true),
        updated_at = now();
end;
$$;

create or replace function public.sync_garden_reminders_json_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_garden_reminders_json(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_garden_reminders_json_after_change on public.garden_reminders;
create trigger sync_garden_reminders_json_after_change
after insert or update or delete on public.garden_reminders
for each row execute function public.sync_garden_reminders_json_trigger();

do $$
declare
  reminder_user record;
begin
  for reminder_user in select distinct user_id from public.garden_reminders loop
    perform public.sync_garden_reminders_json(reminder_user.user_id);
  end loop;
end;
$$;

revoke all on function public.sync_garden_reminders_json(uuid) from public, anon, authenticated;
revoke all on function public.sync_garden_reminders_json_trigger() from public, anon, authenticated;

commit;
