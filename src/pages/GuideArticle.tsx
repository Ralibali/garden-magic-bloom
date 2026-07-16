import React, { useMemo, useState } from 'react';
import VisitorWelcomePopup from '@/components/VisitorWelcomePopup';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, ArrowRight, Sprout, Loader2, BookOpen, CalendarDays, ChevronDown, List,
} from 'lucide-react';
import ShareButtons from '@/components/ShareButtons';
import BlogComments from '@/components/BlogComments';
import { Seo } from '@/hooks/useSeo';
import InlineSignupCTA from '@/components/InlineSignupCTA';
import PublicLayout from '@/components/PublicLayout';
import PublicNotFound from '@/components/PublicNotFound';
import { extractHeadings, injectHeadingIds, sortRelatedPosts, pickContextualCta } from '@/lib/blogArticle';
import { trackEvent } from '@/lib/analytics';

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

const trackCta = (label: string, slug?: string) => {
  try { trackEvent('cta_click', { label, page: 'blog_article', slug }); } catch { /* noop */ }
};

/** Detect if content is raw HTML (starts with a tag) or Markdown */
function isHtmlContent(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith('<') || trimmed.startsWith('<!');
}

/** Simple markdown to HTML - handles common patterns */
function renderMarkdown(md: string): string {
  const html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, text, url) => {
      const isAffiliate = url.includes('adtraction') || url.includes('awin') || url.includes('tradedoubler') || url.includes('partner') || text.includes('→') || text.toLowerCase().includes('köp');
      if (isAffiliate) return `<a href="${url}" target="_blank" rel="noopener sponsored" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity no-underline">${text}</a>`;
      return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
    })
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" class="rounded-2xl my-6 w-full" loading="lazy" />')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />');
  return `<p>${html}</p>`;
}

/** Wrap raw <table> in a horizontally scrollable container for mobile. */
function wrapTablesForMobile(html: string): string {
  return html.replace(/<table(\s[^>]*)?>([\s\S]*?)<\/table>/gi, (m) => `<div class="table-wrapper">${m}</div>`);
}

function renderContent(
  content: string,
  otherPosts?: { title: string; slug: string }[],
  glossary?: { keyword: string; url: string; rel: string }[],
): string {
  let raw = isHtmlContent(content) ? content : renderMarkdown(content);

  if (glossary && glossary.length > 0) {
    const sorted = [...glossary].sort((a, b) => b.keyword.length - a.keyword.length);
    const linked = new Set<string>();
    for (const entry of sorted) {
      if (linked.has(entry.keyword.toLowerCase())) continue;
      const escaped = entry.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![<\\/a-zA-Z"=])\\b(${escaped})\\b(?![^<]*>)(?![^<]*<\\/a>)`, 'i');
      if (regex.test(raw)) {
        raw = raw.replace(regex, `<a href="${entry.url}" target="_blank" rel="${entry.rel}" title="${entry.keyword}">$1</a>`);
        linked.add(entry.keyword.toLowerCase());
      }
    }
  }

  if (otherPosts && otherPosts.length > 0) {
    const linked = new Set<string>();
    const stopWords = new Set(['guide', 'allt', 'bästa', 'enkla', 'denna', 'dessa', 'tips', 'från', 'till', 'eller', 'sverige', 'hemma', 'första', 'andra', 'igång', 'behöver', 'säker']);
    const keywordMap: { keyword: string; slug: string; title: string }[] = [];
    for (const other of otherPosts) {
      const parts = other.title.split(/\s*[–—|]\s*/);
      if (parts[0]) keywordMap.push({ keyword: parts[0].trim(), slug: other.slug, title: other.title });
      keywordMap.push({ keyword: other.slug.replace(/-/g, ' '), slug: other.slug, title: other.title });
      const words = other.title.toLowerCase().split(/[\s–—,.:]+/).filter(w => w.length >= 5 && !stopWords.has(w));
      for (const word of words) keywordMap.push({ keyword: word, slug: other.slug, title: other.title });
    }
    keywordMap.sort((a, b) => b.keyword.length - a.keyword.length);
    for (const entry of keywordMap) {
      if (linked.size >= 5) break;
      if (linked.has(entry.slug)) continue;
      const escaped = entry.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![<\\/a-zA-Z"=])\\b(${escaped})\\b(?![^<]*>)(?![^<]*<\\/a>)(?![^<]*<\\/h[1-6]>)`, 'i');
      if (regex.test(raw)) {
        raw = raw.replace(regex, `<a href="/blogg/${entry.slug}" title="${entry.title.replace(/"/g, '&quot;')}">$1</a>`);
        linked.add(entry.slug);
      }
    }
  }

  raw = wrapTablesForMobile(raw);

  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ['iframe', 'video', 'source', 'picture', 'details', 'summary'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'loading', 'target', 'rel', 'title', 'class'],
  });
}

export default function GuideArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [tocOpen, setTocOpen] = useState(false);

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('is_published', true).single();
      if (error) throw error;
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', data.author_id).single();
      return { ...data, author_name: profile?.display_name || 'Odlingsdagboken' };
    },
    enabled: !!slug,
  });

  const { data: allPosts = [] } = useQuery({
    queryKey: ['all-published-posts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('id, title, slug, excerpt, cover_image_url, category, tags, published_at, content').eq('is_published', true).order('published_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const postGlossaryIds: string[] = (post as any)?.glossary_ids || [];
  const { data: glossary = [] } = useQuery({
    queryKey: ['link-glossary', postGlossaryIds],
    queryFn: async () => {
      if (postGlossaryIds.length === 0) return [];
      const { data, error } = await supabase.from('link_glossary').select('keyword, url, rel').eq('is_active', true).in('id', postGlossaryIds);
      if (error) throw error;
      return data as { keyword: string; url: string; rel: string }[];
    },
    enabled: !!post,
  });

  const jsonLd = useMemo(() => {
    if (!post) return undefined;
    const BASE = 'https://odlingsdagboken.com';
    const fullUrl = `${BASE}/blogg/${post.slug}`;
    const imageUrl = post.cover_image_url ? (post.cover_image_url.startsWith('http') ? post.cover_image_url : `${BASE}${post.cover_image_url}`) : `${BASE}/blog-images/spring-garden.jpg`;
    return [
      { '@type': 'Article', '@id': `${fullUrl}#article`, headline: post.title, description: post.meta_description || post.excerpt || '', image: { '@type': 'ImageObject', url: imageUrl }, datePublished: post.published_at, dateModified: post.updated_at || post.published_at, author: { '@type': 'Organization', name: 'Odlingsdagboken', url: BASE, '@id': `${BASE}/#organization` }, publisher: { '@type': 'Organization', name: 'Odlingsdagboken', url: BASE, '@id': `${BASE}/#organization`, logo: { '@type': 'ImageObject', url: `${BASE}/favicon.ico` } }, mainEntityOfPage: { '@type': 'WebPage', '@id': fullUrl }, isPartOf: { '@id': `${BASE}/#website` }, inLanguage: 'sv-SE', ...(post.tags?.length ? { keywords: post.tags.join(', ') } : {}), wordCount: post.content.replace(/<[^>]+>/g, '').split(/\s+/).length },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Hem', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Blogg', item: `${BASE}/blogg` },
        { '@type': 'ListItem', position: 3, name: post.title, item: fullUrl },
      ] },
    ];
  }, [post]);

  const articleMeta = useMemo(() => post ? { publishedTime: post.published_at || undefined, modifiedTime: post.updated_at || post.published_at || undefined, author: 'Odlingsdagboken', section: post.category || undefined, tags: post.tags || undefined } : undefined, [post]);
  const seoImage = post?.cover_image_url || '/blog-images/spring-garden.jpg';

  const rawHtml = useMemo(
    () => post ? renderContent(post.content, allPosts.filter(p => p.slug !== slug).map(p => ({ title: p.title, slug: p.slug })), glossary) : '',
    [post, allPosts, slug, glossary],
  );
  const headings = useMemo(() => extractHeadings(rawHtml), [rawHtml]);
  const showToc = headings.length >= 3;
  const contentHtml = useMemo(() => (showToc ? injectHeadingIds(rawHtml, headings) : rawHtml), [rawHtml, headings, showToc]);
  const contextualCta = useMemo(() => post ? pickContextualCta({ category: post.category, tags: post.tags }) : null, [post]);
  const relatedPosts = useMemo(
    () => post ? sortRelatedPosts(allPosts as any, { slug: slug || '', category: post.category, tags: post.tags }) : [],
    [allPosts, slug, post],
  );

  const readingTime = (content?: string | null) => {
    if (!content) return 4;
    const words = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
    return Math.max(2, Math.round(words / 220));
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center" aria-live="polite">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground motion-reduce:animate-none" aria-label="Laddar" />
        </div>
      </PublicLayout>
    );
  }
  if (isError || !post) {
    return (
      <PublicLayout>
        <PublicNotFound path={`/blogg/${slug || ''}`} title="Artikeln hittades inte" description="Artikeln finns inte eller är inte längre publicerad." backTo="/blogg" backLabel="Tillbaka till bloggen" />
      </PublicLayout>
    );
  }

  const articleReadingTime = readingTime(post.content);

  return (
    <PublicLayout>
      <Seo
        title={post.meta_title || post.title + ' | Odlingsdagboken'}
        description={post.meta_description || post.excerpt || ''}
        path={`/blogg/${slug || ''}`}
        ogType="article"
        ogImage={seoImage}
        ogImageAlt={post.title}
        jsonLd={jsonLd}
        articleMeta={articleMeta}
      />
      <VisitorWelcomePopup />

      {/* Breadcrumb-ish back bar */}
      <div className="border-b border-border/40 bg-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Link
            to="/blogg"
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tillbaka till bloggen
          </Link>
        </div>
      </div>

      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 ${
          showToc ? 'lg:grid lg:grid-cols-[240px_minmax(0,720px)] lg:gap-14 lg:justify-center' : ''
        }`}
      >
        {/* Desktop TOC */}
        {showToc && (
          <aside className="hidden lg:block" aria-label="Innehållsförteckning">
            <nav className="sticky top-[84px] pr-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3 flex items-center gap-1.5">
                <List className="h-3 w-3" aria-hidden="true" /> Innehåll
              </p>
              <ol className="space-y-1.5 text-sm">
                {headings.map(h => (
                  <li key={h.id} className={h.level === 3 ? 'pl-3' : ''}>
                    <a
                      href={`#${h.id}`}
                      className="block py-1 text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:text-primary focus-visible:underline transition-colors"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
        )}

        <article className={`w-full ${showToc ? '' : 'max-w-[720px] mx-auto'}`}>
          {/* Header */}
          <header className="mb-8 sm:mb-10">
            <div className="flex items-center gap-2 flex-wrap mb-5">
              {post.category && (
                <Badge variant="secondary" className="text-[10px]">
                  {categoryLabels[post.category] || post.category}
                </Badge>
              )}
              {post.published_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" aria-hidden="true" />
                  {new Date(post.published_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              )}
              <span className="text-xs text-muted-foreground">· {articleReadingTime} min läsning</span>
              {post.author_name && (
                <span className="text-xs text-muted-foreground">
                  av <span className="font-medium text-foreground/80">{post.author_name}</span>
                </span>
              )}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] text-foreground leading-[1.1] tracking-tight mb-5">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-lg text-muted-foreground leading-relaxed">
                {post.excerpt}
              </p>
            )}
          </header>

          {/* Hero image */}
          {post.cover_image_url && (
            <div className="aspect-[16/9] overflow-hidden rounded-3xl bg-muted mb-10">
              <img
                src={post.cover_image_url}
                alt={post.title}
                width={1200}
                height={675}
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          )}

          {/* Mobile TOC */}
          {showToc && (
            <details
              className="lg:hidden mb-8 rounded-2xl border border-border/60 bg-card/60 overflow-hidden"
              open={tocOpen}
              onToggle={(e) => setTocOpen((e.currentTarget as HTMLDetailsElement).open)}
            >
              <summary className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer list-none min-h-[48px]">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <List className="h-4 w-4 text-primary" aria-hidden="true" /> Innehåll ({headings.length})
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform motion-reduce:transition-none ${tocOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </summary>
              <ol className="px-4 pb-4 space-y-1.5 text-sm">
                {headings.map(h => (
                  <li key={h.id} className={h.level === 3 ? 'pl-3' : ''}>
                    <a
                      href={`#${h.id}`}
                      className="block py-1.5 min-h-[36px] text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setTocOpen(false)}
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          )}

          {/* Article body */}
          <div className="prose-custom" dangerouslySetInnerHTML={{ __html: contentHtml }} />

          {/* Diskret inline-CTA — ämnesanpassad */}
          {contextualCta && (
            <div onClick={() => trackCta('article_inline', post.slug)}>
              <InlineSignupCTA
                title={contextualCta.title}
                description={contextualCta.description}
                buttonLabel={contextualCta.buttonLabel}
                variant="soft"
              />
            </div>
          )}

          {/* Share + tags */}
          <div className="mt-10 pt-6 border-t border-border/50 space-y-4">
            <ShareButtons url={`https://odlingsdagboken.com/blogg/${post.slug}`} title={post.title} />
            {post.tags && post.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {post.tags.map((tag: string) => (
                  <Link key={tag} to={`/blogg/tagg/${encodeURIComponent(tag)}`}>
                    <Badge variant="outline" className="text-[10px] hover:bg-primary/10 transition-colors cursor-pointer">
                      #{tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <BlogComments postId={post.id} />

          {/* Stark slut-CTA — ämnesanpassad */}
          {contextualCta && (
            <section
              aria-label="Kom igång med Odlingsdagboken"
              className="mt-14 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-accent/5 p-8 sm:p-10 text-center shadow-sm"
              onClick={() => trackCta('article_final', post.slug)}
            >
              <Sprout className="h-9 w-9 mx-auto mb-4 text-primary" aria-hidden="true" />
              <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-3">{contextualCta.title}</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
                {contextualCta.description}
              </p>
              <Button asChild size="lg" className="min-h-[48px] gap-2">
                <Link to={contextualCta.href}>
                  {contextualCta.buttonLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <p className="text-[11px] text-muted-foreground mt-3">
                Inget betalkort krävs · 14 dagars Plus gratis
              </p>
            </section>
          )}

          {/* Related — same card design as blog index */}
          {relatedPosts.length > 0 && (
            <section className="mt-16 pt-10 border-t border-border/50">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-serif text-2xl sm:text-3xl text-foreground flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" /> Fler artiklar
                </h2>
                <Link to="/blogg" className="text-sm text-primary hover:underline">Alla artiklar →</Link>
              </div>
              <div className="grid gap-8 sm:gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {relatedPosts.map(r => (
                  <Link
                    key={r.id}
                    to={`/blogg/${r.slug}`}
                    onClick={() => trackCta('article_related', r.slug)}
                    className="group"
                  >
                    <article className="space-y-4">
                      {r.cover_image_url ? (
                        <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                          <img
                            src={r.cover_image_url}
                            alt={r.title}
                            width={600}
                            height={450}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 motion-reduce:transition-none motion-reduce:transform-none"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/8 to-accent/8 flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-primary/30" aria-hidden="true" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.category && (
                            <Badge variant="secondary" className="text-[10px]">
                              {categoryLabels[r.category] || r.category}
                            </Badge>
                          )}
                          {r.published_at && (
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(r.published_at).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <h3 className="font-serif text-lg sm:text-xl text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {r.title}
                        </h3>
                        {r.excerpt && (
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                            {r.excerpt}
                          </p>
                        )}
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </PublicLayout>
  );
}
