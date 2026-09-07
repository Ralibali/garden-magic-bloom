-- Photos are transient; only extraction and the user's reviewed seed are retained.
alter table public.seed_inventory add column if not exists crop_key text;
create table public.seed_photo_imports (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 image_hash text not null check (image_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'processing' check(status in ('processing','ready','error')),
 fields jsonb, model text, attempts integer not null default 1,
 lease_id uuid not null default gen_random_uuid(), lease_until timestamptz not null default now()+interval '2 minutes',
 reviewed_seed_id uuid references public.seed_inventory(id) on delete set null,
 reviewed_fields jsonb, reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index seed_photo_imports_owner_created on public.seed_photo_imports(user_id, created_at desc);
alter table public.seed_photo_imports enable row level security;
create policy seed_photo_imports_owner_read on public.seed_photo_imports for select to authenticated using(user_id=auth.uid());
revoke all on public.seed_photo_imports from anon,authenticated;
grant select on public.seed_photo_imports to authenticated;
grant all on public.seed_photo_imports to service_role;

create function public.claim_seed_photo(p_user uuid,p_id uuid,p_hash text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.seed_photo_imports;
begin
 if p_user is null or p_id is null or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Ogiltig bild'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,721));
 select * into r from public.seed_photo_imports where id=p_id for update;
 if found then
  if r.user_id<>p_user or r.image_hash<>p_hash then raise exception 'Bildens identitet stämmer inte'; end if;
  if r.status='ready' then return to_jsonb(r); end if;
  if r.status='processing' and r.lease_until>now() then raise exception 'Bilden bearbetas redan. Vänta en stund.'; end if;
  if r.attempts>=3 then raise exception 'För många försök med samma bild. Lägg in uppgifterna manuellt.'; end if;
 end if;
 if (select coalesce(sum(attempts),0) from public.seed_photo_imports where user_id=p_user and updated_at>now()-interval '1 hour')>=6 then raise exception 'Högst sex avläsningar per timme. Försök senare.'; end if;
 insert into public.seed_photo_imports(id,user_id,image_hash) values(p_id,p_user,p_hash)
 on conflict(id) do update set status='processing',attempts=seed_photo_imports.attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',updated_at=now()
 returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.claim_seed_photo(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_seed_photo(uuid,uuid,text) to service_role;

create function public.save_reviewed_seed(p_import uuid,p_reviewed boolean,p_fields jsonb) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.seed_photo_imports; v_id uuid; v_expiry date;
begin
 if auth.uid() is null then raise exception 'Logga in'; end if;
 select * into r from public.seed_photo_imports where id=p_import and user_id=auth.uid() for update;
 if not found or r.status<>'ready' then raise exception 'Avläsningen saknas'; end if;
 if r.reviewed_at is not null then
  if r.reviewed_fields is distinct from p_fields then raise exception 'Fröet är redan sparat. Öppna det i förrådet för att ändra uppgifterna.'; end if;
  if r.reviewed_seed_id is null then raise exception 'Det importerade fröet har tagits bort'; end if;
  return r.reviewed_seed_id;
 end if;
 if p_reviewed is distinct from true then raise exception 'Granska uppgifterna först'; end if;
 if jsonb_typeof(p_fields)<>'object' or coalesce(length(trim(p_fields->>'variety')),0) not between 1 and 200 or length(p_fields::text)>8000 then raise exception 'Kontrollera sortnamnet och textlängden'; end if;
 if nullif(p_fields->>'expiry_date','') is not null then v_expiry:=(p_fields->>'expiry_date')::date; end if;
 insert into public.seed_inventory(user_id,variety,brand,quantity,expiry_date,notes,crop_key)
 values(auth.uid(),trim(p_fields->>'variety'),nullif(left(p_fields->>'brand',200),''),nullif(left(p_fields->>'quantity',200),''),v_expiry,nullif(left(p_fields->>'notes',5000),''),nullif(left(p_fields->>'crop_key',100),'')) returning id into v_id;
 update public.seed_photo_imports set reviewed_seed_id=v_id,reviewed_fields=p_fields,reviewed_at=now(),updated_at=now() where id=p_import;
 return v_id;
end $$;
revoke all on function public.save_reviewed_seed(uuid,boolean,jsonb) from public,anon;
grant execute on function public.save_reviewed_seed(uuid,boolean,jsonb) to authenticated;

-- A single item is changed under a row lock, retaining concurrent reminders.
create function public.change_garden_reminder(p_action text,p_item jsonb,p_expected jsonb default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare s jsonb; items jsonb; old jsonb; item jsonb; pos bigint;
begin
 if auth.uid() is null then raise exception 'Logga in'; end if;
 insert into public.reminder_settings(user_id) values(auth.uid()) on conflict(user_id) do nothing;
 select coalesce(settings,'{}') into s from public.reminder_settings where user_id=auth.uid() for update;
 items:=coalesce(s->'reminders','[]');
 if p_action='preferences' then
  if jsonb_typeof(p_item->'notifications_enabled')<>'boolean' then raise exception 'Ogiltig inställning'; end if;
  s:=s||jsonb_build_object('notifications_enabled',p_item->'notifications_enabled');
 else
  if coalesce(p_item->>'id','')='' then raise exception 'Påminnelsens identitet saknas'; end if;
  select value,ordinality-1 into old,pos from jsonb_array_elements(items) with ordinality where value->>'id'=p_item->>'id' limit 1;
  if p_action='add' and old is not null then return old; end if;
  if p_action in ('replace','delete') then
   if old is null then raise exception 'Påminnelsen finns inte längre'; end if;
   if p_expected is null or old is distinct from p_expected then raise exception 'Påminnelsen har ändrats. Ladda om listan och försök igen.'; end if;
  elsif p_action<>'add' then raise exception 'Ogiltig åtgärd'; end if;
  if p_action='delete' then items:=items-pos::int; else
   if jsonb_typeof(p_item)<>'object' or coalesce(length(trim(p_item->>'title')),0) not between 1 and 300 or length(p_item::text)>8000 or coalesce(p_item->>'type','') not in ('sowing','transplant','watering','other') or coalesce(p_item->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Kontrollera titel och datum'; end if;
   perform (p_item->>'date')::date;
   item:=p_item||jsonb_build_object('done',coalesce((p_item->>'done')::boolean,false));
   if p_action='add' then
    if jsonb_array_length(items)>=2000 then raise exception 'Listan är full. Rensa äldre påminnelser först.'; end if;
    -- Repeated actions should not create another open reminder for the same task.
    select value into old from jsonb_array_elements(items) where not coalesce((value->>'done')::boolean,false) and value->>'title'=item->>'title' and value->>'date'=item->>'date' and coalesce(value->>'source_action_id','')=coalesce(item->>'source_action_id','') limit 1;
    if old is not null then return old; end if;
    items:=items||jsonb_build_array(item||jsonb_build_object('created_at',now()));
   else items:=jsonb_set(items,array[pos::text],item); end if;
  end if;
  s:=jsonb_set(s,'{reminders}',items,true);
 end if;
 update public.reminder_settings set settings=s where user_id=auth.uid();
 return coalesce(item,s);
end $$;
revoke all on function public.change_garden_reminder(text,jsonb,jsonb) from public,anon;
grant execute on function public.change_garden_reminder(text,jsonb,jsonb) to authenticated;

create table public.seed_sowing_plans (
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
 seed_id uuid references public.seed_inventory(id) on delete set null,
 variety text not null,brand text,zone integer check(zone between 1 and 8),
 place text not null, growing_method text not null check(growing_method in ('outdoor','greenhouse','balcony')),
 light text not null check(light in ('sun','partial','shade')),
 sow_type text not null check(sow_type in ('indoor','direct')),sow_date date not null,transplant_date date,
 request jsonb not null,notes text not null default '',created_at timestamptz not null default now(),
 check(transplant_date is null or transplant_date>=sow_date)
);
create index seed_sowing_plans_owner_date on public.seed_sowing_plans(user_id,sow_date);
alter table public.seed_sowing_plans enable row level security;
create policy seed_sowing_plans_owner_read on public.seed_sowing_plans for select to authenticated using(user_id=auth.uid());
revoke all on public.seed_sowing_plans from anon,authenticated;
grant select on public.seed_sowing_plans to authenticated;
create function public.create_seed_sowing_plan(p_id uuid,p_seed uuid,p_plan jsonb) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare seed public.seed_inventory; r public.seed_sowing_plans; v_sow date; v_transplant date;
begin
 if auth.uid() is null or p_id is null then raise exception 'Logga in'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,722));
 select * into r from public.seed_sowing_plans where id=p_id;
 if found then
  if r.user_id<>auth.uid() then raise exception 'Planen kunde inte hittas'; end if;
  if r.request is distinct from p_plan or r.seed_id is distinct from p_seed then raise exception 'Planen är redan sparad. Kontrollera den under Dina såplaner.'; end if;
  return r.id;
 end if;
 select * into seed from public.seed_inventory where id=p_seed and user_id=auth.uid() for key share;
 if not found then raise exception 'Fröet saknas i ditt förråd'; end if;
 if jsonb_typeof(p_plan)<>'object' or coalesce(length(trim(p_plan->>'place')),0) not between 1 and 200 or length(p_plan::text)>8000 then raise exception 'Ange odlingsplats'; end if;
 if p_plan->'reviewed' is distinct from 'true'::jsonb then raise exception 'Granska planens datum först'; end if;
 v_sow:=(p_plan->>'sow_date')::date; v_transplant:=nullif(p_plan->>'transplant_date','')::date;
 if v_sow is null or v_sow<current_date or v_sow>current_date+730 or (v_transplant is not null and (v_transplant<v_sow or v_transplant>v_sow+365)) then raise exception 'Välj kommande datum inom två år, utplantering inom ett år från sådd'; end if;
 insert into public.seed_sowing_plans(id,user_id,seed_id,variety,brand,zone,place,growing_method,light,sow_type,sow_date,transplant_date,notes,request)
 values(p_id,auth.uid(),seed.id,seed.variety,seed.brand,nullif(p_plan->>'zone','')::integer,trim(p_plan->>'place'),p_plan->>'growing_method',p_plan->>'light',p_plan->>'sow_type',v_sow,v_transplant,coalesce(left(p_plan->>'notes',5000),''),p_plan);
 perform public.change_garden_reminder('add',jsonb_build_object('id',p_id::text||':sow','title','Så '||left(seed.variety,180),'type','sowing','date',v_sow,'done',false,'source','seed_plan','source_action_id',p_id,'bed',p_plan->>'place'));
 if v_transplant is not null then
  perform public.change_garden_reminder('add',jsonb_build_object('id',p_id::text||':transplant','title','Plantera ut '||left(seed.variety,180),'type','transplant','date',v_transplant,'done',false,'source','seed_plan','source_action_id',p_id,'bed',p_plan->>'place'));
 end if;
 return p_id;
end $$;
revoke all on function public.create_seed_sowing_plan(uuid,uuid,jsonb) from public,anon;
grant execute on function public.create_seed_sowing_plan(uuid,uuid,jsonb) to authenticated;

-- Reconcile additive columns already used by the sowing form but absent on older deployments.
alter table public.sowings add column if not exists crop_key text,add column if not exists variety_name text,
 add column if not exists seed_inventory_id uuid references public.seed_inventory(id) on delete set null;
create index if not exists sowings_seed_inventory_id_idx on public.sowings(seed_inventory_id);
create function public.check_sowing_seed_owner() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.seed_inventory_id is not null and not exists(select 1 from public.seed_inventory where id=new.seed_inventory_id and user_id=new.user_id) then raise exception 'Fröpartiet tillhör inte såddens ägare'; end if;
 return new;
end $$;
revoke all on function public.check_sowing_seed_owner() from public,anon,authenticated;
create trigger sowing_seed_owner before insert or update of seed_inventory_id,user_id on public.sowings for each row execute function public.check_sowing_seed_owner();
