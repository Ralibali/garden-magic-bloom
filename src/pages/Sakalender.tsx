import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import PublicEmailCapture from '@/components/PublicEmailCapture';
import { ArrowRight, CalendarDays, Check, Copy, Sprout } from 'lucide-react';

type Crop = { name: string; pre: string; plant: string; harvest: string; tip: string };

const crops: Crop[] = [
  { name: 'Tomat', pre: 'Mars–april', plant: 'Plantera ut efter sista frostrisken', harvest: 'Juli–september', tip: 'Tomater vill ha värme, ljus och jämn vattning. Plantera inte ut för tidigt – kalla nätter bromsar plantorna mer än många tror.' },
  { name: 'Chili', pre: 'Januari–mars', plant: 'Plantera ut varmt och skyddat', harvest: 'Juli–oktober', tip: 'Chili har lång utvecklingstid. En tidig, ljus och varm start ger friskare plantor och bättre skörd senare.' },
  { name: 'Gurka', pre: 'April–maj', plant: 'Plantera ut när nätterna är varma', harvest: 'Juli–september', tip: 'Gurka växer snabbt men är känslig för kyla. Förodla hellre lite senare än för tidigt.' },
  { name: 'Morot', pre: 'Rekommenderas inte', plant: 'Direktså april–juni', harvest: 'Juli–oktober', tip: 'Morot sås direkt på växtplatsen i lucker, stenfri jord. Håll jämn fukt under groningen.' },
  { name: 'Sallat', pre: 'Mars–augusti i omgångar', plant: 'Direktså eller plantera ut vår–sensommar', harvest: 'Maj–oktober', tip: 'Så lite men ofta. Sallat ger bäst utdelning när du sprider sådderna över säsongen.' },
  { name: 'Potatis', pre: 'Förgro mars–april', plant: 'Sätt när jorden reder sig', harvest: 'Juni–september', tip: 'Förgro potatis ljust och svalt. Täck blasten vid frostrisk om den kommit upp.' },
  { name: 'Lök', pre: 'Februari–mars från frö', plant: 'Sättlök april–maj', harvest: 'Juli–september', tip: 'Lök vill ha sol, jämn fukt och näringsrik jord. Håll ogräset borta i början.' },
  { name: 'Vitlök', pre: 'Sätts oftast på hösten', plant: 'September–november', harvest: 'Juli–augusti året efter', tip: 'Vitlök trivs soligt i väldränerad jord. Skörda när blasten börjar gulna.' },
  { name: 'Jordgubbar', pre: 'Plantor sätts vår eller sensommar', plant: 'April–maj eller augusti', harvest: 'Juni–juli', tip: 'Jordgubbar vill stå soligt och luftigt. Håll rent från ogräs och undvik för tät plantering.' },
  { name: 'Basilika', pre: 'Mars–maj', plant: 'Ut först när det är varmt', harvest: 'Juni–september', tip: 'Basilika älskar värme och ogillar kyla. Toppa plantan regelbundet för buskigare tillväxt.' },
  { name: 'Ärtor', pre: 'Kan förodlas, men direktsådd fungerar bra', plant: 'Direktså april–juni', harvest: 'Juni–augusti', tip: 'Ärtor kan sås relativt tidigt och vill ha stöd att klättra på.' },
  { name: 'Bönor', pre: 'Maj', plant: 'Så eller plantera ut när jorden är varm', harvest: 'Juli–september', tip: 'Bönor vill ha varm jord. Vänta hellre lite längre än att så i kall jord.' },
];

const methods = ['Pallkrage', 'Växthus', 'Friland', 'Balkong', 'Krukor'];

function zoneText(zone: string) {
  if (['1', '2'].includes(zone)) return 'Du har ofta en tidigare start på säsongen, men håll ändå koll på kalla nätter på våren.';
  if (['3', '4'].includes(zone)) return 'Du har en klassisk svensk odlingssäsong där tajming vid utplantering gör stor skillnad.';
  if (['5', '6'].includes(zone)) return 'Du tjänar mycket på förodling, skyddade lägen och att inte stressa ut värmekrävande plantor.';
  if (['7', '8'].includes(zone)) return 'Välj härdiga sorter, använd skyddade lägen och låt förodlingen ge plantorna ett starkt försprång.';
  return 'När du vet din klimatzon kan råden bli ännu mer träffsäkra. Börja försiktigt och justera efter frost och lokalt väder.';
}

export default function Sakalender() {
  const [zone, setZone] = useState('3');
  const [method, setMethod] = useState('Pallkrage');
  const [selected, setSelected] = useState(['Tomat', 'Gurka', 'Morot', 'Sallat']);
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);
  const selectedCrops = useMemo(() => crops.filter(crop => selected.includes(crop.name)), [selected]);
  const planPayload = { type: 'sakalender', zone, method, crops: selected, createdAt: new Date().toISOString() };
  const shareText = `Jag skapade min såkalender för 2026 med Odlingsdagboken 🌱 Klimatzon ${zone}, odling i ${method.toLowerCase()}.`;

  const createCalendar = () => {
    try {
      localStorage.setItem('odlingsdagboken_public_sakalender', JSON.stringify(planPayload));
      localStorage.setItem('odlingsdagboken_latest_public_plan', JSON.stringify(planPayload));
    } catch {}
    setCreated(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetCalendar = () => setCreated(false);

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Såkalender 2026 – skapa personlig såkalender för din klimatzon" description="Skapa en gratis såkalender för svenska odlare. Välj klimatzon, odlingssätt och växter och få rekommenderade tider för sådd, utplantering och skörd." path="/sakalender" ogImage="/og-image.png" />
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-serif font-semibold text-foreground"><Sprout className="h-5 w-5 text-primary" /> Odlingsdagboken</Link>
          <Button asChild size="sm"><Link to="/login?mode=register">Börja gratis</Link></Button>
        </div>
      </header>
      <main>
        {!created ? (
          <section className="bg-gradient-to-br from-background via-primary/5 to-accent/10">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-20 grid lg:grid-cols-[1fr_420px] gap-10 items-start">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4">Gratis odlingsverktyg</p>
                <h1 className="font-serif text-4xl sm:text-5xl text-foreground leading-tight mb-5">Skapa din personliga såkalender för 2026</h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-6">Välj klimatzon, odlingssätt och vad du vill odla. Odlingsdagboken hjälper dig få koll på när det är dags att så, förodla och plantera ut – anpassat för svenska förhållanden.</p>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Svensk klimatzon</span>
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Pallkrage, växthus och friland</span>
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Sparas när du skapar konto</span>
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl shadow-xl p-5 sm:p-6">
                <h2 className="font-serif text-2xl text-foreground mb-1">Vad vill du odla i år?</h2>
                <p className="text-sm text-muted-foreground mb-5">Gör tre enkla val och få en tydlig startplan.</p>
                <label className="text-sm font-medium text-foreground">Välj klimatzon</label>
                <select value={zone} onChange={event => setZone(event.target.value)} className="mt-2 mb-4 w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">{['1','2','3','4','5','6','7','8','Vet inte'].map(item => <option key={item} value={item}>{item === 'Vet inte' ? 'Jag vet inte' : `Zon ${item}`}</option>)}</select>
                <label className="text-sm font-medium text-foreground">Hur odlar du?</label>
                <div className="grid grid-cols-2 gap-2 mt-2 mb-4">{methods.map(item => <button key={item} type="button" onClick={() => setMethod(item)} className={`rounded-lg border px-3 py-2 text-sm transition-colors ${method === item ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>{item}</button>)}</div>
                <label className="text-sm font-medium text-foreground">Välj växter</label>
                <div className="grid grid-cols-2 gap-2 mt-2 mb-5 max-h-56 overflow-auto pr-1">{crops.map(crop => <button key={crop.name} type="button" onClick={() => setSelected(current => current.includes(crop.name) ? current.filter(item => item !== crop.name) : [...current, crop.name])} className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${selected.includes(crop.name) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>{crop.name}</button>)}</div>
                <Button onClick={createCalendar} disabled={selected.length === 0} className="w-full gap-2" size="lg">Skapa min såkalender <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-gradient-to-br from-background via-primary/5 to-accent/10">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
              <div className="grid lg:grid-cols-[1fr_420px] gap-6 items-start">
                <div className="rounded-3xl border border-primary/20 bg-card p-5 sm:p-7 shadow-xl">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Din såkalender är klar 🌱</p>
                  <h1 className="font-serif text-3xl sm:text-5xl text-foreground leading-tight mb-4">Spara kalendern och få påminnelser</h1>
                  <p className="text-muted-foreground leading-relaxed mb-5">Kalendern är skapad direkt. Spara den nu så kan du få påminnelser, logga sådder och följa upp vad som faktiskt fungerade. {zoneText(zone)}</p>
                  <div className="grid md:grid-cols-2 gap-3 mb-5">
                    {selectedCrops.slice(0, 4).map(crop => (
                      <article key={crop.name} className="rounded-2xl border border-border bg-background/70 p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <h2 className="font-serif text-xl text-foreground">{crop.name}</h2>
                          <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                        </div>
                        <p className="text-sm text-muted-foreground"><strong className="text-foreground">Förodling:</strong> {crop.pre}</p>
                        <p className="text-sm text-muted-foreground"><strong className="text-foreground">Utplantering/sådd:</strong> {crop.plant}</p>
                      </article>
                    ))}
                  </div>
                  {selectedCrops.length > 4 && <p className="text-sm text-muted-foreground mb-4">+ {selectedCrops.length - 4} fler grödor finns med i din plan.</p>}
                  <button type="button" onClick={resetCalendar} className="text-xs text-muted-foreground hover:text-foreground">Ändra mina val</button>
                </div>
                <div className="space-y-4">
                  <div className="bg-primary text-primary-foreground rounded-2xl p-5 sm:p-6">
                    <h2 className="font-serif text-2xl mb-2">Spara i gratis konto</h2>
                    <p className="text-primary-foreground/85 mb-5 text-sm leading-relaxed">Skapa ett konto på samma enhet så plockar Odlingsdagboken upp kalendern i appen.</p>
                    <Button asChild variant="secondary" size="lg" className="w-full gap-2"><Link to="/login?mode=register&source=sakalender">Spara planen och få påminnelser <ArrowRight className="h-4 w-4" /></Link></Button>
                  </div>
                  <PublicEmailCapture source="sakalender" plan={planPayload} title="Vill du få såkalendern skickad till dig?" description="Spara din e-post och fortsätt när det passar. När du skapar konto på samma enhet finns kalendern redo i appen." />
                </div>
              </div>
            </div>
          </section>
        )}

        {created && <section className="max-w-6xl mx-auto px-4 sm:px-8 py-10"><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">{selectedCrops.map(crop => <article key={crop.name} className="bg-card border border-border rounded-2xl p-5 shadow-sm"><div className="flex items-center justify-between mb-4"><h3 className="font-serif text-xl text-foreground">{crop.name}</h3><CalendarDays className="h-5 w-5 text-primary" /></div><dl className="space-y-3 text-sm"><div><dt className="font-medium text-foreground">Förodling</dt><dd className="text-muted-foreground">{crop.pre}</dd></div><div><dt className="font-medium text-foreground">Direktsådd/utplantering</dt><dd className="text-muted-foreground">{crop.plant}</dd></div><div><dt className="font-medium text-foreground">Skörd</dt><dd className="text-muted-foreground">{crop.harvest}</dd></div></dl><p className="mt-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">{crop.tip}</p></article>)}</div><div className="bg-card border border-border rounded-2xl p-6"><h3 className="font-serif text-xl text-foreground mb-2">Dela din såkalender</h3><p className="text-sm text-muted-foreground mb-4">Inspirera fler att komma igång med sin odling.</p><div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground mb-4">{shareText}</div><Button variant="outline" className="gap-2" onClick={async () => { await navigator.clipboard?.writeText(shareText); setCopied(true); }}><Copy className="h-4 w-4" /> {copied ? 'Kopierat!' : 'Kopiera text'}</Button></div></section>}
      </main>
    </div>
  );
}
