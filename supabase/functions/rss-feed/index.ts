import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://odlingsdagboken.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("title, slug, excerpt, published_at, cover_image_url, category, tags")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(50);

  const now = new Date().toUTCString();
  const escXml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Odlingsdagboken – Blogg</title>
    <link>${BASE_URL}/blogg</link>
    <description>Tips, guider och inspiration för din trädgårdsodling. Från frö till skörd.</description>
    <language>sv</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${BASE_URL}/favicon.svg</url>
      <title>Odlingsdagboken</title>
      <link>${BASE_URL}</link>
    </image>
`;

  if (posts) {
    for (const post of posts) {
      const pubDate = post.published_at ? new Date(post.published_at).toUTCString() : now;
      const imageUrl = post.cover_image_url
        ? (post.cover_image_url.startsWith("http") ? post.cover_image_url : `${BASE_URL}${post.cover_image_url}`)
        : null;
      const categories = [
        ...(post.category ? [post.category] : []),
        ...(post.tags || []),
      ];

      xml += `    <item>
      <title>${escXml(post.title)}</title>
      <link>${BASE_URL}/blogg/${post.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/blogg/${post.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escXml(post.excerpt || "")}</description>
`;
      for (const cat of categories) {
        xml += `      <category>${escXml(cat)}</category>\n`;
      }
      if (imageUrl) {
        xml += `      <media:content url="${escXml(imageUrl)}" medium="image" />\n`;
      }
      xml += `    </item>\n`;
    }
  }

  xml += `  </channel>\n</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
