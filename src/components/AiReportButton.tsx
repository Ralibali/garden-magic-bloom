import { useRef, useState } from 'react';
import { Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

export default function AiReportButton({ content }: { content: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [reason, setReason] = useState('Felaktigt eller riskabelt råd');
  const [comment, setComment] = useState('');
  const reportId = useRef(crypto.randomUUID());
  const send = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const message = `[Gro · AI-rapport]\nKategori: ${reason}\nKommentar: ${comment.trim()}\nRapporterat svar:\n${content.slice(0, 6000)}`;
      const { error } = await supabase.from('feedback').insert({ id: reportId.current, user_id: user.id, status: 'new', message });
      // A retry after a lost response must not create a duplicate report.
      if (error && error.code !== '23505') throw error;
      setSent(true); setOpen(false); toast.success('Tack. Rapporten har skickats till Odlingsdagboken.');
    } catch { toast.error('Rapporten kunde inte skickas. Försök igen när du har internet.'); }
    finally { setBusy(false); }
  };
  return <><button type="button" className="flex items-center gap-1 text-xs text-muted-foreground min-h-11" disabled={sent} onClick={() => setOpen(true)}><Flag className="h-3 w-3" />{sent ? 'Rapporterat' : 'Rapportera svaret'}</button><Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent><DialogHeader><DialogTitle>Rapportera AI-svaret</DialogTitle><DialogDescription>Det här svaret och din kommentar skickas till Odlingsdagboken för granskning. Bilder och resten av samtalet följer inte med.</DialogDescription></DialogHeader><Label htmlFor={`reason-${reportId.current}`}>Vad är problemet?</Label><select id={`reason-${reportId.current}`} disabled={busy} className="border rounded-md p-3 bg-background text-sm" value={reason} onChange={e => setReason(e.target.value)}>{['Felaktigt eller riskabelt råd', 'Stötande eller olämpligt innehåll', 'Personuppgifter', 'Annat problem'].map(value => <option key={value}>{value}</option>)}</select><Label htmlFor={`comment-${reportId.current}`}>Kommentar (valfritt)</Label><Textarea id={`comment-${reportId.current}`} disabled={busy} value={comment} maxLength={1000} onChange={e => setComment(e.target.value)} /><Button disabled={busy} onClick={() => void send()}>{busy ? 'Skickar…' : 'Skicka rapport'}</Button></DialogContent></Dialog></>;
}
