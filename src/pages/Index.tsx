import React, { useRef, useEffect, useState } from 'react';
import { useSeo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, ChevronRight, Sprout, Carrot, CalendarDays, RefreshCw, BarChart3, Zap, Flower2, X } from 'lucide-react';
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

/* ─── Seasonal banner ─── */
function SeasonalBanner() {
  const [dismissed, setDismissed] = useState(false);
  const month = new Date().getMonth(); // 0-indexed
  const isSowSeason = month >= 1 && month <= 4; // Feb–May

  if (!isSowSeason || dismissed) return null;

  return (
    <div className="bg-primary text-primary-foreground text-center text-xs sm:text-sm py-2.5 px-4 relative">
      <span>Det är såsäsong! 🌱 Kom igång med din odlingsdagbok innan säsongen sätter igång.</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
        aria-label="Stäng"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── Data ─── */
const capabilities = [
  {
    icon: Sprout,
    title: 'Sålogg',
    desc: 'Logga sort, bädd, sådatum och typ. Håll koll på förodling och utplantering.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Carrot,
    title: 'Skördlogg med vikt',
    desc: 'Registrera varje skörd i gram. Se vad som faktiskt presterar.',
    color: 'bg-accent/10 text-accent',
  },
  {
    icon: CalendarDays,
    title: 'Såkalender per zon',
    desc: 'Rekommenderade tider för 20+ grönsaker, anpassade efter din klimatzon.',
    color: 'bg-success/10 text-success',
  },
  {
    icon: RefreshCw,
    title: 'Växtföljd',
    desc: 'Se vad du odlat var, år för år. Planera smartare rotation.',
    color: 'bg-warning/10 text-warning',
  },
  {
    icon: BarChart3,
    title: 'Statistik & trender',
    desc: 'Jämför säsonger och hitta dina bästa sorter över tid.',
    color: 'bg-accent/10 text-accent',
  },
  {
    icon: Zap,
    title: 'AI-coach Gro',
    desc: 'Ställ odlingsfrågor och få personliga svar baserat på din zon.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Flower2,
    title: 'Krukväxter & inomhusväxter',
    desc: 'Håll koll på vattning, gödsling och skötsel för alla dina inomhusväxter.',
    color: 'bg-success/10 text-success',
  },
];

const comparisons = [
  { feature: 'Klimatzonanpassning', us: true, them: false },
  { feature: 'Skördlogg med vikt', us: true, them: false },
  { feature: 'Växtföljd bädd-för-bädd', us: true, them: false },
  { feature: 'Såkalender per zon', us: true, them: false },
  { feature: 'Krukväxter & inomhusväxter', us: true, them: false },
  { feature: 'AI-odlingscoach', us: true, them: false },
  { feature: 'Pris per år', us: '99 kr', them: '470 kr' },
];

const faqs = [
  { q: 'Kostar det något?', a: 'Grundversionen är helt gratis – för alltid. Med Plus (99 kr/år) får du obegränsade bäddar, smarta påminnelser, växtföljdshistorik och CSV-export. Alla nya konton får sju dagars Plus gratis.' },
  { q: 'Behöver jag ladda ner en app?', a: 'Nej! Odlingsdagboken fungerar direkt i webbläsaren på mobil och dator. Lägg till den på hemskärmen så känns det som en app.' },
  { q: 'Hur skiljer ni er från Gardenize?', a: 'Gardenize fokuserar brett – krukväxter, träd, inspiration. Vi fokuserar 100 % på grönsaksodling med konkreta verktyg: såkalender per klimatzon, skördlogg med vikt och växtföljd per bädd. Vi har även ett komplett system för krukväxter och inomhusväxter – något Gardenize saknar helt.' },
  { q: 'Är mina data säkra?', a: 'Absolut. All data lagras krypterat inom EU. Vi följer GDPR och du kan radera allt när du vill.' },
  { q: 'Hur många bäddar kan jag ha gratis?', a: 'Upp till tre bäddar och tio sådder. Alla nya konton får sju dagars Plus gratis så du kan testa allt.' },
];

const howItWorksSteps = [
  { num: '1', title: 'Skapa konto på tio sekunder', desc: 'Helt gratis, ingen betalinfo krävs.' },
  { num: '2', title: 'Lägg till dina bäddar och växter', desc: 'Odlingsbäddar, krukväxter – allt på ett ställe.' },
  { num: '3', title: 'Logga sådder och skördar', desc: 'Se vad som funkar år efter år.' },
];

/* ─── Component ─── */
export default function Index() {
  useSeo({
    title: 'Odlingsdagboken – Digital odlingsdagbok för svenska odlare',
    description: 'Logga sådder, skördar och växtföljd. Se vad som funkar i just din trädgård – år efter år. Gratis att börja!',
    path: '/',
    jsonLd: [
      {
        '@type': 'SoftwareApplication',
        name: 'Odlingsdagboken',
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        description: 'Digital odlingsdagbok för svenska grönsaksodlare. Logga sådder, skördar och växtföljd – anpassat per klimatzon.',
        url: 'https://odlingsdagboken.com',
        inLanguage: 'sv',
        offers: [
          { '@type': 'Offer', price: '0', priceCurrency: 'SEK', description: 'Gratis grundversion' },
          { '@type': 'Offer', price: '99', priceCurrency: 'SEK', description: 'Plus – obegränsade bäddar, AI-coach, statistik' },
        ],
        
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'Organization',
        name: 'Odlingsdagboken',
        url: 'https://odlingsdagboken.com',
        logo: 'https://odlingsdagboken.com/logo-odlingsdagboken.png',
        sameAs: [
          'https://instagram.com/odlingsdagboken',
          'https://facebook.com/odlingsdagboken',
        ],
      },
    ],
  });

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ═══════════════════════ SEASONAL BANNER ═══════════════════════ */}
      <SeasonalBanner />

      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-8 h-14">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg">🌱</span>
            <span className="font-serif text-base font-semibold text-foreground tracking-tight">Odlingsdagboken</span>
          </a>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs sm:text-sm hidden sm:inline-flex">
              <a href="/blogg">Blogg</a>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs sm:text-sm">
              <a href="/login?mode=login">Logga in</a>
            </Button>
            <Button asChild size="sm" className="h-8 px-3 sm:px-4 text-xs sm:text-sm">
              <a href="/login?mode=register">Kom igång</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-3xl" />
          <div className="absolute -bottom-1/4 -left-1/4 w-[400px] h-[400px] rounded-full bg-accent/[0.04] blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-10 pb-8 sm:py-20 lg:py-28 relative">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <Reveal>
                <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 text-primary px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium mb-5">
                  <Zap className="h-3 w-3" />
                  Anpassad för klimatzoner 1–8
                </div>
              </Reveal>

              <Reveal delay={80}>
                <h1 className="font-serif text-[2rem] sm:text-5xl lg:text-[3.5rem] text-foreground leading-[1.1] tracking-tight mb-4 sm:mb-5">
                  Vet vad som{' '}
                  <span className="gradient-text">funkar</span>
                  {' '}i din trädgård
                </h1>
              </Reveal>

              <Reveal delay={160}>
                <p className="text-[15px] sm:text-lg text-muted-foreground leading-relaxed mb-6 sm:mb-8 max-w-lg mx-auto lg:mx-0">
                  Logga sådder, mät skördar och spåra växtföljd — anpassat efter din klimatzon. Odla smartare, år efter år.
                </p>
              </Reveal>

              <Reveal delay={240}>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-4">
                  <Button asChild size="lg" className="h-12 sm:h-13 px-6 sm:px-8 text-[15px] sm:text-base gap-2 shadow-lg">
                    <a href="/login?mode=register">
                      Skapa gratis konto <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-12 sm:h-13 px-6 sm:px-8 text-[15px] sm:text-base">
                    <a href="#funktioner">Se hur det funkar</a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center lg:text-left">Byggd för svenska förhållanden 🇸🇪</p>
              </Reveal>
            </div>

            {/* Hero image */}
            <Reveal delay={200} className="w-full">
              <div className="block lg:hidden">
                <div className="rounded-2xl overflow-hidden shadow-xl aspect-[4/3] max-w-md mx-auto">
                  <img src={heroFlatlay} alt="Odlingsplanering med fröpåsar, plantor och anteckningsblock" className="w-full h-full object-cover" loading="eager" />
                </div>
              </div>
              <div className="hidden lg:grid grid-cols-5 grid-rows-4 gap-3 h-[480px]">
                <div className="col-span-3 row-span-4 rounded-2xl overflow-hidden shadow-lg">
                  <img src={heroFlatlay} alt="Odlingsplanering med fröpåsar, plantor och anteckningsblock" className="w-full h-full object-cover" loading="eager" />
                </div>
                <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden shadow-md">
                  <img src={heroHands} alt="Händer med nyskördade grönsaker" className="w-full h-full object-cover" loading="eager" />
                </div>
                <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden shadow-md">
                  <img src={heroAerial} alt="Pallkragar i en svensk trädgård" className="w-full h-full object-cover" loading="eager" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ TRUST BAR ═══════════════════════ */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 sm:py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">🇸🇪 <span className="font-medium text-foreground">Byggd för Sverige</span></span>
            <div className="hidden sm:block w-px h-5 bg-border" />
            <span className="flex items-center gap-1.5">🔒 GDPR – data inom EU</span>
            <div className="hidden sm:block w-px h-5 bg-border" />
            <span className="flex items-center gap-1.5">🌱 Gratis att börja</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ PROBLEM → SOLUTION ═══════════════════════ */}
      <section className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Problemet</p>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-3 max-w-xl">
              De flesta hemmaodlare gör samma misstag – år efter år
            </h2>
            <p className="text-muted-foreground max-w-lg mb-8 text-sm sm:text-base">
              Utan data odlar du på känsla. Med Odlingsdagboken odlar du på kunskap.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <Check className="h-3 w-3 shrink-0" /> {item.solution}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <section>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <Reveal className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Så här funkar det</p>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
              Kom igång på tre enkla steg
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {howItWorksSteps.map((step, i) => (
              <Reveal key={step.num} delay={i * 120}>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-serif text-xl font-bold flex items-center justify-center mx-auto mb-4">
                    {step.num}
                  </div>
                  <h3 className="font-serif text-base sm:text-lg text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ CAPABILITIES ═══════════════════════ */}
      <section id="funktioner" className="scroll-mt-20 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <Reveal className="mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Funktioner</p>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground max-w-lg">
              Allt du behöver för att odla smartare
            </h2>
          </Reveal>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {capabilities.map((cap, i) => (
              <Reveal key={cap.title} delay={i * 80}>
                <div className="group p-4 sm:p-6 rounded-2xl border border-border bg-background hover:shadow-lg transition-all duration-300 h-full">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${cap.color} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                    <cap.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <h3 className="font-serif text-sm sm:text-lg text-foreground mb-1 sm:mb-2">{cap.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{cap.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ COMPARISON ═══════════════════════ */}
      <section>
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <Reveal className="text-center mb-8 sm:mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Jämförelse</p>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
              Odlingsdagboken vs Gardenize
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <div className="rounded-2xl border border-border overflow-hidden bg-card">
              <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <div className="p-3 sm:p-4">Funktion</div>
                <div className="p-3 sm:p-4 text-center bg-primary/5 text-primary whitespace-nowrap">Oss</div>
                <div className="p-3 sm:p-4 text-center whitespace-nowrap">Gardenize</div>
              </div>
              {comparisons.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-[1fr_auto_auto] sm:grid-cols-3 text-xs sm:text-sm ${i < comparisons.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="p-3 sm:p-4 text-foreground">{row.feature}</div>
                  <div className="p-3 sm:p-4 text-center bg-primary/5 font-medium min-w-[60px]">
                    {typeof row.us === 'boolean'
                      ? row.us ? <Check className="h-4 w-4 text-primary mx-auto" /> : '–'
                      : <span className="text-primary font-bold">{row.us}</span>
                    }
                  </div>
                  <div className="p-3 sm:p-4 text-center text-muted-foreground min-w-[60px]">
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
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <Reveal className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Prissättning</p>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-3">
              Börja gratis. Uppgradera när du vill.
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Alla nya konton får sju dagars Plus gratis.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
            <Reveal>
              <div className="p-5 sm:p-8 rounded-2xl border border-border bg-background h-full">
                <h3 className="font-serif text-xl text-foreground mb-1">Gratis</h3>
                <div className="flex items-baseline gap-1 mb-4 sm:mb-5">
                  <span className="text-3xl sm:text-4xl font-bold text-foreground">0</span>
                  <span className="text-muted-foreground text-sm">kr/år</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground mb-5 sm:mb-6">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Max tre bäddar</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Max tio sådder</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Skördlogg med vikt</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Såkalender per zon</li>
                </ul>
                <Button asChild variant="outline" className="w-full">
                  <a href="/login?mode=register">Börja gratis</a>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="relative p-5 sm:p-8 rounded-2xl border-2 border-primary bg-background h-full">
                <div className="absolute -top-3 right-4 sm:right-6 bg-primary text-primary-foreground text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                  Populärast
                </div>
                <h3 className="font-serif text-xl text-foreground mb-1">Plus</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl sm:text-4xl font-bold text-foreground">99</span>
                  <span className="text-muted-foreground text-sm">kr/år</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4 sm:mb-5">Bara ~åtta kr/månad · sju dagars gratis provperiod</p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-5 sm:mb-6">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Obegränsade bäddar & sådder</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> AI-coach Gro utan gräns</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Statistik & trender</li>
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
      <section>
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-foreground" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24 relative">
          <div className="max-w-2xl mx-auto text-center">
            <Reveal>
              <h2 className="font-serif text-2xl sm:text-4xl leading-[1.1] mb-4 text-background">
                Redo att veta vad som funkar i din trädgård?
              </h2>
              <p className="text-background/70 mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base">
                Skapa ett konto på tio sekunder. Börja logga. Se resultat redan efter första säsongen.
              </p>
              <Button asChild size="lg" variant="secondary" className="h-12 sm:h-13 px-6 sm:px-8 text-[15px] sm:text-base gap-2">
                <a href="/login?mode=register">
                  Kom igång gratis <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <p className="text-xs text-background/50 mt-4">Alla nya konton får sju dagars Plus gratis</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="border-t border-border bg-background py-8 sm:py-10 px-4 sm:px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>🌱</span>
            <span className="font-serif font-medium text-foreground">Odlingsdagboken</span>
            <span className="text-border mx-2">|</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-5">
            <a href="/terms" className="hover:text-foreground transition-colors">Villkor</a>
            <a href="/blogg" className="hover:text-foreground transition-colors">Blogg</a>
            <a href="/guider" className="hover:text-foreground transition-colors">Guider</a>
            <a href="/login?mode=register" className="hover:text-foreground transition-colors">Skapa konto</a>
            <a href="mailto:hej@odlingsdagboken.se" className="hover:text-foreground transition-colors">Kontakt</a>
            <a href="/login" className="hover:text-foreground transition-colors">Logga in</a>
            <a href="https://instagram.com/odlingsdagboken" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" aria-label="Instagram">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://facebook.com/odlingsdagboken" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" aria-label="Facebook">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
