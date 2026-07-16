import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Dagens 3 — proaktiv morgonbriefing.
// Körs via cron (se docs/daily-briefing-cron.sql). Väljer upp till tre
// prioriterade uppgifter per användare utifrån verklig odlingsdata och
// väder, och skickar push endast när något faktiskt behöver göras.
// Deterministisk logik, ingen generativ AI — samma filosofi som
// dashboardPriority på klientsidan.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const FROST_THRESHOLD_C = 2.0;
const RAIN_HINT_MM = 8;
const MAX_TASKS = 3;

type Task = { text: string; weight: number };

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

function stockholmDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

function daysSince(dateStr: string | null, now: Date): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.floor((now.getTime() - then) / 86400000);
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
    .select("user_id, climate_zone, location_lat, location_lon, daily_briefing_enabled")
    .eq("daily_briefing_enabled", true);

  const { data: subs } = await admin.from("push_subscriptions").select("user_id, endpoint, p256dh, auth");
  const subsByUser = new Map<string, any[]>();
  for (const s of subs || []) {
    if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, []);
    subsByUser.get(s.user_id)!.push(s);
  }

  // Gruppera användare per avrundade koordinater så vädret hämtas en gång per ort.
  const groups = new Map<string, { lat: number; lon: number; users: any[] }>();
  for (const p of profiles || []) {
    if (!subsByUser.has(p.user_id)) continue;
    let lat: number, lon: number;
    if (p.location_lat != null && p.location_lon != null) {
      lat = p.location_lat; lon = p.location_lon;
    } else {
      const c = coordsForZone(p.climate_zone);
      lat = c.lat; lon = c.lon;
    }
    const key = `${lat.toFixed(1)},${lon.toFixed(1)}`;
    if (!groups.has(key)) groups.set(key, { lat, lon, users: [] });
    groups.get(key)!.users.push(p);
  }

  const now = new Date();
  const today = stockholmDateKey(now);
  let checked = 0;
  let sent = 0;
  let skippedNoTasks = 0;

  for (const grp of groups.values()) {
    // Väder: nattens minimum (frostrisk) + dagens nederbörd (regnhänsyn vid vattning).
    let frostMin: number | null = null;
    let rainToday = 0;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${grp.lat}&longitude=${grp.lon}&hourly=temperature_2m&daily=precipitation_sum&forecast_days=2&timezone=Europe/Stockholm`;
      const resp = await fetch(url);
      if (resp.ok) {
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
        if (isFinite(min)) frostMin = min;
        rainToday = data.daily?.precipitation_sum?.[0] ?? 0;
      }
    } catch (e) {
      console.error("weather error", e);
    }

    for (const u of grp.users) {
      checked++;
      try {
        // Dedup: max en briefing per användare och dag.
        const { data: existing } = await admin
          .from("daily_briefing_log")
          .select("user_id")
          .eq("user_id", u.user_id)
          .eq("briefing_date", today)
          .maybeSingle();
        if (existing) continue;

        const [plantsRes, remindersRes] = await Promise.all([
          admin.from("my_plants")
            .select("custom_name, last_watered, watering_interval_days, last_fertilized, fertilizing_interval_days")
            .eq("user_id", u.user_id).limit(50),
          admin.from("reminder_settings").select("settings").eq("user_id", u.user_id).maybeSingle(),
        ]);

        const plants = plantsRes.data || [];
        const reminderSettings = (remindersRes.data?.settings as any) || {};
        const reminders: any[] = Array.isArray(reminderSettings.reminders) ? reminderSettings.reminders : [];

        const tasks: Task[] = [];

        // 1. Frost inatt — alltid högst prioritet.
        if (frostMin != null && frostMin <= FROST_THRESHOLD_C) {
          tasks.push({
            text: `❄️ Ner mot ${frostMin.toFixed(0)}° inatt — täck känsliga plantor och ta in krukor`,
            weight: 0,
          });
        }

        // 2. Vattning: due när intervallet passerats, urgent efter +2 dagar.
        const wateringDue = plants
          .map((p: any) => {
            const interval = p.watering_interval_days;
            const since = daysSince(p.last_watered, now);
            if (!interval || since == null) return null;
            const overdue = since - interval;
            if (overdue < 0) return null;
            return { name: p.custom_name || "En växt", overdue };
          })
          .filter(Boolean) as Array<{ name: string; overdue: number }>;

        if (wateringDue.length > 0) {
          wateringDue.sort((a, b) => b.overdue - a.overdue);
          const first = wateringDue[0];
          const rainHint = rainToday >= RAIN_HINT_MM ? " (regn väntas — känn på jorden för det som står ute)" : "";
          const text = wateringDue.length === 1
            ? `💧 ${first.name} behöver vatten${rainHint}`
            : `💧 ${first.name} och ${wateringDue.length - 1} till behöver vatten${rainHint}`;
          tasks.push({ text, weight: first.overdue >= 2 ? 1 : 3 });
        }

        // 3. Påminnelser som förfaller idag eller är försenade.
        const dueReminders = reminders
          .filter((r: any) => r && !r.done && typeof r.date === "string" && r.date <= today)
          .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));

        if (dueReminders.length > 0) {
          const first = dueReminders[0];
          const text = dueReminders.length === 1
            ? `⏰ Påminnelse: ${first.title || "en uppgift"}`
            : `⏰ ${first.title || "En uppgift"} och ${dueReminders.length - 1} påminnelser till väntar`;
          tasks.push({ text, weight: first.date < today ? 2 : 4 });
        }

        // 4. Gödsling: lägre prioritet än vattning.
        const fertDue = plants
          .map((p: any) => {
            const interval = p.fertilizing_interval_days;
            const since = daysSince(p.last_fertilized, now);
            if (!interval || since == null) return null;
            if (since - interval < 0) return null;
            return { name: p.custom_name || "En växt" };
          })
          .filter(Boolean) as Array<{ name: string }>;

        if (fertDue.length > 0) {
          const text = fertDue.length === 1
            ? `🌿 ${fertDue[0].name} är redo för näring`
            : `🌿 ${fertDue.length} växter är redo för näring`;
          tasks.push({ text, weight: 5 });
        }

        // Skicka bara när något faktiskt behöver göras — aldrig tomma pushar.
        if (tasks.length === 0) {
          skippedNoTasks++;
          continue;
        }

        tasks.sort((a, b) => a.weight - b.weight);
        const top = tasks.slice(0, MAX_TASKS);
        const title = top.length === 1 ? "🌱 1 uppgift i trädgården idag" : `🌱 Dagens ${top.length} i trädgården`;
        const body = top.length === 1 ? top[0].text : `${top[0].text} …och ${top.length - 1} till.`;
        const payload = JSON.stringify({ title, body, url: "/app" });

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
          await admin.from("daily_briefing_log").insert({
            user_id: u.user_id,
            briefing_date: today,
            task_count: top.length,
            top_task: top[0].text,
          });
        }
      } catch (e) {
        console.error("user error", u.user_id, e);
      }
    }
  }

  return new Response(JSON.stringify({ checked, sent, skippedNoTasks, groups: groups.size }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
