-- Additive garden map, explicit invitations and a members-only seed exchange.
begin;
create schema if not exists garden_private;
revoke all on schema garden_private from public, anon;
grant usage on schema garden_private to authenticated;
create table if not exists public.garden_members (
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  joined_at timestamptz not null default now(),
  primary key(owner_id,member_id), check(owner_id <> member_id)
);
create index if not exists garden_members_member on public.garden_members(member_id,owner_id);
alter table public.garden_members enable row level security;
create policy garden_members_read on public.garden_members for select to authenticated using ((select auth.uid()) in (owner_id,member_id));
create policy garden_members_remove on public.garden_members for delete to authenticated using ((select auth.uid()) in (owner_id,member_id));
grant select,delete on public.garden_members to authenticated;
revoke all on public.garden_members from anon;
-- Private definer avoids a beds -> membership -> beds RLS recursion. No user data returned.
create or replace function garden_private.can_use_bed(p_bed uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists (
    select 1 from public.beds b where b.id=p_bed and
    (b.user_id=auth.uid() or exists(select 1 from public.garden_members m where m.owner_id=b.user_id and m.member_id=auth.uid()))
  );
$$;
revoke all on function garden_private.can_use_bed(uuid) from public,anon;
grant execute on function garden_private.can_use_bed(uuid) to authenticated;
create policy garden_shared_beds on public.beds for select to authenticated using (garden_private.can_use_bed(id));
create table if not exists garden_private.invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default now()+interval '7 days',
  used_at timestamptz
);
alter table garden_private.invitations enable row level security;
revoke all on garden_private.invitations from public,anon,authenticated;
create or replace function public.create_garden_invitation() returns text
language plpgsql security definer set search_path='' as $$
declare token text; begin
  if auth.uid() is null then raise exception 'Logga in först'; end if;
  if (select count(*) from garden_private.invitations where owner_id=auth.uid() and used_at is null and expires_at>now())>=10 then raise exception 'Du har redan tio aktiva inbjudningar'; end if;
  token := replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into garden_private.invitations(owner_id,token_hash) values(auth.uid(),encode(sha256(convert_to(token,'UTF8')),'hex'));
  return token;
end; $$;
create or replace function public.accept_garden_invitation(p_token text,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare invitation garden_private.invitations; begin
  if auth.uid() is null or length(p_token)<>64 then raise exception 'Logga in och använd en giltig inbjudan'; end if;
  if length(trim(p_name)) not between 1 and 80 then raise exception 'Ange ditt namn'; end if;
  select * into invitation from garden_private.invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
  if not found or invitation.used_at is not null or invitation.expires_at<=now() then raise exception 'Inbjudan har gått ut eller redan använts'; end if;
  if invitation.owner_id=auth.uid() then raise exception 'Du äger redan denna odling'; end if;
  insert into public.garden_members(owner_id,member_id,display_name) values(invitation.owner_id,auth.uid(),trim(p_name)) on conflict(owner_id,member_id) do update set display_name=excluded.display_name;
  update garden_private.invitations set used_at=now() where id=invitation.id;
  return invitation.owner_id;
end; $$;
create or replace function public.revoke_garden_invitations() returns void
language plpgsql security definer set search_path='' as $$ begin
  if auth.uid() is null then raise exception 'Logga in först'; end if;
  update garden_private.invitations set expires_at=now() where owner_id=auth.uid() and used_at is null;
end; $$;
revoke all on function public.create_garden_invitation(),public.accept_garden_invitation(text,text),public.revoke_garden_invitations() from public,anon;
grant execute on function public.create_garden_invitation(),public.accept_garden_invitation(text,text),public.revoke_garden_invitations() to authenticated;
create table if not exists public.bed_layouts (
  bed_id uuid primary key references public.beds(id) on delete cascade,
  x double precision not null default 5, y double precision not null default 5,
  width double precision not null default 24, height double precision not null default 18,
  kind text not null default 'raised' check(kind in ('bed','raised','greenhouse')),
  check(width between 8 and 80 and height between 8 and 80 and x>=0 and y>=0 and x+width<=100 and y+height<=100)
);
create table if not exists public.bed_plantings (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid not null references public.beds(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  year integer not null check(year between 2000 and 2200),
  variety text not null check(length(trim(variety)) between 1 and 120),
  x double precision not null default 50 check(x between 0 and 100),
  y double precision not null default 50 check(y between 0 and 100),
  created_at timestamptz not null default now()
);
create index if not exists bed_plantings_bed_year on public.bed_plantings(bed_id,year);
alter table public.bed_layouts enable row level security;
alter table public.bed_plantings enable row level security;
create policy garden_layout_access on public.bed_layouts for all to authenticated using (garden_private.can_use_bed(bed_id)) with check(garden_private.can_use_bed(bed_id));
create policy garden_plan_read on public.bed_plantings for select to authenticated using (garden_private.can_use_bed(bed_id));
create policy garden_plan_insert on public.bed_plantings for insert to authenticated with check(user_id=(select auth.uid()) and garden_private.can_use_bed(bed_id));
create policy garden_plan_update on public.bed_plantings for update to authenticated using (garden_private.can_use_bed(bed_id)) with check(garden_private.can_use_bed(bed_id));
create policy garden_plan_delete on public.bed_plantings for delete to authenticated using (garden_private.can_use_bed(bed_id));
grant select,insert,update,delete on public.bed_layouts,public.bed_plantings to authenticated;
revoke all on public.bed_layouts,public.bed_plantings from anon;
create or replace function garden_private.keep_log_author() returns trigger language plpgsql set search_path='' as $$ begin
  if new.user_id is distinct from old.user_id then raise exception 'Författaren får inte ändras'; end if;
  if new.bed_id is distinct from old.bed_id and auth.uid() is distinct from old.user_id then raise exception 'Bara författaren får flytta en logg till en annan bädd';end if;
  return new;
end; $$;
create trigger garden_plan_author before update on public.bed_plantings for each row execute function garden_private.keep_log_author();
-- Bed-linked records are shared. Unlinked notes and profile/account settings remain private.
do $$ declare t text; begin
  foreach t in array array['sowings','harvests','pest_logs'] loop
    execute format('create policy garden_shared_read on public.%I for select to authenticated using (garden_private.can_use_bed(bed_id))',t);
    execute format('create policy garden_shared_update on public.%I for update to authenticated using (garden_private.can_use_bed(bed_id)) with check (garden_private.can_use_bed(bed_id))',t);
    execute format('create policy garden_bed_scope on public.%I as restrictive for all to authenticated using (bed_id is null or garden_private.can_use_bed(bed_id)) with check (bed_id is null or garden_private.can_use_bed(bed_id))',t);
    execute format('create trigger garden_keep_author before update on public.%I for each row execute function garden_private.keep_log_author()',t);
  end loop;
end $$;

create table if not exists public.seed_exchange_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check(length(trim(title)) between 2 and 100),
  crop text not null check(length(trim(crop)) between 1 and 100),
  kind text not null check(kind in ('seed','plant')),
  offer text not null check(offer in ('swap','give')),
  locality text not null check(length(trim(locality)) between 1 and 100),
  description text not null default '' check(length(description)<=2000),
  status text not null default 'active' check(status in ('active','closed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '60 days'
);
create index if not exists seed_exchange_open on public.seed_exchange_listings(status,expires_at);
alter table public.seed_exchange_listings enable row level security;
create policy seed_exchange_read on public.seed_exchange_listings for select to authenticated using(user_id=(select auth.uid()) or (status='active' and expires_at>now()));
create policy seed_exchange_owner on public.seed_exchange_listings for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.seed_exchange_listings to authenticated;
revoke all on public.seed_exchange_listings from anon;
create table if not exists public.seed_exchange_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.seed_exchange_listings(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  message text not null check(length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now(),
  check(sender_id<>recipient_id)
);
create index if not exists seed_exchange_messages_thread on public.seed_exchange_messages(listing_id,created_at);
create index if not exists seed_exchange_messages_recipient on public.seed_exchange_messages(recipient_id);
alter table public.seed_exchange_messages enable row level security;
create policy seed_exchange_message_read on public.seed_exchange_messages for select to authenticated using((select auth.uid()) in (sender_id,recipient_id));
create policy seed_exchange_message_write on public.seed_exchange_messages for insert to authenticated with check (
  sender_id=(select auth.uid()) and exists(select 1 from public.seed_exchange_listings l where l.id=listing_id and l.status='active' and l.expires_at>now() and (recipient_id=l.user_id or sender_id=l.user_id))
);
-- Replies may only go to somebody who has contacted this listing owner.
create or replace function garden_private.validate_exchange_message() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid; begin
  select user_id into owner from public.seed_exchange_listings where id=new.listing_id;
  if new.sender_id=owner and not exists(select 1 from public.seed_exchange_messages where listing_id=new.listing_id and sender_id=new.recipient_id and recipient_id=owner) then raise exception 'Välj en befintlig konversation'; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.sender_id::text,0));
  if (select count(*) from public.seed_exchange_messages where sender_id=new.sender_id and created_at>now()-interval '1 hour')>=30 then raise exception 'För många meddelanden. Försök senare.'; end if;
  return new;
end; $$;
create trigger seed_exchange_message_check before insert on public.seed_exchange_messages for each row execute function garden_private.validate_exchange_message();
grant select,insert on public.seed_exchange_messages to authenticated;
revoke all on public.seed_exchange_messages from anon;
revoke all on function garden_private.keep_log_author(),garden_private.validate_exchange_message() from public,anon,authenticated;
create or replace function garden_private.has_exchange_thread(p_listing uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.seed_exchange_messages m where m.listing_id=p_listing and (select auth.uid()) in (m.sender_id,m.recipient_id));
$$;
revoke all on function garden_private.has_exchange_thread(uuid) from public,anon;
grant execute on function garden_private.has_exchange_thread(uuid) to authenticated;
create policy seed_exchange_past_participant on public.seed_exchange_listings for select to authenticated using(garden_private.has_exchange_thread(id));
commit;
