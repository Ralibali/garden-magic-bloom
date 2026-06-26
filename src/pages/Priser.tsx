import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Sprout, Crown, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const freeFeatures = [
  'Upp till tre bäddar',
  'Upp till tio sådder och obegränsad skördelogg',
  'Personlig dashboard och egna påminnelser',
  'Väderdata och råd för din klimatzon',
  'Växtbibliotek och grundläggande planering',
];

const plusFeatures = [
  'Obegränsade bäddar och sådder',
  'Fler personliga frågor till AI-coachen Gro',
  'Statistik, trender och säsongsjämförelser',
  'Skördens uppskattade butiksvärde',
  'Växtföljd och historik mellan säsonger',
  'Alla Plus-funktioner under provperioden',
];

const faq = [
  { q: 'Är Odlingsdagboken gratis?', a: 'Ja. Gratisversionen innehåller upp till tre bäddar och tio sådder, obegränsad skördelogg, dashboard, påminnelser, väder och växtbibliotek.' },
  { q: 'Vad kostar Plus?', a: 'Plus kostar 99 kronor per år, vilket motsvarar ungefär åtta kronor per månad.' },
  { q: 'Vad får jag i Plus?', a: 'Plus låser upp obegränsade bäddar och sådder, fler frågor till Gro, statistik, säsongsjämförelser, växtföljd och skördens uppskattade värde.' },
  { q: 'Får jag prova innan jag betalar?', a: 'Ja. Nya konton får 14 dagars Plus utan att ange betalkort vid registreringen.' },
  { q: 'Kan jag avsluta?', a: 'Ja. Ett aktivt abonnemang kan hanteras via Stripe-kundportalen inne i appen.' },
];

export default function Priser() {
  return (
    <PublicLayout>
      <Seo
        title="Priser – Odlingsdagboken Plus 99 kr/år"
        description="Börja gratis med tre bäddar och tio sådder. Plus kostar 99 kronor per år och ger obegränsad odlingshistorik, mer Gro och full statistik."
        path="/priser"
        jsonLd={[
          {
            '@type': 'Product',
            name: 'Odlingsdagboken Plus',
            description: 'Plus-version med obegränsade bäddar och sådder, fler frågor till Gro och full statistik.',
            brand: { '@type': 'Brand', name: 'Odlingsdagboken' },
            offers: { '@type': 'Offer', price: '99', priceCurrency: 'SEK', availability: 'https://schema.org/InStock', url: 'https://odlingsdagboken.com/priser' },
          },
          {
            '@type': 'FAQPage',
            mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
          },
        ]}
      />

      <section className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium mb-4"><Sparkles className="h-3.5 w-3.5" /> Enkel och tydlig prissättning</div>
          <h1 className="text-4xl sm:text-5xl font-serif text-foreground mb-4 leading-tight">Börja gratis. Uppgradera när historiken börjar växa.</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Gratis räcker för att prova hela grundidén. Plus tar bort gränserna och hjälper dig jämföra säsonger på riktigt.</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="border-border/50"><CardContent className="p-8 space-y-5"><div><h2 className="font-serif text-2xl">Gratis</h2><p className="text-sm text-muted-foreground mt-1">För att komma igång och bygga din första historik</p></div><div className="flex items-baseline gap-1"><span className="text-4xl font-serif">0 kr</span><span className="text-sm text-muted-foreground">/år</span></div><ul className="space-y-2.5 text-sm">{freeFeatures.map((feature) => <li key={feature} className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>{feature}</span></li>)}</ul><Button asChild variant="outline" className="w-full rounded-xl"><Link to="/login?mode=register">Skapa gratis konto</Link></Button></CardContent></Card>

          <Card className="border-primary/40 shadow-md relative overflow-hidden"><div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider">14 dagar gratis</div><CardContent className="p-8 space-y-5"><div><h2 className="font-serif text-2xl flex items-center gap-2"><Crown className="h-5 w-5 text-primary" /> Plus</h2><p className="text-sm text-muted-foreground mt-1">För dig som vill följa hela odlingen över tid</p></div><div className="flex items-baseline gap-1"><span className="text-4xl font-serif">99 kr</span><span className="text-sm text-muted-foreground">/år</span></div><p className="text-xs text-muted-foreground -mt-3">Cirka åtta kronor per månad</p><ul className="space-y-2.5 text-sm">{plusFeatures.map((feature) => <li key={feature} className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>{feature}</span></li>)}</ul><Button asChild className="w-full rounded-xl gap-2"><Link to="/login?mode=register"><Sprout className="h-4 w-4" /> Starta provperiod</Link></Button></CardContent></Card>
        </div>

        <section className="max-w-2xl mx-auto space-y-6"><h2 className="font-serif text-2xl text-center">Vanliga frågor om priser</h2>{faq.map(({ q, a }) => <details key={q} className="group border border-border/50 rounded-xl p-4 [&_summary::-webkit-details-marker]:hidden"><summary className="cursor-pointer font-medium flex items-center justify-between gap-2">{q}<span className="text-muted-foreground group-open:rotate-45 transition-transform text-lg leading-none">+</span></summary><p className="text-sm text-muted-foreground mt-3 leading-relaxed">{a}</p></details>)}</section>
      </section>
    </PublicLayout>
  );
}
