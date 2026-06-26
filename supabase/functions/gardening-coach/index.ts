import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_DAILY_LIMIT = 3;
const MAX_MESSAGES = 20;
const MAX_CONTENT_LEN = 4000;
const MAX_IMAGES_PER_MSG = 2;
const MAX_IMAGE_BYTES = 1_500_000;

const GRO_SYSTEM_PROMPT = `Du heter **Gro** och är den personliga odlingscoachen i Odlingsdagboken.

Du är varm, kunnig och konkret – som en erfaren svensk odlare. Du ger handlingsbara råd, ställer följdfrågor när underlaget inte räcker och anpassar alltid svaren efter användarens klimatzon, säsong, väder och faktiska odlingsdata.

Du pratar svenska. Du får aldrig hitta på fakta. Om du är osäker ska du säga det öppet och använda nivåerna **trolig**, **möjlig** eller **osäker**.

## ARBETSSÄTT
- Prioritera vad användaren bör göra idag.
- Nämn specifika växter, bäddar, datum och tidigare problem när datan stödjer det.
- Skilj tydligt mellan observation, tolkning och rekommendation.
- Ge korta steg i rätt ordning.
- Undvik att upprepa sådant användaren redan markerat som klart.
- Vid risk för frost, torka, hård vind eller kraftigt regn: förklara exakt vad som bör skyddas eller avvaktas.
- Vid växtproblem: koppla rådet till tidigare problem och behandlingar i samma odling.

## FOTODIAGNOS
När användaren skickar en bild:
1. Beskriv kort vad du faktiskt ser.
2. Ange diagnosens säkerhetsnivå.
3. Koppla till sort, bädd, väder, vattning och historik när det finns data.
4. Ge en numrerad åtgärdsplan.
5. Be om en bättre bild eller mer information när det behövs.

## SVENSKA KLIMATZONER
Zon 1: sista frost ungefär mitten av april.
Zon 2: sista frost ungefär slutet av april.
Zon 3: sista frost ungefär första veckan i maj.
Zon 4: sista frost ungefär mitten av maj.
Zon 5: sista frost ungefär slutet av maj.
Zon 6: sista frost ungefär början av juni.
Zon 7–8: sista frost ofta omkring mitten av juni.
Lokala avvikelser förekommer alltid.

## SVARSSTIL
- Var personlig och konkret.
- Använd markdown.
- Använd emoji sparsamt.
- Avsluta gärna med en enda relevant följdfråga.`;

type ClientMsg = { role: "user" | "assistant"; content: string; images?: string[] };

function dateKeyInStockholm(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function coordinatesForZone(zone: number) {
  switch (zone) {
    case 1: return { lat: 55.60, lon: 13.00 };
    case 2: return { lat: 57.71, lon: 11.97 };
    case 3: return { lat: 58.41, lon: 15.62 };
    case 4: return { lat: 60.67, lon: 15.63 };
    case 5: return { lat: 62.39, lon: 17.31 };
    case 6: return { lat: 63.83, lon: 20.26 };
    case 7: return { lat: 65.58, lon: 17.54 };
    case 8: return { lat: 67.86, lon: 20.22 };
    default: return { lat: 58.41, lon: 15.62 };
  }
}

async function fetchWeather(zone: number) {
  try {
    const { lat, lon } = coordinatesForZone(zone);
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      timezone: "Europe/Stockholm",
      forecast_days: "3",
      current: "temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function formatWeather(weather: any) {
  if (!weather) return "Väderdata kunde inte hämtas.";
  const current = weather.current || {};
  const daily = weather.daily || {};
  return [0, 1, 2].map((index) => {
    const label = index === 0 ? "Idag" : index === 1 ? "Imorgon" : "Om två dagar";
    return `- ${label}: ${daily.temperature_2m_min?.[index] ?? "?"}–${daily.temperature_2m_max?.[index] ?? "?"} °C, nederbörd ${daily.precipitation_sum?.[index] ?? "?"} mm, regnrisk ${daily.precipitation_probability_max?.[index] ?? "?"} %, maxvind ${daily.wind_speed_10m_max?.[index] ?? "?"} km/h`;
  }).join("\n") + `\n- Just nu: ${current.temperature_2m ?? "?"} °C, känns som ${current.apparent_temperature ?? "?"} °C.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let body: any;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    if (rawMessages.length > MAX_MESSAGES) return new Response(JSON.stringify({ error: "Too many messages" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const clientMessages: ClientMsg[] = [];
    for (const message of rawMessages) {
      if (!message || typeof message !== "object") continue;
      if (message.role !== "user" && message.role !== "assistant") continue;
      const content = typeof message.content === "string" ? message.content : "";
      if (!content && !(Array.isArray(message.images) && message.images.length)) continue;
      if (content.length > MAX_CONTENT_LEN) return new Response(JSON.stringify({ error: "Message too long" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      let images: string[] | undefined;
      if (Array.isArray(message.images)) {
        if (message.images.length > MAX_IMAGES_PER_MSG) return new Response(JSON.stringify({ error: "Too many images" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        images = [];
        for (const image of message.images) {
          if (typeof image !== "string") continue;
          if (!/^data:image\/(jpeg|png);base64,/.test(image)) return new Response(JSON.stringify({ error: "Invalid image format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          const base64 = image.split(",", 2)[1] || "";
          if (Math.floor(base64.length * 0.75) > MAX_IMAGE_BYTES) return new Response(JSON.stringify({ error: "Image too large" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          images.push(image);
        }
        if (!images.length) images = undefined;
      }
      clientMessages.push({ role: message.role, content, images });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: profileRow } = await admin.from("profiles").select("display_name, climate_zone, subscription_status, premium_expires_at, preferences").eq("user_id", user.id).maybeSingle();
    const zone = profileRow?.climate_zone || 3;
    const isPremium = profileRow?.subscription_status === "premium" && (!profileRow?.premium_expires_at || new Date(profileRow.premium_expires_at) > new Date());
    const hasUserQuestion = clientMessages.some((message) => message.role === "user");
    let pendingUsage: { date: string; current: number } | null = null;

    if (!isPremium && hasUserQuestion) {
      const date = dateKeyInStockholm();
      const { data: usageRow } = await admin.from("gro_usage").select("message_count").eq("user_id", user.id).eq("usage_date", date).maybeSingle();
      const current = usageRow?.message_count ?? 0;
      if (current >= FREE_DAILY_LIMIT) return new Response(JSON.stringify({ error: "free_limit_reached", message: `Du har använt dina ${FREE_DAILY_LIMIT} gratisfrågor idag. Uppgradera till Plus för obegränsad tillgång.` }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      pendingUsage = { date, current };
    }

    const [sowingsRes, plantsRes, harvestsRes, bedsRes, seasonRes, remindersRes, pestsRes, photosRes, weather] = await Promise.all([
      admin.from("sowings").select("variety, sow_date, status, type, seed_brand, bed_id, beds(name)").eq("user_id", user.id).order("sow_date", { ascending: false }).limit(50),
      admin.from("my_plants").select("custom_name, last_watered, watering_interval_days, location, last_fertilized, fertilizing_interval_days").eq("user_id", user.id).limit(50),
      admin.from("harvests").select("variety, weight_grams, harvest_date, beds(name)").eq("user_id", user.id).order("harvest_date", { ascending: false }).limit(30),
      admin.from("beds").select("name, description, season_notes").eq("user_id", user.id),
      admin.from("season_summaries").select("year, went_well, didnt_work, grow_again, learnings, beds(name)").eq("user_id", user.id).order("year", { ascending: false }).limit(20),
      admin.from("reminder_settings").select("settings").eq("user_id", user.id).maybeSingle(),
      admin.from("pest_logs").select("pest_name, severity, treatment, observed_date, resolved, notes, beds(name)").eq("user_id", user.id).order("observed_date", { ascending: false }).limit(20),
      admin.from("plant_photos").select("caption, taken_at, beds(name)").eq("user_id", user.id).order("taken_at", { ascending: false }).limit(10),
      fetchWeather(zone),
    ]);

    const sowings = sowingsRes.data || [];
    const plants = plantsRes.data || [];
    const harvests = harvestsRes.data || [];
    const beds = bedsRes.data || [];
    const seasons = seasonRes.data || [];
    const reminderSettings = (remindersRes.data?.settings as any) || {};
    const reminders = (reminderSettings.reminders || []).filter((item: any) => !item.done).slice(0, 12);
    const pests = pestsRes.data || [];
    const photos = photosRes.data || [];
    const now = new Date();
    const name = profileRow?.display_name || "odlare";
    const month = now.toLocaleString("sv-SE", { month: "long", timeZone: "Europe/Stockholm" });

    const plantDetails = plants.map((plant: any) => {
      const daysSinceWatered = plant.last_watered ? Math.floor((now.getTime() - new Date(plant.last_watered).getTime()) / 86400000) : null;
      return `- ${plant.custom_name || "Namnlös"}${plant.location ? ` (${plant.location})` : ""}: intervall ${plant.watering_interval_days || "?"} dagar${daysSinceWatered !== null ? `, senast vattnad för ${daysSinceWatered} dagar sedan` : ", ingen vattning registrerad"}`;
    }).join("\n") || "Inga registrerade växter";

    const sowingDetails = sowings.map((sowing: any) => {
      const weeks = Math.floor((now.getTime() - new Date(sowing.sow_date).getTime()) / (7 * 86400000));
      return `- ${sowing.variety} (${sowing.type}, ${sowing.status})${sowing.seed_brand ? ` [${sowing.seed_brand}]` : ""}${sowing.beds?.name ? ` i ${sowing.beds.name}` : ""}, sådd ${sowing.sow_date} (${weeks} veckor sedan)`;
    }).join("\n") || "Inga sådder";

    const harvestDetails = harvests.map((harvest: any) => `- ${harvest.variety}: ${harvest.weight_grams} g${harvest.beds?.name ? ` från ${harvest.beds.name}` : ""} (${harvest.harvest_date})`).join("\n") || "Inga skördar";
    const bedDetails = beds.map((bed: any) => `- ${bed.name}${bed.description ? `: ${bed.description}` : ""}${bed.season_notes ? ` | Anteckningar: ${bed.season_notes}` : ""}`).join("\n") || "Inga bäddar";
    const seasonHistory = seasons.map((season: any) => `- ${season.year}${season.beds?.name ? ` ${season.beds.name}` : ""}: bra ${season.went_well || "-"}; problem ${season.didnt_work || "-"}; lärdom ${season.learnings || "-"}`).join("\n") || "Ingen säsongshistorik";
    const reminderDetails = reminders.map((reminder: any) => `- ${reminder.date}: ${reminder.title} (${reminder.type || "övrigt"})`).join("\n") || "Inga öppna påminnelser";
    const pestDetails = pests.map((pest: any) => `- ${pest.observed_date}: ${pest.pest_name}, ${pest.severity}${pest.beds?.name ? ` i ${pest.beds.name}` : ""}, ${pest.resolved ? "löst" : "öppet"}${pest.treatment ? `, behandling ${pest.treatment}` : ""}${pest.notes ? `, anteckning ${pest.notes}` : ""}`).join("\n") || "Inga loggade problem";
    const photoDetails = photos.map((photo: any) => `- ${photo.taken_at}${photo.beds?.name ? ` i ${photo.beds.name}` : ""}${photo.caption ? `: ${photo.caption}` : ""}`).join("\n") || "Inga nyliga foton";

    const userContext = `
## ANVÄNDARENS KONTEXT – LIVE-DATA
Namn: ${name}
Klimatzon: ${zone}
Datum: ${dateKeyInStockholm(now)}
Månad: ${month}
Erfarenhetsnivå: ${(profileRow?.preferences as any)?.experience_level || "inte angiven"}
Odlingssätt: ${((profileRow?.preferences as any)?.growing_methods || []).join(", ") || "inte angivet"}

### Väderprognos
${formatWeather(weather)}

### Öppna påminnelser
${reminderDetails}

### Bäddar (${beds.length})
${bedDetails}

### Sådder (${sowings.length})
${sowingDetails}

### Skördar (${harvests.length})
${harvestDetails}

### Växter (${plants.length})
${plantDetails}

### Skadedjur och sjukdomar
${pestDetails}

### Senaste fotodokumentationen
${photoDetails}

### Tidigare säsonger
${seasonHistory}`;

    const mappedClientMessages = clientMessages.map((message) => {
      if (message.images?.length) {
        const parts: any[] = [];
        if (message.content) parts.push({ type: "text", text: message.content });
        for (const url of message.images) parts.push({ type: "image_url", image_url: { url } });
        return { role: message.role, content: parts };
      }
      return { role: message.role, content: message.content };
    });

    const messages: any[] = [{ role: "system", content: `${GRO_SYSTEM_PROMPT}\n\n${userContext}` }, ...mappedClientMessages];
    if (!clientMessages.length) messages.push({ role: "user", content: "Ge mig en kort personlig välkomsthälsning och högst tre konkreta saker som är viktigast i min odling just nu. Använd live-datan, undvik generella råd och nämn varför varje sak är prioriterad." });

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-pro", messages, stream: true }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "För många förfrågningar, försök igen om en stund." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI-krediter slut." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI gateway error:", response.status, await response.text());
      throw new Error("AI gateway error");
    }

    if (pendingUsage) {
      const { error: usageError } = await admin.from("gro_usage").upsert({
        user_id: user.id,
        usage_date: pendingUsage.date,
        message_count: pendingUsage.current + 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,usage_date" });
      if (usageError) console.error("Kunde inte uppdatera Gro-kvoten", usageError);
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    console.error("gardening-coach error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
