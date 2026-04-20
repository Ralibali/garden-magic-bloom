import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://odlingsdagboken.com";
const SORO_URL = "https://app.trysoro.com/api/embed/7cadf781-f963-4b64-83b3-705e8bdbbbc7";

type SoroArticle = {
  slug: string;
  title?: string;
  excerpt?: string;
  image?: string | null;
  isoDate?: string;
  category?: string;
  tags?: string[];
};

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

  const [postsRes, soroRes] = await Promise.all([
    supabase
      .from("blog_posts")
      .select("title, slug, excerpt, published_at, cover_image_url, category, tags")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(50),
    fetch(SORO_URL).then((r) => (r.ok ? r.text() : "")).catch(() => ""),
  ]);

  const posts = postsRes.data ?? [];

  // Parse Soro-artiklar ur embed-JS
  let soroArticles: SoroArticle[] = [];
  try {
    const match = (soroRes as string).match(/var SORO_ARTICLES = (\[[\s\S]*?\]);/);
    if (match) {
      const parsed = JSON.parse(match[1]) as SoroArticle[];
      soroArticles = parsed.filter((a) => a && typeof a.slug === "string" && a.slug.length > 0);
    }
  } catch (_e) {
    soroArticles = [];
  }

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

  // Bygg en kombinerad lista, sorterad nyast först
  type FeedItem = {
    title: string;
    link: string;
    guid: string;
    pubDate: string;
    pubTimestamp: number;
    description: string;
    categories: string[];
    imageUrl: string | null;
  };

  const items: FeedItem[] = [];

  for (const post of posts) {
    const dateObj = post.published_at ? new Date(post.published_at) : new Date();
    const imageUrl = post.cover_image_url
      ? (post.cover_image_url.startsWith("http") ? post.cover_image_url : `${BASE_URL}${post.cover_image_url}`)
      : null;
    items.push({
      title: post.title,
      link: `${BASE_URL}/blogg/${post.slug}`,
      guid: `${BASE_URL}/blogg/${post.slug}`,
      pubDate: dateObj.toUTCString(),
      pubTimestamp: dateObj.getTime(),
      description: post.excerpt || "",
      categories: [
        ...(post.category ? [post.category] : []),
        ...(post.tags || []),
      ],
      imageUrl,
    });
  }

  // Skip Soro-slugs som redan finns som native blog_posts
  const nativeSlugs = new Set(posts.map((p) => p.slug));
  for (const art of soroArticles) {
    if (nativeSlugs.has(art.slug)) continue;
    const dateObj = art.isoDate ? new Date(art.isoDate) : new Date();
    const link = `${BASE_URL}/blogg?post=${encodeURIComponent(art.slug)}`;
    items.push({
      title: art.title || art.slug,
      link,
      guid: link,
      pubDate: dateObj.toUTCString(),
      pubTimestamp: dateObj.getTime(),
      description: art.excerpt || "",
      categories: [
        ...(art.category ? [art.category] : []),
        ...(art.tags || []),
      ],
      imageUrl: art.image
        ? (art.image.startsWith("http") ? art.image : `${BASE_URL}${art.image}`)
        : null,
    });
  }

  // Sortera nyast först och kapa till 50
  items.sort((a, b) => b.pubTimestamp - a.pubTimestamp);
  const limited = items.slice(0, 50);

  for (const it of limited) {
    xml += `    <item>
      <title>${escXml(it.title)}</title>
      <link>${it.link}</link>
      <guid isPermaLink="true">${it.guid}</guid>
      <pubDate>${it.pubDate}</pubDate>
      <description>${escXml(it.description)}</description>
`;
    for (const cat of it.categories) {
      xml += `      <category>${escXml(cat)}</category>\n`;
    }
    if (it.imageUrl) {
      xml += `      <media:content url="${escXml(it.imageUrl)}" medium="image" />\n`;
    }
    xml += `    </item>\n`;
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
