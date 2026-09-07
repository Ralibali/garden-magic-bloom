import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  cleanSeedExtraction,
  validateSeedImage,
  SEED_PHOTO_MODEL,
  SEED_PHOTO_PROMPT,
} from "../_shared/seedPhoto.ts";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Metoden stöds inte" }, 405);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  let lease: { id: string; lease_id: string } | null = null;
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token)
      return reply({ error: "Logga in för att läsa av fröpåsen" }, 401);
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);
    if (authError || !user) return reply({ error: "Logga in igen" }, 401);
    // Bound streamed input as well as Content-Length; a caller may omit that header.
    const reader = req.body?.getReader();
    if (!reader) return reply({ error: "Bilden saknas" }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 3_010_000) {
        await reader.cancel();
        return reply({ error: "Bilden är för stor" }, 413);
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    let body: { image?: unknown; id?: string };
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return reply({ error: "Ogiltig bildförfrågan" }, 400);
    }
    if (!body?.id || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.id))
      return reply({ error: "Bildens identitet saknas" }, 400);
    let image: string;
    try {
      image = validateSeedImage(body.image);
    } catch {
      return reply({ error: "Välj ett nytt foto i JPEG, PNG eller WebP" }, 400);
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key)
      return reply(
        {
          error:
            "Avläsningen är inte tillgänglig. Du kan skriva in fröet manuellt.",
        },
        503,
      );
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(image)),
      ),
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const { data: claimed, error: claimError } = await admin.rpc(
      "claim_seed_photo",
      { p_user: user.id, p_id: body.id, p_hash: hash },
    );
    if (claimError) return reply({ error: claimError.message }, 429);
    if (claimed.status === "ready")
      return reply({ id: claimed.id, fields: claimed.fields });
    lease = claimed;
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        signal: AbortSignal.timeout(75_000),
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: SEED_PHOTO_MODEL,
          max_tokens: 2000,
          messages: [
            { role: "system", content: SEED_PHOTO_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: "Läs av fröpåsen och returnera JSON." },
                { type: "image_url", image_url: { url: image } },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );
    if (!response.ok)
      throw new Error(
        "AI-tjänsten är upptagen eller saknar krediter. Försök senare eller fyll i manuellt.",
      );
    const result = await response.json();
    const raw = result?.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || raw.length > 20000)
      throw new Error(
        "Avläsningen kunde inte tolkas. Försök med en tydligare bild.",
      );
    const fields = cleanSeedExtraction(
      JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")),
    );
    const { data: saved, error } = await admin
      .from("seed_photo_imports")
      .update({
        status: "ready",
        fields,
        model: SEED_PHOTO_MODEL,
        updated_at: new Date().toISOString(),
      })
      .eq("id", claimed.id)
      .eq("lease_id", claimed.lease_id)
      .select("id")
      .maybeSingle();
    if (error || !saved)
      throw new Error("Avläsningen kunde inte sparas. Försök igen.");
    return reply({ id: saved.id, fields });
  } catch {
    if (lease)
      await admin
        .from("seed_photo_imports")
        .update({ status: "error", updated_at: new Date().toISOString() })
        .eq("id", lease.id)
        .eq("lease_id", lease.lease_id);
    return reply(
      {
        error:
          "Avläsningen kunde inte slutföras. Försök igen eller skriv in fröet manuellt.",
      },
      502,
    );
  }
});
