import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bot, Camera, Image, Plus, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import AppEmptyState from '@/components/AppEmptyState';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import { localDateKey } from '@/lib/gardenToday';
import { approximateDataUrlBytes, imageUrlToDataUrl } from '@/lib/images';
import { recordProductActivity } from '@/lib/analytics';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_GRO_IMAGE_BYTES = 1_500_000;

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Inte inloggad');
  return user.id;
}

export default function PhotoDiary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [bedId, setBedId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['plant-photos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plant_photos').select('*, beds(name)').order('taken_at', { ascending: false });
      if (error) throw error;
      return Promise.all((data || []).map(async (photo: any) => {
        const storagePath = photo.photo_url;
        if (storagePath?.startsWith('http')) return { ...photo, display_url: storagePath, storage_path: null };
        const { data: signedData, error: signedError } = await supabase.storage.from('plant-photos').createSignedUrl(storagePath, 3600);
        if (signedError) console.error('Kunde inte skapa signerad bildadress', signedError);
        return { ...photo, display_url: signedData?.signedUrl || '', storage_path: storagePath };
      }));
    },
  });
  const { data: beds = [] } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });

  const clearSelection = () => {
    if (preview) URL.revokeObjectURL(preview);
    setSelectedFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Välj en bildfil', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: 'Bilden är för stor', description: 'Välj en bild som är mindre än 15 MB.', variant: 'destructive' });
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Välj en bild först');
      const userId = await getUserId();
      const extension = selectedFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('plant-photos').upload(path, selectedFile, { contentType: selectedFile.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase.from('plant_photos').insert({
        user_id: userId,
        photo_url: path,
        caption: caption.trim() || null,
        bed_id: bedId || null,
        taken_at: localDateKey(),
      }).select('id').single();
      if (error) {
        await supabase.storage.from('plant-photos').remove([path]);
        throw error;
      }
      return data;
    },
    onSuccess: (photo) => {
      queryClient.invalidateQueries({ queryKey: ['plant-photos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-photos'] });
      setDialogOpen(false);
      clearSelection();
      setCaption('');
      setBedId('');
      void recordProductActivity('garden_photo_uploaded', { photo_id: photo.id, has_caption: !!caption.trim(), has_bed: !!bedId });
      toast({ title: 'Foto uppladdat! 📸' });
    },
    onError: (error: any) => toast({ title: 'Uppladdningen misslyckades', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (photo: any) => {
      const { error } = await supabase.from('plant_photos').delete().eq('id', photo.id);
      if (error) throw error;
      if (photo.storage_path) {
        const { error: storageError } = await supabase.storage.from('plant-photos').remove([photo.storage_path]);
        if (storageError) console.error('Kunde inte radera den underliggande bildfilen', storageError);
      }
      return photo.id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['plant-photos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-photos'] });
      void recordProductActivity('garden_photo_deleted', { photo_id: id });
      toast({ title: 'Foto borttaget' });
    },
    onError: (error: any) => toast({ title: 'Kunde inte ta bort fotot', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const analyzeWithGro = async (photo: any) => {
    if (!photo.display_url) {
      toast({ title: 'Bilden kunde inte öppnas', variant: 'destructive' });
      return;
    }
    setAnalyzingId(photo.id);
    try {
      const imageData = await imageUrlToDataUrl(photo.display_url);
      if (approximateDataUrlBytes(imageData) > MAX_GRO_IMAGE_BYTES) throw new Error('Bilden blev för stor för analys');
      const bedContext = photo.beds?.name ? ` Bilden är kopplad till bädden ${photo.beds.name}.` : '';
      const captionContext = photo.caption ? ` Min bildtext är: ${photo.caption}.` : '';
      const prompt = `Analysera det här odlingsfotot från ${photo.taken_at}.${bedContext}${captionContext} Beskriv först vad du faktiskt ser, ange hur säker du är och ge konkreta nästa steg.`;
      void recordProductActivity('garden_photo_opened_in_gro', { photo_id: photo.id });
      navigate('/app/gro', { state: { prompt, imageData, source: 'photo_diary' } });
    } catch (error: any) {
      toast({ title: 'Kunde inte förbereda bilden för Gro', description: error?.message || 'Försök igen.', variant: 'destructive' });
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="premium-panel relative overflow-hidden p-5 sm:p-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/8 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><span className="section-kicker mb-3"><Sparkles className="h-3.5 w-3.5" /> Se förändringen över tid</span><h1 className="page-title">Fotodagbok</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Dokumentera utveckling, problem och skörd. Ett sparat foto kan skickas direkt till Gro för analys.</p></div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Ladda upp foto</Button>
        </div>
      </section>

      {isLoading ? <Card><CardContent className="p-8 text-sm text-muted-foreground">Laddar fotodagboken…</CardContent></Card> : !photos.length ? <AppEmptyState icon={Camera} eyebrow="Din visuella historik" title="Inga foton ännu" description="Ta bilder med jämna mellanrum. Då blir det lättare att upptäcka förändringar och jämföra säsonger." actionLabel="Ladda upp första fotot" onAction={() => setDialogOpen(true)} secondaryLabel="Öppna Gro" onSecondary={() => navigate('/app/gro')} /> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{photos.map((photo: any) => <Card key={photo.id} className="group overflow-hidden hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]"><div className="aspect-square relative bg-muted">{photo.display_url ? <img src={photo.display_url} alt={photo.caption || 'Odlingsfoto'} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><Image className="h-8 w-8" /></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-70" /><div className="absolute bottom-2 left-2 right-2 flex gap-2"><Button size="sm" className="flex-1 bg-white/92 text-emerald-950 hover:bg-white" onClick={() => void analyzeWithGro(photo)} disabled={analyzingId === photo.id}><Bot className="h-3.5 w-3.5" /> {analyzingId === photo.id ? 'Förbereder…' : 'Analysera'}</Button><ConfirmDeleteButton itemName={photo.caption || 'fotot'} description="Fotot och den lagrade bildfilen tas bort permanent." disabled={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(photo)} /></div></div><CardContent className="p-3"><p className="truncate text-sm font-semibold">{photo.caption || 'Odlingsfoto'}</p><div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground"><span className="truncate">{photo.beds?.name || 'Ingen bädd'}</span><span className="shrink-0">{photo.taken_at}</span></div></CardContent></Card>)}</div>}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) clearSelection(); }}><DialogContent><DialogHeader><DialogTitle>Ladda upp foto</DialogTitle></DialogHeader><div className="space-y-4"><input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />{preview ? <div className="relative"><img src={preview} alt="Förhandsvisning" className="h-56 w-full rounded-2xl object-cover" /><Button variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => fileRef.current?.click()}>Byt bild</Button></div> : <button type="button" onClick={() => fileRef.current?.click()} className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"><Image className="h-8 w-8" /><span className="text-sm">Välj bild eller öppna kameran</span></button>}<Input placeholder="Bildtext (valfritt)" value={caption} onChange={(event) => setCaption(event.target.value)} /><Select value={bedId} onValueChange={setBedId}><SelectTrigger><SelectValue placeholder="Koppla till bädd (valfritt)" /></SelectTrigger><SelectContent>{beds.map((bed: any) => <SelectItem key={bed.id} value={bed.id}>{bed.name}</SelectItem>)}</SelectContent></Select><Button onClick={() => uploadMutation.mutate()} disabled={!selectedFile || uploadMutation.isPending} className="w-full">{uploadMutation.isPending ? 'Laddar upp…' : 'Ladda upp'}</Button></div></DialogContent></Dialog>
    </div>
  );
}
