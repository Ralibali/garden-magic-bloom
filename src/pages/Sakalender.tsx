import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import PublicEmailCapture from '@/components/PublicEmailCapture';
import { ArrowRight, CalendarDays, Check, Copy, Sprout } from 'lucide-react';
import { sowingMatrix, formatRange, getCropTiming, type CropTiming } from '@/data/sowingMatrix';

const methods = ['Pallkrage', 'Växthus', 'Friland', 'Balkong', 'Krukor'];

function zoneText(zone: string) {
  if (['1', '2'].includes(zone)) return 'Du har ofta en tidigare start på säsongen, men håll ändå koll på kalla nätter på våren.';
  if (['3', '4'].includes(zone)) return 'Du har en klassisk svensk odlingssäsong där tajming vid utplantering gör stor skillnad.';
  if (['5', '6'].includes(zone)) return 'Du tjänar mycket på förodling, skyddade lägen och att inte stressa ut värmekrävande plantor.';
  if (['7', '8'].includes(zone)) return 'Välj härdiga sorter, använd skyddade lägen och låt förodlingen ge plantorna ett starkt försprång.';
  return 'När du vet din klimatzon kan råden bli ännu mer träffsäkra. Börja försiktigt och justera efter frost och lokalt väder.';
}

function CropRow({ name, timing }: { name: string; timing: CropTiming }) {
  const hasPre = timing.preStart !== null;
  const hasPlant = timing.plantOutStart !== null;
  const hasDirect = timing.directSowStart !== null;
  const hasHarvest = timing.harvestStart !== null;
  return (
    <article className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-xl text-foreground">{name}</h3>
        <CalendarDays className="h-5 w-5 text-primary" />
      </div>
      <dl className="space-y-3 text-sm">
        {hasPre && (
          <div><dt className="font-medium text-foreground">Förodla inomhus</dt>
            <dd className="text-muted-foreground">{formatRange(timing.preStart, timing.preEnd)}</dd></div>
        )}
        {hasPlant && (
          <div><dt className="font-medium text-foreground">Plantera ut</dt>
            <dd className="text-muted-foreground">{formatRange(timing.plantOutStart, timing.plantOutEnd)}</dd></div>
        )}
        {hasDirect && (
          <div><dt className="font-medium text-foreground">Direktsådd</dt>
            <dd className="text-muted-foreground">{formatRange(timing.directSowStart, timing.directSowEnd)}</dd></div>
        )}
        {hasHarvest ? (
          <div><dt className="font-medium text-foreground">Skörd</dt>
            <dd className="text-muted-foreground">{formatRange(timing.harvestStart, timing.harvestEnd)}</dd></div>
        ) : (
          <div><dt className="font-medium text-foreground">Skörd</dt>
            <dd className="text-amber-700 dark:text-amber-400">Rekommenderas i växthus i denna zon.</dd></div>
        )}
      </dl>
      {timing.note && (
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">{timing.note}</p>
      )}
    </article>
  );
}

export default function Sakalender() {
  const [zone, setZone] = useState('3');
  const [method, setMethod] = useState('Pallkrage');
  const [selected, setSelected] = useState(['Tomat', 'Gurka', 'Morot', 'Sallat']);
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  const numericZone = useMemo(() => {
    const n = parseInt(zone, 10);
    return Number.isFinite(n) && n >= 1 && n <= 8 ? n : 3;
  }, [zone]);

  const selectedCrops = useMemo(
    () => sowingMatrix.filter(c => selected.includes(c.name)),
    [selected],
  );

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
      <Seo title="Såkalender 2026 – personlig såkalender för din zon" description="Skapa en gratis såkalender för svenska odlare. Välj klimatzon och få förodlings-, utplanterings- och skördetider beräknade för just din zon (1–8)." path="/sakalender" ogImage="https://odlingsdagboken.com/og-image.png" />
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
                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-6">Välj klimatzon, odlingssätt och vad du vill odla. Odlingsdagboken räknar fram exakta veckor för förodling, utplantering, direktsådd och skörd – baserat på sista frost i just din zon.</p>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Veckor anpassade efter zon 1–8</span>
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Pallkrage, växthus och friland</span>
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Sparas när du skapar konto</span>
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl shadow-xl p-5 sm:p-6">
                <h2 className="font-serif text-2xl text-foreground mb-1">Vad vill du odla i år?</h2>
                <p className="text-sm text-muted-foreground mb-5">Gör tre enkla val och få en tydlig startplan.</p>
                <label htmlFor="sak-zone" className="text-sm font-medium text-foreground">Välj klimatzon</label>
                <select id="sak-zone" value={zone} onChange={event => setZone(event.target.value)} className="mt-2 mb-4 w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">{['1','2','3','4','5','6','7','8','Vet inte'].map(item => <option key={item} value={item}>{item === 'Vet inte' ? 'Jag vet inte' : `Zon ${item}`}</option>)}</select>
                <div id="sak-method-label" className="text-sm font-medium text-foreground">Hur odlar du?</div>
                <div role="group" aria-labelledby="sak-method-label" className="grid grid-cols-2 gap-2 mt-2 mb-4">{methods.map(item => <button key={item} type="button" onClick={() => setMethod(item)} className={`rounded-lg border px-3 py-2 text-sm transition-colors ${method === item ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>{item}</button>)}</div>
                <div id="sak-crops-label" className="text-sm font-medium text-foreground">Välj växter</div>
                <div role="group" aria-labelledby="sak-crops-label" className="grid grid-cols-2 gap-2 mt-2 mb-5 max-h-56 overflow-auto pr-1">{sowingMatrix.map(crop => <button key={crop.name} type="button" onClick={() => setSelected(current => current.includes(crop.name) ? current.filter(item => item !== crop.name) : [...current, crop.name])} className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${selected.includes(crop.name) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>{crop.name}</button>)}</div>
                <Button onClick={createCalendar} disabled={selected.length === 0} className="w-full gap-2" size="lg">Skapa min såkalender <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-gradient-to-br from-background via-primary/5 to-accent/10">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
              <div className="grid lg:grid-cols-[1fr_420px] gap-6 items-start">
                <div className="rounded-3xl border border-primary/20 bg-card p-5 sm:p-7 shadow-xl">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Din såkalender för zon {zone} är klar 🌱</p>
                  <h1 className="font-serif text-3xl sm:text-5xl text-foreground leading-tight mb-4">Tider beräknade för zon {zone}</h1>
                  <p className="text-muted-foreground leading-relaxed mb-5">Veckorna nedan utgår från sista frost i din zon. Spara kalendern och få påminnelser, logga sådder och följ upp vad som faktiskt fungerade. {zoneText(zone)}</p>
                  <div className="grid md:grid-cols-2 gap-3 mb-5">
                    {selectedCrops.slice(0, 4).map(crop => {
                      const t = getCropTiming(crop.name, numericZone);
                      if (!t) return null;
                      return (
                        <article key={crop.name} className="rounded-2xl border border-border bg-background/70 p-4">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <h2 className="font-serif text-xl text-foreground">{crop.name}</h2>
                            <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                          </div>
                          {t.preStart !== null && <p className="text-sm text-muted-foreground"><strong className="text-foreground">Förodla:</strong> {formatRange(t.preStart, t.preEnd)}</p>}
                          {t.plantOutStart !== null && <p className="text-sm text-muted-foreground"><strong className="text-foreground">Plantera ut:</strong> {formatRange(t.plantOutStart, t.plantOutEnd)}</p>}
                          {t.directSowStart !== null && !t.plantOutStart && <p className="text-sm text-muted-foreground"><strong className="text-foreground">Direktsådd:</strong> {formatRange(t.directSowStart, t.directSowEnd)}</p>}
                        </article>
                      );
                    })}
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

        {created && (
          <section className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              {selectedCrops.map(crop => {
                const t = getCropTiming(crop.name, numericZone);
                if (!t) return null;
                return <CropRow key={crop.name} name={crop.name} timing={t} />;
              })}
            </div>
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-serif text-xl text-foreground mb-2">Dela din såkalender</h3>
              <p className="text-sm text-muted-foreground mb-4">Inspirera fler att komma igång med sin odling.</p>
              <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground mb-4">{shareText}</div>
              <Button variant="outline" className="gap-2" onClick={async () => { await navigator.clipboard?.writeText(shareText); setCopied(true); }}>
                <Copy className="h-4 w-4" /> {copied ? 'Kopierat!' : 'Kopiera text'}
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
