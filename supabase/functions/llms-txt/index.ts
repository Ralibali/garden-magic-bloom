// Dynamiskt /llms.txt — AI-motsvarighet till robots.txt.
// Streamas live från seo_plants/seo_months/seo_zones via Supabase.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE = "https://odlingsdagboken.com";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "text/markdown; charset=utf-8",
  "Cache-Control": "public, max-age=600, s-maxage=3600",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [{ data: plants = [] }, { data: months = [] }, { data: zones = [] }] = await Promise.all([
    supabase.from("seo_plants").select("slug, name, description_short").eq("published", true).order("name"),
    supabase.from("seo_months").select("slug, month_name, intro").eq("published", true).order("month_number"),
    supabase.from("seo_zones").select("slug, title, description").eq("published", true).order("zone_number"),
  ]);

  const truncate = (s: string | null, n = 80) =>
    !s ? "" : (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

  const lines: string[] = [
    "# Odlingsdagboken",
    "",
    "> Odlingsdagboken är en svensk digital odlingsdagbok och trädgårdsapp som hjälper hobbyodlare att planera, dokumentera och lyckas med sin odling. Byggd av Aurora Media AB (org.nr 559272-0220) för svenska odlingszoner och svenskt klimat.",
    "",
    "## Om sajten",
    `- [Om oss](${BASE}/om-oss): Aurora Media AB och teamet bakom Odlingsdagboken`,
    `- [Priser](${BASE}/priser): Freemium med Plus för 99 kr/år`,
    `- [Gro – AI-odlingscoach](${BASE}/gro): Personlig AI-rådgivare för svenska odlare`,
    `- [Blogg](${BASE}/blogg): Odlingsguider och artiklar`,
    "",
  ];

  if (plants && plants.length) {
    lines.push("## Växtguider", "");
    for (const p of plants) {
      lines.push(`- [${p.name}](${BASE}/vaxter/${p.slug}): ${truncate(p.description_short)}`);
    }
    lines.push("");
  }

  if (months && months.length) {
    lines.push("## Månadsguider", "");
    for (const m of months) {
      lines.push(`- [${m.month_name}](${BASE}/manad/${m.slug}): ${truncate(m.intro) || `Vad odla i ${m.month_name}`}`);
    }
    lines.push("");
  }

  if (zones && zones.length) {
    lines.push("## Klimatzoner", "");
    for (const z of zones) {
      lines.push(`- [${z.title}](${BASE}/zoner/${z.slug}): ${truncate(z.description) || z.title}`);
    }
    lines.push("");
  }

  lines.push(
    "## Kontakt",
    "- E-post: info@auroramedia.se",
    "- Sajt: https://odlingsdagboken.com",
    ""
  );

  return new Response(lines.join("\n"), { headers });
});
