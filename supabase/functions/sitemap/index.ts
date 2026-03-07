import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const BASE_URL = "https://odlingsdagboken.se";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, updated_at, published_at, cover_image_url, title")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "weekly" },
    { loc: "/blogg", priority: "0.9", changefreq: "daily" },
    { loc: "/guider", priority: "0.8", changefreq: "daily" },
    { loc: "/login", priority: "0.5", changefreq: "monthly" },
    { loc: "/terms", priority: "0.3", changefreq: "yearly" },
  ];

  const now = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  for (const page of staticPages) {
    xml += `  <url>
    <loc>${BASE_URL}${page.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <xhtml:link rel="alternate" hreflang="sv" href="${BASE_URL}${page.loc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${page.loc}" />
  </url>
`;
  }

  if (posts) {
    for (const post of posts) {
      const lastmod = (post.updated_at || post.published_at || now).split("T")[0];
      const imageUrl = post.cover_image_url
        ? (post.cover_image_url.startsWith("http") ? post.cover_image_url : `${BASE_URL}${post.cover_image_url}`)
        : null;

      xml += `  <url>
    <loc>${BASE_URL}/blogg/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="sv" href="${BASE_URL}/blogg/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/blogg/${post.slug}" />`;

      if (imageUrl) {
        xml += `
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${(post.title || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</image:title>
    </image:image>`;
      }

      xml += `
  </url>
`;
    }
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
});
