import { useMemo, useState } from 'react';
import { Check, Loader2, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { sowingMatrix } from '@/data/sowingMatrix';
import { buildSeasonPlan, formatLongDate, MONTHS_SV, type SeasonPlanItem } from '@/lib/gardenCalendar';
import { GUIDE_STYLE } from './calendarStyles';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: number;
  today: string;
  /** Grödor användaren odlat tidigare – förvalda. */
  suggestedCrops: string[];
  /** Planer som redan finns som påminnelser (source_action_id). */
  existingKeys: Set<string>;
  onCreate: (items: SeasonPlanItem[], onProgress: (done: number) => void) => Promise<number>;
};

const CATEGORY_ORDER: { key: string; label: string }[] = [
  { key: 'grönsak', label: 'Grönsaker' },
  { key: 'rotfrukt', label: 'Rotfrukter' },
  { key: 'kål', label: 'Kål' },
  { key: 'bladgrönt', label: 'Bladgrönt' },
  { key: 'krydda', label: 'Kryddor' },
  { key: 'bär', label: 'Bär' },
  { key: 'flerårigt', label: 'Fleråriga' },
];

export default function CalendarSeasonPlanner({ open, onOpenChange, zone, today, suggestedCrops, existingKeys, onCreate }: Props) {
  const thisYear = Number(today.slice(0, 4));
  // Från september planerar de flesta nästa säsong.
  const [year, setYear] = useState(() => (Number(today.slice(5, 7)) >= 9 ? thisYear + 1 : thisYear));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(suggestedCrops));
  const [progress, setProgress] = useState<number | null>(null);

  const plan = useMemo(() => buildSeasonPlan([...selected], zone, year, today), [selected, zone, year, today]);
  const fresh = useMemo(() => plan.filter((item) => !existingKeys.has(item.key)), [plan, existingKeys]);
  const byMonth = useMemo(() => {
    const groups = new Map<number, SeasonPlanItem[]>();
    for (const item of fresh) {
      const month = Number(item.date.slice(5, 7));
      groups.set(month, [...(groups.get(month) ?? []), item]);
    }
    return [...groups.entries()];
  }, [fresh]);

  const toggle = (crop: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(crop)) next.delete(crop);
    else next.add(crop);
    return next;
  });

  const create = async () => {
    if (!fresh.length || progress !== null) return;
    setProgress(0);
    try {
      const created = await onCreate(fresh, setProgress);
      if (created > 0) onOpenChange(false);
    } finally {
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (progress === null) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-2xl"><Wand2 className="h-5 w-5 text-primary" /> Planera säsongen</DialogTitle>
          <DialogDescription>
            Välj vad du vill odla. Kalendern lägger in påminnelser för förodling, sådd, utplantering och skörd enligt zon {zone}, så att du aldrig missar ett såfönster.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Säsong</span>
          {[thisYear, thisYear + 1].map((y) => (
            <button
              key={y}
              type="button"
              aria-pressed={year === y}
              onClick={() => setYear(y)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${year === y ? 'border-primary bg-primary text-primary-foreground' : 'border-border/70 hover:border-primary/40'}`}
            >
              {y}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {CATEGORY_ORDER.map((category) => {
            const crops = sowingMatrix.filter((c) => c.category === category.key);
            if (!crops.length) return null;
            return (
              <div key={category.key}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{category.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {crops.map((crop) => {
                    const on = selected.has(crop.name);
                    return (
                      <button
                        key={crop.name}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(crop.name)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${on ? 'border-primary bg-primary/12 text-primary' : 'border-border/70 hover:border-primary/40'}`}
                      >
                        {on && <Check className="h-3 w-3" />}{crop.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/25 p-3">
          <p className="text-sm font-semibold">
            {fresh.length ? `${fresh.length} ${fresh.length === 1 ? 'ny påminnelse' : 'nya påminnelser'}` : selected.size ? 'Inget nytt att lägga in' : 'Välj minst en gröda'}
            {plan.length > fresh.length && <span className="font-normal text-muted-foreground"> · {plan.length - fresh.length} finns redan</span>}
          </p>
          {byMonth.length > 0 && (
            <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
              {byMonth.map(([month, items]) => (
                <div key={month}>
                  <p className="text-[11px] font-semibold first-letter:uppercase text-muted-foreground">{MONTHS_SV[month - 1]}</p>
                  <ul className="mt-1 space-y-0.5">
                    {items.map((item) => (
                      <li key={item.key} className="flex items-center gap-2 text-xs">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${GUIDE_STYLE[item.step].bar}`} />
                        <span className="w-24 shrink-0 first-letter:uppercase text-muted-foreground">{formatLongDate(item.date).split(' ').slice(0, 2).join(' ')}</span>
                        <span>{item.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={progress !== null}>Avbryt</Button>
          <Button onClick={() => void create()} disabled={!fresh.length || progress !== null} className="gap-2">
            {progress !== null ? <><Loader2 className="h-4 w-4 animate-spin" /> Sparar {progress}/{fresh.length}</> : <>{fresh.length === 1 ? 'Lägg in 1 påminnelse' : `Lägg in ${fresh.length || ''} påminnelser`}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
