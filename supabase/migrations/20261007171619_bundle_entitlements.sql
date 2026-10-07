-- Independent entitlement: never replaces a trial, lifetime or App Store subscription.
create table if not exists public.bundle_entitlements (
 user_id uuid primary key references auth.users(id) on delete cascade,
 active_until timestamptz,
 verified_at timestamptz not null,
 active boolean not null default false
);
alter table public.bundle_entitlements enable row level security;
revoke all on public.bundle_entitlements from public,anon,authenticated;
grant all on public.bundle_entitlements to service_role;
create or replace function public.apply_bundle_entitlement(p_user uuid,p_active boolean,p_until timestamptz,p_observed timestamptz) returns void
language sql security definer set search_path='' as $$
 insert into public.bundle_entitlements(user_id,active,active_until,verified_at) values(p_user,p_active,p_until,p_observed)
 on conflict(user_id) do update set active=excluded.active,active_until=excluded.active_until,verified_at=excluded.verified_at
 where excluded.verified_at>=public.bundle_entitlements.verified_at;
$$;
revoke all on function public.apply_bundle_entitlement(uuid,boolean,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.apply_bundle_entitlement(uuid,boolean,timestamptz,timestamptz) to service_role;

-- Keep client-side plan limits honest at the database boundary.
-- Premium/trial users are represented by subscription_status = 'premium'.

create or replace function public.enforce_free_garden_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_plus boolean := false;
  current_count integer := 0;
  allowed_count integer := 0;
  error_code text := '';
begin
  select coalesce(subscription_status = 'premium', false)
    into is_plus
  from public.profiles
  where user_id = new.user_id;

  is_plus := is_plus or exists(select 1 from public.bundle_entitlements where user_id=new.user_id and active and active_until>now());

  if is_plus then
    return new;
  end if;

  if tg_table_name = 'beds' then
    allowed_count := 3;
    error_code := 'FREE_BED_LIMIT';
  elsif tg_table_name = 'sowings' then
    allowed_count := 10;
    error_code := 'FREE_SOWING_LIMIT';
  else
    return new;
  end if;

  execute format('select count(*) from public.%I where user_id = $1', tg_table_name)
    into current_count
    using new.user_id;

  if current_count >= allowed_count then
    raise exception using
      errcode = 'P0001',
      message = error_code,
      detail = format('Gratisversionens gräns är %s poster i %s.', allowed_count, tg_table_name),
      hint = 'Uppgradera till Plus eller ta bort en befintlig post.';
  end if;

  return new;
end;
$$;
