import { Link } from 'react-router-dom';
import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarDays, Check, MapPin, Sprout } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

const STEPS = [
  {
    icon: MapPin,
    title: 'Berätta var och hur du odlar',
    text: 'Klimatzon, odlingssätt och några grödor. Det tar under en minut. Zonen styr frostfönster och såveckor, inte en exakt adress på kartan.',
  },
  {
    icon: CalendarDays,
    title: 'Få en plan du kan ändra',
    text: 'Såkalender och odlingsplan är utgångspunkter. Flyttar du utplanteringen en vecka för att natten blev kall loggar du det – då finns beslutet kvar till nästa år.',
  },
  {
    icon: Sprout,
    title: 'Logga det som faktiskt hände',
    text: 'Sådd, skörd, foto eller ett problem i Odlingsakuten. Appen blir mer användbar ju mer den får se av just din jord, inte av en generell tabell.',
  },
];

const AFTER = [
  'Du äger datan och kan exportera eller radera kontot.',
  'Lagring sker inom EU.',
  'Inget betalkort krävs för att börja.',
  'Plus är valfritt när historiken börjar växa.',
];

export default function HurDetFungerar() {
  const track = (label: string) => {
    try { trackEvent('cta_click', { label, page: 'hur-det-fungerar' }); } catch { /* noop */ }
  };

  return (
    <PublicLayout>
      <Seo
        title="Hur Odlingsdagboken fungerar – från zon till säsongslärdom"
        description="Välj zon, få en plan för sådd och utplantering, logga vad som händer och lär av din egen trädgård till nästa år."
        path="/hur-det-fungerar"
        jsonLd={{
          '@type': 'HowTo',
          name: 'Så fungerar Odlingsdagboken i praktiken',
          description: 'Tre steg från zon och odlingssätt till en dagbok du kan lära av nästa säsong.',
          inLanguage: 'sv-SE',
          step: STEPS.map((step, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            name: step.title,
            text: step.text,
          })),
        }}
      />

      <article className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <header className="max-w-3xl mb-12">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-3">Hur det fungerar</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-foreground leading-tight mb-4">
            Så fungerar Odlingsdagboken i praktiken
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Det är inte en kurs och inte en nyhetsfeed. Du sätter en zon, får en rimlig tidsplan och antecknar
            det som händer i bädden. Nästa vår finns underlaget kvar – vad som grodde, vad som slokade och vad du flyttade.
          </p>
        </header>

        <ol className="grid md:grid-cols-3 gap-4 mb-12">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative rounded-3xl border border-border bg-card p-6">
                <span className="absolute top-6 right-6 font-serif text-4xl text-primary/15">0{index + 1}</span>
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-serif text-xl text-foreground mb-2">{step.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
              </li>
            );
          })}
        </ol>

        <section className="rounded-3xl border border-border bg-card/60 p-6 sm:p-8 mb-12">
          <h2 className="font-serif text-2xl text-foreground mb-3">Vad som händer efter att du skapat konto</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Om du kom från en växtguide, kalender eller Odlingsakuten följer valet med: gröda, zon eller det
            problem du just felsökte. Annars börjar du med en tom men anpassad dagbok.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground mb-6">
            {AFTER.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {item}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button asChild onClick={() => track('how_register')}>
              <Link to="/login?mode=register&source=hur-det-fungerar">Skapa gratis konto <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/odlingskalender">Öppna odlingskalendern</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/funktioner">Se funktionerna</Link>
            </Button>
          </div>
        </section>
      </article>
    </PublicLayout>
  );
}
