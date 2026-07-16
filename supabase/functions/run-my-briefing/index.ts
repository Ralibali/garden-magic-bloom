import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Manuell "Dagens 3"-briefing för den inloggade användaren.
// Autentisering: JWT från Authorization-headern. Kringgår cron-dedup så att
// användaren själv kan trigga en briefing on-demand från Inställningar.
// Använder samma logik och trösklar som daily-briefing.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROST_THRESHOLD_C = 2.0;
const RAIN_HINT_MM = 8;
const MAX_TASKS = 3;

type Task = { text: string; weight: number };

function coordsForZone(zone: number | null): { lat: number; lon: number } {
  switch (zone) {
    case 1: return { lat: 55.60, lon: 13.00 };
    case 2: return { lat: 57.71, lon: 11.97 };
    case 3: return { lat: 59.33, lon: 18.07 };
    case 4: return { lat: 60.67, lon: 15.63 };
    case 5: return { lat: 62.39, lon: 17.31 };
    case 6: return { lat: 63.83, lon: 20.26 };
    case 7: return { lat: 65.58, lon: 17.54 };
    case 8: return { lat: 67.86, lon: 20.22 };
    default: return { lat: 59.33, lon: 18.07 };
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await anon.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!vapidPublic || !vapidPrivate) {
    return new Response(JSON.stringify({ error: "missing_vapid_keys" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  webpush.setVapidDetails("mailto:info@auroramedia.se", vapidPublic, vapidPrivate);

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: profile } = await admin
    .from("profiles")
    .select("climate_zone, location_lat, location_lon, daily_briefing_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: subs } = await admin.from("push_subscriptions")
    .select("endpoint, p256dh, auth").eq("user_id", userId);
  const hasSub = (subs || []).length > 0;

  let lat: number, lon: number;
  if (profile?.location_lat != null && profile?.location_lon != null) {
    lat = profile.location_lat; lon = profile.location_lon;
  } else {
    const c = coordsForZone(profile?.climate_zone ?? null);
    lat = c.lat; lon = c.lon;
  }

  const now = new Date();
  const today = stockholmDateKey(now);

  let frostMin: number | null = null;
  let rainToday = 0;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&daily=precipitation_sum&forecast_days=2&timezone=Europe/Stockholm`;
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

  const [plantsRes, remindersRes] = await Promise.all([
    admin.from("my_plants")
      .select("custom_name, last_watered, watering_interval_days, last_fertilized, fertilizing_interval_days")
      .eq("user_id", userId).limit(50),
    admin.from("reminder_settings").select("settings").eq("user_id", userId).maybeSingle(),
  ]);

  const plants = plantsRes.data || [];
  const reminderSettings = (remindersRes.data?.settings as any) || {};
  const reminders: any[] = Array.isArray(reminderSettings.reminders) ? reminderSettings.reminders : [];

  const tasks: Task[] = [];

  if (frostMin != null && frostMin <= FROST_THRESHOLD_C) {
    tasks.push({ text: `❄️ Ner mot ${frostMin.toFixed(0)}° inatt — täck känsliga plantor och ta in krukor`, weight: 0 });
  }

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

  tasks.sort((a, b) => a.weight - b.weight);
  const top = tasks.slice(0, MAX_TASKS);

  const result: any = {
    hasSubscription: hasSub,
    briefingEnabled: profile?.daily_briefing_enabled ?? false,
    taskCount: top.length,
    tasks: top.map(t => t.text),
    pushSent: false,
    pushDelivered: 0,
    pushFailed: 0,
  };

  if (top.length === 0) {
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!hasSub) {
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const title = top.length === 1 ? "🌱 1 uppgift i trädgården idag" : `🌱 Dagens ${top.length} i trädgården`;
  const body = top.length === 1 ? top[0].text : `${top[0].text} …och ${top.length - 1} till.`;
  const payload = JSON.stringify({ title, body, url: "/app" });

  for (const s of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      result.pushDelivered++;
    } catch (e: any) {
      const code = e?.statusCode;
      if (code === 404 || code === 410) {
        await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
      result.pushFailed++;
      console.error("push error", code, e?.body);
    }
  }
  result.pushSent = result.pushDelivered > 0;

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
