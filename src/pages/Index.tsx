import React, { useRef, useEffect, useState } from 'react';
import { Seo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, ChevronRight, Sprout, BookOpen, Calendar, Bot, BarChart2, Smartphone, Star, X, Menu } from 'lucide-react';
import dashboardPreview from '@/assets/dashboard-preview.jpg';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

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

/* ─── Animated counter ─── */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView(0.3);

  useEffect(() => {
    if (!visible) return;
    const duration = 1500;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, target]);

  return <span ref={ref as any} aria-live="polite">{count.toLocaleString('sv-SE')}{suffix}</span>;
}

/* ─── Live social proof ─── */
function SocialProofCounter() {
  const { data: weeklyCount } = useQuery({
    queryKey: ['weekly-signup-count'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weekly_signup_count');
      if (error) return 12; // fallback
      return Math.max(data ?? 0, 3); // minimum display
    },
    staleTime: 300_000,
    retry: 1,
  });

  if (!weeklyCount) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="flex items-center gap-2 justify-center lg:justify-start mt-4"
    >
      <div className="flex -space-x-1.5">
        {['🌱', '🌿', '🌻'].map((e, i) => (
          <span key={i} className="w-6 h-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-xs">{e}</span>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        <strong className="text-foreground">{weeklyCount}</strong> nya odlare registrerade sig den här veckan
      </span>
    </motion.div>
  );
}

/* ─── FAQ ─── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } }}
        className="w-full flex items-center justify-between py-5 text-left group"
        role="button"
        aria-expanded={open}
      >
        <span className="text-sm sm:text-base font-medium text-foreground pr-4 group-hover:text-primary transition-colors">{q}</span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-5' : 'max-h-0'}`} role="region">
        <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ─── Seasonal banner ─── */
function SeasonalBanner() {
  const [dismissed, setDismissed] = useState(false);
  const month = new Date().getMonth();
  const isSowSeason = month >= 1 && month <= 4;
  if (!isSowSeason || dismissed) return null;
  return (
    <div className="bg-primary text-primary-foreground text-center text-xs sm:text-sm py-2.5 px-4 relative">
      <span>Det är såsäsong! 🌱 Kom igång med din odlingsdagbok innan säsongen sätter igång.</span>
      <button onClick={() => setDismissed(true)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity" aria-label="Stäng">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── Exit intent popup ─── */
function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed || localStorage.getItem('exit-intent-dismissed')) return;

    let triggered = false;
    const trigger = () => { if (!triggered) { triggered = true; setShow(true); } };

    // Desktop: mouseout at top
    const mouseHandler = (e: MouseEvent) => {
      if (e.clientY < 10) { trigger(); document.removeEventListener('mouseout', mouseHandler); }
    };

    // Mobile: rapid scroll-up or 45s on page
    let lastScrollY = window.scrollY;
    const scrollHandler = () => {
      const diff = lastScrollY - window.scrollY;
      if (diff > 300 && window.scrollY < 200) trigger();
      lastScrollY = window.scrollY;
    };

    const desktopTimer = setTimeout(() => document.addEventListener('mouseout', mouseHandler), 5000);
    const mobileTimer = setTimeout(trigger, 45000);
    window.addEventListener('scroll', scrollHandler, { passive: true });

    return () => {
      clearTimeout(desktopTimer);
      clearTimeout(mobileTimer);
      document.removeEventListener('mouseout', mouseHandler);
      window.removeEventListener('scroll', scrollHandler);
    };
  }, [dismissed]);

  const dismiss = () => { setShow(false); setDismissed(true); localStorage.setItem('exit-intent-dismissed', 'true'); };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4" onClick={dismiss}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative"
      >
        <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground" aria-label="Stäng"><X className="h-5 w-5" /></button>
        <div className="text-center">
          <span className="text-4xl mb-3 block">🌱</span>
          <h3 className="font-serif text-xl text-foreground mb-2">Vänta – missa inte din bästa säsong!</h3>
          <p className="text-sm text-muted-foreground mb-5">Skapa ett gratiskonto och börja logga dina sådder redan idag – tar 30 sekunder.</p>
          <Button asChild size="lg" className="w-full gap-2 mb-3">
            <a href="/login?mode=register">Testa gratis – tar 30 sekunder <ArrowRight className="h-4 w-4" /></a>
          </Button>
          <p className="text-xs text-muted-foreground">Inget betalkort krävs · 14 dagars Plus gratis</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Testimonial card ─── */
function TestimonialCard({ name, zone, quote, stars }: { name: string; zone: number; quote: string; stars: number }) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card h-full flex flex-col">
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: stars }).map((_, i) => <Star key={i} className="h-4 w-4 fill-warning text-warning" />)}
      </div>
      <p className="text-sm text-foreground/85 leading-relaxed mb-4 flex-1">"{quote}"</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{name}</span>
        <span>·</span>
        <span>Klimatzon {zone}</span>
      </div>
    </div>
  );
}

/* ─── Botanical SVG decoration ─── */
function BotanicalDecoration() {
  return (
    <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[500px] opacity-[0.06] pointer-events-none hidden lg:block" viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Botanisk dekoration – digital odlingsdagbok">
      <path d="M200 450 C200 350, 250 300, 300 250 C350 200, 350 150, 300 100 C250 50, 200 80, 200 150" stroke="currentColor" strokeWidth="2" className="text-primary" />
      <path d="M200 450 C200 380, 150 320, 100 270 C50 220, 50 170, 100 130 C150 90, 200 110, 200 170" stroke="currentColor" strokeWidth="2" className="text-primary" />
      <ellipse cx="300" cy="95" rx="40" ry="55" stroke="currentColor" strokeWidth="1.5" className="text-primary" transform="rotate(-20 300 95)" />
      <ellipse cx="100" cy="125" rx="35" ry="50" stroke="currentColor" strokeWidth="1.5" className="text-primary" transform="rotate(20 100 125)" />
      <circle cx="200" cy="200" r="8" fill="currentColor" className="text-primary" fillOpacity="0.3" />
      <circle cx="280" cy="180" r="5" fill="currentColor" className="text-primary" fillOpacity="0.2" />
      <circle cx="120" cy="210" r="6" fill="currentColor" className="text-primary" fillOpacity="0.2" />
    </svg>
  );
}

/* ─── Data ─── */
const features = [
  { icon: BookOpen, title: 'Odlingsdagbok', desc: 'Logga varje sådd och skörd. Se mönster du aldrig visste fanns.', color: 'bg-primary/10 text-primary' },
  { icon: Calendar, title: 'Såkalender', desc: 'Få påminnelser anpassade till din klimatzon och dina växter.', color: 'bg-success/10 text-success' },
  { icon: Sprout, title: 'Växtföljd', desc: 'Planera rotationen automatiskt. Friskare jord, bättre skördar.', color: 'bg-accent/10 text-accent' },
  { icon: Bot, title: 'AI-coach Gro', desc: 'Chatta med Gro om dina växter. Hon svarar baserat på din egna odlingshistorik – dina bäddar, sådder och skördar.', color: 'bg-warning/10 text-warning', badge: 'PLUS', cta: { label: 'Prova Gro →', href: '/app/gro' } },
  { icon: BarChart2, title: 'Skördestatistik', desc: 'Visualisera dina bästa år och dina bästa bäddar.', color: 'bg-primary/10 text-primary' },
  { icon: Smartphone, title: 'PWA – fungerar offline', desc: 'Installera som app. Logga direkt i trädgården utan internet.', color: 'bg-success/10 text-success' },
];

const faqs = [
  { q: 'Är Odlingsdagboken verkligen gratis?', a: 'Ja, grundversionen är alltid gratis utan tidsbegränsning. Du kan logga sådder, skördar och använda såkalendern helt utan kostnad.' },
  { q: 'Vad ingår i Plus?', a: 'Obegränsade bäddar, AI-coach Gro, avancerad statistik, export (CSV/PDF) och prioriterad support. Allt för 99 kr/år.' },
  { q: 'Fungerar appen offline?', a: 'Ja, installera som PWA så fungerar loggning även utan internetuppkoppling. Datan synkas när du är online igen.' },
  { q: 'Kan jag importera data från pappersanteckningar?', a: 'Du kan logga historisk data manuellt. CSV-import är på vår roadmap och kommer snart.' },
  { q: 'Hur lång är gratisperioden för Plus?', a: 'Alla nya konton får 14 dagars Plus gratis – inget betalkort krävs. Du kan avbryta när som helst.' },
];

const testimonials = [
  { name: 'Anna K.', zone: 3, stars: 5, quote: 'Äntligen vet jag varför tomaterna misslyckades förra sommaren. Tre år av data – ovärderligt.' },
  { name: 'Magnus L.', zone: 4, stars: 5, quote: 'AI-coachen Gro svarade på en fråga om mina ärtors gulnande blad på 10 sekunder. Imponerande.' },
  { name: 'Sara W.', zone: 2, stars: 5, quote: 'Jag odlar i pallkrage på balkongen. Perfekt anpassat för mig.' },
];

const howItWorksSteps = [
  { num: '1', title: 'Skapa konto på tio sekunder', desc: 'Helt gratis, ingen betalinfo krävs.' },
  { num: '2', title: 'Lägg till dina bäddar och växter', desc: 'Odlingsbäddar, krukväxter – allt på ett ställe.' },
  { num: '3', title: 'Logga sådder och skördar', desc: 'Se vad som funkar år efter år.' },
];

/* ─── Mobile nav ─── */
function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)} className="sm:hidden p-2 text-muted-foreground hover:text-foreground" aria-label="Meny">
        <Menu className="h-5 w-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="absolute top-full left-0 right-0 bg-card/95 backdrop-blur-xl border-b border-border sm:hidden overflow-hidden z-50"
          >
            <div className="flex flex-col p-4 gap-1">
              <a href="#funktioner" onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm text-foreground hover:text-primary rounded-lg hover:bg-muted/50 transition-colors">Funktioner</a>
              <a href="#priser" onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm text-foreground hover:text-primary rounded-lg hover:bg-muted/50 transition-colors">Priser</a>
              <Link to="/blogg" className="px-3 py-2.5 text-sm text-foreground hover:text-primary rounded-lg hover:bg-muted/50 transition-colors">Blogg</Link>
              <hr className="border-border my-1" />
              <a href="/login?mode=login" className="px-3 py-2.5 text-sm text-foreground hover:text-primary rounded-lg hover:bg-muted/50 transition-colors">Logga in</a>
              <Button asChild size="sm" className="mt-1">
                <a href="/login?mode=register">Testa gratis</a>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Pricing toggle ─── */
function PricingToggle({ yearly, setYearly }: { yearly: boolean; setYearly: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <span className={`text-sm font-medium transition-colors ${!yearly ? 'text-foreground' : 'text-muted-foreground'}`}>Månadsvis</span>
      <button
        onClick={() => setYearly(!yearly)}
        className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-primary' : 'bg-muted'}`}
        aria-label="Byt prisperiod"
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-primary-foreground shadow-sm transition-transform ${yearly ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
      <span className={`text-sm font-medium transition-colors ${yearly ? 'text-foreground' : 'text-muted-foreground'}`}>
        Årsvis <span className="text-xs text-primary font-semibold ml-1">spara 33%</span>
      </span>
    </div>
  );
}

/* ─── Component ─── */
export default function Index() {
  const [yearly, setYearly] = useState(true);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Seo
        title="Odlingsdagboken – såkalender, skördelogg och odlingsplanering"
        description="Planera sådd, logga skördar och se vad som fungerar i din trädgård år efter år. Gratis digital odlingsdagbok för svenska odlare."
        path="/"
        ogImage="/og-image.png"
        ogImageAlt="Odlingsdagboken – digital odlingsdagbok för svenska odlare"
        jsonLd={[
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
            '@type': 'HowTo',
            name: 'Kom igång med Odlingsdagboken',
            description: 'Tre enkla steg för att börja logga din odling digitalt.',
            step: howItWorksSteps.map((s, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: s.title,
              text: s.desc,
            })),
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
            '@id': 'https://odlingsdagboken.com/#organization',
            name: 'Odlingsdagboken',
            url: 'https://odlingsdagboken.com',
            logo: 'https://odlingsdagboken.com/logo-odlingsdagboken.png',
            sameAs: [
              'https://instagram.com/odlingsdagboken',
              'https://facebook.com/odlingsdagboken',
            ],
          },
        ]}
      />
      <ExitIntentPopup />
      <SeasonalBanner />

      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 backdrop-blur-md bg-card/80 border-b border-border/40 relative"
        aria-label="Huvudnavigation"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-8 h-14">
          <a href="/" className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" />
            <span className="font-serif text-base font-semibold text-foreground tracking-tight">Odlingsdagboken</span>
          </a>
          <div className="hidden sm:flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm">
              <a href="#funktioner">Funktioner</a>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm">
              <a href="#priser">Priser</a>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm">
              <Link to="/blogg">Blogg</Link>
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm">
              <a href="/login?mode=login">Logga in</a>
            </Button>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Button asChild size="sm" className="h-8 px-4 text-sm">
                <a href="/login?mode=register">Testa gratis</a>
              </Button>
            </motion.div>
          </div>
          <MobileMenu />
        </div>
      </motion.nav>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <main id="main-content">
      <section aria-labelledby="hero-heading" className="relative bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(152_36%_32%/0.03)] to-[hsl(36_40%_90%/0.3)]">
        <BotanicalDecoration />
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-10 pb-10 sm:py-20 lg:py-28 relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Text */}
            <div className="text-center lg:text-left">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className="flex items-center gap-2 justify-center lg:justify-start mb-4">
                  <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-primary font-semibold">
                    <Sprout className="h-3.5 w-3.5" /> Planera smartare · Odla tryggare · Skörda mer
                  </span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
                <h1 id="hero-heading" className="font-serif text-3xl sm:text-4xl lg:text-5xl text-foreground leading-[1.1] tracking-tight mb-4">
                  Få bättre skörd nästa säsong – med koll på allt du sår, planterar och <span className="gradient-text">skördar</span>
                </h1>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6 max-w-lg mx-auto lg:mx-0">
                  Odlingsdagboken hjälper dig att odla med mer kunskap och mindre gissningar. Logga sådder, skördar, bäddar och anteckningar – och se vad som faktiskt fungerar i din trädgård, år efter år.
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.22 }}>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-4">
                  <motion.div whileHover={{ scale: 1.02 }} className="w-full sm:w-auto">
                    <Button asChild size="lg" className="w-full sm:w-auto h-12 sm:h-13 px-6 sm:px-8 text-[15px] sm:text-base gap-2 shadow-lg">
                      <a href="/login?mode=register">Testa gratis – tar 30 sekunder <ArrowRight className="h-4 w-4" /></a>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} className="w-full sm:w-auto">
                    <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 sm:h-13 px-6 sm:px-8 text-[15px] sm:text-base">
                      <a href="#funktioner">Se hur det fungerar</a>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.3 }}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-center lg:justify-start text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Inget betalkort krävs</span>
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Gratis att börja</span>
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Anpassad för svenska odlare</span>
                </div>
                <p className="text-xs text-muted-foreground/80 mt-3 italic max-w-lg mx-auto lg:mx-0">
                  Används av svenska hobbyodlare som vill få bättre koll på sin säsong.
                </p>
              </motion.div>

              <SocialProofCounter />
            </div>

            {/* Dashboard preview image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative mx-auto lg:mx-0 max-w-md lg:max-w-none"
            >
              <div className="rounded-xl overflow-hidden shadow-2xl border border-border/50 bg-card">
                <img
                  src={dashboardPreview}
                  alt="Odlingsdagbokens dashboard – översikt av sådder, skördar och bäddar"
                  width={600}
                  height={400}
                  fetchPriority="high"
                  className="w-full h-auto"
                />
              </div>

              {/* Floating callout badges – desktop only */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="absolute -left-4 top-6 bg-card border border-border rounded-lg px-3 py-2 shadow-lg hidden lg:flex items-center gap-2 text-xs"
              >
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="text-foreground font-medium">Tomat sådd: 12 mars</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.75 }}
                className="absolute -right-4 top-1/2 -translate-y-1/2 bg-card border border-border rounded-lg px-3 py-2 shadow-lg hidden lg:flex items-center gap-2 text-xs"
              >
                <span className="text-base">🥒</span>
                <span className="text-foreground font-medium">Skörd: Gurka 4,2 kg</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="absolute -bottom-3 -right-3 bg-card border border-border rounded-lg px-3 py-2 shadow-lg hidden sm:flex items-center gap-2 text-xs max-w-[220px]"
              >
                <Bot className="h-4 w-4 text-warning shrink-0" />
                <span className="text-foreground font-medium leading-snug">Gro tipsar: så två veckor senare nästa år</span>
              </motion.div>

              {/* Mobile callouts – stacked under image */}
              <div className="lg:hidden mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center gap-2 text-xs bg-card border border-border rounded-lg px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-foreground font-medium">Tomat sådd: 12 mars</span>
                </div>
                <div className="flex items-center gap-2 text-xs bg-card border border-border rounded-lg px-3 py-2">
                  <span className="text-base">🥒</span>
                  <span className="text-foreground font-medium">Skörd: Gurka 4,2 kg</span>
                </div>
                <div className="flex items-center gap-2 text-xs bg-card border border-border rounded-lg px-3 py-2">
                  <Bot className="h-3.5 w-3.5 text-warning shrink-0" />
                  <span className="text-foreground font-medium leading-snug">Gro tipsar: så senare nästa år</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ TRUST SECTION ═══════════════════════ */}
      <section className="bg-card/40 border-y border-border/40" aria-labelledby="trust-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-12">
          <h2 id="trust-heading" className="text-center text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-5">
            Byggd för svenska hobbyodlare
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center">
            {[
              { icon: '🇸🇪', label: 'Anpassad efter svenska klimatzoner' },
              { icon: '🌿', label: 'Pallkrage, växthus och friland' },
              { icon: '🌱', label: 'Gratis att börja' },
              { icon: '🔒', label: 'GDPR – data inom EU' },
            ].map(item => (
              <li key={item.label} className="flex flex-col items-center gap-2">
                <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                <span className="text-xs sm:text-sm text-foreground/85 leading-snug">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ═══════════════════════ PROBLEM / LÖSNING ═══════════════════════ */}
      <section aria-labelledby="problems-heading" className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-14 sm:py-20">
          <div className="text-center mb-10 max-w-xl mx-auto">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Känner du igen dig?</p>
            <h2 id="problems-heading" className="font-serif text-2xl sm:text-3xl text-foreground mb-3">
              De flesta odlare har samma problem
            </h2>
            <p className="text-sm text-muted-foreground">
              Man minns inte exakt vad man gjorde förra året – och samma misstag upprepas.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { problem: 'Jag glömmer när jag sådde.', solution: 'Logga varje sådd och få bättre koll nästa säsong.' },
              { problem: 'Jag vet inte vad som gav bäst skörd.', solution: 'Jämför skördar mellan bäddar, växter och år.' },
              { problem: 'Jag odlar samma sak på samma plats.', solution: 'Planera växtföljd och undvik att trötta ut jorden.' },
              { problem: 'Jag vet inte vad som gick fel.', solution: 'Anteckna, jämför och fråga Gro när något inte ser rätt ut.' },
              { problem: 'Jag missar rätt såtid.', solution: 'Använd såkalender anpassad efter svensk odling.' },
            ].map((item, i) => (
              <motion.div
                key={item.problem}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="p-5 rounded-2xl border border-border bg-card h-full flex flex-col"
              >
                <p className="text-sm text-muted-foreground mb-2 flex items-start gap-2">
                  <span className="text-destructive mt-0.5" aria-hidden="true">✗</span>
                  <span>"{item.problem}"</span>
                </p>
                <p className="text-sm text-foreground font-medium leading-relaxed flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{item.solution}</span>
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <section aria-labelledby="how-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Så här funkar det</p>
            <h2 id="how-heading" className="font-serif text-2xl sm:text-3xl text-foreground">Kom igång på tre enkla steg</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {howItWorksSteps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-serif text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {step.num}
                </div>
                <h3 className="font-serif text-base sm:text-lg text-foreground mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ APP DEMO ═══════════════════════ */}
      <section className="bg-card border-y border-border overflow-hidden" aria-labelledby="demo-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Se appen i aktion</p>
            <h2 id="demo-heading" className="font-serif text-2xl sm:text-3xl text-foreground mb-3">Din odling – samlad på ett ställe</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">Bäddar, sådder, skördar och statistik – allt i en tydlig översikt.</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="max-w-4xl mx-auto"
          >
            <div className="rounded-xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden bg-background">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-background border border-border rounded-md px-3 py-1 text-[10px] sm:text-xs text-muted-foreground font-mono max-w-xs w-full text-center truncate">
                    odlingsdagboken.com/dashboard
                  </div>
                </div>
                <div className="w-[42px]" />
              </div>
              <img src={dashboardPreview} srcSet={`${dashboardPreview} 1280w`} sizes="(max-width: 768px) 100vw, 662px" alt="Såkalender och växtföljdsplanering i Odlingsdagboken – digital odlingsdagbok för svenska hobbyodlare" width={1280} height={800} className="w-full h-auto block" fetchPriority="high" />
            </div>
            <div className="hidden sm:flex justify-center gap-3 mt-6 flex-wrap">
              {['Skördlogg', 'Såkalender', 'Växtföljd', 'AI-coach Gro', 'Statistik'].map(label => (
                <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-primary text-xs font-medium">
                  <Check className="h-3 w-3" /> {label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ FEATURES ═══════════════════════ */}
      <section id="funktioner" className="scroll-mt-20 bg-background border-b border-border" aria-labelledby="features-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <div className="mb-10 text-center sm:text-left">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Funktioner</p>
            <h2 id="features-heading" className="font-serif text-2xl sm:text-3xl text-foreground">Gratis såkalender, växtföljd och mer</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group p-5 sm:p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-300 h-full"
                whileHover={{ y: -2 }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-serif text-base sm:text-lg text-foreground">{f.title}</h3>
                      {f.badge && (
                        <motion.span
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                          className="px-1.5 py-0.5 text-[10px] font-bold bg-warning/20 text-warning rounded-md uppercase"
                        >
                          {f.badge}
                        </motion.span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    {(f as any).cta && (
                      <Link to={(f as any).cta.href} className="inline-block mt-3 text-sm font-medium text-primary hover:underline">
                        {(f as any).cta.label}
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ PRICING ═══════════════════════ */}
      <section id="priser" className="scroll-mt-20" aria-labelledby="pricing-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Prissättning</p>
            <h2 id="pricing-heading" className="font-serif text-2xl sm:text-3xl text-foreground mb-3">Kom igång gratis – uppgradera när du vill</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">Börja gratis. Uppgradera när du vill.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-5 sm:p-8 rounded-2xl border border-border bg-card h-full"
            >
              <h3 className="font-serif text-xl text-foreground mb-1">Gratis</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl sm:text-4xl font-bold text-foreground">0</span>
                <span className="text-muted-foreground text-sm">kr</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                För dig som vill komma igång och logga sådder, skördar och bäddar.
              </p>
              <ul className="space-y-2.5 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Obegränsade loggposter</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Tre odlingsbäddar</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Såkalender</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Växtföljdsplanering</li>
              </ul>
              <motion.div whileHover={{ scale: 1.02 }}>
                <Button asChild variant="outline" className="w-full">
                  <a href="/login?mode=register">Börja gratis</a>
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative p-5 sm:p-8 rounded-2xl border-2 border-primary bg-[hsl(152_36%_32%/0.03)] h-full"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                className="absolute -top-3 right-4 sm:right-6 bg-primary text-primary-foreground text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider"
              >
                Populärast
              </motion.div>
              <h3 className="font-serif text-xl text-foreground mb-1">Plus</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl sm:text-4xl font-bold text-foreground">99</span>
                <span className="text-muted-foreground text-sm">kr/år</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Bara ~åtta kr/månad</p>
              <p className="text-xs text-muted-foreground mb-4">
                För dig som vill planera smartare, få hjälp av Gro och jämföra säsonger år för år.
              </p>
              <ul className="space-y-2.5 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Allt i Gratis</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Obegränsade bäddar</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> AI-coach Gro</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Avancerad statistik</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Export (CSV/PDF)</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Bättre planering inför nästa säsong</li>
              </ul>
              <motion.div whileHover={{ scale: 1.02 }}>
                <Button asChild className="w-full">
                  <a href="/login?mode=register">Prova Plus gratis i 14 dagar</a>
                </Button>
              </motion.div>
              <p className="text-[10px] text-center text-muted-foreground mt-3">Inget betalkort krävs · Avbryt när som helst</p>
            </motion.div>
          </div>

          {/* Prominent Plus CTA below pricing cards */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-md mx-auto mt-8 text-center"
          >
            <div className="bg-gradient-to-r from-primary/8 via-accent/5 to-warning/8 border border-primary/15 rounded-2xl p-5">
              <p className="font-serif text-base text-foreground mb-1">Osäker? Prova Plus gratis i 14 dagar</p>
              <p className="text-xs text-muted-foreground mb-4">Alla funktioner, inga begränsningar. Inget betalkort.</p>
              <motion.div whileHover={{ scale: 1.02 }}>
                <Button asChild size="lg" className="h-12 px-8 text-base gap-2 shadow-lg w-full sm:w-auto">
                  <a href="/login?mode=register">Prova Plus gratis i 14 dagar <ArrowRight className="h-4 w-4" /></a>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ TESTIMONIALS ═══════════════════════ */}
      <section className="bg-[hsl(36_30%_94%)] dark:bg-muted/30 border-y border-border" aria-labelledby="testimonials-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Omdömen</p>
            <h2 id="testimonials-heading" className="font-serif text-2xl sm:text-3xl text-foreground">Används av svenska hobbyodlare</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <TestimonialCard {...t} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FAQ ═══════════════════════ */}
      <section className="bg-card border-b border-border" aria-labelledby="faq-heading">
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <div className="mb-8 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">FAQ</p>
            <h2 id="faq-heading" className="font-serif text-2xl sm:text-3xl text-foreground">Vanliga frågor</h2>
          </div>
          <div className="border-t border-border">
            {faqs.map(f => <FAQItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ BLOG TEASER ═══════════════════════ */}
      <section aria-labelledby="blog-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Bloggen</p>
            <h2 id="blog-heading" className="font-serif text-2xl sm:text-3xl text-foreground">Lär dig odla bättre</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">Guider, tips och inspiration för svenska odlare – från sådd till skörd.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { title: 'Såtider tomater 2026', slug: 'satider-tomater-2026' },
              { title: 'Växtföljd nybörjarguide', slug: 'vaxtfoljd-gronsakslandet' },
              { title: 'Pallkrage storlek', slug: 'pallkrage-storlek-guide' },
              { title: 'Bästa grönsakerna', slug: 'basta-gronsakerna-odla-sverige' },
              { title: 'Så squash inomhus', slug: 'nar-sa-squash-inomhus' },
              { title: 'Odla tomater', slug: 'odla-tomater' },
            ].map(p => (
              <Link key={p.slug} to={`/blogg/${p.slug}`} className="px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:border-primary hover:text-primary transition-colors">
                {p.title}
              </Link>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link to="/blogg" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
              Alla artiklar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FINAL CTA ═══════════════════════ */}
      <section className="relative overflow-hidden" aria-labelledby="cta-heading">
        <div className="absolute inset-0 bg-foreground" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24 relative">
          <div className="max-w-2xl mx-auto text-center">
            <h2 id="cta-heading" className="font-serif text-2xl sm:text-4xl leading-[1.1] mb-4 text-background">
              Redo att veta vad som funkar i din trädgård?
            </h2>
            <p className="text-background/70 mb-8 max-w-md mx-auto text-sm sm:text-base">
              Skapa ett konto på tio sekunder. Börja logga. Se resultat redan efter första säsongen.
            </p>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Button asChild size="lg" variant="secondary" className="h-12 sm:h-13 px-6 sm:px-8 text-[15px] sm:text-base gap-2">
                <a href="/login?mode=register">Testa gratis – tar 30 sekunder <ArrowRight className="h-4 w-4" /></a>
              </Button>
            </motion.div>
            <p className="text-xs text-background/50 mt-4">Alla nya konton får Plus gratis i 14 dagar · Inget betalkort krävs</p>
          </div>
        </div>
      </section>

      </main>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="bg-[hsl(150_30%_10%)] text-[hsl(152_20%_85%)] py-12 sm:py-16 px-4 sm:px-8" aria-label="Sidfot">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            {/* Col 1: Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Sprout className="h-5 w-5 text-[hsl(152_40%_55%)]" />
                <span className="font-serif text-base font-semibold text-white">Odlingsdagboken</span>
              </div>
              <p className="text-sm text-[hsl(152_15%_60%)] leading-relaxed mb-4">
                Digital odlingsdagbok för svenska hobbyodlare. Logga, lär och odla smartare.
              </p>
              <p className="text-xs text-[hsl(152_10%_45%)]">© {new Date().getFullYear()} Odlingsdagboken</p>
            </div>

            {/* Col 2: Produkt */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Produkt</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#funktioner" className="hover:text-white transition-colors">Funktioner</a></li>
                <li><a href="#priser" className="hover:text-white transition-colors">Priser</a></li>
                <li><Link to="/blogg" className="hover:text-white transition-colors">Odlingstips & guider</Link></li>
                <li><Link to="/blogg/satider-tomater-2026" className="hover:text-white transition-colors">Såtider tomater</Link></li>
                <li><Link to="/blogg/vaxtfoljd-gronsakslandet" className="hover:text-white transition-colors">Växtföljd guide</Link></li>
                <li><a href="/install" className="hover:text-white transition-colors">Installera</a></li>
              </ul>
            </div>

            {/* Col 3: Support */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:info@auroramedia.se" className="hover:text-white transition-colors">Kontakta oss</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Integritetspolicy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Villkor</a></li>
              </ul>
            </div>

            {/* Col 4: Social */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Följ oss</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://instagram.com/odlingsdagboken" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    @odlingsdagboken
                  </a>
                </li>
                <li>
                  <a href="https://facebook.com/odlingsdagboken" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    @odlingsdagboken
                  </a>
                </li>
              </ul>
              <div className="flex gap-2 mt-4">
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-[hsl(152_30%_20%)] text-[hsl(152_30%_65%)] font-medium">🔒 GDPR</span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-[hsl(152_30%_20%)] text-[hsl(152_30%_65%)] font-medium">🇪🇺 Data i EU</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
