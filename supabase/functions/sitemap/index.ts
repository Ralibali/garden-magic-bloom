import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const BASE_URL = "https://odlingsdagboken.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [postsRes, plantsRes, monthsRes, zonesRes, soroRes] = await Promise.all([
    supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at, cover_image_url, title")
      .eq("is_published", true)
      .order("published_at", { ascending: false }),
    supabase
      .from("seo_plants")
      .select("slug, updated_at, image_url, name")
      .eq("published", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("seo_months")
      .select("slug, updated_at, title")
      .eq("published", true)
      .order("month_number", { ascending: true }),
    supabase
      .from("seo_zones")
      .select("slug, updated_at, title")
      .eq("published", true)
      .order("zone_number", { ascending: true }),
    fetch("https://app.trysoro.com/api/embed/7cadf781-f963-4b64-83b3-705e8bdbbbc7")
      .then((r) => r.ok ? r.text() : "")
      .catch(() => ""),
  ]);

  const posts = postsRes.data ?? [];
  const plants = plantsRes.data ?? [];
  const months = monthsRes.data ?? [];
  const zones = zonesRes.data ?? [];

  type SoroArticle = { slug: string; title?: string; image?: string | null; isoDate?: string };
  let soroArticles: SoroArticle[] = [];
  try {
    const match = (soroRes as string).match(/var SORO_ARTICLES = (\[[\s\S]*?\]);/);
    if (match) {
      const parsed = JSON.parse(match[1]) as Array<{ slug: string; title?: string; image?: string | null; isoDate?: string }>;
      soroArticles = parsed.filter((a) => a && typeof a.slug === "string" && a.slug.length > 0);
    }
  } catch (_e) {
    soroArticles = [];
  }

  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "weekly" },
    { loc: "/sakalender", priority: "0.95", changefreq: "weekly" },
    { loc: "/odlingsplan", priority: "0.95", changefreq: "weekly" },
    { loc: "/odlingsakuten", priority: "0.9", changefreq: "weekly" },
    { loc: "/gro", priority: "0.85", changefreq: "weekly" },
    { loc: "/priser", priority: "0.75", changefreq: "monthly" },
    { loc: "/om-oss", priority: "0.65", changefreq: "monthly" },
    { loc: "/blogg", priority: "0.9", changefreq: "daily" },
    { loc: "/vaxter", priority: "0.9", changefreq: "weekly" },
    { loc: "/manad", priority: "0.8", changefreq: "weekly" },
    { loc: "/zoner", priority: "0.8", changefreq: "monthly" },
    { loc: "/install", priority: "0.6", changefreq: "monthly" },
    { loc: "/terms", priority: "0.3", changefreq: "yearly" },
  ];

  const today = new Date().toISOString().split("T")[0];
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  const writeUrl = (
    loc: string,
    lastmod: string,
    changefreq: string,
    priority: string,
    image?: { url: string; title?: string } | null,
  ) => {
    xml += `  <url>
    <loc>${BASE_URL}${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="sv" href="${BASE_URL}${loc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${loc}" />`;
    if (image?.url) {
      const absolute = image.url.startsWith("http") ? image.url : `${BASE_URL}${image.url}`;
      xml += `
    <image:image>
      <image:loc>${esc(absolute)}</image:loc>${image.title ? `
      <image:title>${esc(image.title)}</image:title>` : ""}
    </image:image>`;
    }
    xml += `
  </url>
`;
  };

  for (const page of staticPages) {
    writeUrl(page.loc, today, page.changefreq, page.priority);
  }

  for (const post of posts) {
    const lastmod = (post.updated_at || post.published_at || today).split("T")[0];
    writeUrl(`/blogg/${post.slug}`, lastmod, "weekly", "0.8",
      post.cover_image_url ? { url: post.cover_image_url, title: post.title } : null);
  }

  for (const plant of plants) {
    const lastmod = (plant.updated_at || today).split("T")[0];
    writeUrl(`/vaxter/${plant.slug}`, lastmod, "monthly", "0.8",
      plant.image_url ? { url: plant.image_url, title: plant.name } : null);
  }

  for (const month of months) {
    const lastmod = (month.updated_at || today).split("T")[0];
    writeUrl(`/manad/${month.slug}`, lastmod, "monthly", "0.7");
  }

  for (const zone of zones) {
    const lastmod = (zone.updated_at || today).split("T")[0];
    writeUrl(`/zoner/${zone.slug}`, lastmod, "monthly", "0.7");
  }

  const nativeSlugs = new Set(posts.map((p) => p.slug));
  for (const art of soroArticles) {
    if (nativeSlugs.has(art.slug)) continue;
    const lastmod = art.isoDate ? art.isoDate.split("T")[0] : today;
    writeUrl(
      `/blogg?post=${encodeURIComponent(art.slug)}`,
      lastmod,
      "monthly",
      "0.7",
      art.image ? { url: art.image, title: art.title } : null,
    );
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
});
