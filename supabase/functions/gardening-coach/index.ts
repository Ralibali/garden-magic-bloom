import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

## SÅTIDER, SKÖTSEL, VÄXTFÖLJD, SAMPLANTERING, SKADEDJUR, GÖDNING, JORD, BEVATTNING
Du har djup kunskap om alla dessa ämnen för svenska förhållanden. Ge konkreta, zonspecifika råd.

## VÄXTFÖLJD
Odla inte samma växtfamilj på samma plats mer än vart 3–4 år.
- Nattskuggeväxter (tomat, potatis, paprika): 3 år
- Korsblommiga (kål, broccoli, rucola): 3 år
- Rotfrukter (morot, palsternacka): 2 år
- Baljväxter (bönor, ärtor): Fixar kväve – bra förväxt
- Gurkväxter (gurka, squash, pumpa): 2 år

## KRUKVÄXTER
Du kan ge detaljerade råd om vattning, gödsling, ljus och problem för vanliga krukväxter som monstera, orkidé, fikus, kaktus, spindelplanta, pothos, fredslilja och aloe vera.

## HUR GRO SVARAR
- Var personlig – nämn användarens namn och specifika växter/bäddar
- Var konkret och handlingsinriktad
- Använd emoji sparsamt men effektivt
- Formatera med markdown
- Ställ följdfrågor vid behov`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const { messages: clientMessages } = await req.json();

    // Fetch all user context in parallel
    const [profileRes, sowingsRes, plantsRes, harvestsRes, bedsRes, seasonRes] = await Promise.all([
      supabase.from("profiles").select("display_name, climate_zone").eq("user_id", user.id).maybeSingle(),
      supabase.from("sowings").select("variety, sow_date, status, type, seed_brand, bed_id, beds(name)").eq("user_id", user.id).order("sow_date", { ascending: false }).limit(50),
      supabase.from("my_plants").select("custom_name, last_watered, watering_interval_days, location, last_fertilized, fertilizing_interval_days").eq("user_id", user.id).limit(50),
      supabase.from("harvests").select("variety, weight_grams, harvest_date, beds(name)").eq("user_id", user.id).order("harvest_date", { ascending: false }).limit(30),
      supabase.from("beds").select("name, description, season_notes").eq("user_id", user.id),
      supabase.from("season_summaries").select("year, went_well, didnt_work, grow_again, beds(name)").eq("user_id", user.id).order("year", { ascending: false }).limit(20),
    ]);

    const profile = profileRes.data;
    const sowings = sowingsRes.data || [];
    const plants = plantsRes.data || [];
    const harvests = harvestsRes.data || [];
    const beds = bedsRes.data || [];
    const seasons = seasonRes.data || [];

    const now = new Date();
    const month = now.toLocaleString("sv-SE", { month: "long" });
    const zone = profile?.climate_zone || 3;
    const name = profile?.display_name || "odlare";

    // Build dynamic context
    const plantDetails = plants.map(p => {
      const daysSince = p.last_watered ? Math.floor((now.getTime() - new Date(p.last_watered).getTime()) / 86400000) : null;
      const daysUntil = (p.watering_interval_days && daysSince !== null) ? p.watering_interval_days - daysSince : null;
      return `- ${p.custom_name || "Namnlös"}${p.location ? ` (${p.location})` : ""}: vattningsintervall ${p.watering_interval_days || '?'} dagar${daysSince !== null ? `, senast vattnad för ${daysSince} dagar sedan` : ""}${daysUntil !== null ? `, ${daysUntil <= 0 ? `FÖRSENAD ${Math.abs(daysUntil)} dagar` : `${daysUntil} dagar till nästa`}` : ""}`;
    }).join("\n") || "Inga registrerade";

    const sowingDetails = sowings.map(s => {
      const bed = (s as any).beds?.name;
      const weeksSince = Math.floor((now.getTime() - new Date(s.sow_date).getTime()) / (7 * 86400000));
      return `- ${s.variety} (${s.type}, ${s.status})${s.seed_brand ? ` [${s.seed_brand}]` : ""}${bed ? ` i ${bed}` : ""} – sådd ${s.sow_date} (${weeksSince} veckor sedan)`;
    }).join("\n") || "Inga sådder";

    const harvestDetails = harvests.map(h => {
      const bed = (h as any).beds?.name;
      return `- ${h.variety}: ${h.weight_grams}g${bed ? ` från ${bed}` : ""} (${h.harvest_date})`;
    }).join("\n") || "Inga skördar";

    const bedDetails = beds.map(b => `- ${b.name}${b.description ? `: ${b.description}` : ""}`).join("\n") || "Inga bäddar";

    const seasonHistory = seasons.map(s => {
      const bed = (s as any).beds?.name;
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

    // Build messages array
    const messages = [
      { role: "system", content: systemContent },
      ...(clientMessages || []),
    ];

    // If no user messages yet, add a prompt for proactive greeting
    if (!clientMessages || clientMessages.length === 0) {
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
