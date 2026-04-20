import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "seo-plant-images";

function buildPrompt(name: string, latin?: string | null): string {
  return `A high-quality editorial photograph of a healthy ${name}${
    latin ? ` (${latin})` : ""
  } plant growing in a Swedish home garden. Natural daylight, shallow depth of field, soft warm tones, lush green foliage, realistic textures. Magazine-style composition, no text, no watermark, no people. Wide aspect ratio suitable for an article hero image.`;
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URL from AI gateway");
  const contentType = match[1];
  const b64 = match[2];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Auth check via anon client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin only");

    const body = await req.json();
    const { plantId } = body as { plantId?: string };
    if (!plantId) throw new Error("plantId krävs");

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: plant, error: plantErr } = await adminClient
      .from("seo_plants")
      .select("id, slug, name, latin_name")
      .eq("id", plantId)
      .maybeSingle();
    if (plantErr) throw plantErr;
    if (!plant) throw new Error("Växt hittades inte");

    // Generate image via Lovable AI gateway (Gemini image model)
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          { role: "user", content: buildPrompt(plant.name, plant.latin_name) },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      if (aiResp.status === 429) throw new Error("Rate limit – försök igen om en stund.");
      if (aiResp.status === 402) throw new Error("AI-krediter slut. Lägg till krediter i Lovable Workspace.");
      throw new Error(`AI gateway error ${aiResp.status}: ${text.slice(0, 300)}`);
    }

    const aiData = await aiResp.json();
    const dataUrl: string | undefined =
      aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) throw new Error("AI returnerade ingen bild");

    const { bytes, contentType } = dataUrlToBytes(dataUrl);
    const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
    const path = `${plant.slug}-${Date.now()}.${ext}`;

    const { error: uploadErr } = await adminClient.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType, upsert: true });
    if (uploadErr) throw uploadErr;

    const { data: pub } = adminClient.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub.publicUrl;
    const alt = `${plant.name} som odlas i en svensk trädgård`;

    const { error: updateErr } = await adminClient
      .from("seo_plants")
      .update({ image_url: publicUrl, image_alt: alt })
      .eq("id", plant.id);
    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ success: true, image_url: publicUrl, image_alt: alt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-plant-image error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("Admin only") ? 403 :
      message.includes("Not authenticated") ? 401 :
      message.includes("Rate limit") ? 429 :
      message.includes("krediter") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
