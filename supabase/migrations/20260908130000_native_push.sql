-- Native tokens and delivery jobs are accessible only through authenticated edge
-- functions. Device secrets are never stored in plaintext or exposed by SELECT.
create table public.native_push_installations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_secret_hash text not null check (device_secret_hash ~ '^[a-f0-9]{64}$'),
  generation uuid not null,
  provider text not null check (provider in ('apns','fcm')),
  environment text not null check (environment in ('sandbox','production')),
  app_id text not null,
  token text not null check (length(token) between 32 and 4096),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(provider, environment, app_id, token)
);
create index native_push_owner on public.native_push_installations(user_id) where enabled;
create index native_push_disabled_retention on public.native_push_installations(updated_at) where not enabled;
alter table public.native_push_installations enable row level security;
revoke all on public.native_push_installations from anon, authenticated;
grant all on public.native_push_installations to service_role;

create table public.native_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null references public.native_push_installations(id) on delete cascade,
  generation uuid not null,
  event_key text not null check (length(event_key) between 1 and 160),
  kind text not null check (kind in ('frost','daily','test')),
  state text not null default 'pending' check (state in ('pending','sending','sent','failed')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  available_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  lease_id uuid,
  lease_until timestamptz,
  provider_code text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(installation_id, generation, event_key)
);
create index native_push_pending on public.native_push_deliveries(available_at) where state in ('pending','sending');
create index native_push_delivery_retention on public.native_push_deliveries(created_at);
create index native_push_expiration on public.native_push_deliveries(expires_at) where state in ('pending','sending');
alter table public.native_push_deliveries enable row level security;
revoke all on public.native_push_deliveries from anon, authenticated;
grant all on public.native_push_deliveries to service_role;

create table public.native_push_revocations (
  installation_id uuid not null,
  generation uuid not null,
  device_secret_hash text not null,
  created_at timestamptz not null default now(),
  primary key(installation_id,generation,device_secret_hash)
);
alter table public.native_push_revocations enable row level security;
create index native_push_revocation_retention on public.native_push_revocations(created_at);
revoke all on public.native_push_revocations from anon,authenticated;
grant all on public.native_push_revocations to service_role;

create function public.register_native_push(p_id uuid, p_user uuid, p_secret_hash text,
  p_generation uuid, p_provider text, p_environment text, p_app_id text, p_token text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare old public.native_push_installations%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  if exists(select 1 from public.native_push_revocations where installation_id=p_id and generation=p_generation and device_secret_hash=p_secret_hash) then return false; end if;
  select * into old from public.native_push_installations where id=p_id for update;
  if found and old.device_secret_hash <> p_secret_hash then return false; end if;
  if old.user_id <> p_user and old.generation = p_generation then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 1));
  if (select count(*) from public.native_push_installations where user_id=p_user and enabled and id<>p_id) >= 10 then
    raise exception 'Too many registered devices';
  end if;
  -- Remove jobs bound to an earlier consent/login generation before rebinding.
  delete from public.native_push_deliveries where installation_id=p_id and generation<>p_generation;
  insert into public.native_push_installations(id,user_id,device_secret_hash,generation,provider,environment,app_id,token)
    values(p_id,p_user,p_secret_hash,p_generation,p_provider,p_environment,p_app_id,p_token)
  on conflict(id) do update set user_id=excluded.user_id,generation=excluded.generation,
    provider=excluded.provider,environment=excluded.environment,app_id=excluded.app_id,
    token=excluded.token,enabled=true,updated_at=now();
  return true;
end $$;

create function public.unregister_native_push(p_id uuid, p_secret_hash text, p_generation uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  insert into public.native_push_revocations(installation_id,generation,device_secret_hash)
    values(p_id,p_generation,p_secret_hash) on conflict do nothing;
  -- A delayed logout from A must not disable B, or a newer login by A.
  update public.native_push_installations set enabled=false,updated_at=now()
    where id=p_id and device_secret_hash=p_secret_hash and generation=p_generation;
  if found then
    delete from public.native_push_deliveries where installation_id=p_id and generation=p_generation;
  end if;
end $$;

create function public.enqueue_native_push(p_user uuid, p_event_key text, p_kind text, p_installation uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer; deadline timestamptz := now() + interval '15 minutes';
begin
  if p_kind='frost' and p_event_key ~ '^frost:[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    deadline := (substring(p_event_key from 7)::date + time '09:00') at time zone 'Europe/Stockholm';
  elsif p_kind='daily' and p_event_key ~ '^daily:[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    deadline := (substring(p_event_key from 7)::date + time '18:00') at time zone 'Europe/Stockholm';
  end if;
  insert into public.native_push_deliveries(installation_id,generation,event_key,kind,expires_at)
    select id,generation,p_event_key,p_kind,deadline from public.native_push_installations
    where user_id=p_user and enabled and deadline>now() and (p_installation is null or id=p_installation)
    on conflict(installation_id,generation,event_key) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create function public.claim_native_push(p_installation uuid default null)
returns setof public.native_push_deliveries language plpgsql security definer set search_path = '' as $$
begin
  delete from public.native_push_revocations where created_at<now()-interval '30 days';
  delete from public.native_push_deliveries where created_at<now()-interval '30 days';
  delete from public.native_push_installations where not enabled and updated_at<now()-interval '30 days';
  update public.native_push_deliveries set state='failed',provider_code='expired'
    where state in ('pending','sending') and (expires_at<=now() or (attempts>=3 and lease_until<=now()));
  return query
  with candidate as (
    select d.id from public.native_push_deliveries d
    join public.native_push_installations i on i.id=d.installation_id and i.generation=d.generation and i.enabled
    where d.expires_at>now() and d.attempts<3 and (p_installation is null or i.id=p_installation)
      and ((d.state='pending' and d.available_at<=now()) or (d.state='sending' and d.lease_until<=now()))
    order by d.available_at,d.id for update of d skip locked limit 1
  )
  update public.native_push_deliveries d set state='sending',attempts=d.attempts+1,
    lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes'
    from candidate c where d.id=c.id returning d.*;
end $$;

revoke all on function public.register_native_push(uuid,uuid,text,uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.unregister_native_push(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.enqueue_native_push(uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function public.claim_native_push(uuid) from public,anon,authenticated;
grant execute on function public.register_native_push(uuid,uuid,text,uuid,text,text,text,text) to service_role;
grant execute on function public.unregister_native_push(uuid,text,uuid) to service_role;
grant execute on function public.enqueue_native_push(uuid,text,text,uuid) to service_role;
grant execute on function public.claim_native_push(uuid) to service_role;
