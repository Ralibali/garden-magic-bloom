import React, { useEffect, useRef } from 'react';
import VisitorWelcomePopup from '@/components/VisitorWelcomePopup';
import { Seo } from '@/hooks/useSeo';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Loader2, Sprout } from 'lucide-react';
import { CURRENT_YEAR } from '@/lib/currentYear';

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

export default function Guides() {
  const soroRef = useRef<HTMLDivElement>(null);

  // Inject Soro embed script
  useEffect(() => {
    if (!soroRef.current) return;
    if (soroRef.current.querySelector('script')) return;

    const params = new URLSearchParams(window.location.search);
    let url = 'https://app.trysoro.com/api/embed/7cadf781-f963-4b64-83b3-705e8bdbbbc7';
    const post = params.get('post');
    if (post) url += '?post=' + encodeURIComponent(post);

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    soroRef.current.appendChild(script);
  }, []);

  // Fetch existing database articles
  const { data: posts = [], isLoading } = useQuery({
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

  const readingTime = (content?: string | null) => {
    if (!content) return 4;
    const words = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
    return Math.max(2, Math.round(words / 220));
  };

  const featured = posts.find(p => p.cover_image_url) || posts[0];
  const rest = posts.filter(p => p.id !== featured?.id);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`Odlingstips & Guider ${CURRENT_YEAR} | Odlingsdagboken`}
        description="Guider, såtider och tips för svenska hobbyodlare. Lär dig mer om växtföljd, pallkrage och klassisk grönsaksodling."
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
      <VisitorWelcomePopup />

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

      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-xl">🌱</span>
            <span className="font-serif text-lg text-foreground">Odlingsdagboken</span>
          </Link>
          <Link to="/login">
            <Button size="sm" className="rounded-xl text-xs gap-1">
              <Sprout className="h-3 w-3" /> Kom igång
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-14">
        {/* Editorial hero heading */}
        <div className="max-w-2xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium mb-4">
            <BookOpen className="h-3.5 w-3.5" /> Bloggen
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif text-foreground mb-4 leading-[1.1] tracking-tight">
            Odlingstips & guider för svenska hobbyodlare
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Guider, såtider och tips för dig som odlar grönsaker. Från sådd till skörd – anpassat för svenska förhållanden.
          </p>
        </div>

        {/* Featured article — editorial hero */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : featured && (
          <section className="mb-16 sm:mb-20">
            <Link to={`/blogg/${featured.slug}`} className="group grid gap-6 sm:gap-10 md:grid-cols-2 items-center">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                {featured.cover_image_url ? (
                  <img src={featured.cover_image_url} alt={featured.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" loading="eager" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center"><BookOpen className="h-10 w-10 text-primary/30" /></div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {featured.category && <Badge variant="secondary" className="text-[10px]">{categoryLabels[featured.category] || featured.category}</Badge>}
                  <span className="text-xs text-muted-foreground">{readingTime(featured.content)} min läsning</span>
                  {featured.published_at && <span className="text-xs text-muted-foreground">· {new Date(featured.published_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground leading-tight mb-3 group-hover:text-primary transition-colors">
                  {featured.title}
                </h2>
                {featured.excerpt && <p className="text-muted-foreground leading-relaxed mb-5">{featured.excerpt}</p>}
                <span className="inline-flex items-center text-sm font-medium text-primary gap-1.5">
                  Läs artikeln <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          </section>
        )}

        {/* Soro widget – new articles published automatically */}
        <section className="mb-16">
          <div id="soro-blog" ref={soroRef} />
        </section>

        {/* Rest of articles */}
        {rest.length > 0 && (
          <section>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-8">Senaste artiklar</h2>
            <div className="grid gap-8 sm:gap-10 sm:grid-cols-2">
              {rest.map(post => (
                <Link key={post.id} to={`/blogg/${post.slug}`} className="group">
                  <article className="space-y-4">
                    {post.cover_image_url ? (
                      <div className="aspect-[16/10] overflow-hidden rounded-xl bg-muted">
                        <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                      </div>
                    ) : (
                      <div className="aspect-[16/10] rounded-xl bg-gradient-to-br from-primary/8 to-accent/8 flex items-center justify-center"><BookOpen className="h-8 w-8 text-primary/30" /></div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.category && <Badge variant="secondary" className="text-[10px]">{categoryLabels[post.category] || post.category}</Badge>}
                        <span className="text-[11px] text-muted-foreground">{readingTime(post.content)} min läsning</span>
                        {post.published_at && <span className="text-[11px] text-muted-foreground">· {new Date(post.published_at).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}</span>}
                      </div>
                      <h3 className="font-serif text-xl sm:text-2xl text-foreground leading-snug group-hover:text-primary transition-colors">{post.title}</h3>
                      {post.excerpt && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{post.excerpt}</p>}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="mt-20 text-center bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-2xl p-8 sm:p-12 border border-border/30">
          <span className="text-3xl mb-3 block">🌱</span>
          <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-2">
            Logga din odling – helt gratis
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            Med Odlingsdagboken håller du koll på sådder, skördar och växtföljd. Perfekt för dig som vill odla smartare.
          </p>
          <Link to="/login">
            <Button size="lg" className="rounded-xl gap-2">
              <Sprout className="h-4 w-4" /> Skapa ett konto
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border/50 mt-16 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Odlingsdagboken</span>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-foreground transition-colors">Startsidan</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Villkor</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Logga in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
