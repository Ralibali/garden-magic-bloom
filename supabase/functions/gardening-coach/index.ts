import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Fetch user context
    const [profileRes, sowingsRes, plantsRes, harvestsRes] = await Promise.all([
      supabase.from("profiles").select("display_name, climate_zone").eq("user_id", user.id).maybeSingle(),
      supabase.from("sowings").select("variety, sow_date, status, type").eq("user_id", user.id).order("sow_date", { ascending: false }).limit(20),
      supabase.from("my_plants").select("custom_name, last_watered, watering_interval_days, location").eq("user_id", user.id).limit(20),
      supabase.from("harvests").select("variety, weight_grams, harvest_date").eq("user_id", user.id).order("harvest_date", { ascending: false }).limit(10),
    ]);

    const profile = profileRes.data;
    const sowings = sowingsRes.data || [];
    const plants = plantsRes.data || [];
    const harvests = harvestsRes.data || [];

    const now = new Date();
    const month = now.toLocaleString("sv-SE", { month: "long" });
    const zone = profile?.climate_zone || 3;
    const name = profile?.display_name || "odlare";

    const systemPrompt = `Du är Odlingscoachen – en vänlig, kunnig och inspirerande svensk odlingsrådgivare. 
Du ger personliga tips baserat på användarens klimatzon, aktuella sådder, krukväxter och skördar.
Svara alltid på svenska. Var konkret, positiv och handlingsinriktig.
Använd emoji sparsamt men effektivt.
Håll svaret till max 4-5 korta, konkreta tips. Formatera med markdown.
Nämn användaren vid namn om möjligt.`;

    const userContext = `
Användare: ${name}
Klimatzon: ${zone}
Månad: ${month} ${now.getFullYear()}
Datum: ${now.toISOString().split("T")[0]}

Aktiva sådder (${sowings.length} st): ${sowings.slice(0, 10).map(s => `${s.variety} (${s.status}, ${s.type})`).join(", ") || "Inga"}
Krukväxter (${plants.length} st): ${plants.slice(0, 10).map(p => {
  const daysSince = p.last_watered ? Math.floor((now.getTime() - new Date(p.last_watered).getTime()) / 86400000) : null;
  return `${p.custom_name}${p.location ? ` (${p.location})` : ""}${daysSince !== null ? ` – vattnad för ${daysSince} dagar sedan` : ""}`;
}).join(", ") || "Inga"}
Senaste skördar: ${harvests.slice(0, 5).map(h => `${h.variety} ${h.weight_grams}g`).join(", ") || "Inga"}

Ge ${name} personliga odlingstips för just nu. Tänk på:
- Vad som kan sås/förodlas i zon ${zone} just nu
- Skötsel av befintliga sådder och krukväxter (vattning, gödsling)
- Eventuella varningar (frost, skadedjur typiska för årstiden)
- Inspirerande förslag på vad som kan göras härnäst
`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext },
        ],
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
