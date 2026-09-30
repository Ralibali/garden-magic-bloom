// Prenumererbar odlingskalender (webcal/iCal). Publik endpoint (verify_jwt = false):
// behörigheten är den hemliga token i länken, som slås upp via sin SHA-256-hash.
// Skapas och stängs av från appen med RPC:erna i 20260930120000_calendar_feed.sql.
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCalendarFeed } from "../_shared/calendarFeed.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve((req) =>
  handleCalendarFeed(req, {
    async resolveOwner(tokenHash) {
      const { data, error } = await admin.rpc("resolve_calendar_feed", { p_token_hash: tokenHash });
      if (error) throw error;
      return typeof data === "string" ? data : null;
    },
    async loadGarden(userId) {
      const [profile, sowings, harvests, settings] = await Promise.all([
        admin.from("profiles").select("climate_zone").eq("user_id", userId).maybeSingle(),
        admin
          .from("sowings")
          .select("id, variety, sow_date, transplant_date, status, type, plant_kind, crop_key, beds(name)")
          .eq("user_id", userId)
          .order("sow_date", { ascending: false })
          .limit(1000),
        admin
          .from("harvests")
          .select("id, variety, harvest_date, weight_grams, beds(name)")
          .eq("user_id", userId)
          .order("harvest_date", { ascending: false })
          .limit(1000),
        admin.from("reminder_settings").select("settings").eq("user_id", userId).maybeSingle(),
      ]);
      for (const result of [profile, sowings, harvests, settings]) if (result.error) throw result.error;
      const reminders = (settings.data?.settings as { reminders?: unknown } | null)?.reminders;
      return {
        zone: (profile.data?.climate_zone as number | null | undefined) ?? null,
        sowings: sowings.data ?? [],
        harvests: harvests.data ?? [],
        reminders: Array.isArray(reminders) ? reminders : [],
      };
    },
  }).catch((error) => {
    console.error("[calendar-feed]", error instanceof Error ? error.message : error);
    return new Response("Kalendern kunde inte hämtas just nu.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "900" },
    });
  })
);
