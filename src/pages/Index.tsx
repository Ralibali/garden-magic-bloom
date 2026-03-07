import React, { useRef, useEffect, useState } from 'react';
import { useSeo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, ChevronRight, Sprout, Carrot, CalendarDays, RefreshCw, BarChart3, Zap } from 'lucide-react';
import heroFlatlay from '@/assets/hero-flatlay.jpg';
import heroHands from '@/assets/hero-harvest-hands.jpg';
import heroAerial from '@/assets/hero-beds-aerial.jpg';

/* ─── Scroll-triggered fade ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── FAQ ─── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-sm sm:text-base font-medium text-foreground pr-4 group-hover:text-primary transition-colors">{q}</span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${open ? 'rotate-90' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-5' : 'max-h-0'}`}>
        <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ─── Data ─── */
const capabilities = [
  {
    icon: Sprout,
    title: 'Sålogg',
    desc: 'Logga sort, bädd, sådatum och typ. Håll koll på förodling och utplantering – allt på ett ställe.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Carrot,
    title: 'Skördlogg med vikt',
    desc: 'Registrera varje skörd i gram. Se totalt per sort och bädd – och vet vad som faktiskt presterar.',
    color: 'bg-accent/10 text-accent',
  },
  {
    icon: CalendarDays,
    title: 'Såkalender per zon',
    desc: 'Rekommenderade tider för 20+ grönsaker, automatiskt anpassade efter din klimatzon (1–8).',
    color: 'bg-success/10 text-success',
  },
  {
    icon: RefreshCw,
    title: 'Växtföljd',
    desc: 'Se vad du odlat var, år för år. Undvik sjukdomar och planera smartare rotation.',
    color: 'bg-warning/10 text-warning',
  },
  {
    icon: BarChart3,
    title: 'Statistik & trender',
    desc: 'Jämför säsonger. Hitta dina bästa sorter. Se hur odlingen utvecklas över tid.',
    color: 'bg-accent/10 text-accent',
  },
];

const comparisons = [
  { feature: 'Klimatzonanpassning (1–8)', us: true, them: false },
  { feature: 'Skördlogg med vikt (kg)', us: true, them: false },
  { feature: 'Växtföljd bädd-för-bädd', us: true, them: false },
  { feature: 'Såkalender per zon', us: true, them: false },
  { feature: 'Pris per år', us: '99 kr', them: '349 kr' },
];

const faqs = [
  { q: 'Kostar det något?', a: 'Grundversionen är helt gratis – för alltid. Med Plus (99 kr/år) får du obegränsade bäddar, smarta påminnelser, växtföljdshistorik och CSV-export. Alla nya konton får 7 dagars Plus gratis.' },
  { q: 'Behöver jag ladda ner en app?', a: 'Nej! Odlingsdagboken fungerar direkt i webbläsaren på mobil och dator. Lägg till den på hemskärmen så känns det som en app.' },
  { q: 'Hur skiljer ni er från Gardenize?', a: 'Gardenize fokuserar brett – krukväxter, träd, inspiration. Vi fokuserar 100 % på grönsaksodling med konkreta verktyg: såkalender per klimatzon, skördlogg med vikt och växtföljd per bädd. Vi kostar 99 kr/år mot deras 349 kr/år.' },
  { q: 'Är mina data säkra?', a: 'Absolut. All data lagras krypterat inom EU. Vi följer GDPR och du kan radera allt när du vill.' },
  { q: 'Hur många bäddar kan jag ha gratis?', a: 'Upp till 3 bäddar och 20 sådder per år. Alla nya konton får 7 dagars Plus gratis så du kan testa allt.' },
];

/* ─── Component ─── */
export default function Index() {
  useSeo({
    title: 'Odlingsdagboken – Digital odlingsdagbok för svenska odlare',
    description: 'Logga sådder, skördar och växtföljd. Se vad som funkar i just din trädgård – år efter år. Gratis att börja!',
    path: '/',
  });

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-8 h-14">
          <a href="/" className="flex items-center gap-2.5">
            <span className="text-lg">🌱</span>
            <span className="font-serif text-base font-semibold text-foreground tracking-tight">Odlingsdagboken</span>
          </a>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm">
              <a href="/blogg">Blogg</a>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm hidden sm:inline-flex">
              <a href="/login?mode=login">Logga in</a>
            </Button>
            <Button asChild size="sm" className="h-8 px-4 text-sm">
              <a href="/login?mode=register">Kom igång</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="pt-14">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <Reveal>
                <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 text-primary px-3.5 py-1.5 rounded-full text-xs font-medium mb-6">
                  <Zap className="h-3 w-3" />
                  Anpassad för svenska klimatzoner 1–8
                </div>
              </Reveal>

              <Reveal delay={80}>
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] text-foreground leading-[1.08] tracking-tight mb-5">
                  Vet vad som <em className="not-italic gradient-text">funkar</em> i din trädgård
                </h1>
              </Reveal>

              <Reveal delay={160}>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
                  Logga sådder, mät skördar i kg och spåra växtföljd — allt anpassat efter din klimatzon. Så du odlar smartare, år efter år.
                </p>
              </Reveal>

              <Reveal delay={240}>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <Button asChild size="lg" className="h-13 px-8 text-base gap-2 shadow-lg">
                    <a href="/login?mode=register">
                      Skapa gratis konto <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-13 px-8 text-base">
                    <a href="#funktioner">Se hur det funkar</a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Lanserar våren 2026 – var med från start 🌱</p>
              </Reveal>
            </div>

            {/* Image mosaic */}
            <Reveal delay={200} className="relative">
              <div className="grid grid-cols-5 grid-rows-4 gap-3 h-[360px] sm:h-[420px] lg:h-[480px]">
                <div className="col-span-3 row-span-4 rounded-2xl overflow-hidden shadow-lg">
                  <img src={heroFlatlay} alt="Odlingsplanering med fröpåsar, plantor och anteckningsblock" className="w-full h-full object-cover" loading="eager" />
                </div>
                <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden shadow-md">
                  <img src={heroHands} alt="Händer med nyskördade grönsaker från pallkrage" className="w-full h-full object-cover" loading="eager" />
                </div>
                <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden shadow-md">
                  <img src={heroAerial} alt="Pallkragar i en svensk bakgårdsträdgård" className="w-full h-full object-cover" loading="eager" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ PROBLEM → SOLUTION ═══════════════════════ */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Problemet</p>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-4 max-w-2xl">
              De flesta hemmaodlare gör samma misstag – år efter år
            </h2>
            <p className="text-muted-foreground max-w-xl mb-10">
              Vad odlade jag i den här bädden förra året? Vilka sorter gav bäst? Ska jag så tomaterna nu eller vänta?
              Utan data odlar du på känsla. Med Odlingsdagboken odlar du på kunskap.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { emoji: '📓', problem: '"Jag glömmer vad jag odlade var"', solution: 'Bädd-för-bädd logg med full historik' },
              { emoji: '🤷', problem: '"Jag vet inte vilka sorter som ger bäst"', solution: 'Skördlogg med vikt per sort' },
              { emoji: '📅', problem: '"Jag missar rätt såtider"', solution: 'Såkalender anpassad per klimatzon' },
            ].map((item, i) => (
              <Reveal key={item.problem} delay={i * 100}>
                <div className="p-5 rounded-xl border border-border bg-background">
                  <span className="text-2xl mb-3 block">{item.emoji}</span>
                  <p className="text-sm font-medium text-foreground mb-2">{item.problem}</p>
                  <p className="text-xs text-primary font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" /> {item.solution}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ CAPABILITIES ═══════════════════════ */}
      <section id="funktioner" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <Reveal className="mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Funktioner</p>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground max-w-lg">
              Allt du behöver för att odla smartare
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((cap, i) => (
              <Reveal key={cap.title} delay={i * 80}>
                <div className="group p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-300 h-full">
                  <div className={`w-10 h-10 rounded-xl ${cap.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <cap.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-lg text-foreground mb-2">{cap.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cap.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ COMPARISON ═══════════════════════ */}
      <section className="bg-card border-y border-border">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <Reveal className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Jämförelse</p>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
              Odlingsdagboken vs Gardenize
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <div className="rounded-2xl border border-border overflow-hidden bg-background">
              <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <div className="p-4">Funktion</div>
                <div className="p-4 text-center bg-primary/5 text-primary">Odlingsdagboken</div>
                <div className="p-4 text-center">Gardenize</div>
              </div>
              {comparisons.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-3 text-sm ${i < comparisons.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="p-4 text-foreground">{row.feature}</div>
                  <div className="p-4 text-center bg-primary/5 font-medium">
                    {typeof row.us === 'boolean'
                      ? row.us ? <Check className="h-4 w-4 text-primary mx-auto" /> : '–'
                      : <span className="text-primary font-bold">{row.us}</span>
                    }
                  </div>
                  <div className="p-4 text-center text-muted-foreground">
                    {typeof row.them === 'boolean'
                      ? row.them ? <Check className="h-4 w-4 mx-auto" /> : '–'
                      : row.them
                    }
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ PRICING ═══════════════════════ */}
      <section>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <Reveal className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Prissättning</p>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-3">
              Börja gratis. Uppgradera när du vill.
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Alla nya konton får 7 dagars Plus gratis.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Reveal>
              <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card h-full">
                <h3 className="font-serif text-xl text-foreground mb-1">Gratis</h3>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-4xl font-bold text-foreground">0</span>
                  <span className="text-muted-foreground">kr/år</span>
                </div>
                <ul className="space-y-2.5 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Max 3 bäddar</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Max 20 sådder per år</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Skördlogg med vikt</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Såkalender per zon</li>
                </ul>
                <Button asChild variant="outline" className="w-full">
                  <a href="/login?mode=register">Börja gratis</a>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="relative p-6 sm:p-8 rounded-2xl border-2 border-primary bg-card h-full">
                <div className="absolute -top-3 right-6 bg-primary text-primary-foreground text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                  Populärast
                </div>
                <h3 className="font-serif text-xl text-foreground mb-1">Plus</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-foreground">99</span>
                  <span className="text-muted-foreground">kr/år</span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">~8 kr/mån · 7 dagars gratis provperiod</p>
                <ul className="space-y-2.5 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Obegränsade bäddar & sådder</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Smarta påminnelser per zon</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Full växtföljdshistorik</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Export (CSV/PDF)</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Säsongsanteckningar</li>
                </ul>
                <Button asChild className="w-full">
                  <a href="/login?mode=register">Prova Plus gratis</a>
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FAQ ═══════════════════════ */}
      <section className="bg-card border-y border-border">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <Reveal className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">FAQ</p>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground">Vanliga frågor</h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="border-t border-border">
              {faqs.map((f) => <FAQItem key={f.q} q={f.q} a={f.a} />)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ FINAL CTA ═══════════════════════ */}
      <section className="bg-foreground text-background">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <Reveal>
              <h2 className="font-serif text-3xl sm:text-4xl leading-[1.1] mb-4">
                Redo att veta vad som funkar i din trädgård?
              </h2>
              <p className="text-background/70 mb-8 max-w-md mx-auto">
                Skapa ett konto på 10 sekunder. Börja logga. Se resultat redan efter första säsongen.
              </p>
              <Button asChild size="lg" variant="secondary" className="h-13 px-8 text-base gap-2">
                <a href="/login?mode=register">
                  Kom igång gratis <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <p className="text-xs text-background/50 mt-4">Alla nya konton får 7 dagars Plus gratis</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="border-t border-border bg-background py-10 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>🌱</span>
            <span className="font-serif font-medium text-foreground">Odlingsdagboken</span>
            <span className="text-border mx-2">|</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-5">
            <a href="/terms" className="hover:text-foreground transition-colors">Villkor</a>
            <a href="/blogg" className="hover:text-foreground transition-colors">Blogg</a>
            <a href="mailto:hej@odlingsdagboken.se" className="hover:text-foreground transition-colors">Kontakt</a>
            <a href="/login" className="hover:text-foreground transition-colors">Logga in</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
