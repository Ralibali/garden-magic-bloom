import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sprout } from 'lucide-react';

interface PublicLayoutProps {
  children: ReactNode;
  /** When true, renders only the bare layout (skips header/footer). */
  bare?: boolean;
}

/**
 * Shared header + footer for public marketing/SEO pages.
 * Matches the Guides page styling exactly so the public site feels cohesive.
 */
export default function PublicLayout({ children, bare = false }: PublicLayoutProps) {
  if (bare) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-xl">🌱</span>
            <span className="font-serif text-lg text-foreground">Odlingsdagboken</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/sakalender" className="hover:text-foreground transition-colors">Såkalender</Link>
            <Link to="/vaxter" className="hover:text-foreground transition-colors">Växter</Link>
            <Link to="/manad" className="hover:text-foreground transition-colors">Månad</Link>
            <Link to="/zoner" className="hover:text-foreground transition-colors">Zoner</Link>
            <Link to="/blogg" className="hover:text-foreground transition-colors">Blogg</Link>
            <Link to="/priser" className="hover:text-foreground transition-colors">Priser</Link>
            <Link to="/om-oss" className="hover:text-foreground transition-colors">Om oss</Link>
          </nav>
          <Link to="/login">
            <Button size="sm" className="rounded-xl text-xs gap-1">
              <Sprout className="h-3 w-3" /> Kom igång
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/50 mt-16 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Aurora Media AB · Org.nr 559272-0220</span>
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
            <Link to="/" className="hover:text-foreground transition-colors">Startsidan</Link>
            <Link to="/vaxter" className="hover:text-foreground transition-colors">Växtguider</Link>
            <Link to="/manad" className="hover:text-foreground transition-colors">Månader</Link>
            <Link to="/zoner" className="hover:text-foreground transition-colors">Zoner</Link>
            <Link to="/blogg" className="hover:text-foreground transition-colors">Blogg</Link>
            <Link to="/gro" className="hover:text-foreground transition-colors">Gro AI</Link>
            <Link to="/priser" className="hover:text-foreground transition-colors">Priser</Link>
            <Link to="/om-oss" className="hover:text-foreground transition-colors">Om oss</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Villkor</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Logga in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
