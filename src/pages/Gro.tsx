import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Sprout, MessageCircle, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const examples = [
  { q: 'Mina tomater får gula blad – vad kan det bero på?', a: 'Gro analyserar dina bäddar, jordsort och senaste väder, och ger en personlig rekommendation utifrån din historik.' },
  { q: 'Vad ska jag så i maj i zon tre?', a: 'Gro tittar på din klimatzon och föreslår exakt vilka sorter som passar din trädgård just nu.' },
  { q: 'Hur ofta ska jag vattna mina chiliplanta?', a: 'Gro kombinerar väderdata med dina odlingsloggar och ger skräddarsydda tips.' },
  { q: 'Jag ser små vita flugor på mina kålplantor', a: 'Gro identifierar skadedjuret och föreslår ekologiska åtgärder anpassade efter dina grödor.' },
];

export default function Gro() {
  return (
    <PublicLayout>
      <Seo
        title="Gro – AI-odlingscoach för svenska trädgårdar | Odlingsdagboken"
        description="Gro är Odlingsdagbokens AI-coach. Ställ frågor om sådd, skadedjur och skötsel – och få personliga svar baserat på din klimatzon och odlingshistorik."
        path="/gro"
        jsonLd={[
          {
            '@type': 'SoftwareApplication',
            name: 'Gro – AI-odlingscoach',
            applicationCategory: 'LifestyleApplication',
            operatingSystem: 'Web',
            description: 'AI-driven trädgårdscoach baserad på Gemini 2.5 Pro. Anpassar svar efter användarens klimatzon, bäddar och odlingsdata.',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'SEK' },
            aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '127' },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://odlingsdagboken.com' },
              { '@type': 'ListItem', position: 2, name: 'Gro AI' },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: examples.map(e => ({
              '@type': 'Question',
              name: e.q,
              acceptedAnswer: { '@type': 'Answer', text: e.a },
            })),
          },
        ]}
      />

      <section className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium mb-4">
            <Bot className="h-3.5 w-3.5" /> Personlig AI-coach
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif text-foreground mb-4 leading-tight">
            Gro – AI-odlingscoach
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ställ frågor om din trädgård och få personliga svar – byggd på din klimatzon, dina bäddar och din odlingshistorik.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <Link to="/login">
              <Button size="lg" className="rounded-xl gap-2">
                <Sprout className="h-4 w-4" /> Prova Gro gratis
              </Button>
            </Link>
            <Link to="/priser">
              <Button size="lg" variant="outline" className="rounded-xl">
                Se priser
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Tre frågor gratis · Obegränsat med Plus
          </p>
        </header>

        <section className="grid sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Sparkles, title: 'Personligt anpassad', desc: 'Svar baserade på din zon och dina sådder.' },
            { icon: Zap, title: 'Snabba svar', desc: 'Svar på några sekunder, dygnet runt.' },
            { icon: MessageCircle, title: 'Som en kunnig vän', desc: 'Praktiska råd, inga generiska svar.' },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-border/50">
              <CardContent className="p-5 space-y-2">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="font-serif text-base text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-3 mb-12">
          <h2 className="font-serif text-2xl text-foreground mb-5 text-center">Exempel på frågor du kan ställa</h2>
          {examples.map(({ q, a }, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs shrink-0">🧑‍🌾</span>
                  <p className="text-sm font-medium text-foreground pt-1">{q}</p>
                </div>
                <div className="flex items-start gap-3 pl-2">
                  <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed pt-1">{a}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="text-center bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-2xl p-8 border border-border/30">
          <span className="text-3xl mb-3 block">🤖</span>
          <h2 className="font-serif text-xl text-foreground mb-2">Redo att prova Gro?</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            Skapa ett gratis konto, fyll i din klimatzon och börja chatta direkt.
          </p>
          <Link to="/login">
            <Button size="lg" className="rounded-xl gap-2">
              <Sprout className="h-4 w-4" /> Kom igång
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
