-- Prenumererbar odlingskalender (webcal/iCal). Varje användare kan ha en hemlig
-- länk. Bara en SHA-256-hash av token sparas; själva token visas en gång när den
-- skapas. Tabellen nås aldrig direkt av klienter – bara via RPC:erna nedan och
-- av edge functionen calendar-feed med service role.
create table public.calendar_feed_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz
);
alter table public.calendar_feed_tokens enable row level security;
revoke all on public.calendar_feed_tokens from anon, authenticated;
grant all on public.calendar_feed_tokens to service_role;

-- Skapar (eller byter) användarens hemliga länk och returnerar token i klartext.
-- En ny token gör den gamla länken ogiltig direkt.
create or replace function public.create_calendar_feed_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  token text;
begin
  if uid is null then raise exception 'Logga in'; end if;
  -- Två UUID v4 ger 244 slumpbitar utan att kräva pgcrypto.
  token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.calendar_feed_tokens(user_id, token_hash)
  values (uid, encode(sha256(convert_to(token, 'UTF8')), 'hex'))
  on conflict (user_id) do update
    set token_hash = excluded.token_hash, created_at = now(), last_accessed_at = null;
  return token;
end;
$$;

-- Stänger av länken helt.
create or replace function public.revoke_calendar_feed_token()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Logga in'; end if;
  delete from public.calendar_feed_tokens where user_id = auth.uid();
end;
$$;

-- Om länken finns och när en kalender senast hämtade den. Aldrig själva hashen.
create or replace function public.calendar_feed_status()
returns table(created_at timestamptz, last_accessed_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select t.created_at, t.last_accessed_at
  from public.calendar_feed_tokens t
  where t.user_id = auth.uid();
$$;

-- Används bara av edge functionen: slår upp ägaren till en token-hash och
-- noterar hämtningen (högst en skrivning per timme per länk).
create or replace function public.resolve_calendar_feed(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then return null; end if;
  update public.calendar_feed_tokens
    set last_accessed_at = now()
    where token_hash = p_token_hash
      and (last_accessed_at is null or last_accessed_at < now() - interval '1 hour');
  select user_id into owner from public.calendar_feed_tokens where token_hash = p_token_hash;
  return owner;
end;
$$;

revoke all on function public.create_calendar_feed_token() from public, anon;
revoke all on function public.revoke_calendar_feed_token() from public, anon;
revoke all on function public.calendar_feed_status() from public, anon;
revoke all on function public.resolve_calendar_feed(text) from public, anon, authenticated;
grant execute on function public.create_calendar_feed_token() to authenticated;
grant execute on function public.revoke_calendar_feed_token() to authenticated;
grant execute on function public.calendar_feed_status() to authenticated;
grant execute on function public.resolve_calendar_feed(text) to service_role;
