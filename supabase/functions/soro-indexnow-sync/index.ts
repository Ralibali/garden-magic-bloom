// Hämtar Soro-artiklar och pingar IndexNow för nya/uppdaterade slugs.
// Lagrar redan-pingade slugs i en KV-liknande tabell via Supabase för att undvika dubletter.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const SORO_URL = "https://app.trysoro.com/api/embed/7cadf781-f963-4b64-83b3-705e8bdbbbc7";
const HOST = "odlingsdagboken.com";
const KEY = "cf82dd06e2cee2bb8a1101be1c96df38";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

type SoroArticle = { slug: string; title?: string; isoDate?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Hämta Soro-artiklar
    const soroRes = await fetch(SORO_URL);
    const soroText = await soroRes.text();
    const match = soroText.match(/var SORO_ARTICLES = (\[[\s\S]*?\]);/);
    if (!match) {
      return new Response(JSON.stringify({ error: "Kunde inte parsa Soro-artiklar" }), { status: 500, headers: corsHeaders });
    }
    const articles = (JSON.parse(match[1]) as SoroArticle[])
      .filter(a => a && typeof a.slug === "string" && a.slug.length > 0);

    // 2. Identifiera nya/uppdaterade artiklar via state-tabell
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existing } = await supabase
      .from("soro_indexnow_state")
      .select("slug, last_iso_date");

    const existingMap = new Map((existing ?? []).map(r => [r.slug as string, r.last_iso_date as string | null]));
    const toPing: SoroArticle[] = [];
    const toUpsert: Array<{ slug: string; last_iso_date: string | null }> = [];

    for (const art of articles) {
      const prev = existingMap.get(art.slug);
      const current = art.isoDate ?? null;
      if (prev === undefined || prev !== current) {
        toPing.push(art);
        toUpsert.push({ slug: art.slug, last_iso_date: current });
      }
    }

    if (toPing.length === 0) {
      return new Response(JSON.stringify({ message: "Inga nya Soro-artiklar att pinga", total: articles.length }), { headers: corsHeaders });
    }

    // 3. Pinga IndexNow
    const urlList = toPing.map(a => `https://${HOST}/blogg?post=${encodeURIComponent(a.slug)}`);
    // Lägg även till sitemap så Google återbesöker den
    urlList.push(`https://${HOST}/sitemap.xml`);

    const pingResults: Array<{ endpoint: string; status: number; ok: boolean }> = [];
    for (const endpoint of ["https://api.indexnow.org/indexnow", "https://www.bing.com/indexnow"]) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
        });
        await res.text();
        pingResults.push({ endpoint, status: res.status, ok: res.ok });
      } catch (e) {
        pingResults.push({ endpoint, status: 0, ok: false });
        console.error("IndexNow error:", endpoint, e);
      }
    }

    // 4. Uppdatera state
    if (toUpsert.length > 0) {
      await supabase.from("soro_indexnow_state").upsert(toUpsert, { onConflict: "slug" });
    }

    return new Response(JSON.stringify({
      pinged_count: toPing.length,
      pinged_slugs: toPing.map(a => a.slug),
      total_articles: articles.length,
      results: pingResults,
    }), { headers: corsHeaders });
  } catch (e) {
    console.error("soro-indexnow-sync error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
