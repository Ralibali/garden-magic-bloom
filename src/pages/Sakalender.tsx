import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sprout, ArrowRight, Calendar, Leaf, Loader2, Search, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

type SeoPlant = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  sow_indoor_start: number | null;
  sow_indoor_end: number | null;
  sow_outdoor_start: number | null;
  sow_outdoor_end: number | null;
  harvest_start: number | null;
  harvest_end: number | null;
  zone_min: number | null;
  zone_max: number | null;
};

const SWEDISH_MONTHS = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

const GROWING_METHODS = [
  { id: 'pallkrage', label: 'Pallkrage', emoji: '🪵' },
  { id: 'vaxthus', label: 'Växthus', emoji: '🏡' },
  { id: 'friland', label: 'Friland', emoji: '🌾' },
  { id: 'balkong', label: 'Balkong', emoji: '🌿' },
  { id: 'krukor', label: 'Krukor', emoji: '🪴' },
] as const;

// Per-plant copy from section 15
const PLANT_COPY: Record<string, string> = {
  tomat: 'Förodla tomat inomhus i god tid innan utplantering. Tomater vill ha värme, ljus och jämn vattning. Plantera inte ut för tidigt – kalla nätter bromsar plantorna mer än många tror.',
  chili: 'Chili har lång utvecklingstid och mår bäst av att startas tidigt. Ge plantorna mycket ljus och värme. En stark start på våren ger friskare plantor och bättre skörd senare.',
  gurka: 'Gurka växer snabbt men är känslig för kyla. Förodla hellre lite senare än för tidigt och plantera ut först när nätterna är stabilt varma.',
  morot: 'Morot sås direkt på växtplatsen. Jorden bör vara lucker, stenfri och jämnt fuktig under groningen. Täck gärna sådden för att behålla fukt.',
  sallad: 'Sallat är tacksam och kan sås i omgångar. Så lite men ofta för att få jämn skörd under längre tid. Den trivs bäst när det inte är för varmt.',
  potatis: 'Förgro potatis ljust och svalt innan sättning. Sätt när jorden reder sig och inte är för kall. Täck vid risk för frost om blasten kommit upp.',
  lok: 'Lök vill ha sol, jämn fukt och näringsrik jord. Sättlök är enkelt och passar de flesta odlare. Håll ogräset borta i början när löken växer långsamt.',
  vitlok: 'Vitlök sätts oftast på hösten för bäst resultat. Den vill stå soligt i väldränerad jord. Nästa sommar skördar du när blasten börjar gulna.',
  jordgubbe: 'Jordgubbar trivs i soligt läge och väldränerad jord. Ta bort ogräs och håll plantorna luftiga så minskar risken för sjukdomar.',
  basilika: 'Basilika älskar värme och ogillar kyla. Odla gärna i kruka, växthus eller skyddat läge. Toppa plantan regelbundet för buskigare tillväxt.',
  arta: 'Ärtor kan sås relativt tidigt när jorden börjar bli brukbar. De vill ha stöd att klättra på och jämn fukt under utvecklingen.',
  bona: 'Bönor vill ha varm jord och ska inte sås för tidigt. Vänta tills risken för kalla nätter är över. När de väl kommer igång växer de snabbt.',
};

function rangeContains(start: number | null, end: number | null, month: number): boolean {
  if (!start) return false;
  const e = end ?? start;
  if (start <= e) return month >= start && month <= e;
  // Wrap-around (e.g. 11 -> 2)
  return month >= start || month <= e;
}

function formatRange(start: number | null, end: number | null): string {
  if (!start) return '–';
  const e = end ?? start;
  if (start === e) return MONTH_SHORT[start - 1];
  return `${MONTH_SHORT[start - 1]}–${MONTH_SHORT[e - 1]}`;
}

export default function Sakalender() {
  const [plants, setPlants] = useState<SeoPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [zone, setZone] = useState<number>(3);
  const [methods, setMethods] = useState<Set<string>>(new Set(['pallkrage']));
  const [selectedPlants, setSelectedPlants] = useState<Set<string>>(new Set(['tomat', 'morot', 'sallad']));
  const [showResult, setShowResult] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('seo_plants')
        .select('id, slug, name, category, sow_indoor_start, sow_indoor_end, sow_outdoor_start, sow_outdoor_end, harvest_start, harvest_end, zone_min, zone_max')
        .eq('published', true)
        .order('featured', { ascending: false })
        .order('name', { ascending: true });
      if (!active) return;
      if (!error && data) setPlants(data as SeoPlant[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const filteredPlants = useMemo(() => {
    if (!search.trim()) return plants;
    const q = search.trim().toLowerCase();
    return plants.filter(p => p.name.toLowerCase().includes(q));
  }, [plants, search]);

  const togglePlant = (slug: string) => {
    setSelectedPlants(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const toggleMethod = (id: string) => {
    setMethods(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedPlantData = useMemo(() => {
    return plants.filter(p => selectedPlants.has(p.slug));
  }, [plants, selectedPlants]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlants.size === 0) return;
    setShowResult(true);
    setTimeout(() => {
      document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const usesIndoor = methods.has('vaxthus') || methods.has('krukor') || methods.has('balkong') || methods.has('pallkrage');

  return (
    <PublicLayout>
      <Seo
        title="Såkalender 2026 – skapa personlig såkalender för din klimatzon"
        description="Skapa en gratis såkalender för svenska odlare. Välj klimatzon, odlingssätt och växter och få rekommenderade tider för sådd, utplantering och skörd."
        path="/sakalender"
        jsonLd={[
          {
            '@type': 'WebApplication',
            name: 'Såkalender 2026 – Odlingsdagboken',
            applicationCategory: 'LifestyleApplication',
            operatingSystem: 'Web',
            description: 'Personlig såkalender för svenska odlare. Anpassas efter klimatzon och odlingssätt.',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'SEK' },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://odlingsdagboken.com' },
              { '@type': 'ListItem', position: 2, name: 'Såkalender' },
            ],
          },
        ]}
      />

      {/* HERO */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-[0.15em] mb-4">
            <Calendar className="h-3.5 w-3.5" /> Såkalender 2026
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-foreground leading-tight mb-4">
            Skapa din personliga såkalender för 2026
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Välj klimatzon, odlingssätt och vad du vill odla. Odlingsdagboken hjälper dig få koll på när det är dags att så, förodla och plantera ut – anpassat för svenska förhållanden.
          </p>
        </div>
      </section>

      {/* FORM */}
      <section className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
        <form onSubmit={handleSubmit}>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-5 sm:p-8 space-y-8">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-1">Vad vill du odla i år?</h2>
                <p className="text-sm text-muted-foreground">Välj klimatzon, hur du odlar och vilka växter du planerar för säsongen.</p>
              </div>

              {/* Zone */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">Välj klimatzon</Label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(z => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setZone(z)}
                      className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                        zone === z
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:bg-muted'
                      }`}
                      aria-pressed={zone === z}
                    >
                      Zon {z}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Vet du inte din zon? Söder = zon 1–2, Mellansverige = 3–4, Norrland = 5–8.
                </p>
              </div>

              {/* Method */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">Hur odlar du?</Label>
                <div className="flex flex-wrap gap-2">
                  {GROWING_METHODS.map(m => {
                    const active = methods.has(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMethod(m.id)}
                        className={`inline-flex items-center gap-2 h-11 px-4 rounded-lg border text-sm transition-colors ${
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-foreground hover:bg-muted'
                        }`}
                        aria-pressed={active}
                      >
                        <span aria-hidden="true">{m.emoji}</span>
                        <span>{m.label}</span>
                        {active && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plants */}
              <div>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <Label className="text-sm font-medium text-foreground">Välj växter</Label>
                  <span className="text-xs text-muted-foreground">{selectedPlants.size} valda</span>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Sök växt – t.ex. tomat, morot, sallad…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value.slice(0, 50))}
                    className="pl-10 h-11"
                    maxLength={50}
                  />
                </div>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" /> Hämtar växter…
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-background/40 p-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {filteredPlants.map(p => {
                        const active = selectedPlants.has(p.slug);
                        const inZone = !p.zone_min || !p.zone_max || (zone >= p.zone_min && zone <= p.zone_max);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => togglePlant(p.slug)}
                            className={`text-left px-3 py-2 rounded-md border text-sm transition-colors flex items-center justify-between gap-1 ${
                              active
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-card hover:bg-muted text-foreground'
                            }`}
                            aria-pressed={active}
                          >
                            <span className="capitalize truncate">{p.name}</span>
                            {!inZone && (
                              <span className="text-[10px] text-warning shrink-0" title={`Bäst i zon ${p.zone_min}–${p.zone_max}`}>!</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {filteredPlants.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Inga växter matchar sökningen.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto h-12 px-8 text-base gap-2"
                  disabled={selectedPlants.size === 0 || methods.size === 0}
                >
                  <Sprout className="h-4 w-4" /> Skapa min såkalender
                </Button>
                {selectedPlants.size === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">Välj minst en växt för att skapa din kalender.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </section>

      {/* RESULT */}
      {showResult && selectedPlantData.length > 0 && (
        <section id="result" className="bg-card/40 border-y border-border">
          <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Din såkalender</p>
              <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-3">
                Här är din personliga såkalender
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Det här är en bra startpunkt för din odlingsplan. Justera alltid efter väder, frostnätter och hur dina plantor faktiskt utvecklas – men med en tydlig plan blir säsongen mycket enklare.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <Badge variant="outline">Zon {zone}</Badge>
                {Array.from(methods).map(m => {
                  const meta = GROWING_METHODS.find(x => x.id === m);
                  return meta ? <Badge key={m} variant="outline">{meta.emoji} {meta.label}</Badge> : null;
                })}
              </div>
            </div>

            {/* Month grid overview */}
            <div className="hidden md:block mb-10 overflow-x-auto rounded-xl border border-border bg-background/60">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground">Växt</th>
                    {MONTH_SHORT.map(m => (
                      <th key={m} className="p-2 font-medium text-muted-foreground text-center">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedPlantData.map(p => (
                    <tr key={p.id} className="border-b border-border/50 last:border-0">
                      <td className="p-3 font-medium text-foreground capitalize">{p.name}</td>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                        const indoor = usesIndoor && rangeContains(p.sow_indoor_start, p.sow_indoor_end, month);
                        const outdoor = rangeContains(p.sow_outdoor_start, p.sow_outdoor_end, month);
                        const harvest = rangeContains(p.harvest_start, p.harvest_end, month);
                        return (
                          <td key={month} className="p-1 text-center">
                            <div className="flex flex-col gap-0.5 items-center">
                              {indoor && <span title="Förodla inne" className="block w-2 h-2 rounded-full bg-warning" />}
                              {outdoor && <span title="Så ute" className="block w-2 h-2 rounded-full bg-primary" />}
                              {harvest && <span title="Skörd" className="block w-2 h-2 rounded-full bg-accent" />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-wrap items-center gap-4 p-3 border-t border-border text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="block w-2 h-2 rounded-full bg-warning" /> Förodla inne</span>
                <span className="flex items-center gap-1.5"><span className="block w-2 h-2 rounded-full bg-primary" /> Så ute</span>
                <span className="flex items-center gap-1.5"><span className="block w-2 h-2 rounded-full bg-accent" /> Skörd</span>
              </div>
            </div>

            {/* Per-plant cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedPlantData.map((p, i) => {
                const copy = PLANT_COPY[p.slug];
                const inZone = !p.zone_min || !p.zone_max || (zone >= p.zone_min && zone <= p.zone_max);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                  >
                    <Card className="border-border/60 h-full">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-serif text-lg text-foreground capitalize">{p.name}</h3>
                            {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                          </div>
                          <Leaf className="h-4 w-4 text-primary mt-1 shrink-0" />
                        </div>

                        {!inZone && (
                          <p className="text-[11px] text-warning bg-warning/10 rounded px-2 py-1.5 flex items-start gap-1.5">
                            <span className="font-medium">OBS:</span>
                            <span>{p.name} trivs bäst i zon {p.zone_min}–{p.zone_max}. I zon {zone} kan du behöva odla i växthus eller skyddat läge.</span>
                          </p>
                        )}

                        <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-md bg-warning/5 border border-warning/20 p-2">
                            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Förodla</dt>
                            <dd className="font-medium text-foreground mt-1">{formatRange(p.sow_indoor_start, p.sow_indoor_end)}</dd>
                          </div>
                          <div className="rounded-md bg-primary/5 border border-primary/20 p-2">
                            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Så ute</dt>
                            <dd className="font-medium text-foreground mt-1">{formatRange(p.sow_outdoor_start, p.sow_outdoor_end)}</dd>
                          </div>
                          <div className="rounded-md bg-accent/5 border border-accent/20 p-2">
                            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Skörd</dt>
                            <dd className="font-medium text-foreground mt-1">{formatRange(p.harvest_start, p.harvest_end)}</dd>
                          </div>
                        </dl>

                        {copy && (
                          <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                            {copy}
                          </p>
                        )}

                        <Link
                          to={`/vaxter/${p.slug}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline pt-1"
                        >
                          Läs mer om {p.name} <ArrowRight className="h-3 w-3" />
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Save CTA */}
            <div className="mt-12 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6 sm:p-10 text-center shadow-sm">
              <span className="text-3xl mb-3 block">📅</span>
              <h3 className="font-serif text-xl sm:text-2xl text-foreground mb-3">
                Spara din såkalender och få påminnelser
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
                Skapa ett gratis konto så kan du spara din plan, få påminnelser och följa upp vad som faktiskt fungerade när säsongen är över.
              </p>
              <Link to="/login?mode=register">
                <Button size="lg" className="h-12 px-6 sm:px-8 text-base gap-2 shadow-lg">
                  <Sprout className="h-4 w-4" /> Skapa gratis konto <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground/90 mt-4 italic">
                Din bästa odlingskunskap kommer från din egen trädgård.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* SEO copy block when no result yet */}
      {!showResult && (
        <section className="max-w-3xl mx-auto px-4 pb-16">
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <h2 className="font-serif text-xl text-foreground">Varför en personlig såkalender?</h2>
            <p className="leading-relaxed">
              Generella såkalendrar är en bra utgångspunkt, men de tar sällan hänsyn till var i landet du odlar, vilken klimatzon du har eller om du odlar i pallkrage, växthus eller på friland. En såkalender som är anpassad efter just dina förhållanden gör säsongen lugnare och resultatet bättre.
            </p>
            <h2 className="font-serif text-xl text-foreground mt-8">Det här ingår i din kalender</h2>
            <ul>
              <li>Förodlingsperiod inomhus för värmekrävande växter</li>
              <li>Sådirekt-perioder utomhus när jorden är redo</li>
              <li>Skördeperioder så du vet vad du kan vänta dig</li>
              <li>Tips per växt – inte generella råd från andra klimat</li>
            </ul>
            <p className="text-sm text-muted-foreground/90 italic mt-6">
              Det du antecknar i år blir kunskap nästa år.
            </p>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
