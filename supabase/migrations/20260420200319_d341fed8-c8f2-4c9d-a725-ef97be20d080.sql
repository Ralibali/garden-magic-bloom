-- Enable extensions for HTTP from triggers
create extension if not exists pg_net with schema extensions;

-- Trigger function: ping IndexNow when a SEO page is published
create or replace function public.ping_indexnow_on_publish()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  url_path text;
begin
  -- Only fire when published transitions to true
  if (TG_OP = 'UPDATE' and OLD.published is distinct from NEW.published and NEW.published = true)
     or (TG_OP = 'INSERT' and NEW.published = true) then

    if TG_TABLE_NAME = 'seo_plants' then
      url_path := '/vaxter/' || NEW.slug;
    elsif TG_TABLE_NAME = 'seo_months' then
      url_path := '/manad/' || NEW.slug;
    elsif TG_TABLE_NAME = 'seo_zones' then
      url_path := '/zoner/' || NEW.slug;
    else
      return NEW;
    end if;

    perform net.http_post(
      url := 'https://ysonnvbkrwajacvdkqut.supabase.co/functions/v1/indexnow-ping',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('paths', jsonb_build_array(url_path))
    );
  end if;

  return NEW;
end;
$$;

-- Triggers per table
drop trigger if exists trg_indexnow_seo_plants on public.seo_plants;
create trigger trg_indexnow_seo_plants
after insert or update of published on public.seo_plants
for each row execute function public.ping_indexnow_on_publish();

drop trigger if exists trg_indexnow_seo_months on public.seo_months;
create trigger trg_indexnow_seo_months
after insert or update of published on public.seo_months
for each row execute function public.ping_indexnow_on_publish();

drop trigger if exists trg_indexnow_seo_zones on public.seo_zones;
create trigger trg_indexnow_seo_zones
after insert or update of published on public.seo_zones
for each row execute function public.ping_indexnow_on_publish();