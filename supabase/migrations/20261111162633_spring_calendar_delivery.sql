-- Public calendar emails use the project's existing transactional delivery queue.
-- Leads and pilot permissions stay private. The portable link contains only garden choices.
alter table public.public_leads
  add column if not exists pilot_opt_in boolean not null default false,
  add column if not exists calendar_message_id text;

revoke all on public.public_leads from public, anon, authenticated;
grant insert (email, source, plan, page_path, user_agent, consent_marketing)
  on public.public_leads to anon, authenticated;
grant all on public.public_leads to service_role;

create schema if not exists garden_mail;
revoke all on schema garden_mail from public;
grant usage on schema garden_mail to anon, authenticated, service_role;

create or replace function garden_mail.request_calendar(p_email text, p_plan jsonb, p_marketing boolean, p_pilot boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  recipient text := lower(trim(p_email));
  clean_plan jsonb := p_plan - 'channel';
  channel text := p_plan->>'channel';
  message_id text;
  plan_url text;
  unsubscribe_token text;
  html text;
  subject text;
  last_request public.public_leads%rowtype;
  listed_crops text;
begin
  if recipient is null or length(recipient) > 254 or recipient !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or jsonb_typeof(clean_plan) is distinct from 'object' or octet_length(clean_plan::text) > 8192
    or clean_plan->>'type' is distinct from 'sakalender'
    or jsonb_typeof(clean_plan->'season') is distinct from 'number'
    or coalesce(clean_plan->>'season','') !~ '^(20[0-9]{2}|2100)$'
    or coalesce(clean_plan->>'zone','') !~ '^([1-8]|Vet inte)$'
    or coalesce(clean_plan->>'method','') not in ('Pallkrage','Växthus','Friland','Balkong','Krukor')
    or jsonb_typeof(clean_plan->'crops') is distinct from 'array'
    or jsonb_typeof(clean_plan->'varieties') is distinct from 'object'
    or clean_plan - array['type','season','zone','method','crops','varieties'] <> '{}'::jsonb
  then raise exception 'Ogiltig såkalender' using errcode='22023'; end if;
  if jsonb_array_length(clean_plan->'crops') not between 1 and 90
    or exists (select from jsonb_array_elements_text(clean_plan->'crops') c(crop) where c.crop is null or c.crop !~ '^[[:alpha:]][[:alpha:] -]{0,39}$')
    or exists (select from jsonb_each(clean_plan->'varieties') v(k, val) where not (clean_plan->'crops' ? v.k) or jsonb_typeof(v.val) <> 'string' or length(v.val #>> '{}') > 50)
  then raise exception 'Ogiltiga grödor' using errcode='22023'; end if;

  -- A caller can request only this fixed template. Serialize duplicate submissions per recipient.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(recipient, 6735));
  select * into last_request from public.public_leads
    where lower(email)=recipient and source='sakalender' and calendar_message_id is not null
      and (public.public_leads.plan - 'channel') = clean_plan and created_at > now()-interval '15 minutes'
    order by created_at desc limit 1;
  if found and not exists (select from public.email_send_log l where l.message_id=last_request.calendar_message_id and l.status = 'dlq') then
    update public.public_leads set pilot_opt_in=pilot_opt_in or coalesce(p_pilot,false),
      consent_marketing=consent_marketing or coalesce(p_marketing,false) where id=last_request.id;
    return 'accepted';
  end if;
  if (select count(*) from public.public_leads where lower(email)=recipient and calendar_message_id is not null and created_at > now()-interval '24 hours') >= 3 then
    return 'limited';
  end if;
  if exists(select from public.suppressed_emails s where s.email=recipient) then return 'accepted'; end if;
  message_id := 'sakalender-' || gen_random_uuid()::text;
  plan_url := 'https://odlingsdagboken.com/sakalender?via=' ||
    case when channel ~ '^[a-z][a-z0-9-]{0,35}$' then channel else 'planmejl' end ||
    '#plan=' || translate(encode(convert_to(clean_plan::text,'UTF8'),'base64'), E'+/=\n\r','-_');
  -- Only approved crop labels appear in the message. Sort names stay inside the encoded plan.
  select string_agg(c.crop, ', ' order by c.ord) into listed_crops
    from jsonb_array_elements_text(clean_plan->'crops') with ordinality c(crop, ord);
  insert into public.email_unsubscribe_tokens (email, token) values (recipient, gen_random_uuid()::text)
    on conflict (email) do nothing;
  select token into strict unsubscribe_token from public.email_unsubscribe_tokens where email=recipient;
  subject := 'Din såkalender ' || (clean_plan->>'season') || ' från Odlingsdagboken';
  html := '<!doctype html><html lang="sv"><body><h1>' || subject || '</h1><p>' || listed_crops ||
    '</p><p><a href="' || plan_url || '">Öppna min såkalender</a></p><p>Länken öppnar samma sorter och såtider på datorn och mobilen. Du kan ändra ort eller spara planen i din dagbok.</p><p>Odlingsdagboken · Aurora Media AB</p><p><a href="https://ysonnvbkrwajacvdkqut.supabase.co/functions/v1/email-unsubscribe?token=' ||
    unsubscribe_token || '">Avregistrera mejl</a></p></body></html>';
  insert into public.public_leads(email,source,plan,page_path,consent_marketing,pilot_opt_in,calendar_message_id)
    values (recipient,'sakalender',case when channel ~ '^[a-z][a-z0-9-]{0,35}$' then clean_plan || jsonb_build_object('channel',channel) else clean_plan end,'/sakalender',coalesce(p_marketing,false),coalesce(p_pilot,false),message_id);
  insert into public.email_send_log(message_id,template_name,recipient_email,status)
    values(message_id,'lead-plan-sakalender',recipient,'pending');
  perform public.enqueue_email('transactional_emails', jsonb_build_object('message_id',message_id,'idempotency_key',message_id,
    'to',recipient,'from','Odlingsdagboken <no-reply@notify.odlingsdagboken.com>','sender_domain','notify.odlingsdagboken.com',
    'subject',subject,'html',html,
    'text',subject || E'\n\n' || listed_crops || E'\n\nÖppna min såkalender på valfri enhet:\n' || plan_url ||
      E'\n\nOdlingsdagboken · Aurora Media AB\nAvregistrera mejl: https://ysonnvbkrwajacvdkqut.supabase.co/functions/v1/email-unsubscribe?token=' || unsubscribe_token,
    'unsubscribe_token',unsubscribe_token,'purpose','transactional','label','lead-plan-sakalender','queued_at',now()));
  return 'accepted';
end;
$$;

create or replace function public.request_sowing_calendar(p_email text, p_plan jsonb, p_marketing boolean, p_pilot boolean)
returns text language sql security invoker set search_path='' as $$
  select garden_mail.request_calendar(p_email,p_plan,p_marketing,p_pilot);
$$;
revoke all on function garden_mail.request_calendar(text,jsonb,boolean,boolean), public.request_sowing_calendar(text,jsonb,boolean,boolean) from public;
grant execute on function garden_mail.request_calendar(text,jsonb,boolean,boolean), public.request_sowing_calendar(text,jsonb,boolean,boolean) to anon, authenticated, service_role;

-- Merge only this individual preference under existing profile ownership/RLS.
create or replace function public.save_sowing_calendar(p_plan jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if auth.uid() is null or p_plan->>'type' is distinct from 'sakalender' or jsonb_typeof(p_plan->'crops') is distinct from 'array'
    or octet_length(p_plan::text)>10000 then raise exception 'Ogiltig plan eller session'; end if;
  update public.profiles set preferences = coalesce(preferences,'{}'::jsonb) || jsonb_build_object('sowing_calendar',p_plan)
    where user_id = auth.uid();
  if not found then raise exception 'Profilen saknas'; end if;
end;
$$;
revoke all on function public.save_sowing_calendar(jsonb) from public, anon;
grant execute on function public.save_sowing_calendar(jsonb) to authenticated;
