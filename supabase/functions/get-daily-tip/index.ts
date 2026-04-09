import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return 'vår';
  if (month >= 6 && month <= 8) return 'sommar';
  if (month >= 9 && month <= 11) return 'höst';
  return 'vinter';
}

function getStockholmDate(): { dateStr: string; season: string; displayDate: string } {
  const now = new Date();
  const stockholm = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }));
  const year = stockholm.getFullYear();
  const month = stockholm.getMonth() + 1;
  const day = stockholm.getDate();
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const season = getSeason(month);
  const displayDate = stockholm.toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return { dateStr, season, displayDate };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { dateStr, season, displayDate } = getStockholmDate();

    // 1. Check cache first
    const { data: cached } = await supabase
      .from('daily_ai_tip')
      .select('*')
      .eq('date', dateStr)
      .single();

    if (cached) {
      console.log(`[getDailyTip] Cache hit for ${dateStr}`);
      return new Response(JSON.stringify({
        date: cached.date,
        season: cached.season,
        tip_text: cached.tip_text,
        cached: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. No cache - generate with AI
    console.log(`[getDailyTip] Cache miss for ${dateStr}, generating...`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Du är en kunnig trädgårdsrådgivare specialiserad på grönsaksodling i Sverige. Skriv ETT kort dagligt odlingstips. Anpassa efter säsong: ${season} och datum: ${displayDate}.

Krav:
- 70–120 ord.
- Svenskt språk.
- Praktiskt, konkret och användbart för hobbyodlare.
- Tips kan handla om: sådd, förodling, utplantering, skötsel, skörd, kompost, växtföljd, jordförbättring, skadedjur, bevattning.
- Anpassa efter vad som är relevant för årstiden i Sverige.
- Inga emojis.
- Ingen fluff.

Returnera bara själva tipstexten.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit, försök igen senare." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Krediter slut." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const tipText = aiData.choices?.[0]?.message?.content?.trim() || '';

    if (!tipText) throw new Error("Empty AI response");

    // 3. Try to insert (unique constraint protects against duplicates)
    const { data: inserted, error: insertError } = await supabase
      .from('daily_ai_tip')
      .insert({ date: dateStr, season, tip_text: tipText })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        console.log(`[getDailyTip] Duplicate key, reading existing...`);
        const { data: existing } = await supabase
          .from('daily_ai_tip')
          .select('*')
          .eq('date', dateStr)
          .single();

        if (existing) {
          return new Response(JSON.stringify({
            date: existing.date,
            season: existing.season,
            tip_text: existing.tip_text,
            cached: true,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      throw new Error(insertError.message);
    }

    console.log(`[getDailyTip] Generated and cached for ${dateStr}`);
    return new Response(JSON.stringify({
      date: inserted.date,
      season: inserted.season,
      tip_text: inserted.tip_text,
      cached: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("getDailyTip error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
