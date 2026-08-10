import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { MONTH_NAMES_SV } from '@/lib/seoData';

interface Props {
  /** Månad 1–12. Standard: innevarande månad. */
  month?: number;
  description?: string;
  className?: string;
}

/**
 * Intern länk från verktygssidorna in i odlingskalendern.
 * Ankartexten är beskrivande med månadsnamnet, inte "läs mer".
 */
export default function CalendarCrossLink({ month, description, className = '' }: Props) {
  const monthNumber = month && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1;
  const monthName = MONTH_NAMES_SV[monthNumber - 1];

  return (
    <div className={`rounded-2xl border border-border/60 bg-card/60 p-5 ${className}`}>
      <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-primary font-semibold mb-2">
        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Månad för månad
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
        {description || `Vill du se allt som händer i odlingen just nu – sådder, utplantering, skörd och skötsel?`}
      </p>
      <Link
        to={`/odlingskalender/${monthName}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        Se hela odlingskalendern för {monthName} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
