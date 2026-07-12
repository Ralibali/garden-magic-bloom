import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface PlantPhotoStripProps {
  plantId: string;
  plantName: string;
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
  // Accept both stored paths ("uid/plant/xyz.jpg") and full public URLs.
  const marker = '/plant-photos/';
  const index = photoUrl.indexOf(marker);
  return index === -1 ? photoUrl : photoUrl.slice(index + marker.length);
}

export default function PlantPhotoStrip({ plantId, plantName }: PlantPhotoStripProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [signed, setSigned] = useState<Record<string, string>>({});

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['plant-photos', plantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_photos')
        .select('id, photo_url, taken_at, caption')
        .eq('my_plant_id', plantId)
        .order('taken_at', { ascending: false })
        .limit(12);
      if (error) { console.warn('[plant_photos]', error); return []; }
      return data || [];
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

  return (
    <section className="rounded-[1.6rem] border border-border/60 bg-card/72 p-4 sm:p-5" aria-label={`Foton av ${plantName}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold"><Camera className="h-4 w-4 text-primary" /> Visuell utveckling</p>
          <p className="mt-1 text-xs text-muted-foreground">Ett foto då och då — appen sparar dem i ordning så du kan se växten växa.</p>
        </div>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={handlePick} disabled={upload.isPending}>
          {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          <span>Lägg till foto</span>
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} aria-hidden="true" />
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
                <img src={signed[photo.id]} alt={`${plantName} ${photo.taken_at}`} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-full w-full animate-pulse bg-muted" />
              )}
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1 text-[10px] font-medium text-white">
                {new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short' }).format(new Date(photo.taken_at))}
              </figcaption>
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
    </section>
  );
}
