import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Seo } from '@/hooks/useSeo';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PublicLayout from '@/components/PublicLayout';
import InlineSignupCTA from '@/components/InlineSignupCTA';
import { ArrowRight, BookOpen, Loader2, Search, Sprout } from 'lucide-react';
import { CURRENT_YEAR } from '@/lib/currentYear';
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

const readingTime = (content?: string | null) => {
  if (!content) return 4;
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 220));
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });

export default function Guides() {
  const soroRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!soroRef.current || soroRef.current.querySelector('script')) return;
    const params = new URLSearchParams(window.location.search);
    let url = 'https://app.trysoro.com/api/embed/7cadf781-f963-4b64-83b3-705e8bdbbbc7';
    const post = params.get('post');
    if (post) url += '?post=' + encodeURIComponent(post);
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    soroRef.current.appendChild(script);
  }, []);

  const { data: posts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['public-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, category, tags, published_at, content')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach(p => p.category && set.add(p.category));
    return Array.from(set);
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter(p => {
      if (activeCategory && p.category !== activeCategory) return false;
      if (!q) return true;
      return (
        p.title?.toLowerCase().includes(q) ||
        p.excerpt?.toLowerCase().includes(q) ||
        (p.tags || []).some((t: string) => t.toLowerCase().includes(q))
      );
    });
  }, [posts, query, activeCategory]);

  const featured = filtered.find(p => p.cover_image_url) || filtered[0];
  const rest = filtered.filter(p => p.id !== featured?.id);

  const trackCta = (label: string) => {
    try { trackEvent('cta_click', { label, page: 'blog_index' }); } catch { /* noop */ }
  };

  return (
    <PublicLayout>
      <Seo
        title={`Odlingstips & guider ${CURRENT_YEAR} | Odlingsdagboken`}
        description="Guider, såtider och tips för svenska hobbyodlare. Lär dig mer om växtföljd, pallkrage, växthus och klassisk grönsaksodling — anpassat för svenska förhållanden."
        path="/blogg"
        ogImage="/blog-images/spring-garden.jpg"
        ogImageAlt="Svensk köksträdgård – Odlingsdagbokens blogg"
        jsonLd={[
          {
            '@type': 'CollectionPage',
            '@id': 'https://odlingsdagboken.com/blogg',
            name: 'Bloggen – Guider & tips om grönsaksodling',
            description: 'Guider, tips och inspiration för svenska hobbyodlare.',
            url: 'https://odlingsdagboken.com/blogg',
            isPartOf: { '@id': 'https://odlingsdagboken.com/#website' },
            inLanguage: 'sv-SE',
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://odlingsdagboken.com' },
              { '@type': 'ListItem', position: 2, name: 'Blogg', item: 'https://odlingsdagboken.com/blogg' },
            ],
          },
        ]}
      />
      {posts.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              itemListElement: posts.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `https://odlingsdagboken.com/blogg/${p.slug}`,
                name: p.title,
              })),
            }),
          }}
        />
      )}

      {/* HERO */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary mb-5">
              <BookOpen className="h-3.5 w-3.5" /> Bloggen
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-foreground leading-[1.05] tracking-tight mb-5">
              Odlingskunskap för svenska trädgårdar
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Guider, såtider och praktiska tips från erfarna odlare — anpassat för pallkrage, växthus, balkong och friland i svenska klimatzoner.
            </p>
          </div>

          {/* Search + filters */}
          <div className="mt-10 flex flex-col gap-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Sök artiklar, t.ex. tomat, växtföljd, pallkrage"
                className="pl-10 h-11 bg-card/80 border-border rounded-full"
                aria-label="Sök artiklar"
              />
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Kategorier">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === null}
                  onClick={() => setActiveCategory(null)}
                  className={`min-h-[36px] px-4 rounded-full text-xs font-medium border transition-colors ${
                    activeCategory === null
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Alla ämnen
                </button>
                {categories.map(c => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === c}
                    onClick={() => setActiveCategory(activeCategory === c ? null : c)}
                    className={`min-h-[36px] px-4 rounded-full text-xs font-medium border transition-colors ${
                      activeCategory === c
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {categoryLabels[c] || c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-24" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <p className="text-foreground mb-3">Vi kunde inte ladda artiklarna just nu.</p>
            <Button variant="outline" onClick={() => refetch()}>Försök igen</Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="rounded-3xl border border-border bg-card/60 p-10 text-center">
            <BookOpen className="h-10 w-10 mx-auto mb-4 text-muted-foreground/60" />
            <h2 className="font-serif text-2xl text-foreground mb-2">Inga träffar</h2>
            <p className="text-muted-foreground mb-5">Prova en annan sökterm eller ta bort kategorifiltret.</p>
            <Button variant="outline" onClick={() => { setQuery(''); setActiveCategory(null); }}>Rensa filter</Button>
          </div>
        )}

        {/* Featured */}
        {featured && (
          <section className="mb-16 sm:mb-20">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold">Utvalt</h2>
            </div>
            <Link
              to={`/blogg/${featured.slug}`}
              onClick={() => trackCta('blog_featured')}
              className="group grid gap-6 sm:gap-10 md:grid-cols-2 items-center"
            >
              <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-muted">
                {featured.cover_image_url ? (
                  <img
                    src={featured.cover_image_url}
                    alt={featured.title}
                    width={800}
                    height={600}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                    loading="eager"
                    fetchPriority="high"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-primary/30" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {featured.category && <Badge variant="secondary" className="text-[10px]">{categoryLabels[featured.category] || featured.category}</Badge>}
                  <span className="text-xs text-muted-foreground">{readingTime(featured.content)} min läsning</span>
                  {featured.published_at && <span className="text-xs text-muted-foreground">· {formatDate(featured.published_at)}</span>}
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground leading-tight mb-3 group-hover:text-primary transition-colors">
                  {featured.title}
                </h3>
                {featured.excerpt && <p className="text-muted-foreground leading-relaxed mb-5 text-[15px]">{featured.excerpt}</p>}
                <span className="inline-flex items-center text-sm font-medium text-primary gap-1.5">
                  Läs artikeln <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          </section>
        )}

        {/* Mid-page CTA */}
        {rest.length > 3 && (
          <div className="mb-16">
            <InlineSignupCTA
              title="Gör bloggkunskapen till din egen odlingsdagbok"
              description="Logga sådder, skördar och anteckningar i Odlingsdagboken — och koppla det du lär dig här till din egen trädgård."
              variant="soft"
            />
          </div>
        )}

        {/* Rest */}
        {rest.length > 0 && (
          <section>
            <div className="mb-8 flex items-baseline justify-between">
              <h2 className="font-serif text-2xl sm:text-3xl text-foreground">Senaste guiderna</h2>
              <span className="text-xs text-muted-foreground">{rest.length} artiklar</span>
            </div>
            <div className="grid gap-8 sm:gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post, idx) => (
                <Link
                  key={post.id}
                  to={`/blogg/${post.slug}`}
                  onClick={() => trackCta('blog_card')}
                  className="group"
                >
                  <article className="space-y-4">
                    {post.cover_image_url ? (
                      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                        <img
                          src={post.cover_image_url}
                          alt={post.title}
                          width={600}
                          height={450}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          loading={idx < 3 ? 'eager' : 'lazy'}
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/8 to-accent/8 flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-primary/30" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.category && <Badge variant="secondary" className="text-[10px]">{categoryLabels[post.category] || post.category}</Badge>}
                        <span className="text-[11px] text-muted-foreground">{readingTime(post.content)} min läsning</span>
                        {post.published_at && <span className="text-[11px] text-muted-foreground">· {new Date(post.published_at).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}</span>}
                      </div>
                      <h3 className="font-serif text-xl sm:text-2xl text-foreground leading-snug group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      {post.excerpt && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{post.excerpt}</p>}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Soro embed – auto-published articles */}
        <section className="mt-20">
          <div id="soro-blog" ref={soroRef} />
        </section>

        {/* Final CTA */}
        <div className="mt-20">
          <InlineSignupCTA
            title="Logga din odling – helt gratis"
            description="Med Odlingsdagboken håller du koll på sådder, skördar och växtföljd. Perfekt för dig som vill odla smartare år efter år."
            buttonLabel="Skapa gratis konto"
            variant="card"
          />
        </div>
      </main>
    </PublicLayout>
  );
}
