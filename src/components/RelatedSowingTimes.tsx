import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { queryName, relatedGuideCrops, SATIDER_PATH, verbFor } from '@/lib/sowingGuide';

interface Props {
  /** Texten grödorna letas i, t.ex. artikelns titel, taggar och ingress. */
  text: string;
  className?: string;
}

/** Länkar från en artikel till såtiderna för grödorna den handlar om. */
export default function RelatedSowingTimes({ text, className = '' }: Props) {
  const crops = useMemo(() => relatedGuideCrops(text), [text]);
  if (!crops.length) return null;
  return (
    <aside aria-label="Såtider för grödorna i artikeln" className={`rounded-2xl border border-border/60 bg-card/60 p-5 ${className}`}>
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Såtider i din zon
      </p>
      <ul className="flex flex-wrap gap-2 text-sm">
        {crops.map((crop) => (
          <li key={crop.slug}>
            <Link to={`${SATIDER_PATH}/${crop.slug}`} className="inline-block rounded-full border border-border/70 px-3 py-1.5 hover:border-primary/40 hover:text-primary">
              När ska man {verbFor(crop.name)} {queryName(crop.name)}?
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
