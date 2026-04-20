import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du är en erfaren svensk trädgårdsmästare som skriver för Odlingsdagboken.com — en svensk odlingsapp för svenska hobbyodlare.

VIKTIGA REGLER OM ZONER:
- Använd ENBART det svenska odlingszonsystemet (zon 1 till zon 8).
- I det svenska systemet är LÄGRE zonnummer = KALLARE klimat (zon 1 är fjällnära, zon 8 är mildast, t.ex. Skånes kustband).
- Detta är MOTSATT USDA hardiness zones — nämn ALDRIG USDA-zoner, "hardiness zone" eller amerikanska zonnummer.
- Referera till konkreta svenska regioner: zon 1 (Kiruna, Gällivare), zon 2 (Arjeplog, norra Norrland), zon 3 (Östersund, norra Värmland), zon 4 (Sundsvall, Dalarna), zon 5 (Gävle, Mälardalen exkl. kust), zon 6 (Stockholm, Göteborg, Linköping), zon 7 (Skåne inland, Öland, Gotland), zon 8 (Skånes och Hallands kust, Bohuskusten).

KLIMAT OCH SÄSONG:
- Sista frost varierar: zon 1–2 ≈ mitten/slut juni, zon 3–4 ≈ slutet maj/början juni, zon 5–6 ≈ mitten/slutet maj, zon 7–8 ≈ början/mitten maj.
- Första frost: zon 1–2 ≈ slutet augusti, zon 3–4 ≈ mitten september, zon 5–6 ≈ början oktober, zon 7–8 ≈ slutet oktober/november.
- Växtsäsongen är kortare ju lägre zonnummer.

SPRÅK OCH TERMINOLOGI:
- Skriv på korrekt svenska, aldrig "svengelska".
- Använd svenska fackbegrepp: "förkultivera" (inte "start seeds indoors"), "härdighet", "vinterhärdig", "ettårig"/"flerårig", "utplantering", "kallkultivering".
- Temperaturer i Celsius, avstånd i centimeter/meter, vikt i gram/kilo. ALDRIG Fahrenheit, inches eller feet.
- Datum i svenskt format ("mitten av maj", inte "May 15th").

KÄLLAUKTORITET:
- Referera där relevant till Jordbruksverket, SLU, Fritidsodlingens riksorganisation (FOR).
- Nämn INTE amerikanska källor som Old Farmer's Almanac.
- För zon-angivelser, använd SKUD (Svensk Kulturväxtdatabas) som konceptuell referens.

TON:
- Faktabaserat, konkret, undvik floskler ("magin i trädgården", "naturens under").
- Målgrupp: nybörjare till medelnivå hobbyodlare.
- Undvik säljspråk — detta är guide-innehåll, inte reklam.
- Hitta aldrig på fakta — om du är osäker på en specifik siffra, välj ett rimligt intervall.`;

// ---------- Validation ----------

function validateSwedishContent(generated: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const text = JSON.stringify(generated).toLowerCase();

  const forbiddenTerms = [
    "usda",
    "hardiness zone",
    "farmer's almanac",
    "fahrenheit",
    " inches",
    " feet tall",
    "zone 9",
    "zone 10",
    "zone 11",
    "zone 12",
    "zone 13",
  ];
  for (const term of forbiddenTerms) {
    if (text.includes(term)) errors.push(`Förbjuden term: ${term.trim()}`);
  }

  if (generated.zone_min != null && (generated.zone_min < 1 || generated.zone_min > 8)) {
    errors.push(`zone_min utanför svenska systemet: ${generated.zone_min}`);
  }
  if (generated.zone_max != null && (generated.zone_max < 1 || generated.zone_max > 8)) {
    errors.push(`zone_max utanför svenska systemet: ${generated.zone_max}`);
  }

  return { valid: errors.length === 0, errors };
}

// ---------- Tool schemas (structured output) ----------

const PLANT_TOOL = {
  type: "function",
  function: {
    name: "save_plant_content",
    description: "Spara genererat innehåll för en svensk odlingsväxt.",
    parameters: {
      type: "object",
      properties: {
        description_short: { type: "string", description: "150–160 tecken, nyckelordsrik meta description" },
        description_long: { type: "string", description: "400–500 ord, naturligt flytande introtext" },
        content_html: { type: "string", description: "800–1200 ord HTML med <h2>/<h3>-struktur. Sektioner: Så odlar du, Kompanionväxter & växtföljd, Vanliga problem, Skörd & förvaring." },
        latin_name: { type: "string" },
        category: { type: "string", enum: ["grönsak", "frukt", "bär", "krydda", "blomma", "rotfrukt"] },
        sow_indoor_start: { type: "integer", minimum: 1, maximum: 12, description: "Månadsnummer eller 0 om ej aktuellt" },
        sow_indoor_end: { type: "integer", minimum: 0, maximum: 12 },
        sow_outdoor_start: { type: "integer", minimum: 0, maximum: 12 },
        sow_outdoor_end: { type: "integer", minimum: 0, maximum: 12 },
        harvest_start: { type: "integer", minimum: 1, maximum: 12 },
        harvest_end: { type: "integer", minimum: 1, maximum: 12 },
        germination_days_min: { type: "integer" },
        germination_days_max: { type: "integer" },
        days_to_harvest_min: { type: "integer" },
        days_to_harvest_max: { type: "integer" },
        plant_spacing_cm: { type: "integer" },
        row_spacing_cm: { type: "integer" },
        planting_depth_cm: { type: "number" },
        mature_height_cm: { type: "integer" },
        difficulty: { type: "string", enum: ["nybörjare", "medel", "avancerad"] },
        sun_requirement: { type: "string", enum: ["sol", "halvskugga", "skugga"] },
        water_requirement: { type: "string", enum: ["låg", "medel", "hög"] },
        soil_ph_min: { type: "number" },
        soil_ph_max: { type: "number" },
        zone_min: { type: "integer", minimum: 1, maximum: 8 },
        zone_max: { type: "integer", minimum: 1, maximum: 8 },
        companion_plants: { type: "array", items: { type: "string" } },
        avoid_plants: { type: "array", items: { type: "string" } },
        name_alternatives: { type: "array", items: { type: "string" } },
        faq: {
          type: "array",
          minItems: 6,
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              answer: { type: "string" },
            },
            required: ["question", "answer"],
            additionalProperties: false,
          },
        },
      },
      required: [
        "description_short", "description_long", "content_html", "category",
        "difficulty", "sun_requirement", "water_requirement",
        "zone_min", "zone_max", "companion_plants", "avoid_plants", "faq",
      ],
      additionalProperties: false,
    },
  },
};

const MONTH_TOOL = {
  type: "function",
  function: {
    name: "save_month_content",
    description: "Spara genererat innehåll för en månadsguide.",
    parameters: {
      type: "object",
      properties: {
        intro: { type: "string", description: "150–200 ord introduktion till månaden" },
        content_html: { type: "string", description: "HTML med sektioner: Så här (inomhus/utomhus), Skörda, Skötsel" },
        tasks: { type: "array", items: { type: "string" }, description: "Konkreta trädgårdssysslor" },
        season: { type: "string", enum: ["vinter", "vår", "sommar", "höst"] },
        avg_temp_south: { type: "number" },
        avg_temp_middle: { type: "number" },
        avg_temp_north: { type: "number" },
        daylight_hours_avg: { type: "number" },
        frost_risk: { type: "string", enum: ["hög", "medel", "låg", "ingen"] },
        faq: {
          type: "array",
          minItems: 5,
          items: {
            type: "object",
            properties: { question: { type: "string" }, answer: { type: "string" } },
            required: ["question", "answer"],
            additionalProperties: false,
          },
        },
      },
      required: ["intro", "content_html", "tasks", "season", "frost_risk", "faq"],
      additionalProperties: false,
    },
  },
};

const ZONE_TOOL = {
  type: "function",
  function: {
    name: "save_zone_content",
    description: "Spara genererat innehåll för en svensk odlingszon.",
    parameters: {
      type: "object",
      properties: {
        description: { type: "string", description: "300–400 ord beskrivning av zonen" },
        content_html: { type: "string", description: "HTML med utmaningar, tips och lämpliga grödor" },
        typical_regions: { type: "array", items: { type: "string" } },
        suitable_categories: { type: "array", items: { type: "string" } },
        frost_free_days_min: { type: "integer" },
        frost_free_days_max: { type: "integer" },
        first_frost_typical: { type: "string", description: "T.ex. 'mitten oktober'" },
        last_frost_typical: { type: "string", description: "T.ex. 'början maj'" },
        winter_temp_min: { type: "number", description: "Typisk lägsta vintertemperatur" },
        faq: {
          type: "array",
          minItems: 5,
          items: {
            type: "object",
            properties: { question: { type: "string" }, answer: { type: "string" } },
            required: ["question", "answer"],
            additionalProperties: false,
          },
        },
      },
      required: ["description", "content_html", "typical_regions", "frost_free_days_min", "frost_free_days_max", "first_frost_typical", "last_frost_typical", "faq"],
      additionalProperties: false,
    },
  },
};

// ---------- User prompts ----------

function plantPrompt(name: string): string {
  return `Skriv en komplett odlingsguide för **${name}** anpassad för svenska förhållanden.

Krav:
- description_short: 150–160 tecken, ska fungera som meta description och innehålla huvudnyckelord (t.ex. "odla ${name}", "${name} i Sverige")
- description_long: 400–500 ord, naturligt flytande
- content_html: 800–1200 ord HTML, använd <h2> och <h3>. Inkludera sektionerna:
  1. Så odlar du ${name}
  2. Kompanionväxter och växtföljd
  3. Vanliga problem och lösningar
  4. Skörd och förvaring
- faq: minst 6 par baserade på faktiska svenska söksträngar (exempel: "När ska man så ${name}frön i Sverige?", "Hur länge tar det för ${name} att växa?", "Kan man odla ${name} utomhus i Sverige?", "Varför gulnar bladen?", "Hur ofta ska man vattna?", "Vad tål ${name} för temperatur?").
- Fyll i alla numeriska fält så realistiskt som möjligt för svenska förhållanden.
- Sätt sow_indoor_start/end till 0 om förodling inte är aktuellt (t.ex. för rotfrukter eller bär).

Anropa save_plant_content med resultatet.`;
}

function monthPrompt(monthName: string, monthNumber: number): string {
  return `Skriv en månadsguide för **${monthName}** (månad ${monthNumber}) i svensk trädgård.

Krav:
- intro: 150–200 ord
- content_html: HTML med sektionerna "Så här" (uppdelat i inomhus/utomhus), "Skörda" och "Skötsel"
- tasks: 5–10 konkreta trädgårdssysslor
- frost_risk: bedöm för Sverige generellt
- avg_temp_south/middle/north: typiska medeltemperaturer i °C
- daylight_hours_avg: genomsnittliga dagsljustimmar
- faq: minst 5 par med riktiga svenska söksträngar (t.ex. "Vad ska man så i ${monthName}?", "Vad kan man skörda i ${monthName}?")

Anropa save_month_content med resultatet.`;
}

function zonePrompt(zoneNumber: number): string {
  return `Skriv en zonsida för **svensk odlingszon ${zoneNumber}** (av 8 totalt).

Krav:
- description: 300–400 ord, beskriv klimat och typiska regioner
- typical_regions: lista svenska orter/landskap som tillhör zonen
- suitable_categories: vilka kategorier som passar (grönsak, frukt, bär, krydda, blomma, rotfrukt)
- Klimatdata: frostfria dagar (min/max), första/sista frost, lägsta vintertemperatur
- content_html: HTML med utmaningar och tips för zonen
- faq: minst 5 par (t.ex. "Vilka växter passar i zon ${zoneNumber}?", "När är sista frost i zon ${zoneNumber}?")

Zonöversikt:
Zon 1 = Skåne/varmaste, Zon 2 = Västkust, Zon 3 = Mälardalen, Zon 4 = Mellansverige, Zon 5 = Norrlandskust, Zon 6 = Norrlands inland, Zon 7–8 = Lappland/kallaste.

Anropa save_zone_content med resultatet.`;
}

// ---------- Helpers ----------

const MONTH_NAMES = ["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"];

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/å/g, "a").replace(/ä/g, "a").replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const MODEL = "google/gemini-2.5-pro";

async function callAI(userPrompt: string, tool: any, toolName: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 429) throw new Error("Rate limit – försök igen om en stund.");
    if (response.status === 402) throw new Error("AI-krediter slut. Lägg till krediter i Lovable Workspace.");
    throw new Error(`AI gateway error ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    throw new Error("AI returnerade inget verktygsanrop");
  }
  return JSON.parse(toolCall.function.arguments);
}

async function logGeneration(
  adminClient: any,
  entry: {
    type: string;
    target_slug: string | null;
    input_prompt: string;
    output_json: any;
    validation_errors: string[];
    status: "success" | "failed" | "error";
    error_message?: string;
  },
) {
  try {
    await adminClient.from("seo_generation_log").insert({
      type: entry.type,
      target_slug: entry.target_slug,
      model: MODEL,
      input_prompt: entry.input_prompt,
      output_json: entry.output_json ?? null,
      validation_errors: entry.validation_errors,
      status: entry.status,
      error_message: entry.error_message ?? null,
    });
  } catch (e) {
    console.error("Failed to write seo_generation_log:", e);
  }
}

// ---------- Main handler ----------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check via anon client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin only");

    // Service-role client for writes (bypass RLS)
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { type, name, monthNumber, zoneNumber } = body as {
      type: "plant" | "month" | "zone";
      name?: string;
      monthNumber?: number;
      zoneNumber?: number;
    };

    if (type === "plant") {
      if (!name) throw new Error("name krävs för plant");
      const result = await callAI(plantPrompt(name), PLANT_TOOL, "save_plant_content");
      const slug = slugify(name);

      // Normalise 0 → null for sow fields
      const cleanInt = (v: any) => (v === 0 || v == null ? null : v);

      const row = {
        slug,
        name,
        latin_name: result.latin_name ?? null,
        category: result.category,
        name_alternatives: result.name_alternatives ?? [],
        sow_indoor_start: cleanInt(result.sow_indoor_start),
        sow_indoor_end: cleanInt(result.sow_indoor_end),
        sow_outdoor_start: cleanInt(result.sow_outdoor_start),
        sow_outdoor_end: cleanInt(result.sow_outdoor_end),
        harvest_start: result.harvest_start ?? null,
        harvest_end: result.harvest_end ?? null,
        germination_days_min: result.germination_days_min ?? null,
        germination_days_max: result.germination_days_max ?? null,
        days_to_harvest_min: result.days_to_harvest_min ?? null,
        days_to_harvest_max: result.days_to_harvest_max ?? null,
        plant_spacing_cm: result.plant_spacing_cm ?? null,
        row_spacing_cm: result.row_spacing_cm ?? null,
        planting_depth_cm: result.planting_depth_cm ?? null,
        mature_height_cm: result.mature_height_cm ?? null,
        difficulty: result.difficulty,
        sun_requirement: result.sun_requirement,
        water_requirement: result.water_requirement,
        soil_ph_min: result.soil_ph_min ?? null,
        soil_ph_max: result.soil_ph_max ?? null,
        zone_min: result.zone_min,
        zone_max: result.zone_max,
        companion_plants: result.companion_plants ?? [],
        avoid_plants: result.avoid_plants ?? [],
        description_short: result.description_short,
        description_long: result.description_long,
        content_html: result.content_html,
        faq: result.faq,
        published: false,
      };

      const { error } = await adminClient.from("seo_plants").upsert(row, { onConflict: "slug" });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, slug, type }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "month") {
      if (!monthNumber || monthNumber < 1 || monthNumber > 12) throw new Error("monthNumber 1-12 krävs");
      const monthName = MONTH_NAMES[monthNumber - 1];
      const result = await callAI(monthPrompt(monthName, monthNumber), MONTH_TOOL, "save_month_content");

      const row = {
        slug: monthName,
        month_number: monthNumber,
        month_name: monthName,
        title: `Trädgård i ${monthName} – Vad ska du så och skörda?`,
        season: result.season,
        intro: result.intro,
        content_html: result.content_html,
        tasks: result.tasks,
        avg_temp_south: result.avg_temp_south ?? null,
        avg_temp_middle: result.avg_temp_middle ?? null,
        avg_temp_north: result.avg_temp_north ?? null,
        daylight_hours_avg: result.daylight_hours_avg ?? null,
        frost_risk: result.frost_risk,
        faq: result.faq,
        published: false,
      };

      const { error } = await adminClient.from("seo_months").upsert(row, { onConflict: "slug" });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, slug: monthName, type }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "zone") {
      if (!zoneNumber || zoneNumber < 1 || zoneNumber > 8) throw new Error("zoneNumber 1-8 krävs");
      const result = await callAI(zonePrompt(zoneNumber), ZONE_TOOL, "save_zone_content");

      const row = {
        slug: `zon-${zoneNumber}`,
        zone_number: zoneNumber,
        title: `Odlingszon ${zoneNumber} – Klimat, växter och tips`,
        description: result.description,
        content_html: result.content_html,
        typical_regions: result.typical_regions,
        suitable_categories: result.suitable_categories ?? [],
        frost_free_days_min: result.frost_free_days_min,
        frost_free_days_max: result.frost_free_days_max,
        first_frost_typical: result.first_frost_typical,
        last_frost_typical: result.last_frost_typical,
        winter_temp_min: result.winter_temp_min ?? null,
        faq: result.faq,
        published: false,
      };

      const { error } = await adminClient.from("seo_zones").upsert(row, { onConflict: "slug" });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, slug: `zon-${zoneNumber}`, type }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Okänd type: ${type}`);
  } catch (e) {
    console.error("generate-seo-content error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("Admin only") ? 403 :
                   message.includes("Not authenticated") ? 401 :
                   message.includes("Rate limit") ? 429 :
                   message.includes("krediter") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
