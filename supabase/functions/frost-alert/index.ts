import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function coordsForZone(zone: number | null): { lat: number; lon: number; name: string } {
  switch (zone) {
    case 1: return { lat: 55.60, lon: 13.00, name: "Malmö" };
    case 2: return { lat: 57.71, lon: 11.97, name: "Göteborg" };
    case 3: return { lat: 59.33, lon: 18.07, name: "Stockholm" };
    case 4: return { lat: 60.67, lon: 15.63, name: "Falun" };
    case 5: return { lat: 62.39, lon: 17.31, name: "Sundsvall" };
    case 6: return { lat: 63.83, lon: 20.26, name: "Umeå" };
    case 7: return { lat: 65.58, lon: 17.54, name: "Vilhelmina" };
    case 8: return { lat: 67.86, lon: 20.22, name: "Kiruna" };
    default: return { lat: 59.33, lon: 18.07, name: "Stockholm" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = req.headers.get("x-cron-secret");
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || secret !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!vapidPublic || !vapidPrivate) {
    return new Response(JSON.stringify({ error: "missing_vapid_keys" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  webpush.setVapidDetails("mailto:info@auroramedia.se", vapidPublic, vapidPrivate);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, climate_zone, location_lat, location_lon, location_name, frost_alerts_enabled")
    .eq("frost_alerts_enabled", true);

  const { data: subs } = await admin.from("push_subscriptions").select("user_id, endpoint, p256dh, auth");
  const subsByUser = new Map<string, any[]>();
  for (const s of subs || []) {
    if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, []);
    subsByUser.get(s.user_id)!.push(s);
  }

  // Group users by rounded coords
  const groups = new Map<string, { lat: number; lon: number; name: string; users: any[] }>();
  for (const p of profiles || []) {
    if (!subsByUser.has(p.user_id)) continue;
    let lat: number, lon: number, name: string;
    if (p.location_lat != null && p.location_lon != null) {
      lat = p.location_lat; lon = p.location_lon; name = p.location_name || "din ort";
    } else {
      const c = coordsForZone(p.climate_zone);
      lat = c.lat; lon = c.lon; name = c.name;
    }
    const key = `${lat.toFixed(1)},${lon.toFixed(1)}`;
    if (!groups.has(key)) groups.set(key, { lat, lon, name, users: [] });
    groups.get(key)!.users.push({ ...p, _name: name });
  }

  // Tomorrow date in Stockholm
  const tomorrowDate = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(Date.now() + 86400000));

  let checked = 0;
  let sent = 0;

  for (const grp of groups.values()) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${grp.lat}&longitude=${grp.lon}&hourly=temperature_2m&forecast_hours=20&timezone=Europe/Stockholm`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();
      const times: string[] = data.hourly?.time || [];
      const temps: number[] = data.hourly?.temperature_2m || [];
      let min = Infinity;
      for (let i = 0; i < times.length; i++) {
        const h = parseInt(times[i].slice(11, 13), 10);
        if (h >= 18 || h <= 9) {
          if (temps[i] != null && temps[i] < min) min = temps[i];
        }
      }
      if (!isFinite(min) || min > 2.0) continue;

      for (const u of grp.users) {
        checked++;
        const { data: existing } = await admin
          .from("frost_alert_log")
          .select("user_id")
          .eq("user_id", u.user_id)
          .eq("alert_date", tomorrowDate)
          .maybeSingle();
        if (existing) continue;

        const payload = JSON.stringify({
          title: "❄️ Frostrisk inatt",
          body: `Ner mot ${min.toFixed(1)}° i ${u._name}. Täck känsliga plantor och ta in krukor.`,
          url: "/app",
        });

        const userSubs = subsByUser.get(u.user_id) || [];
        let anyDelivered = false;
        for (const s of userSubs) {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
            anyDelivered = true;
          } catch (e: any) {
            const code = e?.statusCode;
            if (code === 404 || code === 410) {
              await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
            } else {
              console.error("push error", e?.statusCode, e?.body);
            }
          }
        }
        if (anyDelivered) {
          sent++;
          await admin.from("frost_alert_log").insert({ user_id: u.user_id, alert_date: tomorrowDate, min_temp: min });
        }
      }
    } catch (e) {
      console.error("group error", e);
    }
  }

  return new Response(JSON.stringify({ checked, sent, groups: groups.size }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
