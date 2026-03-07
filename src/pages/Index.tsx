import React, { useRef, useEffect, useState } from 'react';
import { useSeo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import { Sprout, ArrowRight, BarChart3, LayoutGrid, Carrot, RefreshCw, Calendar, Check, ChevronDown, ChevronRight, Star, Users, Clock } from 'lucide-react';
import heroGarden from '@/assets/hero-garden.jpg';

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} className={`transition-all duration-600 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(target / 90);
    const timer = setInterval(() => { start += step; if (start >= target) { setCount(target); clearInterval(timer); } else setCount(start); }, 16);
    return () => clearInterval(timer);
  }, [visible, target]);
  return <span ref={ref}>{count.toLocaleString('sv-SE')}{suffix}</span>;
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-muted/50 transition-colors">
        <span className="text-sm sm:text-base font-medium text-foreground pr-4">{q}</span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="px-4 sm:px-5 pb-4 sm:pb-5 -mt-1"><p className="text-sm text-muted-foreground leading-relaxed">{a}</p></div>}
    </div>
  );
}

const features = [
  { icon: Sprout, title: 'Sålogg', desc: 'Logga sort, bädd och sådatum. Håll koll på förodling och utplantering.' },
  { icon: Carrot, title: 'Skördlogg', desc: 'Registrera skörd med vikt och datum. Se totalt per sort.' },
  { icon: RefreshCw, title: 'Växtföljd', desc: 'Se vad du odlat var, år för år. Undvik att odla samma sak på samma ställe.' },
  { icon: Calendar, title: 'Såtider', desc: 'Rekommenderade tider anpassade för just din klimatzon.' },
];

const steps = [
  { num: '1', title: 'Skapa konto', desc: 'Det tar 10 sekunder. Helt gratis.' },
  { num: '2', title: 'Lägg till bäddar', desc: 'Namnge dina odlingsbäddar, pallkragar och växthus.' },
  { num: '3', title: 'Börja logga', desc: 'Registrera sådder och skördar. Se allt i din dagbok.' },
];

const testimonials = [
  { text: 'Äntligen kan jag hålla koll på vad jag odlade var förra året! Växtföljden hade jag aldrig lyckats med innan.', name: 'Maria L.', location: 'Skåne · Zon 1', avatar: '👩‍🌾' },
  { text: 'Perfekt för oss som har pallkragar och vill veta exakt hur mycket vi skördar. Enkelt och snyggt.', name: 'Anders K.', location: 'Dalarna · Zon 4', avatar: '👨‍🌾' },
  { text: 'Jag säljer lite grönsaker till grannar och nu ser jag vilka sorter som ger bäst. Tack Odlingsdagboken!', name: 'Eva S.', location: 'Halland · Zon 2', avatar: '👩‍🌾' },
];

const faqs = [
  { q: 'Kostar det något?', a: 'Grundversionen är helt gratis – för alltid. Med Plus (99 kr/år) får du obegränsade bäddar, smarta påminnelser, full växtföljdshistorik och säsongsanteckningar. Nya användare får dessutom 7 dagars gratis Plus automatiskt.' },
  { q: 'Behöver jag ladda ner en app?', a: 'Nej! Odlingsdagboken fungerar direkt i webbläsaren. Du kan lägga till den på hemskärmen så känns det som en app.' },
  { q: 'Vad skiljer er från Gardenize?', a: 'Gardenize är brett och täcker allt från krukväxter till träd. Vi gör en sak och gör den riktigt bra: grönsaksodling. Konkret innebär det: inbyggda svenska klimatzoner som styr dina såtider, skördvikter per sort så du ser vilka som faktiskt presterar, växtföljdsvy bädd-för-bädd år efter år, och smarta påminnelser som säger till när det är dags att så eller plantera ut – anpassat efter just din zon. Allt det saknas i Gardenize.' },
  { q: 'Är mina data säkra?', a: 'Absolut. All data lagras krypterat inom EU. Vi följer GDPR och du kan radera allt när du vill.' },
  { q: 'Hur många bäddar kan jag ha gratis?', a: 'I gratisversionen kan du ha upp till 3 bäddar och 20 sådder per år. Nya konton får 7 dagars Plus automatiskt så du kan testa allt.' },
];

export default function Index() {
  useSeo({
    title: 'Odlingsdagboken – Din digitala odlingsdagbok för svenska odlare',
    description: 'Håll koll på såtider, skördar och växtföljd. Vet vad som funkar i just din trädgård – år efter år. Gratis att börja!',
    path: '/',
  });

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[92vh] flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <img src={heroGarden} alt="Svensk köksträdgård med odlingsbäddar i morgonljus" className="w-full h-full object-cover object-[50%_45%] animate-hero-zoom scale-110" loading="eager" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/50 to-background" />

        <nav aria-label="Huvudnavigation" className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌱</span>
            <span className="font-serif text-lg text-primary-foreground drop-shadow-sm">Odlingsdagboken</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10">
              <a href="/login?mode=login">Logga in</a>
            </Button>
            <Button asChild size="sm" className="shadow-lg">
              <a href="/login?mode=register">Kom igång</a>
            </Button>
          </div>
        </nav>

        <div className="relative z-10 text-center px-5 sm:px-6 max-w-3xl mx-auto">
          <FadeUp>
            <div className="inline-flex items-center gap-2 bg-primary-foreground/15 backdrop-blur-md text-primary-foreground px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium border border-primary-foreground/20 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              Anpassad för svenska klimatzoner
            </div>
          </FadeUp>

          <FadeUp delay={100}>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl text-primary-foreground mb-4 sm:mb-5 leading-[1.1] drop-shadow-lg">
              Din digitala{' '}
              <span className="relative inline-block">
                odlingsdagbok
                <svg className="absolute -bottom-3 left-0 w-full h-3 text-primary" viewBox="0 0 200 12" fill="none">
                  <path d="M2 8 C50 2, 150 2, 198 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
          </FadeUp>

          <FadeUp delay={200}>
            <p className="text-base sm:text-xl text-primary-foreground/85 mb-8 max-w-lg mx-auto leading-relaxed">
              Håll koll på såtider, skördar och växtföljd. Vet vad som funkar i just <strong>din</strong> trädgård – år efter år.
            </p>
          </FadeUp>

          <FadeUp delay={300}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
              <Button asChild size="lg" className="h-14 px-12 text-lg gap-2 shadow-[0_8px_30px_hsl(var(--primary)/0.4)] hover:shadow-[0_8px_40px_hsl(var(--primary)/0.5)] hover:scale-[1.02] transition-all">
                <a href="/login?mode=register">
                  🌱 Kom igång gratis
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-primary-foreground/60">Klart på 10 sekunder · Helt kostnadsfritt</p>
          </FadeUp>

          <FadeUp delay={400}>
            <div className="flex flex-wrap gap-x-6 gap-y-1 justify-center text-xs sm:text-sm text-primary-foreground/70 mt-6">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Helt gratis att börja</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Svenska klimatzoner</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> 100% svensk 🇸🇪</span>
            </div>
          </FadeUp>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <ChevronDown className="h-6 w-6 text-primary-foreground/40" />
        </div>
      </section>

      {/* ═══ SOCIAL PROOF ═══ */}
      <section className="relative z-10 border-b border-border bg-card">
        <div className="container max-w-5xl mx-auto px-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
            {[
              { target: 1240, suffix: '+', label: 'sådder loggade', icon: Sprout },
              { target: 380, suffix: '', label: 'odlare', icon: Users },
              { target: 4, suffix: ',9 ★', label: 'snittbetyg', icon: Star },
              { target: 10, suffix: 's', label: 'att skapa konto', icon: Clock },
            ].map((s, i) => (
              <FadeUp key={s.label} delay={i * 100} className="py-5 sm:py-7 text-center">
                <p className="stat-number text-lg sm:text-2xl text-foreground"><AnimatedNumber target={s.target} suffix={s.suffix} /></p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="relative z-10 py-16 sm:py-24">
        <div className="container max-w-5xl mx-auto px-5 sm:px-6">
          <FadeUp className="text-center mb-10 sm:mb-14">
            <h2 className="font-serif text-2xl sm:text-4xl text-foreground mb-3">
              Allt du behöver för att <span className="gradient-text">odla smartare</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
              Fokuserat på grönsaksodling. Byggt för svenska förhållanden.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {features.map((f, i) => (
              <FadeUp key={f.title} delay={i * 100}>
                <div className="p-6 rounded-2xl border border-border bg-card card-hover">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-serif text-lg text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="relative z-10 bg-card/50 border-y border-border py-16 sm:py-24">
        <div className="container max-w-4xl mx-auto px-5 sm:px-6">
          <FadeUp className="text-center mb-10 sm:mb-14">
            <h2 className="font-serif text-2xl sm:text-4xl text-foreground mb-3">Kom igång på under en minut</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Tre enkla steg – sen odlar du smartare.</p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <FadeUp key={s.num} delay={i * 150}>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold font-serif">{s.num}</div>
                  <h3 className="font-serif text-lg text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={450} className="text-center mt-10">
            <Button asChild size="lg" className="h-12 px-8 text-base gap-2">
              <a href="/login?mode=register">Skapa konto gratis <ArrowRight className="h-4 w-4" /></a>
            </Button>
          </FadeUp>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="relative z-10 py-16 sm:py-24">
        <div className="container max-w-5xl mx-auto px-5 sm:px-6">
          <FadeUp className="text-center mb-10 sm:mb-14">
            <h2 className="font-serif text-2xl sm:text-4xl text-foreground mb-3">Vad andra odlare säger</h2>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <FadeUp key={t.name} delay={i * 100}>
                <div className="p-6 rounded-2xl border border-border bg-card h-full flex flex-col">
                  <div className="flex gap-1 mb-3">{[1,2,3,4,5].map(s => <Star key={s} className="h-4 w-4 text-warning fill-warning" />)}</div>
                  <p className="text-sm text-foreground/90 leading-relaxed flex-1 mb-4">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{t.avatar}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.location}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="relative z-10 bg-card/50 border-y border-border py-16 sm:py-24">
        <div className="container max-w-4xl mx-auto px-5 sm:px-6">
          <FadeUp className="text-center mb-10 sm:mb-14">
            <h2 className="font-serif text-2xl sm:text-4xl text-foreground mb-3">Enkel prissättning</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Börja gratis, uppgradera när du behöver.</p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <FadeUp>
              <div className="p-6 rounded-2xl border border-border bg-card">
                <h3 className="font-serif text-xl text-foreground mb-1">Gratis</h3>
                <p className="text-3xl font-bold text-foreground mb-4">0 kr<span className="text-sm font-normal text-muted-foreground">/år</span></p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Max 3 bäddar</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Max 20 sådder/år</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Växtföljd – nuvarande år</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Skördlogg med vikt</li>
                </ul>
                <Button asChild variant="outline" className="w-full">
                  <a href="/login?mode=register">Kom igång gratis</a>
                </Button>
              </div>
            </FadeUp>

            <FadeUp delay={100}>
              <div className="p-6 rounded-2xl border-2 border-primary bg-card relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">Populärast</div>
                <h3 className="font-serif text-xl text-foreground mb-1">Plus</h3>
                <p className="text-3xl font-bold text-foreground mb-4">99 kr<span className="text-sm font-normal text-muted-foreground">/år</span></p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Obegränsade bäddar & sådder</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Smarta påminnelser per klimatzon</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Full växtföljdshistorik (alla år)</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Säsongsanteckningar per bädd</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> CSV-export</li>
                </ul>
                <Button asChild className="w-full">
                  <a href="/login?mode=register">Prova Plus – 7 dagar gratis</a>
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">Inget kreditkort krävs</p>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="relative z-10 py-16 sm:py-24">
        <div className="container max-w-2xl mx-auto px-5 sm:px-6">
          <FadeUp className="text-center mb-10">
            <h2 className="font-serif text-2xl sm:text-4xl text-foreground mb-3">Vanliga frågor</h2>
          </FadeUp>
          <div className="space-y-3">
            {faqs.map((f, i) => <FadeUp key={i} delay={i * 60}><FAQItem q={f.q} a={f.a} /></FadeUp>)}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="relative z-10 bg-primary text-primary-foreground py-16 sm:py-20">
        <div className="container max-w-3xl mx-auto px-5 sm:px-6 text-center">
          <FadeUp>
            <h2 className="font-serif text-2xl sm:text-4xl mb-4">Redo att odla smartare?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
              Skapa ett gratis konto och börja logga dina sådder och skördar redan idag.
            </p>
            <Button asChild size="lg" variant="secondary" className="h-14 px-10 text-lg gap-2">
              <a href="/login?mode=register">
                🌱 Kom igång nu
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
          </FadeUp>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border bg-card py-8 px-5">
        <div className="container max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Odlingsdagboken</span>
          <div className="flex gap-4">
            <a href="/terms" className="hover:text-foreground transition-colors">Villkor</a>
            <a href="/blogg" className="hover:text-foreground transition-colors">Blogg</a>
            <a href="/login" className="hover:text-foreground transition-colors">Logga in</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
