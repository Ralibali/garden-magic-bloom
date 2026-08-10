import { useState } from 'react';
import { Download, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { plausibleEvent } from '@/lib/plausible';

const FUNCTIONS_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

interface Props {
  zone: number;
  className?: string;
}

/** Lead magnet: laddar ner hela årets odlingskalender som PDF för valfri zon. */
export default function CalendarPdfDownload({ zone, className = '' }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const year = new Date().getFullYear();

  const download = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${FUNCTIONS_BASE}/calendar-pdf?zon=${zone}`);
      if (!response.ok) throw new Error('pdf_failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `odlingskalender-${year}-zon-${zone}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      plausibleEvent('calendar_pdf_download', { zone: String(zone) });
    } catch {
      setError('Kunde inte skapa PDF:en just nu. Försök igen om en stund.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6 ${className}`}>
      <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-primary font-semibold mb-2">
        <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Gratis nedladdning
      </p>
      <h2 className="font-serif text-xl sm:text-2xl text-foreground mb-2">
        Hela odlingskalendern {year} för zon {zone} som PDF
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-2xl">
        Alla månader på ett ställe – förodling, utplantering, direktsådd och skörd räknat efter din zon.
        Skriv ut och sätt upp i växthuset.
      </p>
      <Button onClick={download} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {loading ? 'Skapar PDF…' : `Ladda ner PDF för zon ${zone}`}
      </Button>
      {error && <p className="text-sm text-destructive mt-3" role="alert">{error}</p>}
    </div>
  );
}
