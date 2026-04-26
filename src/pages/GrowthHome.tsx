import { Link } from 'react-router-dom';
import { Seo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, CalendarDays, Check, ClipboardList, Leaf, Search, Sprout, Star, TrendingUp } from 'lucide-react';

const tools = [
  {
    icon: CalendarDays,
    title: 'Personlig såkalender',
    text: 'Välj klimatzon, odlingssätt och växter. Få en tydlig plan för sådd, förodling och utplantering.',
    href: '/sakalender',
    cta: 'Skapa såkalender',
  },
  {
    icon: ClipboardList,
    title: 'Odlingsplan 2026',
    text: 'Bygg en komplett odlingsplan för pallkrage, växthus, friland, balkong eller kolonilott.',
    href: '/odlingsplan',
    cta: 'Gör min plan',
  },
  {
    icon: Search,
    title: 'Odlingsakuten',
    text: 'Felsök gula blad, slokande plantor och svag tillväxt med praktiska råd för svenska förhållanden.',
    href: '/odlingsakuten',
    cta: 'Felsök planta',
  },
];

const problems = [
  ['Jag minns inte när jag sådde', 'Logga sådder, utplantering och skörd så du slipper börja om från minnet varje vår.'],
  ['Jag vet inte vad som gav bäst skörd', 'Jämför bäddar, grödor och säsonger och se vad som faktiskt fungerar hos dig.'],
  ['Jag missar rätt tid att så', 'Använd såkalender och påminnelser som stöd genom hela säsongen.'],
  ['Jag vet inte vad som gick fel', 'Anteckna problem, väder, vattning och åtgärder så du kan lära av varje säsong.'],
];

const features = [
  'Logga sådder, skördar och anteckningar',
  'Planera växtföljd mellan säsonger',
  'Få bättre koll på klimatzon och såtider',
  'Fråga AI-coachen Gro när något ser fel ut',
  'Se vilka bäddar och grödor som presterar bäst',
  'Spara erfarenheter från varje odlingsår',
];

export default function GrowthHome() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Odlingsdagboken – såkalender, odlingsplan och skördelogg"
        description="Planera sådd, logga skördar och se vad som fungerar i din trädgård år efter år. Gratis digital odlingsdagbok för svenska odlare."
        path="/"
        ogImage="/og-image.png"
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
            mainEntity: [
              { '@type': 'Question', name: 'Är Odlingsdagboken gratis?', acceptedAnswer: { '@type': 'Answer', text: 'Ja, du kan börja gratis utan betalkort och logga sådder, skördar och anteckningar.' } },
              { '@type': 'Question', name: 'Passar Odlingsdagboken nybörjare?', acceptedAnswer: { '@type': 'Answer', text: 'Ja, Odlingsdagboken är byggd för att vara enkel även om du precis börjat odla.' } },
              { '@type': 'Question', name: 'Vad är Gro?', acceptedAnswer: { '@type': 'Answer', text: 'Gro är Odlingsdagbokens AI-coach som hjälper dig med såtider, växtföljd och odlingsproblem.' } },
            ],
          },
        ]}
      />

      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto h-14 px-4 sm:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-serif font-semibold">
            <Sprout className="h-5 w-5 text-primary" /> Odlingsdagboken
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link className="px-3 py-2 text-muted-foreground hover:text-foreground" to="/sakalender">Såkalender</Link>
            <Link className="px-3 py-2 text-muted-foreground hover:text-foreground" to="/odlingsplan">Odlingsplan</Link>
            <Link className="px-3 py-2 text-muted-foreground hover:text-foreground" to="/odlingsakuten">Odlingsakuten</Link>
            <Link className="px-3 py-2 text-muted-foreground hover:text-foreground" to="/blogg">Blogg</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/login?mode=login">Logga in</Link></Button>
            <Button asChild size="sm"><Link to="/login?mode=register">Testa gratis</Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-5">
                <Leaf className="h-3.5 w-3.5" /> Planera smartare · Odla tryggare · Skörda mer
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight mb-5">
                Sluta gissa i trädgården – se vad som faktiskt fungerar hos dig
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-7">
                Odlingsdagboken hjälper dig planera sådd, logga skörd och lära av varje säsong. Bygg din egen kunskapsbank för pallkrage, växthus, friland, balkong och svenska klimatzoner.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Button asChild size="lg" className="h-12 px-7 gap-2 text-base"><Link to="/sakalender">Skapa min såkalender <ArrowRight className="h-4 w-4" /></Link></Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-7 text-base"><Link to="/login?mode=register">Testa gratis – tar 30 sekunder</Link></Button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Inget betalkort krävs</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> 14 dagars Plus gratis</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Byggd för Sverige</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl shadow-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Din säsong</p>
                  <h2 className="font-serif text-2xl">Exempel på odlingsplan</h2>
                </div>
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-3">
                {[['Tomat', 'Förodla i mars · plantera ut efter frost'], ['Gurka', 'Förodla i april · vänta på varma nätter'], ['Morot', 'Direktså april–juni · håll jämn fukt'], ['Sallat', 'Så i omgångar · skörda länge']].map(([crop, text]) => (
                  <div key={crop} className="rounded-2xl border border-border bg-background/70 p-4 flex items-start justify-between gap-4">
                    <div><h3 className="font-medium">{crop}</h3><p className="text-sm text-muted-foreground">{text}</p></div>
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-primary/10 border border-primary/20 p-4 flex gap-3">
                <Bot className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">Gro tipsar:</strong> Om du odlar i zon 3, vänta hellre lite med gurkan än att få rangliga plantor inomhus.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 grid sm:grid-cols-4 gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Svenska klimatzoner</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Pallkrage & växthus</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Skörd & statistik</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> GDPR · data inom EU</span>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Gratis verktyg först</p>
            <h2 className="font-serif text-3xl sm:text-4xl mb-3">Få värde direkt – spara när du vill fortsätta</h2>
            <p className="text-muted-foreground leading-relaxed">Vi kräver inte konto innan du fått nytta. Börja med ett verktyg, få en konkret plan och spara sedan i Odlingsdagboken.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {tools.map(tool => {
              const Icon = tool.icon;
              return (
                <Link key={tool.title} to={tool.href} className="group rounded-3xl border border-border bg-card p-6 shadow-sm hover:shadow-lg transition-all">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5"><Icon className="h-5 w-5" /></div>
                  <h3 className="font-serif text-2xl mb-2 group-hover:text-primary transition-colors">{tool.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{tool.text}</p>
                  <span className="text-sm font-medium text-primary inline-flex items-center gap-1">{tool.cta} <ArrowRight className="h-4 w-4" /></span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="bg-muted/30 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Känner du igen dig?</p>
              <h2 className="font-serif text-3xl sm:text-4xl mb-4">De flesta odlare gör mer rätt än de tror – men minnet räcker inte</h2>
              <p className="text-muted-foreground leading-relaxed">När sådde du tomaterna? Vilken bädd gav bäst skörd? Vad växte där förra året? Odlingsdagboken gör det enkelt att se mönstren och fatta bättre beslut nästa säsong.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {problems.map(([title, text]) => <div key={title} className="rounded-2xl bg-card border border-border p-5"><h3 className="font-medium mb-2">{title}</h3><p className="text-sm text-muted-foreground leading-relaxed">{text}</p></div>)}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">AI-coachen Gro</p>
            <h2 className="font-serif text-3xl sm:text-4xl mb-4">Möt Gro – din personliga odlingsrådgivare</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">Fråga Gro om såtider, gula blad, växtföljd, skadedjur eller varför en planta inte trivs. Ju mer du loggar i Odlingsdagboken, desto bättre kan Gro hjälpa dig utifrån just din trädgård.</p>
            <div className="space-y-2 text-sm text-muted-foreground mb-6">
              {['När ska jag så tomat i zon 3?', 'Varför gulnar bladen på min gurka?', 'Vad kan jag odla efter potatis?', 'Hur förbättrar jag jorden i min pallkrage?'].map(q => <div key={q} className="rounded-xl border border-border bg-card px-4 py-3">“{q}”</div>)}
            </div>
            <Button asChild className="gap-2"><Link to="/login?mode=register">Testa Gro gratis <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
          <div className="rounded-3xl bg-card border border-border p-6 shadow-xl">
            <div className="flex gap-1 mb-4">{[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-warning text-warning" />)}</div>
            <blockquote className="text-lg font-serif leading-relaxed mb-4">“Det bästa är att jag kan jämföra år för år. Jag såg direkt att gurkan trivdes bättre i den andra bädden, något jag aldrig hade kommit ihåg annars.”</blockquote>
            <p className="text-sm text-muted-foreground">Sara, pallkrageodlare</p>
          </div>
        </section>

        <section className="bg-card/50 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Därför fungerar det</p>
              <h2 className="font-serif text-3xl sm:text-4xl mb-3">Din odling blir bättre när du börjar se mönstren</h2>
              <p className="text-muted-foreground leading-relaxed">Erfarna odlare gissar inte – de observerar, antecknar och justerar. Det du antecknar i år blir kunskap nästa år.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {features.map(feature => <div key={feature} className="rounded-2xl border border-border bg-background p-4 text-sm flex gap-3"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> <span>{feature}</span></div>)}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-6 items-stretch">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <h2 className="font-serif text-3xl mb-3">Gratis</h2>
              <p className="text-muted-foreground mb-6">För dig som vill komma igång och få bättre koll på sådder, skördar och bäddar.</p>
              <ul className="space-y-3 text-sm mb-8">
                {['Logga sådder och skördar', 'Skapa dina första bäddar', 'Använd grundläggande såkalender', 'Spara anteckningar från säsongen'].map(item => <li key={item} className="flex gap-2"><Check className="h-4 w-4 text-primary" /> {item}</li>)}
              </ul>
              <Button asChild variant="outline" size="lg" className="w-full"><Link to="/login?mode=register">Börja gratis</Link></Button>
            </div>
            <div className="rounded-3xl border-2 border-primary bg-primary text-primary-foreground p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute right-6 top-6 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">Mest värde</div>
              <h2 className="font-serif text-3xl mb-3">Plus</h2>
              <p className="text-primary-foreground/85 mb-4">För dig som vill odla mer genomtänkt, få hjälp av Gro och jämföra säsonger år för år.</p>
              <div className="text-4xl font-serif mb-6">99 kr<span className="text-base font-sans text-primary-foreground/75">/år</span></div>
              <ul className="space-y-3 text-sm mb-8">
                {['Obegränsade bäddar', 'AI-coach Gro', 'Avancerad skördestatistik', 'Export av din odlingsdata', '14 dagars Plus gratis'].map(item => <li key={item} className="flex gap-2"><Check className="h-4 w-4" /> {item}</li>)}
              </ul>
              <Button asChild variant="secondary" size="lg" className="w-full"><Link to="/login?mode=register">Prova Plus gratis i 14 dagar</Link></Button>
              <p className="text-xs text-primary-foreground/75 mt-3 text-center">Mindre än priset av en fröpåse i månaden.</p>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-16 sm:py-20 text-center">
            <h2 className="font-serif text-3xl sm:text-5xl mb-4">Gör årets odling till kunskap för nästa år</h2>
            <p className="text-primary-foreground/85 text-lg leading-relaxed mb-7">Börja med en såkalender, skapa din odlingsplan eller felsök en planta. När du vill spara allt finns Odlingsdagboken redo.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="secondary" size="lg" className="gap-2"><Link to="/sakalender">Skapa såkalender <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild variant="outline" size="lg" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"><Link to="/login?mode=register">Skapa gratis konto</Link></Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
