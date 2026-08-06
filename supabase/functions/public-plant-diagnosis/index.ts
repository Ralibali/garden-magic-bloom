import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_IMAGE_BYTES = 1_500_000;
const MAX_NOTE_LENGTH = 500;

const SYSTEM_PROMPT = `Du är Växtdoktorn i Odlingsdagboken. Du analyserar ett foto av en växt och ger försiktig, praktisk vägledning på svenska.

VIKTIGT:
- Ställ aldrig en säker diagnos från en enda bild.
- Skriv "kan vara", "ser möjligen ut som" eller "kan tyda på".
- Föreslå aldrig bekämpningsmedel som första åtgärd.
- Rekommendera aldrig vattning enbart från bilden; användaren måste känna på jorden.
- Om bilden är oklar, inte visar en växt eller inte räcker för bedömning ska du säga det tydligt.
- Returnera alltid giltig JSON enligt exakt detta schema:
{
  "summary": "kort helhetsbedömning",
  "confidence": "low" | "medium" | "high",
  "likely_causes": [{ "title": "möjlig orsak", "explanation": "kort förklaring" }],
  "actions": ["konkret steg att göra nu"],
  "follow_up": "vad användaren bör kontrollera eller fotografera senare",
  "disclaimer": "kort påminnelse om att AI-bedömningen kan vara fel"
}

Begränsa likely_causes till högst 3 och actions till högst 5. Alla texter ska vara vuxna, lugna och konkreta.`;

type Analysis = {
  summary: string;
  confidence: "low" | "medium" | "high";
  likely_causes: Array<{ title: string; explanation: string }>;
  actions: string[];
  follow_up: string;
  disclaimer: string;
};

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(fenced.slice(start, end + 1)); } catch { return null; }
}

function sanitize(value: any): Analysis {
  return {
    summary: String(value?.summary || "Bilden räcker inte för en tydlig bedömning.").slice(0, 500),
    confidence: ["low", "medium", "high"].includes(value?.confidence) ? value.confidence : "low",
    likely_causes: Array.isArray(value?.likely_causes)
      ? value.likely_causes.filter((item: any) => item && typeof item.title === "string").slice(0, 3).map((item: any) => ({
          title: String(item.title).slice(0, 120),
          explanation: String(item.explanation || "").slice(0, 360),
        }))
      : [],
    actions: Array.isArray(value?.actions) ? value.actions.filter((item: any) => typeof item === "string").slice(0, 5).map((item: string) => item.slice(0, 260)) : [],
    follow_up: String(value?.follow_up || "Ta ett nytt foto i dagsljus och kontrollera även bladens undersidor och jordens fuktighet.").slice(0, 400),
    disclaimer: String(value?.disclaimer || "Detta är en AI-baserad första bedömning och kan vara fel.").slice(0, 260),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Metoden stöds inte" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => null);
    const image = body?.image;
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, MAX_NOTE_LENGTH) : "";
    if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) {
      return new Response(JSON.stringify({ error: "En giltig bild krävs" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const base64 = image.split(",", 2)[1] || "";
    if (Math.floor(base64.length * 0.75) > MAX_IMAGE_BYTES) {
      return new Response(JSON.stringify({ error: "Bilden är för stor" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI-tjänsten är inte konfigurerad" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = note
      ? `Analysera växtbilden. Användaren beskriver problemet så här: ${note}`
      : "Analysera växtbilden och ge en försiktig första bedömning.";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image } }] },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status === 429 ? 429 : aiResponse.status === 402 ? 402 : 502;
      const message = status === 429 ? "AI-tjänsten är upptagen. Försök igen om en stund." : status === 402 ? "AI-krediterna är tillfälligt slut." : "AI-tjänsten kunde inte analysera bilden.";
      return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = await aiResponse.json();
    const raw = payload?.choices?.[0]?.message?.content;
    const parsed = extractJson(typeof raw === "string" ? raw : JSON.stringify(raw || {}));
    if (!parsed) return new Response(JSON.stringify({ error: "Kunde inte tolka AI-svaret" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ analysis: sanitize(parsed) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("public-plant-diagnosis error", error);
    return new Response(JSON.stringify({ error: "Något gick fel vid analysen" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
