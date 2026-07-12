import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Du är en försiktig svensk odlingsassistent som hjälper till att TOLKA vad som SYNS på ett bild av en krukväxt.

VIKTIGT:
- Du ställer ALDRIG en säker diagnos. Använd uttryckligen ord som "möjligen", "det ser ut som", "kan tyda på".
- Du föreslår aldrig att vattna enbart baserat på bilden — jorden måste kollas fysiskt.
- Om bilden är oklar, för mörk eller inte visar en växt: säg det tydligt och returnera tomma observationer.
- Svara ALLTID med giltig JSON exakt enligt schemat.

Schema:
{
  "overall_impression": "en kort mening om helhetsintrycket, max 140 tecken",
  "observations": [{ "label": "vad du ser", "severity": "info" | "watch" | "concern" }],
  "manual_checks": ["konkreta saker användaren själv bör kontrollera fysiskt"],
  "recommendation": "en försiktig rekommendation, max 200 tecken",
  "confidence": "low" | "medium" | "high",
  "unclear": true | false
}

Alla texter på svenska. Håll ton vuxen, hjälpsam, inte alarmistisk.`;

interface AnalysisResult {
  overall_impression: string;
  observations: Array<{ label: string; severity: 'info' | 'watch' | 'concern' }>;
  manual_checks: string[];
  recommendation: string;
  confidence: 'low' | 'medium' | 'high';
  unclear: boolean;
}

function sanitize(raw: any): AnalysisResult {
  const observations = Array.isArray(raw?.observations)
    ? raw.observations
        .filter((o: any) => o && typeof o.label === 'string')
        .slice(0, 6)
        .map((o: any) => ({
          label: String(o.label).slice(0, 160),
          severity: ['info', 'watch', 'concern'].includes(o.severity) ? o.severity : 'info',
        }))
    : [];
  const manualChecks = Array.isArray(raw?.manual_checks)
    ? raw.manual_checks.filter((c: any) => typeof c === 'string').slice(0, 6).map((c: string) => c.slice(0, 200))
    : [];
  return {
    overall_impression: String(raw?.overall_impression || '').slice(0, 220),
    observations,
    manual_checks: manualChecks,
    recommendation: String(raw?.recommendation || '').slice(0, 280),
    confidence: ['low', 'medium', 'high'].includes(raw?.confidence) ? raw.confidence : 'low',
    unclear: raw?.unclear === true,
  };
}

function extractJson(text: string): any {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first === -1 || last === -1) return null;
  try {
    return JSON.parse(candidate.slice(first, last + 1));
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Ej inloggad' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Ogiltig session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const photoId = body?.photo_id;
    if (!photoId || typeof photoId !== 'string') {
      return new Response(JSON.stringify({ error: 'photo_id krävs' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: photo, error: photoError } = await admin
      .from('plant_photos')
      .select('id, user_id, my_plant_id, photo_url, taken_at, analysis')
      .eq('id', photoId)
      .maybeSingle();
    if (photoError || !photo) {
      return new Response(JSON.stringify({ error: 'Fotot kunde inte hittas' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (photo.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Ej din bild' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Storage path can be stored either as bare path or a full URL — normalize.
    const marker = '/plant-photos/';
    const idx = photo.photo_url.indexOf(marker);
    const storagePath = idx === -1 ? photo.photo_url : photo.photo_url.slice(idx + marker.length);

    const { data: signed, error: signError } = await admin.storage
      .from('plant-photos')
      .createSignedUrl(storagePath, 600);
    if (signError || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: 'Kunde inte läsa bilden' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'AI-tjänsten är inte konfigurerad' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analysera bilden. Returnera JSON enligt schemat. Var försiktig — detta är observationsstöd, inte diagnos.' },
          { type: 'image_url', image_url: { url: signed.signedUrl } },
        ],
      },
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI gateway error', aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'AI-tjänsten är just nu överbelastad. Försök igen om en stund.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI-krediterna är slut för tillfället.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'AI-tjänsten svarade inte.' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiJson = await aiResponse.json();
    const rawText = aiJson?.choices?.[0]?.message?.content || '';
    const parsed = extractJson(typeof rawText === 'string' ? rawText : JSON.stringify(rawText));
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'Kunde inte tolka AI-svaret' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const analysis = sanitize(parsed);
    const record = {
      ...analysis,
      generated_at: new Date().toISOString(),
      model: 'google/gemini-2.5-pro',
    };

    await admin
      .from('plant_photos')
      .update({ analysis: record, analyzed_at: new Date().toISOString() })
      .eq('id', photoId);

    return new Response(JSON.stringify({ analysis: record }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('analyze-plant-photo error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Okänt fel' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
