
-- 1) Revoke EXECUTE from anon/authenticated on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.grant_premium_days(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_activity_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_referral(text, uuid) FROM PUBLIC, anon;

-- Trigger-only functions: no need for anon/authenticated EXECUTE
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_subscription_selfmod() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_subscription_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ping_indexnow_on_publish() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;

-- Keep has_role and get_weekly_signup_count callable (used by RLS and public landing page)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_signup_count() TO authenticated, anon;
-- process_referral is called client-side by signed-in users
GRANT EXECUTE ON FUNCTION public.process_referral(text, uuid) TO authenticated;

-- 2) Update ping_indexnow_on_publish to send service-role Authorization so the
--    now-authenticated indexnow-ping edge function still accepts publish triggers.
CREATE OR REPLACE FUNCTION public.ping_indexnow_on_publish()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  url_path text;
  service_key text;
begin
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

    select decrypted_secret into service_key
    from vault.decrypted_secrets
    where name = 'email_queue_service_role_key'
    limit 1;

    perform net.http_post(
      url := 'https://ysonnvbkrwajacvdkqut.supabase.co/functions/v1/indexnow-ping',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(service_key, '')
      ),
      body := jsonb_build_object('paths', jsonb_build_array(url_path))
    );
  end if;

  return NEW;
end;
$function$;
