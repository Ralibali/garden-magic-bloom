import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Plus, Trash2, Image } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

const PhotoDiary = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [bedId, setBedId] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { data: photos, isLoading } = useQuery({
    queryKey: ['plant-photos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plant_photos').select('*, beds(name)').order('taken_at', { ascending: false });
      if (error) throw error;
      // Generate signed URLs for each photo
      const withUrls = await Promise.all((data || []).map(async (photo: any) => {
        // Handle legacy public URLs (already full URLs) and new path-only values
        if (photo.photo_url?.startsWith('http')) {
          return photo;
        }
        const { data: signedData } = await supabase.storage.from('plant-photos').createSignedUrl(photo.photo_url, 3600);
        return { ...photo, photo_url: signedData?.signedUrl || photo.photo_url };
      }));
      return withUrls;
    },
  });

  const { data: beds } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('No file');
      setUploading(true);
      const userId = await getUserId();
      const ext = selectedFile.name.split('.').pop();
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('plant-photos').upload(path, selectedFile);
      if (uploadError) throw uploadError;

      // Store just the storage path (bucket is now private)
      const { error } = await supabase.from('plant_photos').insert({
        user_id: userId,
        photo_url: path,
        caption: caption || null,
        bed_id: bedId || null,
        taken_at: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-photos'] });
      setDialogOpen(false);
      setSelectedFile(null);
      setPreview(null);
      setCaption('');
      setBedId('');
      setUploading(false);
      toast({ title: 'Foto uppladdat! 📸' });
    },
    onError: () => {
      setUploading(false);
      toast({ title: 'Uppladdning misslyckades', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plant_photos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-photos'] });
      toast({ title: 'Foto borttaget' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fotodagbok</h1>
          <p className="text-muted-foreground text-sm">Dokumentera dina odlingar med bilder.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 w-fit">
          <Plus className="h-4 w-4" /> Ladda upp foto
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Laddar...</p>
      ) : !photos?.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Camera className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Inga foton ännu. Ta en bild på din odling!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo: any) => (
            <Card key={photo.id} className="overflow-hidden group">
              <div className="aspect-square relative">
                <img src={photo.photo_url} alt={photo.caption || 'Odlingsfoto'} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:text-destructive hover:bg-white/20" onClick={() => deleteMutation.mutate(photo.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <CardContent className="p-2.5">
                {photo.caption && <p className="text-xs font-medium text-foreground truncate">{photo.caption}</p>}
                <div className="flex items-center justify-between mt-0.5">
                  {(photo as any).beds?.name && <span className="text-[10px] text-muted-foreground">{(photo as any).beds.name}</span>}
                  <span className="text-[10px] text-muted-foreground">{photo.taken_at}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ladda upp foto</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                <Button variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => fileRef.current?.click()}>
                  Byt bild
                </Button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                <Image className="h-8 w-8" />
                <span className="text-sm">Klicka för att välja bild</span>
              </button>
            )}
            <Input placeholder="Bildtext (valfritt)" value={caption} onChange={e => setCaption(e.target.value)} />
            <Select value={bedId} onValueChange={setBedId}>
              <SelectTrigger><SelectValue placeholder="Koppla till bädd (valfritt)" /></SelectTrigger>
              <SelectContent>
                {beds?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => uploadMutation.mutate()} disabled={!selectedFile || uploading} className="w-full">
              {uploading ? 'Laddar upp...' : 'Ladda upp'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhotoDiary;
