import { Link } from 'react-router-dom';
import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, BarChart3, Bell, BookOpen, Bot, CalendarDays, Camera, Check, Leaf, Sparkles,
} from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Odlingsdagbok per bädd',
    text: 'Sådder, skördar och anteckningar ligger samlade på samma plats. När du undrar om gurkan trivdes i pallkragen förra året slipper du bläddra i lösa lappar.',
  },
  {
    icon: CalendarDays,
    title: 'Såkalender efter zon',
    text: 'Förodling, direktsådd och utplantering räknas mot klimatzon 1–8. Kalendern är en plan, inte ett löfte – våren kommer olika tidigt i Malmö och Kiruna.',
  },
  {
    icon: Bell,
    title: 'Påminnelser när det är dags',
    text: 'Diskreta påminnelser för sådd, utplantering och uppföljning. Du styr vad som ska pipa, så appen inte skriker när du bara vill vattna.',
  },
  {
    icon: Sparkles,
    title: 'Växtpuls',
    text: 'Vattning, gödsling och korta observationer bildar en känsla över tid. Det ersätter inte att titta på plantan, men det gör det lättare att se mönster.',
  },
  {
    icon: Bot,
    title: 'Gro, AI-coach i din historik',
    text: 'Gro svarar på såtider, gula blad och växtföljd med det du redan loggat som bakgrund. Ju mer du antecknar, desto mindre generella blir svaren.',
  },
  {
    icon: BarChart3,
    title: 'Skörd och säsongsjämförelse',
    text: 'Se vilka bäddar och grödor som faktiskt gav. Plus låser upp längre historik så nästa års plan bygger på din trädgård, inte på en generell tabell.',
  },
  {
    icon: Camera,
    title: 'Fotodagbok',
    text: 'Ett foto per vecka räcker långt. Du ser om tomatplantan faktiskt hämtade sig efter den kalla natten, och kan visa Gro samma bild senare.',
  },
  {
    icon: Leaf,
    title: 'Växtguider för Sverige',
    text: 'Publika guider för vanliga grödor, månader och zoner. Därifrån kan du lägga till en växt i din egen odling med sortnamnet redan ifyllt.',
  },
];

const faqs = [
  { q: 'Vad är gratis?', a: 'Du kan skapa konto, logga sådder och skördar, använda såkalender och spara anteckningar. Plus (99 kr/år) tar bort taket på bäddar och ger mer Gro och statistik.' },
  { q: 'Måste jag använda alla funktioner?', a: 'Nej. Många börjar med sålogg och en bädd. Resten finns när du behöver jämföra säsonger eller felsöka en planta.' },
  { q: 'Fungerar det utan växthus?', a: 'Ja. Du väljer pallkrage, friland, balkong, kruka eller växthus. Råd och kalender justeras efter det du angett, inte efter en tänkt kolonilott.' },
];

export default function Funktioner() {
  const track = (label: string) => {
    try { trackEvent('cta_click', { label, page: 'funktioner' }); } catch { /* noop */ }
  };

  return (
    <PublicLayout>
      <Seo
        title="Funktioner i Odlingsdagboken – dagbok, såkalender och skördelogg"
        description="Se hur odlingsdagbok, såkalender, skördelogg och Gro hänger ihop. Byggd för pallkrage, växthus, balkong och friland i Sverige."
        path="/funktioner"
        jsonLd={[
          {
            '@type': 'WebPage',
            name: 'Funktioner som gör odlingen lättare att minnas',
            url: 'https://odlingsdagboken.com/funktioner',
            description: 'Översikt av funktionerna i Odlingsdagboken för svenska hobbyodlare.',
            inLanguage: 'sv-SE',
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          },
        ]}
      />

      <article className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <header className="max-w-3xl mb-12">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-3">Funktioner</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-foreground leading-tight mb-4">
            Funktioner som gör odlingen lättare att minnas
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Startsida och funktionssida är inte samma sak. Här är vad appen faktiskt gör när säsongen är igång:
            du planerar, loggar och tittar tillbaka – utan att sprida anteckningarna i tre appar och en pärm.
          </p>
        </header>

        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <section key={feature.title} className="rounded-3xl border border-border bg-card p-6">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-serif text-xl text-foreground mb-2">{feature.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.text}</p>
              </section>
            );
          })}
        </div>

        <section className="rounded-3xl border border-border bg-card/60 p-6 sm:p-8 mb-12">
          <h2 className="font-serif text-2xl text-foreground mb-3">Gratis jämfört med Plus</h2>
          <ul className="space-y-2 text-sm text-muted-foreground mb-5">
            <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Gratis: bäddar, sålogg, skörd, grundkalender och foton.</li>
            <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Plus: obegränsade bäddar, mer Gro, statistik och export. 14 dagar utan betalkort.</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button asChild onClick={() => track('features_register')}>
              <Link to="/login?mode=register&source=funktioner">Testa gratis <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/priser">Se priser</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/hur-det-fungerar">Hur det fungerar</Link>
            </Button>
          </div>
        </section>

        <section className="max-w-2xl">
          <h2 className="font-serif text-2xl text-foreground mb-4">Vanliga frågor om funktionerna</h2>
          {faqs.map((item) => (
            <details key={item.q} className="group border border-border/50 rounded-xl p-4 mb-3 [&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer font-medium text-foreground">{item.q}</summary>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </section>
      </article>
    </PublicLayout>
  );
}
