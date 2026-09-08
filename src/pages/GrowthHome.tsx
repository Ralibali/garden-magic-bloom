import { useAuth } from '@/hooks/useAuth';
import harvestImage from '@/assets/hero-harvest-hands.jpg';
import { Link } from 'react-router-dom';
import { Seo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import PublicLayout from '@/components/PublicLayout';
import {
  ArrowRight, Bot, CalendarDays, Check, ClipboardList, Leaf, Search, Sprout,
  BarChart3, Camera, Bell, BookOpen, Sparkles, Sun, Home, Building2, Trees
} from 'lucide-react';
import { CURRENT_YEAR } from '@/lib/currentYear';
import { trackEvent } from '@/lib/analytics';

const trackCta = (label: string) => {
  try { trackEvent('cta_click', { label, page: 'home' }); } catch { /* noop */ }
};

const steps = [
  { icon: Sprout, title: 'Berätta om din odling', text: 'Klimatzon, odlingssätt och det du odlar. Det tar under en minut.' },
  { icon: CalendarDays, title: 'Få din såkalender och plan', text: 'En tydlig plan för sådd, förodling, utplantering och skörd — anpassad för Sverige.' },
  { icon: BarChart3, title: 'Skriv din egen odlingshistoria', text: 'Anteckna, jämför och se vad som fungerar hos just dig — år efter år.' },
];

const segments = [
  { icon: Home, title: 'Pallkrage', text: 'Håll koll på växtföljd, jordkvalitet och vad varje pallkrage gav i skörd.' },
  { icon: Building2, title: 'Växthus', text: 'Planera säsongen, följ temperatur och lär av vad som trivs bäst under glas.' },
  { icon: Sun, title: 'Balkong', text: 'Anpassade råd för krukor, ljusförhållanden och kompakta grödor.' },
  { icon: Trees, title: 'Friland & kolonilott', text: 'Bäddar, växtföljd och rotationsvarningar för större odlingar.' },
];

const features = [
  { icon: BookOpen, title: 'Personlig odlingsdagbok', text: 'Sådd, foton, växtvård och egna anteckningar i en gemensam dagbok. Sök på växt, plats eller lärdom och återbesök tidigare år.' },
  { icon: CalendarDays, title: 'Såplanering & påminnelser', text: 'Såkalender, förodling och utplantering med diskreta påminnelser vid rätt tidpunkt.' },
  { icon: Sparkles, title: 'Växtpuls', text: 'Följ hur dina plantor mår över tid med vattning, gödsling och egna observationer.' },
  { icon: Bot, title: 'Gro — din AI-coach', text: 'Fråga om gula blad, växtföljd eller såtider. Gro svarar utifrån din odling och zon.' },
  { icon: BarChart3, title: 'Skörd & statistik', text: 'Se vilka bäddar och grödor som presterar bäst. Jämför säsonger utan att gissa.' },
  { icon: Camera, title: 'Fotodagbok & historik', text: 'Spara foton med rätt datum, koppla till en sådd eller krukväxt och se hur odlingen förändras.' },
];

const faqs = [
  { q: 'Är Odlingsdagboken gratis?', a: 'Ja. Du kan börja gratis utan betalkort och logga sådder, skördar och anteckningar. Plus (99 kr/år) ger obegränsade bäddar, AI-coachen Gro, avancerad statistik och export.' },
  { q: 'Passar det nybörjare?', a: 'Ja. Onboardingen är byggd för att du snabbt ska komma igång även om du aldrig odlat förr. Du får förslag anpassade efter din zon och ditt odlingssätt.' },
  { q: 'Fungerar det för pallkrage, växthus, balkong och kolonilott?', a: 'Ja. Du väljer själv odlingssätt när du kommer igång, och råden anpassas därefter — inklusive växtföljd, jordvolym och ljusförhållanden.' },
  { q: 'Vad är Gro?', a: 'Gro är vår AI-coach som hjälper dig med såtider, växtföljd, skadedjur och felsökning. Ju mer du loggar, desto mer personliga svar kan Gro ge.' },
  { q: 'Var lagras min data?', a: 'Din data lagras krypterat inom EU. Du äger den och kan när som helst exportera eller radera hela ditt konto.' },
  { q: 'Kan jag avbryta Plus?', a: 'Ja. Du kan avsluta när du vill från kontoinställningarna. Prenumerationen förnyas årligen tills du säger upp den.' },
];

export default function GrowthHome() {
  const { isAuthenticated } = useAuth();
  return (
    <PublicLayout>
      <Seo
        title={`Odlingsdagboken – digital odlingsdagbok, såkalender & skördelogg ${CURRENT_YEAR}`}
        description="Planera sådd, logga skördar och se vad som fungerar i din trädgård år efter år. Digital odlingsdagbok för pallkrage, växthus, balkong och friland. Byggd för Sverige."
        path="/"
        ogImage="https://odlingsdagboken.com/og-image.png"
        jsonLd={[
          {
            '@type': 'SoftwareApplication',
            name: 'Odlingsdagboken',
            applicationCategory: 'LifestyleApplication',
            operatingSystem: 'Web',
            description: 'Digital odlingsdagbok, såkalender och odlingsplanering för svenska hobbyodlare.',
            url: 'https://odlingsdagboken.com',
            inLanguage: 'sv',
            offers: [
              { '@type': 'Offer', price: '0', priceCurrency: 'SEK', description: 'Gratis grundversion' },
              { '@type': 'Offer', price: '99', priceCurrency: 'SEK', description: 'Plus – AI-coach, obegränsade bäddar och statistik' },
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
        ]}
      />

      <section className="bloom-hero relative overflow-hidden bg-[#173e2b] text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
          <div className="relative z-10">
            <p className="mb-6 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.16em] text-emerald-200"><Sprout className="h-4 w-4" /> För livet som växer</p>
            <h1 className="max-w-2xl font-serif text-5xl !text-white leading-[1.06] tracking-tight sm:text-6xl lg:text-[4.25rem]">Din odling.<br />Dina ögonblick.<br /><span className="text-[#e5cd83]">Din dagbok.</span></h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/80">Från det allra första fröet till den där skörden du aldrig glömmer. Samla bilder, följ det som växer och ta med dig lärdomarna till nästa säsong.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="min-h-12 bg-[#e5cd83] px-6 text-base text-[#173e2b] hover:bg-[#f2dfa7]" onClick={() => trackCta('hero_primary')}><Link to={isAuthenticated ? '/app/timeline' : '/login?mode=register'}>{isAuthenticated ? 'Öppna min dagbok' : 'Börja min odlingsdagbok'}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button asChild variant="outline" size="lg" className="min-h-12 border-white/30 bg-transparent text-base text-white hover:bg-white/10 hover:text-white" onClick={() => trackCta('hero_secondary')}><Link to="/sakalender">Utforska såkalendern</Link></Button>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70"><span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-200" />Gratis att börja</span><span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-200" />För svenska klimatzoner</span></div>
          </div>
          <div className="relative pb-8 sm:pb-12">
            <img src={harvestImage} alt="Händer fyllda med nyskördade tomater, zucchini och morötter vid en grönskande pallkrage" width="1024" height="1024" fetchPriority="high" className="aspect-[5/6] max-h-[590px] w-full rounded-t-[8rem] rounded-b-3xl object-cover sm:rounded-t-[10rem]" />
            <div className="absolute bottom-0 left-0 right-4 rounded-2xl border border-white/50 bg-[#fffdf5] p-5 text-[#24372b] shadow-xl sm:-left-5 sm:right-12 sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-medium"><BookOpen className="h-4 w-4 text-[#38664b]" />Ett exempel ur dagboken</span><span className="text-xs text-[#637266]">Augusti</span></div>
              <p className="font-serif text-2xl !text-[#24372b]">Den första tomaten smakar alltid bäst.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-[#e7eddd] px-3 py-1">Skörd · 1,2 kg</span><span className="rounded-full bg-[#eee8d8] px-3 py-1">Växthuset</span><span className="rounded-full bg-[#eee8d8] px-3 py-1">En lärdom till nästa år</span></div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/15"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-5 py-5 text-sm text-white/75 sm:px-8"><span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-emerald-200" />Din historia, år efter år</span><span className="inline-flex items-center gap-2"><Camera className="h-4 w-4 text-emerald-200" />Foton & små upptäckter</span><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-200" />Sådd till skörd</span><span className="inline-flex items-center gap-2"><Sprout className="h-4 w-4 text-emerald-200" />Balkong, trädgård & krukväxter</span></div></div>
      </section>

      {/* HOW IT WORKS */}
      <section id="hur-det-fungerar" className="border-y border-border bg-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-2xl mb-12">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-3">Så fungerar det</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-3">Från frö till erfarenhet — i tre lugna steg</h2>
            <p className="text-muted-foreground leading-relaxed">Du får värde direkt. Vi kräver inget konto för att pröva verktygen, och du behåller alltid kontrollen över din data.</p>
          </div>
          <ol className="grid md:grid-cols-3 gap-5">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.title} className="relative rounded-3xl border border-border bg-card p-6 sm:p-7">
                  <span className="absolute top-6 right-6 font-serif text-4xl text-primary/15">0{i + 1}</span>
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-xl text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* FOR WHO / SEGMENTS */}
      <section id="for-vem" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-2xl mb-12">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-3">För dig som odlar — hur du än odlar</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-3">Anpassad för ditt sätt att odla</h2>
          <p className="text-muted-foreground leading-relaxed">Odlingsdagboken justerar råd och kalender efter det du odlar och hur du odlar. Utan att bli komplicerad.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {segments.map(seg => {
            const Icon = seg.icon;
            return (
              <div key={seg.title} className="rounded-3xl border border-border bg-card p-6 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-5">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-xl text-foreground mb-2">{seg.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{seg.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* FEATURES */}
      <section id="funktioner" className="bg-card/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-2xl mb-12">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-3">Kärnfunktioner</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-3">Allt du behöver för en bättre säsong</h2>
            <p className="text-muted-foreground leading-relaxed">Sex delar som hänger ihop — inte sex olika appar. Bygg din personliga odlingskunskap medan du håller ordning.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-3xl border border-border bg-background p-6">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-lg text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* GRO PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-3">AI-coachen Gro</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-4">En erfaren odlare vid din sida — dygnet runt</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Fråga Gro om såtider, gula blad, växtföljd eller skadedjur. Ju mer du loggar i Odlingsdagboken, desto bättre kan Gro svara utifrån din trädgård, din zon och din historik.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground mb-6">
            {['När ska jag så tomat i zon 3?', 'Varför gulnar bladen på min gurka?', 'Vad kan jag odla efter potatis?', 'Hur förbättrar jag jorden i min pallkrage?'].map(q => (
              <div key={q} className="rounded-xl border border-border bg-card px-4 py-3">"{q}"</div>
            ))}
          </div>
          <Button asChild className="gap-2 min-h-[44px]" onClick={() => trackCta('gro_try')}>
            <Link to="/login?mode=register">Testa Gro gratis <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="rounded-3xl bg-card border border-border p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Bot className="h-5 w-5" /></div>
            <div>
              <p className="font-serif text-lg text-foreground leading-none">Gro</p>
              <p className="text-[11px] text-muted-foreground mt-1">Din AI-odlingscoach</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-2xl bg-muted/60 px-4 py-3 max-w-[85%]">Varför gulnar bladen längst ner på min tomat?</div>
            <div className="rounded-2xl bg-primary/8 border border-primary/15 px-4 py-3 leading-relaxed">
              Gulnande nedre blad beror oftast på tre saker: ojämn vattning, näringsbrist (särskilt kväve) eller naturlig avmognad. Kontrollera att jorden är jämnt fuktig och känn efter om bladen är sköra. Behöver du kan Gro föreslå gödselschema för resten av säsongen.
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pris" className="bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-3">Pris</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-3">Börja gratis. Uppgradera när du vill.</h2>
            <p className="text-muted-foreground leading-relaxed">Ingen prova-på-fälla. Gratis räcker långt — Plus är för dig som vill jämföra säsonger, få hjälp av Gro och odla mer genomtänkt.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-5 max-w-5xl mx-auto">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <h3 className="font-serif text-2xl text-foreground mb-2">Gratis</h3>
              <p className="text-muted-foreground text-sm mb-5">För dig som vill komma igång.</p>
              <div className="font-serif text-4xl text-foreground mb-6">0 kr</div>
              <ul className="space-y-2.5 text-sm mb-8">
                {['Logga sådder och skördar', 'Skapa dina första bäddar', 'Grundläggande såkalender', 'Anteckningar och fotodagbok'].map(item => (
                  <li key={item} className="flex gap-2.5"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> <span className="text-muted-foreground">{item}</span></li>
                ))}
              </ul>
              <Button asChild variant="outline" size="lg" className="w-full min-h-[44px]" onClick={() => trackCta('pricing_free')}>
                <Link to="/login?mode=register">Börja gratis</Link>
              </Button>
            </div>
            <div className="rounded-3xl border-2 border-primary bg-primary text-primary-foreground p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute right-6 top-6 rounded-full bg-primary-foreground/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">Mest värde</div>
              <h3 className="font-serif text-2xl mb-2">Plus</h3>
              <p className="text-primary-foreground/85 text-sm mb-5">För dig som vill odla mer genomtänkt.</p>
              <div className="font-serif text-4xl mb-1">99 kr<span className="text-base font-sans text-primary-foreground/75 ml-1">/år</span></div>
              <p className="text-xs text-primary-foreground/70 mb-6">Bara ~åtta kronor i månaden.</p>
              <ul className="space-y-2.5 text-sm mb-8">
                {['Allt i Gratis', 'Obegränsade bäddar och pallkrage', 'AI-coachen Gro', 'Avancerad skörd- och statistikvy', 'Export av din odlingsdata', '14 dagars Plus gratis'].map(item => (
                  <li key={item} className="flex gap-2.5"><Check className="h-4 w-4 shrink-0 mt-0.5" /> <span className="text-primary-foreground/95">{item}</span></li>
                ))}
              </ul>
              <Button asChild variant="secondary" size="lg" className="w-full min-h-[44px]" onClick={() => trackCta('pricing_plus')}>
                <Link to="/login?mode=register">Prova Plus gratis i 14 dagar</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-3">Vanliga frågor</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground">Frågor vi ofta får</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left font-serif text-lg text-foreground hover:no-underline py-5">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed text-[15px]">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/85" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center text-primary-foreground">
          <Sprout className="h-10 w-10 mx-auto mb-5 text-primary-foreground/80" />
          <h2 className="font-serif text-3xl sm:text-5xl leading-tight mb-4">Gör årets odling till kunskap för nästa år</h2>
          <p className="text-primary-foreground/85 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
            Börja gratis. Bygg din odlingsdagbok en logg i taget. Innan du vet ordet av har du din egen erfarenhetsbank.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" variant="secondary" className="gap-2 min-h-[44px]" onClick={() => trackCta('final_primary')}>
              <Link to="/login?mode=register">Testa gratis <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 min-h-[44px]">
              <Link to="/blogg">Läs bloggen</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
