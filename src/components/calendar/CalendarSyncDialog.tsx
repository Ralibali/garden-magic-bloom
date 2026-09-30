import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Download, Link2, Loader2, RefreshCw, ShieldCheck, Unlink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { seedRpc } from '@/lib/seedPlans';
import { calendarFeedLinks } from '@/lib/gardenCalendar';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Engångsexport som .ics-fil. */
  onDownload: () => void;
};

type FeedStatus = { created_at: string; last_accessed_at: string | null };

const STATUS_KEY = ['calendar-feed-status'];

function shortDate(iso: string) {
  return new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export default function CalendarSyncDialog({ open, onOpenChange, onDownload }: Props) {
  const queryClient = useQueryClient();
  // Token finns bara i minnet: databasen sparar enbart en hash.
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const status = useQuery({
    queryKey: STATUS_KEY,
    queryFn: async () => ((await seedRpc<FeedStatus[] | null>('calendar_feed_status', {})) ?? [])[0] ?? null,
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () => seedRpc<string>('create_calendar_feed_token', {}),
    onSuccess: (next) => {
      setToken(next);
      setCopied(false);
      void queryClient.invalidateQueries({ queryKey: STATUS_KEY });
    },
    onError: () => toast({ title: 'Länken kunde inte skapas', description: 'Försök igen om en stund.', variant: 'destructive' }),
  });

  const revoke = useMutation({
    mutationFn: () => seedRpc('revoke_calendar_feed_token', {}),
    onSuccess: () => {
      setToken(null);
      void queryClient.invalidateQueries({ queryKey: STATUS_KEY });
      toast({ title: 'Kalenderlänken är avstängd', description: 'Kalendrar som prenumererade får inga fler uppdateringar.' });
    },
    onError: () => toast({ title: 'Länken kunde inte stängas av', description: 'Försök igen om en stund.', variant: 'destructive' }),
  });

  const links = token ? calendarFeedLinks(import.meta.env.VITE_SUPABASE_URL ?? '', token) : null;
  const active = !!status.data;
  const busy = create.isPending || revoke.isPending;

  const copy = async () => {
    if (!links) return;
    try {
      await navigator.clipboard.writeText(links.https);
      setCopied(true);
    } catch {
      toast({ title: 'Kunde inte kopiera', description: 'Markera länken och kopiera den manuellt.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) { onOpenChange(next); if (!next) setToken(null); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-2xl"><Link2 className="h-5 w-5 text-primary" /> Synka med din kalender</DialogTitle>
          <DialogDescription>
            Prenumerera så dyker sådder, utplanteringar, beräknade skördar och påminnelser upp i Google, Apple eller Outlook – och uppdateras av sig själva.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3 rounded-2xl border border-primary/25 bg-primary/[0.04] p-4">
          <h3 className="text-sm font-semibold">Prenumerera <span className="font-normal text-muted-foreground">· rekommenderas</span></h3>

          {status.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Kollar din länk…</p>}

          {links ? (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <Button asChild variant="outline" size="sm"><a href={links.google} target="_blank" rel="noopener noreferrer">Google</a></Button>
                <Button asChild variant="outline" size="sm"><a href={links.webcal}>Apple / iPhone</a></Button>
                <Button asChild variant="outline" size="sm"><a href={links.outlook} target="_blank" rel="noopener noreferrer">Outlook</a></Button>
              </div>
              <div className="flex gap-2">
                <Input readOnly value={links.https} aria-label="Din kalenderlänk" onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                <Button type="button" variant="secondary" onClick={() => void copy()} aria-label="Kopiera länken">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="flex gap-2 rounded-xl bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                Länken är hemlig och visas bara nu. Den som har den kan se din odlingskalender, så dela den inte. Tappar du bort den skapar du en ny.
              </p>
            </div>
          ) : active && status.data ? (
            <div className="space-y-2 text-sm">
              <p>
                Din länk är aktiv sedan {shortDate(status.data.created_at)}.
                {status.data.last_accessed_at
                  ? ` Senast hämtad ${shortDate(status.data.last_accessed_at)}.`
                  : ' Ingen kalender har hämtat den ännu.'}
              </p>
              <p className="text-xs text-muted-foreground">Av säkerhetsskäl sparar vi bara ett fingeravtryck av länken. Behöver du lägga in den igen skapar du en ny – den gamla slutar då att fungera.</p>
            </div>
          ) : !status.isLoading ? (
            <p className="text-sm text-muted-foreground">Du får en hemlig länk som din kalenderapp hämtar ungefär var sjätte timme.</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!links && (
              <Button onClick={() => create.mutate()} disabled={busy || status.isLoading} className="gap-2">
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? <RefreshCw className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                {active ? 'Skapa ny länk' : 'Skapa prenumerationslänk'}
              </Button>
            )}
            {(active || links) && (
              <Button variant="ghost" onClick={() => revoke.mutate()} disabled={busy} className="gap-2 text-destructive hover:text-destructive">
                <Unlink className="h-4 w-4" /> Stäng av länken
              </Button>
            )}
          </div>
        </section>

        <section className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 p-4">
          <div>
            <h3 className="text-sm font-semibold">Ladda ner en gång</h3>
            <p className="text-xs text-muted-foreground">En .ics-fil med läget just nu. Uppdateras inte.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={onDownload}><Download className="h-4 w-4" /> .ics</Button>
        </section>
      </DialogContent>
    </Dialog>
  );
}
