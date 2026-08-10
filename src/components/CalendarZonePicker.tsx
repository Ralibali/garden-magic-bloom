import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

interface Props {
  zone: number;
  onChange: (zone: number) => void;
  className?: string;
  compact?: boolean;
}

const ZONES = [1, 2, 3, 4, 5, 6, 7, 8];

export default function CalendarZonePicker({ zone, onChange, className = '', compact = false }: Props) {
  return (
    <div className={`rounded-2xl border border-border/60 bg-card/70 p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
          <MapPin className="h-4 w-4 text-primary" aria-hidden="true" /> Din klimatzon
        </span>
        <div role="group" aria-label="Välj klimatzon" className="flex flex-wrap gap-1.5">
          {ZONES.map(z => (
            <Button
              key={z}
              type="button"
              size="sm"
              variant={z === zone ? 'default' : 'outline'}
              aria-pressed={z === zone}
              onClick={() => onChange(z)}
              className="h-9 w-9 rounded-full p-0 text-xs font-semibold"
            >
              {z}
            </Button>
          ))}
        </div>
      </div>
      {!compact && (
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
          Zonen ändrar vecknumren i kalendern, inte adressen till sidan. Valet sparas och följer med till
          såkalendern och odlingsplanen.
        </p>
      )}
    </div>
  );
}
