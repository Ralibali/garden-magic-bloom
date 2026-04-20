import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Sprout, Crown, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const freeFeatures = [
  'Tre bäddar med säsongsanteckningar',
  'Sådder, skördar och tidslinje',
  'Personlig dashboard och påminnelser',
  'Väderdata för din klimatzon',
  'Växtbibliotek med över 150 sorter',
];

const plusFeatures = [
  'Obegränsade bäddar',
  'Avancerad statistik och trender',
  'Växtföljdshistorik utöver ett år',
  'AI-coachen Gro – obegränsade frågor',
  'Exportera data till CSV och PDF',
  'Säsongsanteckningar och planering',
  'Prioriterad support',
  'Alla framtida funktioner',
];

export default function Priser() {
  return (
    <PublicLayout>
      <Seo
        title="Priser – Odlingsdagboken Plus 99 kr/år | Freemium"
        description="Odlingsdagboken är gratis. Plus kostar bara nittionio kronor per år och låser upp obegränsade bäddar, AI-coachen Gro och avancerad statistik."
        path="/priser"
        jsonLd={[
          {
            '@type': 'Product',
            name: 'Odlingsdagboken Plus',
            description: 'Premium-version av Odlingsdagboken med obegränsade bäddar, AI-coach och avancerad statistik.',
            brand: { '@type': 'Brand', name: 'Odlingsdagboken' },
            offers: {
              '@type': 'Offer',
              price: '99',
              priceCurrency: 'SEK',
              availability: 'https://schema.org/InStock',
              url: 'https://odlingsdagboken.com/priser',
              priceValidUntil: '2027-12-31',
            },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://odlingsdagboken.com' },
              { '@type': 'ListItem', position: 2, name: 'Priser' },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'Är Odlingsdagboken verkligen gratis?',
                acceptedAnswer: { '@type': 'Answer', text: 'Ja. Du kan logga upp till tre bäddar, registrera obegränsat antal sådder och skördar, och använda dashboard, väder och påminnelser helt utan kostnad.' },
              },
              {
                '@type': 'Question',
                name: 'Vad kostar Plus?',
                acceptedAnswer: { '@type': 'Answer', text: 'Bara nittionio kronor per år. Det blir cirka åtta kronor per månad – mindre än en kopp kaffe.' },
              },
              {
                '@type': 'Question',
                name: 'Får jag prova Plus innan jag betalar?',
                acceptedAnswer: { '@type': 'Answer', text: 'Ja, alla nya konton får fjorton dagars fri tillgång till alla Plus-funktioner. Inget kort krävs vid registrering.' },
              },
              {
                '@type': 'Question',
                name: 'Kan jag avsluta när jag vill?',
                acceptedAnswer: { '@type': 'Answer', text: 'Ja. Avsluta direkt i appen via Stripe-kundportalen. Inga bindningstider.' },
              },
            ],
          },
        ]}
      />

      <section className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Enkel prissättning
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif text-foreground mb-4 leading-tight">
            Bara nittionio kronor per år
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Använd Odlingsdagboken gratis. Uppgradera till Plus när du vill ha obegränsade bäddar och AI-coachen Gro.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="border-border/50">
            <CardContent className="p-8 space-y-5">
              <div>
                <h2 className="font-serif text-2xl text-foreground">Gratis</h2>
                <p className="text-sm text-muted-foreground mt-1">För dig som odlar i mindre skala</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-serif text-foreground">0 kr</span>
                <span className="text-sm text-muted-foreground">/år</span>
              </div>
              <ul className="space-y-2.5 text-sm">
                {freeFeatures.map(f => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/login" className="block pt-2">
                <Button variant="outline" className="w-full rounded-xl">Skapa gratis konto</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-primary/40 shadow-md relative overflow-hidden">
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider">
              Mest populär
            </div>
            <CardContent className="p-8 space-y-5">
              <div>
                <h2 className="font-serif text-2xl text-foreground flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" /> Plus
                </h2>
                <p className="text-sm text-muted-foreground mt-1">För den ambitiösa odlaren</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-serif text-foreground">99 kr</span>
                <span className="text-sm text-muted-foreground">/år</span>
              </div>
              <p className="text-xs text-muted-foreground -mt-3">Cirka åtta kronor per månad · Fjorton dagars fri provperiod</p>
              <ul className="space-y-2.5 text-sm">
                {plusFeatures.map(f => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/login" className="block pt-2">
                <Button className="w-full rounded-xl gap-2">
                  <Sprout className="h-4 w-4" /> Starta provperiod
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <section className="max-w-2xl mx-auto space-y-6">
          <h2 className="font-serif text-2xl text-foreground text-center">Vanliga frågor om priser</h2>
          {[
            { q: 'Är Odlingsdagboken verkligen gratis?', a: 'Ja. Du kan logga upp till tre bäddar, registrera obegränsat antal sådder och skördar, och använda dashboard, väder och påminnelser helt utan kostnad.' },
            { q: 'Vad kostar Plus?', a: 'Bara nittionio kronor per år. Det blir cirka åtta kronor per månad – mindre än en kopp kaffe.' },
            { q: 'Får jag prova Plus innan jag betalar?', a: 'Ja, alla nya konton får fjorton dagars fri tillgång till alla Plus-funktioner. Inget kort krävs vid registrering.' },
            { q: 'Kan jag avsluta när jag vill?', a: 'Ja. Avsluta direkt i appen via Stripe-kundportalen. Inga bindningstider.' },
          ].map(({ q, a }) => (
            <details key={q} className="group border border-border/50 rounded-xl p-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer font-medium text-foreground flex items-center justify-between gap-2">
                {q}
                <span className="text-muted-foreground group-open:rotate-45 transition-transform text-lg leading-none">+</span>
              </summary>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{a}</p>
            </details>
          ))}
        </section>
      </section>
    </PublicLayout>
  );
}
