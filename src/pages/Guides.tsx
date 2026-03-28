import React, { useEffect, useRef } from 'react';
import VisitorWelcomePopup from '@/components/VisitorWelcomePopup';
import { useSeo } from '@/hooks/useSeo';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sprout } from 'lucide-react';

export default function Guides() {
  const containerRef = useRef<HTMLDivElement>(null);

  useSeo({
    title: 'Odlingstips & Guider 2026 | Odlingsdagboken',
    description: 'Guider, såtider och tips för svenska hobbyodlare. Lär dig mer om växtföljd, pallkrage och klassisk grönsaksodling.',
    path: '/blogg',
    ogImage: '/blog-images/spring-garden.jpg',
    ogImageAlt: 'Svensk köksträdgård – Odlingsdagbokens blogg',
    jsonLd: [
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
    ],
  });

  useEffect(() => {
    if (!containerRef.current) return;
    // Avoid double-injection
    if (containerRef.current.querySelector('script')) return;

    const params = new URLSearchParams(window.location.search);
    let url = 'https://app.trysoro.com/api/embed/7cadf781-f963-4b64-83b3-705e8bdbbbc7';
    const post = params.get('post');
    if (post) url += '?post=' + encodeURIComponent(post);

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <VisitorWelcomePopup />

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

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div id="soro-blog" ref={containerRef} />
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
