import PublicLayout from '@/components/PublicLayout';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Seo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import PublicEmailCapture from '@/components/PublicEmailCapture';
import CalendarCrossLink from '@/components/CalendarCrossLink';
import { ArrowRight, CalendarDays, Check, Copy, Sprout } from 'lucide-react';
import { sowingMatrix, formatRange, getCropTiming, type CropTiming } from '@/data/sowingMatrix';
import { calendarChannel, calendarLink, calendarStartingPoint, growingMethods, type CalendarPlan } from '@/lib/calendarLink';
import { buildSeasonPlan, formatLongDate } from '@/lib/gardenCalendar';
import { localDateKey } from '@/lib/gardenToday';
import { zoneForPlace, ZONE_PLACES } from '@/lib/swedishZones';
import { hasTelemetryConsent } from '@/lib/privacyTelemetry';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { cropSlug, SATIDER_PATH } from '@/lib/guideRoutes';



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
        <h3 className="font-serif text-xl text-foreground">
          <Link to={`${SATIDER_PATH}/${cropSlug(name)}`} className="hover:text-primary hover:underline" title={`Såtider för ${name.toLowerCase()} i alla zoner`}>{name}</Link>
        </h3>
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
  const [params] = useSearchParams();
  const { hash } = useLocation();
  // A second plan can be opened while the router is on the same path.
  return <CalendarBuilder key={params.toString() + hash} params={params} hash={hash} />;
}

function CalendarBuilder({ params, hash }: { params: URLSearchParams; hash: string }) {
  const [initial] = useState(() => calendarStartingPoint(params, hash));
  const { season } = initial.plan;
  const [zone, setZone] = useState(initial.plan.zone);
  const [method, setMethod] = useState(initial.plan.method);
  const [selected, setSelected] = useState(initial.plan.crops);
  const [varieties, setVarieties] = useState(initial.plan.varieties);
  const [created, setCreated] = useState(initial.showResult);
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [place, setPlace] = useState('');
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const channel = calendarChannel(params.get('via')) ?? 'direkt';

  const numericZone = useMemo(() => {
    const n = parseInt(zone, 10);
    return Number.isFinite(n) && n >= 1 && n <= 8 ? n : 3;
  }, [zone]);

  const selectedCrops = useMemo(
    () => sowingMatrix.filter(c => selected.includes(c.name)),
    [selected],
  );

  const planPayload: CalendarPlan = {
    type: 'sakalender', season, zone, method, crops: selected,
    varieties: Object.fromEntries(selected.filter(crop => varieties[crop]?.trim()).map(crop => [crop, varieties[crop].trim()])),
  };
  const today = localDateKey();
  const next = useMemo(() => buildSeasonPlan(selected, numericZone, season, today)[0], [selected, numericZone, season, today]);
  const shareUrl = calendarLink(planPayload, channel === 'direkt' ? 'delning' : channel);

  function currentDraft() {
    return { ...planPayload, ...(hasTelemetryConsent() ? { channel } : {}), createdAt: new Date().toISOString() };
  }

  function keepDraft() {
    const value = JSON.stringify(currentDraft());
    try {
      localStorage.setItem('odlingsdagboken_public_sakalender', value);
      localStorage.setItem('odlingsdagboken_latest_public_plan', value);
    } catch { /* The portable link still works without browser storage. */ }
  }

  const createCalendar = () => {
    keepDraft();
    void trackEvent('calendar_created', { source: channel, crop_count: selected.length });
    setCreated(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function saveToAccount() {
    keepDraft();
    if (!isAuthenticated) {
      // Resume the explicit save after authentication, including an existing account.
      try { localStorage.setItem('odlingsdagboken_calendar_to_save', JSON.stringify(currentDraft())); } catch { /* onboarding can use the local draft */ }
      navigate('/login?mode=register&return=/app&source=sakalender');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('save_sowing_calendar', { p_plan: currentDraft() });
    setSaving(false);
    if (error) {
      toast({ title: 'Planen kunde inte sparas', description: 'Försök igen eller kopiera länken nedan.', variant: 'destructive' });
      return;
    }
    await client.invalidateQueries({ queryKey: ['profile'] });
    navigate('/app');
  }

  async function copyPlan() {
    setShowLink(true);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      void trackEvent('calendar_link_copied', { source: channel });
    } catch { setCopied(false); }
  }

  const resetCalendar = () => setCreated(false);

  return (
    <PublicLayout>
      <Seo title={`Såkalender ${season} – personlig såkalender för din zon`} description="Skapa en gratis såkalender för svenska odlare. Välj klimatzon och få förodlings-, utplanterings- och skördetider beräknade för just din zon (1–8)." path="/sakalender" ogImage="https://odlingsdagboken.com/og-image.png" />

      <div>
        {!created ? (
          <section className="bg-gradient-to-br from-background via-primary/5 to-accent/10">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-10 items-start">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4">Gratis odlingsverktyg</p>
                <h1 className="font-serif text-4xl sm:text-5xl text-foreground leading-tight mb-5">Skapa din personliga såkalender för {season}</h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-6">Välj klimatzon, odlingssätt och vad du vill odla. Odlingsdagboken visar ungefärliga veckor för förodling, utplantering, direktsådd och skörd – baserat på sista frost i just din zon.</p>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Veckor anpassade efter zon 1–8</span>
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Pallkrage, växthus och friland</span>
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Sparas när du skapar konto</span>
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl shadow-xl p-5 sm:p-6">
                <h2 className="font-serif text-2xl text-foreground mb-1">Vad vill du odla?</h2>
                <p className="text-sm text-muted-foreground mb-5">{params.get('pilot') === '1' ? 'Vill du provodla med oss våren 2027? Skapa din kalender och kryssa i pilotanmälan när du beställer planmejlet.' : 'Välj var och vad du vill odla.'}</p>
                {params.get('mall') === 'pallkrage-120x80' && <p className="mb-4 text-sm">Pallkrage 120 × 80 cm. Rädisa, sallat, spenat och dill är förvalda. Byt fritt.</p>}
                <label htmlFor="sak-place" className="text-sm font-medium">Sök din ort (valfritt)</label>
                <input id="sak-place" list="sak-places" value={place} placeholder="Till exempel Linköping" onChange={event => { const value = event.target.value; setPlace(value); const match = zoneForPlace(value); if (match) setZone(String(match)); }} className="mt-2 mb-2 w-full h-11 rounded-lg border border-input bg-background px-3 text-sm" />
                <datalist id="sak-places">{ZONE_PLACES.flatMap(row => row.places).map(name => <option key={name} value={name} />)}</datalist>
                {place && <p className="mb-3 text-xs text-muted-foreground" role="status">{zoneForPlace(place) ? 'Kontrollera zonen för ditt lokala läge.' : 'Välj din zon nedan om orten saknas.'}</p>}
                <label htmlFor="sak-zone" className="text-sm font-medium text-foreground">Välj klimatzon</label>
                <select id="sak-zone" value={zone} onChange={event => setZone(event.target.value)} className="mt-2 mb-4 w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">{['1','2','3','4','5','6','7','8','Vet inte'].map(item => <option key={item} value={item}>{item === 'Vet inte' ? 'Jag vet inte' : `Zon ${item}`}</option>)}</select>
                <div id="sak-method-label" className="text-sm font-medium text-foreground">Hur odlar du?</div>
                <div role="group" aria-labelledby="sak-method-label" className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 mb-4">{growingMethods.map(item => <button key={item} type="button" aria-pressed={method === item} onClick={() => setMethod(item)} className={`rounded-lg border px-3 py-2 text-sm transition-colors ${method === item ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>{item}</button>)}</div>
                <div id="sak-crops-label" className="text-sm font-medium text-foreground">Välj växter</div>
                <div role="group" aria-labelledby="sak-crops-label" className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 mb-5 sm:max-h-56 sm:overflow-auto pr-1">{sowingMatrix.map(crop => <button key={crop.name} type="button" aria-pressed={selected.includes(crop.name)} onClick={() => setSelected(current => current.includes(crop.name) ? current.filter(item => item !== crop.name) : [...current, crop.name])} className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${selected.includes(crop.name) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>{crop.name}</button>)}</div>
                <details className="mb-4"><summary className="cursor-pointer text-sm font-medium">Lägg till sortnamn från fröpåsarna</summary><div className="mt-3 grid gap-2">{selected.map(crop => <label key={crop} className="grid gap-1 text-sm">{crop}<input maxLength={50} value={varieties[crop] ?? ''} onChange={e => setVarieties(old => ({ ...old, [crop]: e.target.value }))} placeholder="Sortnamn (valfritt)" className="rounded-lg border border-input bg-background p-2" /></label>)}</div></details>
                <Button onClick={createCalendar} disabled={selected.length === 0} className="w-full gap-2" size="lg">Skapa min såkalender <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-gradient-to-br from-background via-primary/5 to-accent/10">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
                <div className="rounded-3xl border border-primary/20 bg-card p-5 sm:p-7 shadow-xl">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Din såkalender för {season}</p>
                  <h1 className="font-serif text-3xl sm:text-5xl text-foreground leading-tight mb-4">{zone === 'Vet inte' ? 'Exempeltider för zon 3' : 'Tider för zon ' + zone}</h1>
                  <p className="text-muted-foreground leading-relaxed mb-5">Veckorna nedan utgår från sista frost i din zon. Spara kalendern och få påminnelser, logga sådder och följ upp vad som faktiskt fungerade. {zoneText(zone)}</p>
                  {next && <div className="mb-5 rounded-xl bg-primary/10 p-4"><h2 className="font-semibold">Nästa steg i din plan</h2><p>{next.title}{varieties[next.crop] ? ' · ' + varieties[next.crop] : ''} från {formatLongDate(next.date)}.</p></div>}
                  <div className="grid md:grid-cols-2 gap-3 mb-5">
                    {selectedCrops.slice(0, 4).map(crop => {
                      const t = getCropTiming(crop.name, numericZone);
                      if (!t) return null;
                      return (
                        <article key={crop.name} className="rounded-2xl border border-border bg-background/70 p-4">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <h2 className="font-serif text-xl text-foreground">{crop.name}{varieties[crop.name] ? ' · ' + varieties[crop.name] : ''}</h2>
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
                  <button type="button" onClick={resetCalendar} className="text-xs text-muted-foreground hover:text-foreground">Ändra ort, zon eller grödor</button>
                </div>
                <div className="min-w-0 space-y-4">
                  <div className="bg-primary text-primary-foreground rounded-2xl p-5 sm:p-6">
                    <h2 className="font-serif text-2xl text-primary-foreground mb-2">Min odlingsdagbok</h2>
                    <p className="text-primary-foreground/85 mb-5 text-sm">Spara grödorna och sorterna i ditt konto för att logga din första sådd.</p>
                    <Button variant="secondary" size="lg" disabled={saving || loading} onClick={saveToAccount} className="w-full min-h-12"> {saving ? 'Sparar…' : 'Spara planen i min dagbok'} <ArrowRight className="h-4 w-4" /></Button>
                  </div>
                  <PublicEmailCapture source="sakalender" plan={planPayload} channel={channel} title="Öppna din såkalender på en annan enhet" description="Få en länk till dina valda grödor och sorter via mejl." />
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
              <p className="text-sm text-muted-foreground mb-4">Den som får länken kan använda dina sorter och anpassa såtiderna till sin egen zon.</p>
              <Button variant="outline" className="gap-2" onClick={copyPlan}><Copy className="h-4 w-4" />{copied ? 'Länken kopierad' : 'Kopiera planlänk'}</Button>
              {showLink && <input aria-label="Delbar planlänk" readOnly value={shareUrl} onFocus={e => e.target.select()} className="mt-2 w-full rounded-lg border p-2 text-sm" />}
            </div>
            <CalendarCrossLink
              className="mt-6"
              description="Såkalendern visar tiderna gröda för gröda. Odlingskalendern visar i stället allt som ska göras just den här månaden i din zon."
            />
          </section>
        )}
      </div>
    </PublicLayout>
  );
}
