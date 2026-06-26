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

revoke all on function public.enforce_free_garden_limits() from public;

drop trigger if exists enforce_free_bed_limit on public.beds;
create trigger enforce_free_bed_limit
before insert on public.beds
for each row execute function public.enforce_free_garden_limits();

drop trigger if exists enforce_free_sowing_limit on public.sowings;
create trigger enforce_free_sowing_limit
before insert on public.sowings
for each row execute function public.enforce_free_garden_limits();
