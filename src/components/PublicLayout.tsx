import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Instagram, Leaf, Menu, Sprout, X } from 'lucide-react';

interface PublicLayoutProps {
  children: ReactNode;
  bare?: boolean;
}

type NavItem = { label: string; to: string; anchor?: string; matchPrefix?: string };

const NAV: NavItem[] = [
  { label: 'Hur det fungerar', to: '/#hur-det-fungerar', anchor: 'hur-det-fungerar' },
  { label: 'Funktioner', to: '/#funktioner', anchor: 'funktioner' },
  { label: 'För vem', to: '/#for-vem', anchor: 'for-vem' },
  { label: 'Blogg', to: '/blogg', matchPrefix: '/blogg' },
  { label: 'Pris', to: '/#pris', anchor: 'pris' },
];

function buildHref(item: NavItem, isHome: boolean): string {
  if (!item.anchor) return item.to;
  return isHome ? `#${item.anchor}` : item.to;
}

export default function PublicLayout({ children, bare = false }: PublicLayoutProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = location.pathname === '/';

  // Close menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  if (bare) return <>{children}</>;

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) return location.pathname === item.matchPrefix || location.pathname.startsWith(item.matchPrefix + '/');
    return false;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col app-canvas">
      <a
        href="#public-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Hoppa till innehåll
      </a>

      <header className="sticky top-0 z-40 border-b border-border/45 bg-background/85 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-4">
          <Link to="/" className="group flex items-center gap-3 min-w-0" aria-label="Odlingsdagboken – till startsidan">
            <span className="botanical-panel w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none">
              <Sprout className="h-5 w-5 text-white" />
            </span>
            <span className="min-w-0">
              <span className="block font-serif text-[15px] sm:text-[18px] leading-none text-foreground whitespace-nowrap">Odlingsdagboken</span>
              <span className="hidden sm:block text-[9px] uppercase tracking-[0.15em] text-muted-foreground mt-1.5">Svensk odlingshjälp</span>
            </span>
          </Link>

          <nav aria-label="Huvudmeny" className="hidden lg:flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 shadow-sm">
            {NAV.map(item => (
              <Link
                key={item.label}
                to={buildHref(item, isHome)}
                aria-current={isActive(item) ? 'page' : undefined}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                  isActive(item)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-primary/7 hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex min-h-[40px]">
              <Link to="/login?mode=login">Logga in</Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5 min-h-[40px] px-3 sm:px-4">
              <Link to="/login?mode=register">Testa gratis <ArrowRight className="hidden sm:inline h-3.5 w-3.5" aria-hidden="true" /></Link>
            </Button>
            <button
              type="button"
              onClick={() => setMobileOpen(v => !v)}
              aria-expanded={mobileOpen}
              aria-controls="public-mobile-menu"
              aria-label={mobileOpen ? 'Stäng meny' : 'Öppna meny'}
              className="lg:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            id="public-mobile-menu"
            className="lg:hidden border-t border-border/45 bg-background/98 backdrop-blur-2xl"
          >
            <nav aria-label="Mobilmeny" className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-1">
              {NAV.map(item => (
                <Link
                  key={item.label}
                  to={buildHref(item, isHome)}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive(item) ? 'page' : undefined}
                  className={`min-h-[44px] flex items-center rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive(item)
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 pt-3 border-t border-border/50 flex flex-col gap-2 sm:hidden">
                <Button asChild variant="outline" className="w-full min-h-[44px]">
                  <Link to="/login?mode=login" onClick={() => setMobileOpen(false)}>Logga in</Link>
                </Button>
                <Button asChild className="w-full gap-1.5 min-h-[44px]">
                  <Link to="/login?mode=register" onClick={() => setMobileOpen(false)}>
                    Testa gratis <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="public-main" className="flex-1">{children}</main>

      <footer className="mt-20 border-t border-white/8 bg-[hsl(151_34%_12%)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid gap-10 md:grid-cols-[1.35fr_.65fr_.65fr]">
            <div className="max-w-md">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center">
                  <Leaf className="h-5 w-5 text-lime-200" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-serif text-xl">Odlingsdagboken</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/45 mt-1">Från frö till erfarenhet</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-white/60">
                Planera sådd, logga skörd och bygg din egen kunskapsbank för svenska förhållanden — säsong efter säsong.
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 mb-4">Upptäck</p>
              <div className="grid gap-3 text-sm text-white/70">
                {[
                  ['Såkalender', '/sakalender'],
                  ['Odlingsplan', '/odlingsplan'],
                  ['Växtguider', '/vaxter'],
                  ['Odlingsakuten', '/odlingsakuten'],
                  ['Gro AI', '/gro'],
                ].map(([label, href]) => (
                  <Link key={href} to={href} className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 mb-4">Företaget</p>
              <div className="grid gap-3 text-sm text-white/70">
                {[
                  ['Blogg', '/blogg'],
                  ['Om oss', '/om-oss'],
                  ['Priser', '/priser'],
                  ['Villkor', '/terms'],
                  ['Logga in', '/login?mode=login'],
                ].map(([label, href]) => (
                  <Link key={href} to={href} className="hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/45">
            <span>© {new Date().getFullYear()} Aurora Media AB · Org.nr 559272-0220</span>
            <div className="flex items-center gap-3">
              <span>Byggd med omtanke i Sverige</span>
              <Instagram className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
