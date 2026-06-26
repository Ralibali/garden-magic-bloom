import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const BASE_URL = "https://odlingsdagboken.com";

type ImageEntry = { url: string; title?: string };
type SitemapEntry = { loc: string; lastmod?: string | null; image?: ImageEntry | null };

const esc = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const dateOnly = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
};

const latestDate = (values: Array<string | null | undefined>) => {
  const valid = values
    .map((value) => value ? new Date(value) : null)
    .filter((value): value is Date => !!value && !Number.isNaN(value.getTime()));
  if (!valid.length) return undefined;
  return valid.sort((a, b) => b.getTime() - a.getTime())[0].toISOString().slice(0, 10);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [postsRes, plantsRes, monthsRes, zonesRes] = await Promise.all([
    supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at, cover_image_url, title, tags")
      .eq("is_published", true)
      .order("published_at", { ascending: false }),
    supabase
      .from("seo_plants")
      .select("slug, updated_at, created_at, image_url, name")
      .eq("published", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("seo_months")
      .select("slug, updated_at, created_at")
      .eq("published", true)
      .order("month_number", { ascending: true }),
    supabase
      .from("seo_zones")
      .select("slug, updated_at, created_at")
      .eq("published", true)
      .order("zone_number", { ascending: true }),
  ]);

  const posts = postsRes.data ?? [];
  const plants = plantsRes.data ?? [];
  const months = monthsRes.data ?? [];
  const zones = zonesRes.data ?? [];

  const entries: SitemapEntry[] = [
    { loc: "/" },
    { loc: "/sakalender" },
    { loc: "/odlingsplan" },
    { loc: "/odlingsakuten" },
    { loc: "/gro" },
    { loc: "/priser" },
    { loc: "/om-oss" },
    { loc: "/blogg", lastmod: latestDate(posts.map((post) => post.updated_at || post.published_at)) },
    { loc: "/vaxter", lastmod: latestDate(plants.map((plant) => plant.updated_at || plant.created_at)) },
    { loc: "/manad", lastmod: latestDate(months.map((month) => month.updated_at || month.created_at)) },
    { loc: "/zoner", lastmod: latestDate(zones.map((zone) => zone.updated_at || zone.created_at)) },
    { loc: "/install" },
    { loc: "/terms" },
  ];

  for (const post of posts) {
    entries.push({
      loc: `/blogg/${post.slug}`,
      lastmod: dateOnly(post.updated_at || post.published_at),
      image: post.cover_image_url ? { url: post.cover_image_url, title: post.title } : null,
    });
  }

  for (const plant of plants) {
    entries.push({
      loc: `/vaxter/${plant.slug}`,
      lastmod: dateOnly(plant.updated_at || plant.created_at),
      image: plant.image_url ? { url: plant.image_url, title: plant.name } : null,
    });
  }

  for (const month of months) {
    entries.push({
      loc: `/manad/${month.slug}`,
      lastmod: dateOnly(month.updated_at || month.created_at),
    });
  }

  for (const zone of zones) {
    entries.push({
      loc: `/zoner/${zone.slug}`,
      lastmod: dateOnly(zone.updated_at || zone.created_at),
    });
  }

  const tags = new Map<string, string[]>();
  for (const post of posts as Array<{ tags: string[] | null; updated_at: string | null; published_at: string | null }>) {
    for (const tag of Array.isArray(post.tags) ? post.tags : []) {
      const normalized = tag?.trim();
      if (!normalized) continue;
      const dates = tags.get(normalized) ?? [];
      const date = post.updated_at || post.published_at;
      if (date) dates.push(date);
      tags.set(normalized, dates);
    }
  }

  for (const [tag, dates] of tags) {
    entries.push({
      loc: `/blogg/tagg/${encodeURIComponent(tag)}`,
      lastmod: latestDate(dates),
    });
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  for (const entry of entries) {
    const absoluteUrl = `${BASE_URL}${entry.loc}`;
    xml += `  <url>\n    <loc>${esc(absoluteUrl)}</loc>`;
    if (entry.lastmod) xml += `\n    <lastmod>${entry.lastmod}</lastmod>`;
    xml += `\n    <xhtml:link rel="alternate" hreflang="sv-SE" href="${esc(absoluteUrl)}" />`;
    xml += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(absoluteUrl)}" />`;
    if (entry.image?.url) {
      const absoluteImage = entry.image.url.startsWith("http") ? entry.image.url : `${BASE_URL}${entry.image.url}`;
      xml += `\n    <image:image>\n      <image:loc>${esc(absoluteImage)}</image:loc>`;
      if (entry.image.title) xml += `\n      <image:title>${esc(entry.image.title)}</image:title>`;
      xml += `\n    </image:image>`;
    }
    xml += `\n  </url>\n`;
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
});
