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

const GRO_SYSTEM_PROMPT = `Du heter **Gro** och är den personliga odlingscoachen i appen Odlingsdagboken. Namnet Gro betyder att något gror och växer – precis som du hjälper användarna att göra.

Du är varm, kunnig och konkret – som en erfaren granne med 20 års erfarenhet av svensk köksträdgård, krukväxter och bärodling. Du är aldrig torr eller akademisk. Du ger handlingsbara råd, ställer följdfrågor när du behöver mer info och anpassar alltid svaren efter användarens zon, säsong och vad de faktiskt odlar.

Du pratar svenska, alltid. Du får ALDRIG hitta på fakta. Om du är osäker säger du det öppet.

## PROAKTIVA INSIKTER
Gro ska inte bara svara på frågor – hon ska också märka saker i användarens data och kommentera dem spontant.

### Vattning (krukväxter)
- Växt 1–2 dagar försenad: "Din [växt] börjar bli törstig – dags att vattna snart!"
- Växt 3+ dagar försenad: "[Växt] är försenad med vattning! Kolla om bladen hänger."
- Vattnas oftare än intervallet: "Du verkar vattna [växt] oftare än rekommenderat – risk för övervattning."

### Sådder och utplantering
- Status "förodlad" och dags att plantera ut: "Dina [sort] har nog stått inne länge nog nu – i zon [X] brukar man plantera ut efter [datum]."
- Ingen statusuppdatering på länge: "Hur går det med dina [sort]? Du sådde dem för [X] veckor sedan."
- Inga sådder mars–april: "Det börjar bli dags att komma igång med förodlingen!"

### Skörd
- Ingen skörd juli–september: "Du har inte loggat någon skörd än – har du börjat skörda?"
- Låg skörd jämfört med förra året: flagga det
- Rekordskörd: "Wow, [X] kg [sort] – det är din bästa skörd hittills!"

### Växtföljd
- Samma växtfamilj i samma bädd två år i rad: "Obs! Du odlade [sort] i [bädd] förra året också – bättre att byta."

### Säsong och klimatzon
- Ge zonspecifika tips baserat på aktuell månad
- Frostvarning om väderdata visar risk

## SVENSKA KLIMATZONER
Zon 1 (Skåne): Sista frost mitten april, 200 dagars säsong
Zon 2 (Västkust): Sista frost slutet april, 185 dagar
Zon 3 (Mälardalen): Sista frost första veckan maj, 170 dagar
Zon 4 (Mellansverige): Sista frost mitten maj, 155 dagar
Zon 5 (Norrlands kust): Sista frost slutet maj, 140 dagar
Zon 6 (Norrland inland): Sista frost början juni, 120 dagar
Zon 7–8 (Lappland): Sista frost mitten juni, 90–100 dagar

## VÄXTFÖLJD
Odla inte samma växtfamilj på samma plats mer än vart 3–4 år.

## FOTODIAGNOS
När användaren skickar en bild ska du:
1. Beskriv kort vad du faktiskt ser (planta, blad, jord, omgivning, symtom).
2. Ställ diagnos med säkerhetsgrad: **trolig**, **möjlig** eller **osäker**. Var ärlig – gissa inte vilt.
3. Koppla till användarens kontext (zon, bädd, sort, jord, väder).
4. Ge konkret åtgärdsplan i numrerade steg.
5. Vid osäkerhet, be om närbild på blad/stam eller info om vattning, ljus och senaste gödning.

## HUR GRO SVARAR
- Var personlig – nämn användarens namn och specifika växter/bäddar
- Var konkret och handlingsinriktad
- Använd emoji sparsamt men effektivt
- Formatera med markdown
- Ställ följdfrågor vid behov`;

function todayInStockholm(): string {
  // YYYY-MM-DD in Europe/Stockholm
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
  });
  return fmt.format(new Date());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ───── Validate payload ─────
    let body: any;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    if (rawMessages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: "Too many messages" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    type ClientMsg = { role: string; content: string; images?: string[] };
    const clientMessages: ClientMsg[] = [];
    for (const m of rawMessages) {
      if (!m || typeof m !== "object") continue;
      if (m.role !== "user" && m.role !== "assistant") continue;
      const content = typeof m.content === "string" ? m.content : "";
      if (!content && !(Array.isArray(m.images) && m.images.length)) continue;
      if (content.length > MAX_CONTENT_LEN) {
        return new Response(JSON.stringify({ error: "Message too long" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let images: string[] | undefined;
      if (Array.isArray(m.images)) {
        if (m.images.length > MAX_IMAGES_PER_MSG) {
          return new Response(JSON.stringify({ error: "Too many images (max 2)" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        images = [];
        for (const img of m.images) {
          if (typeof img !== "string") continue;
          if (!/^data:image\/(jpeg|png);base64,/.test(img)) {
            return new Response(JSON.stringify({ error: "Invalid image format" }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          // Estimate decoded size: base64 length * 0.75
          const b64 = img.split(",", 2)[1] || "";
          const approxBytes = Math.floor(b64.length * 0.75);
          if (approxBytes > MAX_IMAGE_BYTES) {
            return new Response(JSON.stringify({ error: "Image too large (max 1.5 MB)" }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          images.push(img);
        }
        if (images.length === 0) images = undefined;
      }
      clientMessages.push({ role: m.role, content, images });
    }

    // ───── Service role client for premium check + usage ─────
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profileRow } = await admin
      .from("profiles")
      .select("display_name, climate_zone, subscription_status, premium_expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    const isPremium = profileRow?.subscription_status === "premium" &&
      (!profileRow?.premium_expires_at || new Date(profileRow.premium_expires_at) > new Date());

    // ───── Rate limit (free users only) ─────
    if (!isPremium) {
      const today = todayInStockholm();
      const { data: usageRow } = await admin
        .from("gro_usage")
        .select("message_count")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();

      const current = usageRow?.message_count ?? 0;
      if (current >= FREE_DAILY_LIMIT) {
        return new Response(JSON.stringify({
          error: "free_limit_reached",
          message: `Du har använt dina ${FREE_DAILY_LIMIT} gratisfrågor idag. Uppgradera till Plus för obegränsad tillgång.`,
        }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin.from("gro_usage").upsert({
        user_id: user.id,
        usage_date: today,
        message_count: current + 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,usage_date" });
    }

    // ───── Fetch context (parallel) ─────
    const [sowingsRes, plantsRes, harvestsRes, bedsRes, seasonRes] = await Promise.all([
      admin.from("sowings").select("variety, sow_date, status, type, seed_brand, bed_id, beds(name)").eq("user_id", user.id).order("sow_date", { ascending: false }).limit(50),
      admin.from("my_plants").select("custom_name, last_watered, watering_interval_days, location, last_fertilized, fertilizing_interval_days").eq("user_id", user.id).limit(50),
      admin.from("harvests").select("variety, weight_grams, harvest_date, beds(name)").eq("user_id", user.id).order("harvest_date", { ascending: false }).limit(30),
      admin.from("beds").select("name, description, season_notes").eq("user_id", user.id),
      admin.from("season_summaries").select("year, went_well, didnt_work, grow_again, beds(name)").eq("user_id", user.id).order("year", { ascending: false }).limit(20),
    ]);

    const sowings = sowingsRes.data || [];
    const plants = plantsRes.data || [];
    const harvests = harvestsRes.data || [];
    const beds = bedsRes.data || [];
    const seasons = seasonRes.data || [];

    const now = new Date();
    const month = now.toLocaleString("sv-SE", { month: "long" });
    const zone = profileRow?.climate_zone || 3;
    const name = profileRow?.display_name || "odlare";

    const plantDetails = plants.map((p: any) => {
      const daysSince = p.last_watered ? Math.floor((now.getTime() - new Date(p.last_watered).getTime()) / 86400000) : null;
      const daysUntil = (p.watering_interval_days && daysSince !== null) ? p.watering_interval_days - daysSince : null;
      return `- ${p.custom_name || "Namnlös"}${p.location ? ` (${p.location})` : ""}: vattningsintervall ${p.watering_interval_days || '?'} dagar${daysSince !== null ? `, senast vattnad för ${daysSince} dagar sedan` : ""}${daysUntil !== null ? `, ${daysUntil <= 0 ? `FÖRSENAD ${Math.abs(daysUntil)} dagar` : `${daysUntil} dagar till nästa`}` : ""}`;
    }).join("\n") || "Inga registrerade";

    const sowingDetails = sowings.map((s: any) => {
      const bed = s.beds?.name;
      const weeksSince = Math.floor((now.getTime() - new Date(s.sow_date).getTime()) / (7 * 86400000));
      return `- ${s.variety} (${s.type}, ${s.status})${s.seed_brand ? ` [${s.seed_brand}]` : ""}${bed ? ` i ${bed}` : ""} – sådd ${s.sow_date} (${weeksSince} veckor sedan)`;
    }).join("\n") || "Inga sådder";

    const harvestDetails = harvests.map((h: any) => {
      const bed = h.beds?.name;
      return `- ${h.variety}: ${h.weight_grams}g${bed ? ` från ${bed}` : ""} (${h.harvest_date})`;
    }).join("\n") || "Inga skördar";

    const bedDetails = beds.map((b: any) => `- ${b.name}${b.description ? `: ${b.description}` : ""}`).join("\n") || "Inga bäddar";

    const seasonHistory = seasons.map((s: any) => {
      const bed = s.beds?.name;
      return `- ${s.year}${bed ? ` ${bed}` : ""}: Bra: ${s.went_well || '-'} | Dåligt: ${s.didnt_work || '-'} | Odla igen: ${s.grow_again || '-'}`;
    }).join("\n") || "Ingen historik";

    const userContext = `
## ANVÄNDARENS KONTEXT (live-data)
Namn: ${name}
Klimatzon: ${zone}
Månad: ${month} ${now.getFullYear()}
Datum: ${now.toISOString().split("T")[0]}

### Bäddar (${beds.length} st)
${bedDetails}

### Sådder denna säsong (${sowings.length} st)
${sowingDetails}

### Skördar denna säsong (${harvests.length} st)
${harvestDetails}

### Krukväxter (${plants.length} st)
${plantDetails}

### Växtföljdshistorik
${seasonHistory}
`;

    const systemContent = GRO_SYSTEM_PROMPT + "\n\n" + userContext;

    const mappedClientMessages = clientMessages.map((m) => {
      if (m.images && m.images.length) {
        const parts: any[] = [];
        if (m.content) parts.push({ type: "text", text: m.content });
        for (const url of m.images) parts.push({ type: "image_url", image_url: { url } });
        return { role: m.role, content: parts };
      }
      return { role: m.role, content: m.content };
    });

    const messages: any[] = [
      { role: "system", content: systemContent },
      ...mappedClientMessages,
    ];

    if (clientMessages.length === 0) {
      messages.push({
        role: "user",
        content: `Hej Gro! Ge mig en personlig hälsning och dina bästa proaktiva insikter baserat på min odlingsdata just nu. Reagera på allt du ser i datan – försenade vattningar, sådder som borde planteras ut, växtföljdsproblem, säsongsspecifika tips. Var konkret och nämn specifika växter och bäddar.`,
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "För många förfrågningar, försök igen om en stund." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-krediter slut." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("gardening-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
