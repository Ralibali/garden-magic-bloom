import React from 'react';
import VisitorWelcomePopup from '@/components/VisitorWelcomePopup';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sprout, Loader2, BookOpen, CalendarDays } from 'lucide-react';

const categoryLabels: Record<string, string> = {
  guide: 'Guide',
  recension: 'Recension',
  tips: 'Tips & tricks',
  halsa: 'Hälsa',
  nyborjare: 'Nybörjare',
  tradgard: 'Trädgård & odling',
  hem: 'Hem & hållbarhet',
  friluftsliv: 'Friluftsliv & natur',
};

/** Detect if content is raw HTML (starts with a tag) or Markdown */
function isHtmlContent(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith('<') || trimmed.startsWith('<!');
}

/** Simple markdown to HTML - handles common patterns */
function renderMarkdown(md: string): string {
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-serif text-foreground mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-serif text-foreground mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-serif text-foreground mt-8 mb-3">$1</h1>')
    // Bold & italic
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links - affiliate links get special styling
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, text, url) => {
      const isAffiliate = url.includes('adtraction') || url.includes('awin') || url.includes('tradedoubler') || url.includes('partner') || text.includes('→') || text.toLowerCase().includes('köp');
      if (isAffiliate) {
        return `<a href="${url}" target="_blank" rel="noopener sponsored" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity no-underline">${text}</a>`;
      }
      return `<a href="${url}" target="_blank" rel="noopener" class="text-primary underline underline-offset-2 hover:opacity-80">${text}</a>`;
    })
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc text-foreground/90">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-foreground/90">$1</li>')
    // Images
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-4 w-full max-w-lg" loading="lazy" />')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary/30 pl-4 py-1 my-4 text-muted-foreground italic">$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-6 border-border/50" />')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="text-foreground/85 leading-relaxed mb-4">')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br />');

  return `<p class="text-foreground/85 leading-relaxed mb-4">${html}</p>`;
}

/** Sanitize and render content – supports both raw HTML and Markdown */
function renderContent(
  content: string,
  otherPosts?: { title: string; slug: string }[],
  glossary?: { keyword: string; url: string; rel: string }[]
): string {
  let raw = isHtmlContent(content) ? content : renderMarkdown(content);

  // Apply glossary links first (affiliate keywords → links)
  if (glossary && glossary.length > 0) {
    // Sort by keyword length descending so longer keywords match first
    const sorted = [...glossary].sort((a, b) => b.keyword.length - a.keyword.length);
    const linked = new Set<string>();

    for (const entry of sorted) {
      if (linked.has(entry.keyword.toLowerCase())) continue;
      const escaped = entry.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match keyword NOT already inside a tag, link, or attribute
      const regex = new RegExp(`(?<![<\\/a-zA-Z"=])\\b(${escaped})\\b(?![^<]*>)(?![^<]*<\\/a>)`, 'i');
      if (regex.test(raw)) {
        raw = raw.replace(regex, `<a href="${entry.url}" target="_blank" rel="${entry.rel}" class="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"  title="${entry.keyword}">$1</a>`);
        linked.add(entry.keyword.toLowerCase());
      }
    }
  }

  // Auto internal linking: extract contextual keywords from titles/slugs and match in content
  if (otherPosts && otherPosts.length > 0) {
    const linked = new Set<string>();
    const stopWords = new Set(['guide', 'allt', 'bästa', 'enkla', 'denna', 'dessa', 'tips', 'från', 'till', 'eller', 'sverige', 'hemma', 'första', 'andra', 'igång', 'behöver', 'säker']);

    // Build keyword → post mapping from titles
    const keywordMap: { keyword: string; slug: string; title: string }[] = [];
    for (const other of otherPosts) {
      // Use the first part of the title (before –) as a keyword phrase
      const parts = other.title.split(/\s*[–—|]\s*/);
      if (parts[0]) {
        keywordMap.push({ keyword: parts[0].trim(), slug: other.slug, title: other.title });
      }
      // Readable slug as keyword (e.g. "kompostera hemma")
      const slugPhrase = other.slug.replace(/-/g, ' ');
      keywordMap.push({ keyword: slugPhrase, slug: other.slug, title: other.title });
      // Extract meaningful individual words (5+ chars) as fallback
      const words = other.title.toLowerCase().split(/[\s–—,.:]+/).filter(w => w.length >= 5 && !stopWords.has(w));
      for (const word of words) {
        keywordMap.push({ keyword: word, slug: other.slug, title: other.title });
      }
    }

    // Sort by keyword length descending (prefer longer, more specific matches)
    keywordMap.sort((a, b) => b.keyword.length - a.keyword.length);

    for (const entry of keywordMap) {
      if (linked.size >= 5) break;
      if (linked.has(entry.slug)) continue;

      const escaped = entry.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(
        `(?<![<\\/a-zA-Z"=])\\b(${escaped})\\b(?![^<]*>)(?![^<]*<\\/a>)(?![^<]*<\\/h[1-6]>)`,
        'i'
      );
      if (regex.test(raw)) {
        raw = raw.replace(
          regex,
          `<a href="/blogg/${entry.slug}" class="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity" title="${entry.title.replace(/"/g, '&quot;')}">$1</a>`
        );
        linked.add(entry.slug);
      }
    }
  }

  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ['iframe', 'video', 'source', 'picture', 'details', 'summary'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'loading', 'target', 'rel', 'style', 'title'],
  });
}

export default function GuideArticle() {
  const { slug } = useParams<{ slug: string }>();

  // Fetch current post
  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();
      if (error) throw error;
      // Fetch author name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', data.author_id)
        .single();
      return { ...data, author_name: profile?.display_name || 'Odlingsdagboken' };
    },
    enabled: !!slug,
  });

  // Fetch all published posts for internal linking + related posts
  const { data: allPosts = [] } = useQuery({
    queryKey: ['all-published-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, category, tags, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch glossary for auto-linking keywords – only those selected for this post
  const postGlossaryIds: string[] = (post as any)?.glossary_ids || [];
  const { data: glossary = [] } = useQuery({
    queryKey: ['link-glossary', postGlossaryIds],
    queryFn: async () => {
      if (postGlossaryIds.length === 0) return [];
      const { data, error } = await supabase
        .from('link_glossary')
        .select('keyword, url, rel')
        .eq('is_active', true)
        .in('id', postGlossaryIds);
      if (error) throw error;
      return data as { keyword: string; url: string; rel: string }[];
    },
    enabled: !!post,
  });

  // SEO - full OG, Twitter, hreflang, JSON-LD with Article + FAQ + Product + BreadcrumbList
  React.useEffect(() => {
    if (!post) return;
    const BASE = 'https://odlingsdagboken.se';
    const fullUrl = `${BASE}/blogg/${post.slug}`;
    const pageTitle = post.meta_title || post.title + ' | Odlingsdagboken';
    const pageDesc = post.meta_description || post.excerpt || '';
    const imageUrl = post.cover_image_url
      ? (post.cover_image_url.startsWith('http') ? post.cover_image_url : `${BASE}${post.cover_image_url}`)
      : `${BASE}/blog-images/spring-garden.jpg`;

    const createdElements: HTMLElement[] = [];

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        createdElements.push(el);
      }
      el.setAttribute('content', content);
    };

    const addLink = (rel: string, href: string, attrs?: Record<string, string>) => {
      const el = document.createElement('link');
      el.rel = rel;
      el.href = href;
      if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      createdElements.push(el);
    };

    // Title
    document.title = pageTitle;

    // Core meta
    setMeta('name', 'description', pageDesc);
    setMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

    // Canonical + hreflang
    document.querySelector('link[rel="canonical"]')?.remove();
    addLink('canonical', fullUrl);
    addLink('alternate', fullUrl, { hreflang: 'sv' });
    addLink('alternate', fullUrl, { hreflang: 'x-default' });

    // OG tags
    setMeta('property', 'og:title', pageTitle);
    setMeta('property', 'og:description', pageDesc);
    setMeta('property', 'og:url', fullUrl);
    setMeta('property', 'og:type', 'article');
    setMeta('property', 'og:site_name', 'Hönsgården');
    setMeta('property', 'og:locale', 'sv_SE');
    setMeta('property', 'og:image', imageUrl);
    setMeta('property', 'og:image:alt', post.title);

    // Article meta
    if (post.published_at) setMeta('property', 'article:published_time', post.published_at);
    if (post.updated_at) setMeta('property', 'article:modified_time', post.updated_at);
    setMeta('property', 'article:author', 'Hönsgården');
    if (post.category) setMeta('property', 'article:section', post.category);
    if (post.tags) {
      post.tags.forEach((tag: string) => {
        const el = document.createElement('meta');
        el.setAttribute('property', 'article:tag');
        el.setAttribute('content', tag);
        document.head.appendChild(el);
        createdElements.push(el);
      });
    }

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', pageTitle);
    setMeta('name', 'twitter:description', pageDesc);
    setMeta('name', 'twitter:image', imageUrl);
    setMeta('name', 'twitter:image:alt', post.title);

    // AI citation meta
    setMeta('name', 'citation_title', post.title);
    setMeta('name', 'citation_author', 'Hönsgården');
    setMeta('name', 'citation_language', 'sv');
    if (post.published_at) setMeta('name', 'citation_date', post.published_at.split('T')[0]);

    // JSON-LD @graph
    const graph: any[] = [
      {
        '@type': 'Article',
        '@id': `${fullUrl}#article`,
        headline: post.title,
        description: pageDesc,
        image: { '@type': 'ImageObject', url: imageUrl },
        datePublished: post.published_at,
        dateModified: post.updated_at || post.published_at,
        author: { '@type': 'Organization', name: 'Hönsgården', url: BASE, '@id': `${BASE}/#organization` },
        publisher: {
          '@type': 'Organization',
          name: 'Hönsgården',
          url: BASE,
          '@id': `${BASE}/#organization`,
          logo: { '@type': 'ImageObject', url: `${BASE}/favicon.ico` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': fullUrl },
        isPartOf: { '@id': `${BASE}/#website` },
        inLanguage: 'sv-SE',
        ...(post.tags && post.tags.length > 0 ? { keywords: post.tags.join(', ') } : {}),
        wordCount: post.content.replace(/<[^>]+>/g, '').split(/\s+/).length,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Hem', item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Blogg', item: `${BASE}/blogg` },
          { '@type': 'ListItem', position: 3, name: post.title, item: fullUrl },
        ],
      },
      {
        '@type': 'WebPage',
        '@id': fullUrl,
        url: fullUrl,
        name: pageTitle,
        isPartOf: { '@id': `${BASE}/#website` },
        primaryImageOfPage: { '@type': 'ImageObject', url: imageUrl },
        datePublished: post.published_at,
        dateModified: post.updated_at || post.published_at,
        inLanguage: 'sv-SE',
      },
    ];

    // Extract FAQ pairs from HTML content
    const faqPairs: { q: string; a: string }[] = [];
    const faqRegex = /<(?:div|dt)[^>]*class="faq-q"[^>]*>([\s\S]*?)<\/(?:div|dt)>\s*<(?:div|dd)[^>]*class="faq-a"[^>]*>([\s\S]*?)<\/(?:div|dd)>/gi;
    let match;
    while ((match = faqRegex.exec(post.content)) !== null) {
      const q = match[1].replace(/<[^>]+>/g, '').trim();
      const a = match[2].replace(/<[^>]+>/g, '').trim();
      if (q && a) faqPairs.push({ q, a });
    }
    const detailsRegex = /<summary[^>]*>([\s\S]*?)<\/summary>\s*([\s\S]*?)(?=<\/details>)/gi;
    while ((match = detailsRegex.exec(post.content)) !== null) {
      const q = match[1].replace(/<[^>]+>/g, '').trim();
      const a = match[2].replace(/<[^>]+>/g, '').trim();
      if (q && a) faqPairs.push({ q, a });
    }

    if (faqPairs.length > 0) {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: faqPairs.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      });
    }

    // Extract Product schema from product cards/tables in content
    const productRegex = /<(?:h4|span)[^>]*class="(?:product-card-title|pct-product-name)"[^>]*>([\s\S]*?)<\/(?:h4|span)>/gi;
    const priceRegex = /<span[^>]*class="(?:product-card-price|pct-price)"[^>]*>([\s\S]*?)<\/span>/gi;
    const productNames: string[] = [];
    const productPrices: string[] = [];
    while ((match = productRegex.exec(post.content)) !== null) {
      productNames.push(match[1].replace(/<[^>]+>/g, '').trim());
    }
    while ((match = priceRegex.exec(post.content)) !== null) {
      productPrices.push(match[1].replace(/<[^>]+>/g, '').trim());
    }
    if (productNames.length > 0) {
      const itemList = {
        '@type': 'ItemList',
        name: `Produkter i ${post.title}`,
        itemListElement: productNames.map((name, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Product',
            name,
            ...(productPrices[i] ? {
              offers: {
                '@type': 'Offer',
                priceCurrency: 'SEK',
                price: productPrices[i].replace(/[^\d,]/g, '').replace(',', '.'),
                availability: 'https://schema.org/InStock',
              },
            } : {}),
          },
        })),
      };
      graph.push(itemList);
    }

    const jsonLd = { '@context': 'https://schema.org', '@graph': graph };
    let script = document.getElementById('json-ld-article') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = 'json-ld-article';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
      createdElements.push(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = 'Hönsgården';
      createdElements.forEach(el => el.remove());
      document.getElementById('json-ld-article')?.remove();
    };
  }, [post]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <BookOpen className="h-10 w-10 text-muted-foreground/30" />
        <h1 className="font-serif text-xl text-foreground">Artikeln hittades inte</h1>
        <Link to="/blogg"><Button variant="outline" className="rounded-xl"><ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka till bloggen</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <VisitorWelcomePopup />
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/blogg" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Blogg
          </Link>
          <Link to="/login">
            <Button size="sm" className="rounded-xl text-xs gap-1">
              <Egg className="h-3 w-3" /> Kom igång
            </Button>
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {post.category && (
            <Badge variant="secondary" className="text-[10px]">
              {categoryLabels[post.category] || post.category}
            </Badge>
          )}
          {post.published_at && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {new Date(post.published_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          )}
          {post.author_name && (
            <span className="text-xs text-muted-foreground">
              av <span className="font-medium text-foreground/80">{post.author_name}</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-foreground leading-tight mb-4">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">{post.excerpt}</p>
        )}

        {/* Cover */}
        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full rounded-2xl aspect-video object-cover mb-8"
          />
        )}

        {/* Content with auto internal links */}
        <div
          className="prose-custom"
          dangerouslySetInnerHTML={{
            __html: renderContent(
              post.content,
              allPosts
                .filter(p => p.slug !== slug)
                .map(p => ({ title: p.title, slug: p.slug })),
              glossary
            ),
          }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-8 pt-6 border-t border-border/50">
            {post.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px]">#{tag}</Badge>
            ))}
          </div>
        )}

        {/* Inline CTA */}
        <div className="mt-12 bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-2xl p-6 sm:p-8 border border-border/30 text-center">
          <span className="text-2xl mb-2 block">🐔</span>
          <h3 className="font-serif text-lg text-foreground mb-2">
            Vill du hålla koll på dina höns?
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
            Logga ägg, foder och hälsa med Hönsgården – helt kostnadsfritt.
          </p>
          <Link to="/login">
            <Button className="rounded-xl gap-2">
              <Egg className="h-4 w-4" /> Skapa ett konto
            </Button>
          </Link>
        </div>

        {/* Related posts */}
        {(() => {
          const otherPosts = allPosts.filter(p => p.slug !== slug);
          if (otherPosts.length === 0) return null;

          // Score relevance: shared tags + same category
          const postTags = new Set(post.tags || []);
          const scored = otherPosts.map(p => {
            let score = 0;
            if (p.category === post.category) score += 2;
            (p.tags || []).forEach(t => { if (postTags.has(t)) score += 1; });
            return { ...p, score };
          });
          scored.sort((a, b) => b.score - a.score || (new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()));
          const related = scored.slice(0, 3);

          return (
            <div className="mt-14 pt-8 border-t border-border/50">
              <h2 className="font-serif text-xl text-foreground mb-5 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> Fler artiklar
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {related.map(r => (
                  <Link key={r.id} to={`/blogg/${r.slug}`} className="group">
                    <div className="rounded-xl border border-border/50 overflow-hidden hover:shadow-md transition-all duration-300 h-full bg-card">
                      {r.cover_image_url ? (
                        <div className="aspect-video overflow-hidden">
                          <img src={r.cover_image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gradient-to-br from-primary/8 to-accent/8 flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-primary/30" />
                        </div>
                      )}
                      <div className="p-3 space-y-1">
                        <h3 className="font-serif text-sm text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {r.title}
                        </h3>
                        {r.excerpt && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{r.excerpt}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}
      </article>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Hönsgården</span>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-foreground transition-colors">Startsidan</Link>
            <Link to="/blogg" className="hover:text-foreground transition-colors">Blogg</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Villkor</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
