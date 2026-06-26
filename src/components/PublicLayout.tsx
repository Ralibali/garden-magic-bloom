import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Instagram, Leaf, Sprout } from 'lucide-react';

interface PublicLayoutProps {
  children: ReactNode;
  bare?: boolean;
}

export default function PublicLayout({ children, bare = false }: PublicLayoutProps) {
  if (bare) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col app-canvas">
      <header className="sticky top-0 z-40 border-b border-border/45 bg-background/78 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-5">
          <Link to="/" className="group flex items-center gap-3 min-w-0">
            <span className="botanical-panel w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105"><Sprout className="h-5 w-5 text-white" /></span>
            <span className="min-w-0"><span className="block font-serif text-[18px] leading-none text-foreground truncate">Odlingsdagboken</span><span className="hidden sm:block text-[9px] uppercase tracking-[0.15em] text-muted-foreground mt-1.5">Svensk odlingshjälp</span></span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 shadow-sm">
            {[['Växter', '/vaxter'], ['Månad', '/manad'], ['Zoner', '/zoner'], ['Blogg', '/blogg'], ['Priser', '/priser'], ['Om oss', '/om-oss']].map(([label, href]) => <Link key={href} to={href} className="rounded-full px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/7 hover:text-foreground">{label}</Link>)}
          </nav>

          <div className="flex items-center gap-2"><Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/login?mode=login">Logga in</Link></Button><Button asChild size="sm" className="gap-1.5"><Link to="/login?mode=register">Kom igång <ArrowRight className="h-3.5 w-3.5" /></Link></Button></div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-20 border-t border-white/8 bg-[hsl(151_34%_12%)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid gap-10 md:grid-cols-[1.35fr_.65fr_.65fr]">
            <div className="max-w-md"><div className="flex items-center gap-3"><span className="w-11 h-11 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center"><Leaf className="h-5 w-5 text-lime-200" /></span><div><p className="font-serif text-xl">Odlingsdagboken</p><p className="text-[10px] uppercase tracking-[0.16em] text-white/45 mt-1">Från frö till erfarenhet</p></div></div><p className="mt-5 text-sm leading-relaxed text-white/58">Planera sådd, logga skörd och bygg din egen kunskapsbank för svenska förhållanden — säsong efter säsong.</p></div>

            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 mb-4">Upptäck</p><div className="grid gap-3 text-sm text-white/65">{[['Såkalender', '/sakalender'], ['Odlingsplan', '/odlingsplan'], ['Växtguider', '/vaxter'], ['Odlingsakuten', '/odlingsakuten'], ['Gro AI', '/gro']].map(([label, href]) => <Link key={href} to={href} className="hover:text-white transition-colors">{label}</Link>)}</div></div>

            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 mb-4">Företaget</p><div className="grid gap-3 text-sm text-white/65">{[['Priser', '/priser'], ['Om oss', '/om-oss'], ['Blogg', '/blogg'], ['Villkor', '/terms'], ['Logga in', '/login?mode=login']].map(([label, href]) => <Link key={href} to={href} className="hover:text-white transition-colors">{label}</Link>)}</div></div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/38"><span>© {new Date().getFullYear()} Aurora Media AB · Org.nr 559272-0220</span><div className="flex items-center gap-3"><span>Byggd med omtanke i Sverige</span><Instagram className="h-4 w-4" /></div></div>
        </div>
      </footer>
    </div>
  );
}
