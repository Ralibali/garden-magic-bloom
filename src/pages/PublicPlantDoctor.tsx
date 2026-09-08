import { ChangeEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowRight, Camera, Check, Crown, Loader2, RotateCcw, ShieldCheck, Sparkles, Sprout, Upload, X } from 'lucide-react';
import { Seo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import { approximateDataUrlBytes, compressImageFile } from '@/lib/images';

const MAX_IMAGE_BYTES = 1_500_000;
const PUBLIC_USAGE_KEY = 'odlingsdagboken_public_plant_diagnosis_used';
const DIAGNOSIS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-plant-diagnosis`;

type Diagnosis = {
  summary: string;
  confidence: 'low' | 'medium' | 'high';
  likely_causes: Array<{ title: string; explanation: string }>;
  actions: string[];
  follow_up: string;
  disclaimer: string;
};

function hasUsedFreeDiagnosis() {
  try {
    return localStorage.getItem(PUBLIC_USAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function confidenceLabel(value: Diagnosis['confidence']) {
  if (value === 'high') return 'Ganska tydlig bild';
  if (value === 'medium') return 'Måttlig säkerhet';
  return 'Osäker bedömning';
}

export default function PublicPlantDoctor() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageData, setImageData] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [alreadyUsed, setAlreadyUsed] = useState(hasUsedFreeDiagnosis());

  const chooseImage = () => fileRef.current?.click();

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setDiagnosis(null);
    try {
      const compressed = await compressImageFile(file, 1280, 0.8);
      if (approximateDataUrlBytes(compressed) > MAX_IMAGE_BYTES) {
        setError('Bilden är fortfarande för stor. Prova en annan bild.');
        return;
      }
      setImageData(compressed);
    } catch {
      setError('Kunde inte läsa bilden. Prova ett foto i JPG- eller PNG-format.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const analyze = async () => {
    if (!imageData || loading) return;
    if (alreadyUsed) {
      setError('Din kostnadsfria analys är redan använd. Skapa ett gratis konto för fler analyser.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(DIAGNOSIS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ image: imageData, note: note.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Analysen kunde inte genomföras.');
      setDiagnosis(body.analysis);
      try { localStorage.setItem(PUBLIC_USAGE_KEY, '1'); } catch {}
      setAlreadyUsed(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Något gick fel. Prova igen.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImageData('');
    setDiagnosis(null);
    setNote('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Växtdoktorn – fota växten och få hjälp direkt"
        description="Ta ett foto på din växt och få en kostnadsfri AI-bedömning av gula blad, fläckar, skadedjur och andra vanliga växtproblem."
        path="/vaxtdoktorn"
        ogImage="/og-image.png"
      />

      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2 font-serif font-semibold text-foreground">
            <Sprout className="h-5 w-5 text-primary" /> Odlingsdagboken
          </Link>
          <Button asChild size="sm"><Link to="/login?mode=register&source=vaxtdoktorn">Skapa gratis konto</Link></Button>
        </div>
      </header>

      <main>
        <section className="bg-gradient-to-br from-background via-primary/5 to-accent/10">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-8 sm:py-20 lg:grid-cols-[1fr_460px] lg:items-start">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Växtdoktorn AI</p>
              <h1 className="mb-5 font-serif text-4xl leading-tight text-foreground sm:text-6xl">Fota din växt. Få hjälp direkt.</h1>
              <p className="mb-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">Ladda upp ett foto på blad, stam eller hela plantan. Du får en första försiktig bedömning av vad som kan vara fel och konkreta steg att prova.</p>
              <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
                {['En analys utan konto', 'Svar på svenska', 'Konkreta nästa steg'].map(item => (
                  <div key={item} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary" /> {item}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex max-w-xl gap-3 rounded-2xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p>AI kan misstolka bilder. Kontrollera alltid jord, bladens undersidor och växtens miljö innan du behandlar.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-xl sm:p-6">
              {!diagnosis ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-serif text-2xl text-foreground">Ladda upp ett tydligt foto</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Fotografera gärna både det skadade området och lite av plantan runtomkring.</p>
                  </div>

                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={handleImage} />
                  {imageData ? (
                    <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/30">
                      <img src={imageData} alt="Växt som ska analyseras" className="h-72 w-full object-cover" />
                      <button type="button" onClick={() => setImageData('')} aria-label="Ta bort bilden" className="absolute right-3 top-3 rounded-full bg-background/90 p-2 shadow hover:bg-background"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={chooseImage} className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/25 bg-primary/5 p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/10">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><Camera className="h-7 w-7 text-primary" /></div>
                      <span className="font-semibold text-foreground">Ta foto eller välj från mobilen</span>
                      <span className="mt-1 text-sm text-muted-foreground">JPG, PNG eller WEBP</span>
                    </button>
                  )}

                  <label className="block">
                    <span className="text-sm font-medium text-foreground">Berätta gärna vad du ser <span className="font-normal text-muted-foreground">(valfritt)</span></span>
                    <textarea value={note} onChange={event => setNote(event.target.value.slice(0, 500))} rows={3} placeholder="Exempel: bladen har blivit gula på en vecka och jorden känns fuktig" className="mt-2 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" />
                  </label>

                  {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

                  {alreadyUsed ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
                      <Sparkles className="mx-auto h-6 w-6 text-primary" />
                      <p className="mt-2 font-semibold text-foreground">Din kostnadsfria analys är använd</p>
                      <p className="mt-1 text-sm text-muted-foreground">Skapa konto för fler analyser, sparad historik och uppföljning med nya foton.</p>
                      <Button asChild className="mt-4 w-full"><Link to="/login?mode=register&source=vaxtdoktorn-limit">Fortsätt gratis med konto <ArrowRight className="h-4 w-4" /></Link></Button>
                    </div>
                  ) : (
                    <Button onClick={analyze} disabled={!imageData || loading} size="lg" className="w-full gap-2">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyserar bilden…</> : <><Sparkles className="h-4 w-4" /> Analysera min växt gratis</>}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="overflow-hidden rounded-2xl border border-border"><img src={imageData} alt="Analyserad växt" className="h-52 w-full object-cover" /></div>
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{confidenceLabel(diagnosis.confidence)}</span>
                      <span className="text-xs text-muted-foreground">Första AI-bedömning</span>
                    </div>
                    <h2 className="font-serif text-3xl text-foreground">Det här kan vara problemet</h2>
                    <div className="prose prose-sm mt-3 max-w-none text-muted-foreground dark:prose-invert"><ReactMarkdown>{diagnosis.summary}</ReactMarkdown></div>
                  </div>
                  <div className="space-y-3">
                    {diagnosis.likely_causes.map((cause, index) => (
                      <article key={`${cause.title}-${index}`} className="rounded-2xl border border-border bg-background/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Möjlig orsak {index + 1}</p>
                        <h3 className="mt-1 font-serif text-xl text-foreground">{cause.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{cause.explanation}</p>
                      </article>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
                    <h3 className="font-serif text-2xl">Gör detta nu</h3>
                    <ol className="mt-3 space-y-2 text-sm text-primary-foreground/90">{diagnosis.actions.map((action, index) => <li key={action} className="flex gap-2"><span className="font-semibold">{index + 1}.</span><span>{action}</span></li>)}</ol>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">Följ upp:</strong> {diagnosis.follow_up}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{diagnosis.disclaimer}</p>
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
                    <Crown className="mx-auto h-7 w-7 text-primary" />
                    <h3 className="mt-2 font-serif text-2xl text-foreground">Vill du följa växtens utveckling?</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Skapa ett gratis konto för fler frågor. Med Plus får du obegränsad AI-hjälp, sparade analyser och uppföljning före och efter behandling.</p>
                    <Button asChild size="lg" className="mt-4 w-full"><Link to="/login?mode=register&source=vaxtdoktorn-result">Skapa konto och fortsätt <ArrowRight className="h-4 w-4" /></Link></Button>
                  </div>
                  <button type="button" onClick={reset} className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"><RotateCcw className="h-4 w-4" /> Visa uppladdningen igen</button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-border/50 bg-card">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-8 lg:grid-cols-3">
            <div><Upload className="h-6 w-6 text-primary" /><h2 className="mt-3 font-serif text-xl">1. Ta ett tydligt foto</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Bra ljus och skarpa detaljer ger bättre vägledning.</p></div>
            <div><Sparkles className="h-6 w-6 text-primary" /><h2 className="mt-3 font-serif text-xl">2. Få en första bedömning</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Vi visar möjliga orsaker, säkerhetsnivå och vad du kan kontrollera.</p></div>
            <div><Sprout className="h-6 w-6 text-primary" /><h2 className="mt-3 font-serif text-xl">3. Spara och följ upp</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Med konto kan du samla bilder och se om växten återhämtar sig.</p></div>
          </div>
        </section>
      </main>
    </div>
  );
}
