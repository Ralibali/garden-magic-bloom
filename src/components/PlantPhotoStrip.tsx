import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, GitCompare, ImagePlus, Loader2, Sparkles, X, ZoomIn, AlertTriangle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface PlantPhotoStripProps {
  plantId: string;
  plantName: string;
}

interface PhotoRow {
  id: string;
  photo_url: string;
  taken_at: string;
  caption: string | null;
  analysis: any;
  analyzed_at: string | null;
}

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Du behöver vara inloggad.');
  return user.id;
}

async function signPhoto(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('plant-photos').createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

function extractStoragePath(photoUrl: string): string {
  const marker = '/plant-photos/';
  const index = photoUrl.indexOf(marker);
  return index === -1 ? photoUrl : photoUrl.slice(index + marker.length);
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  } catch { return value; }
}

function formatShort(value: string) {
  try {
    return new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short' }).format(new Date(value));
  } catch { return value; }
}

export default function PlantPhotoStrip({ plantId, plantName }: PlantPhotoStripProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [compareOpen, setCompareOpen] = useState(false);
  const [lightbox, setLightbox] = useState<PhotoRow | null>(null);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['plant-photos', plantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_photos')
        .select('id, photo_url, taken_at, caption, analysis, analyzed_at')
        .eq('my_plant_id', plantId)
        .order('taken_at', { ascending: false })
        .limit(24);
      if (error) { console.warn('[plant_photos]', error); return []; }
      return (data || []) as PhotoRow[];
    },
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const entries: Record<string, string> = {};
      for (const photo of photos) {
        const path = extractStoragePath(photo.photo_url);
        const url = await signPhoto(path);
        if (url) entries[photo.id] = url;
      }
      if (alive) setSigned(entries);
    })();
    return () => { alive = false; };
  }, [photos]);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const userId = await currentUserId();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/plants/${plantId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('plant-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from('plant_photos').insert({
        user_id: userId,
        my_plant_id: plantId,
        photo_url: path,
        taken_at: new Date().toISOString().slice(0, 10),
      } as any);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-photos', plantId] });
      toast({ title: 'Fotot är sparat 📸', description: `Nu byggs en visuell tidslinje för ${plantName}.` });
    },
    onError: (error: any) => toast({ title: 'Kunde inte spara foto', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      const path = extractStoragePath(url);
      await supabase.storage.from('plant-photos').remove([path]);
      const { error } = await supabase.from('plant_photos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plant-photos', plantId] }),
  });

  const analyze = useMutation({
    mutationFn: async (photoId: string) => {
      const { data, error } = await supabase.functions.invoke('analyze-plant-photo', { body: { photo_id: photoId } });
      if (error) throw error;
      return data as { analysis: any };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-photos', plantId] });
      toast({ title: 'Observation klar', description: 'AI-noteringen är sparad på fotot.' });
    },
    onError: (error: any) => {
      const message = error?.context?.text ? undefined : (error?.message || 'Kunde inte analysera bilden.');
      toast({ title: 'Ingen analys kunde göras', description: message, variant: 'destructive' });
    },
  });

  const handlePick = () => fileRef.current?.click();

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Bilden är för stor', description: 'Välj en bild på högst 8 MB.', variant: 'destructive' });
      return;
    }
    upload.mutate(file);
  };

  const sortedOldestFirst = useMemo(() => [...photos].reverse(), [photos]);
  const before = sortedOldestFirst[0] || null; // oldest
  const after = photos[0] || null; // newest
  const canCompare = photos.length >= 2 && before && after && before.id !== after.id;

  return (
    <section className="rounded-[1.6rem] border border-border/60 bg-card/72 p-4 sm:p-5" aria-label={`Foton av ${plantName}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold"><Camera className="h-4 w-4 text-primary" /> Visuell utveckling</p>
          <p className="mt-1 text-xs text-muted-foreground">Ett foto då och då — appen bygger en tidslinje och kan hjälpa dig se förändringar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCompare && (
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setCompareOpen(true)}>
              <GitCompare className="h-3.5 w-3.5" /> Före/efter
            </Button>
          )}
          <Button size="sm" variant="outline" className="rounded-xl" onClick={handlePick} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            <span>Lägg till foto</span>
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} aria-hidden="true" />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-muted" />
      ) : photos.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-muted/25 p-5 text-center text-xs text-muted-foreground">
          Inga foton ännu. Lägg till ett så börjar tidslinjen.
        </div>
      ) : (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {photos.map(photo => (
            <figure key={photo.id} className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted">
              {signed[photo.id] ? (
                <button type="button" onClick={() => setLightbox(photo)} className="h-full w-full">
                  <img src={signed[photo.id]} alt={`${plantName} ${photo.taken_at}`} className="h-full w-full object-cover" loading="lazy" />
                </button>
              ) : (
                <div className="h-full w-full animate-pulse bg-muted" />
              )}
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1 text-[10px] font-medium text-white">
                {formatShort(photo.taken_at)}
              </figcaption>
              {photo.analysis && (
                <span className="pointer-events-none absolute left-1 top-1 rounded-full bg-primary/85 px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground" title="Bilden har en AI-observation">
                  AI
                </span>
              )}
              <button
                type="button"
                onClick={() => remove.mutate({ id: photo.id, url: photo.photo_url })}
                className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:flex group-hover:opacity-100 focus:opacity-100"
                aria-label="Ta bort fotot"
              >
                <X className="h-3 w-3" />
              </button>
            </figure>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={next => { if (!next) setLightbox(null); }}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-0">
          {lightbox && (
            <>
              <div className="bg-black">
                {signed[lightbox.id] ? (
                  <img src={signed[lightbox.id]} alt={plantName} className="max-h-[60vh] w-full object-contain" />
                ) : (
                  <div className="h-64 animate-pulse bg-muted" />
                )}
              </div>
              <div className="space-y-4 p-5">
                <DialogHeader>
                  <DialogTitle className="text-lg">{plantName}</DialogTitle>
                  <DialogDescription>{formatDate(lightbox.taken_at)}</DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => analyze.mutate(lightbox.id)}
                    disabled={analyze.isPending}
                  >
                    {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {lightbox.analysis ? 'Kör analys igen' : 'Analysera bild (observationsstöd)'}
                  </Button>
                </div>

                {(lightbox.analysis || analyze.data?.analysis) && (
                  <AnalysisView analysis={analyze.data?.analysis || lightbox.analysis} />
                )}

                <p className="flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Detta är observationsstöd — inte en säker diagnos. Kontrollera alltid jorden fysiskt innan du vattnar,
                    och undersök blad, undersidor och jordyta själv innan du gör åtgärder.
                  </span>
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Before/after compare */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><GitCompare className="h-4 w-4" /> Före och efter — {plantName}</DialogTitle>
            <DialogDescription>Äldsta och senaste bilden i din tidslinje.</DialogDescription>
          </DialogHeader>
          {canCompare && before && after && (
            <BeforeAfterCompare beforeUrl={signed[before.id]} afterUrl={signed[after.id]} beforeDate={before.taken_at} afterDate={after.taken_at} />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function BeforeAfterCompare({ beforeUrl, afterUrl, beforeDate, afterDate }: { beforeUrl?: string; afterUrl?: string; beforeDate: string; afterDate: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="space-y-3">
      <div className="relative select-none overflow-hidden rounded-2xl bg-muted" style={{ aspectRatio: '4/3' }}>
        {afterUrl ? <img src={afterUrl} alt={`Senare, ${afterDate}`} className="absolute inset-0 h-full w-full object-cover" draggable={false} /> : <div className="absolute inset-0 animate-pulse bg-muted" />}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }} aria-hidden={!beforeUrl}>
          {beforeUrl ? <img src={beforeUrl} alt={`Tidigare, ${beforeDate}`} className="absolute inset-0 h-full w-full object-cover" style={{ width: `${100 / (pos / 100 || 1)}%`, maxWidth: 'none' }} draggable={false} /> : null}
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-lg" style={{ left: `${pos}%` }} />
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">Tidigare</span>
        <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">Senare</span>
      </div>
      <input
        aria-label="Skjut för att jämföra bilderna"
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={e => setPos(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDate(beforeDate)}</span>
        <span>{formatDate(afterDate)}</span>
      </div>
    </div>
  );
}

function AnalysisView({ analysis }: { analysis: any }) {
  if (!analysis) return null;
  const observations: Array<{ label: string; severity: string }> = Array.isArray(analysis.observations) ? analysis.observations : [];
  const checks: string[] = Array.isArray(analysis.manual_checks) ? analysis.manual_checks : [];
  const confidenceLabel = analysis.confidence === 'high' ? 'Hög säkerhet' : analysis.confidence === 'medium' ? 'Medel säkerhet' : 'Låg säkerhet';
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-card/72 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Observationsstöd</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{confidenceLabel}</span>
      </div>
      {analysis.unclear && (
        <p className="rounded-xl border border-border/60 bg-muted/40 p-2 text-xs text-muted-foreground">
          Bilden är svårtolkad. Ta gärna ett skarpare foto i dagsljus från flera vinklar.
        </p>
      )}
      {analysis.overall_impression && (
        <p className="text-sm leading-relaxed">{analysis.overall_impression}</p>
      )}
      {observations.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Möjliga synliga tecken</p>
          <ul className="mt-1.5 space-y-1">
            {observations.map((obs, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${obs.severity === 'concern' ? 'bg-rose-500' : obs.severity === 'watch' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span>{obs.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {checks.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Kontrollera själv fysiskt</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs">
            {checks.map((check, i) => <li key={i}>{check}</li>)}
          </ul>
        </div>
      )}
      {analysis.recommendation && (
        <p className="rounded-xl border border-primary/15 bg-primary/5 p-2.5 text-xs leading-relaxed">
          <span className="font-semibold">Försiktig rekommendation:</span> {analysis.recommendation}
        </p>
      )}
      <p className="text-[10px] italic text-muted-foreground">
        Vattna aldrig enbart utifrån en bild — kontrollera alltid jorden själv först.
      </p>
    </div>
  );
}
