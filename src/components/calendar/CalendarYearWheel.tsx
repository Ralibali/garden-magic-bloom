import { useMemo, useState } from 'react';
import { Search, Sprout } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { buildYearWheel, isoWeekOfKey, MONTHS_SV, type GuideActivity, type YearWheelRow } from '@/lib/gardenCalendar';
import { GUIDE_STYLE } from './calendarStyles';

type Props = {
  year: number;
  zone: number;
  today: string;
  /** Grödor användaren odlar – med sina såddatum det här året. */
  mySowDates: Map<string, string[]>;
  onPickCrop: (crop: string) => void;
};

const WEEKS = 53;
const CATEGORY_LABEL: Record<string, string> = {
  grönsak: 'Grönsaker',
  rotfrukt: 'Rotfrukter',
  kål: 'Kål',
  bladgrönt: 'Bladgrönt',
  krydda: 'Kryddor',
  bär: 'Bär',
  flerårigt: 'Fleråriga',
};

function pct(week: number) {
  return `${((week - 1) / WEEKS) * 100}%`;
}

function Bars({ row }: { row: YearWheelRow }) {
  return (
    <>
      {row.spans.flatMap((span) => {
        const parts: [number, number][] = span.start <= span.end ? [[span.start, span.end]] : [[span.start, WEEKS], [1, span.end]];
        return parts.map(([start, end], i) => (
          <span
            key={`${span.activity}-${i}`}
            className={`absolute h-2 rounded-full ${GUIDE_STYLE[span.activity].bar} ${barOffset(span.activity)}`}
            style={{ left: pct(start), width: `${((end - start + 1) / WEEKS) * 100}%` }}
            title={`${GUIDE_STYLE[span.activity].label}: v.${span.start}–${span.end}`}
          />
        ));
      })}
    </>
  );
}

function barOffset(activity: GuideActivity) {
  // Förodling/sådd överst, utplantering i mitten, skörd nederst – så överlappen syns.
  return activity === 'skorda' ? 'top-[27px]' : activity === 'planteraUt' ? 'top-[19px]' : activity === 'direktsa' ? 'top-[11px]' : 'top-[3px]';
}

export default function CalendarYearWheel({ year, zone, today, mySowDates, onPickCrop }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('alla');
  const rows = useMemo(() => buildYearWheel(zone), [zone]);
  const currentWeek = today.startsWith(String(year)) ? isoWeekOfKey(today) : null;
  const monthMarks = useMemo(
    () => MONTHS_SV.map((name, i) => {
      const week = isoWeekOfKey(`${year}-${String(i + 1).padStart(2, '0')}-01`);
      return { name, week: i === 0 && week > 50 ? 1 : week };
    }),
    [year],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => (category === 'alla' || (category === 'mina' ? mySowDates.has(row.name) : row.category === category)))
      .filter((row) => !q || row.name.toLowerCase().includes(q))
      .sort((a, b) => Number(mySowDates.has(b.name)) - Number(mySowDates.has(a.name)));
  }, [rows, query, category, mySowDates]);

  const categories = ['alla', ...(mySowDates.size ? ['mina'] : []), ...Object.keys(CATEGORY_LABEL)];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök gröda" className="pl-9" aria-label="Sök gröda" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              aria-pressed={category === key}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${category === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border/70 hover:border-primary/40'}`}
            >
              {key === 'alla' ? 'Alla' : key === 'mina' ? 'Mina grödor' : CATEGORY_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {(Object.keys(GUIDE_STYLE) as GuideActivity[]).map((activity) => (
          <span key={activity} className="flex items-center gap-1.5"><span className={`h-2 w-4 rounded-full ${GUIDE_STYLE[activity].bar}`} /> {GUIDE_STYLE[activity].label}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-background bg-foreground" /> Din sådd</span>
      </div>

      <div className="overflow-x-auto rounded-[1.35rem] border border-border/70 bg-card/80">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[9rem_1fr] border-b border-border/70 bg-muted/35">
            <div className="p-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Zon {zone}</div>
            <div className="relative h-8">
              {monthMarks.map((mark) => (
                <span key={mark.name} className="absolute top-2 border-l border-border/60 pl-1 text-[10px] font-semibold uppercase text-muted-foreground" style={{ left: pct(mark.week) }}>
                  {mark.name.slice(0, 3)}
                </span>
              ))}
            </div>
          </div>
          {visible.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Ingen gröda matchar.</p>}
          {visible.map((row) => {
            const sowDates = mySowDates.get(row.name) ?? [];
            const mine = sowDates.length > 0;
            return (
              <div key={row.name} className={`grid grid-cols-[9rem_1fr] border-b border-border/40 last:border-0 ${mine ? 'bg-primary/[0.04]' : ''}`}>
                <button type="button" onClick={() => onPickCrop(row.name)} className="flex items-center gap-1.5 truncate p-2 text-left text-sm font-medium hover:text-primary" title={`Logga sådd av ${row.name}${row.note ? ` – ${row.note}` : ''}`}>
                  {mine && <Sprout className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Du odlar" />}
                  <span className="truncate">{row.name}</span>
                </button>
                <div className="relative h-9">
                  {monthMarks.map((mark) => <span key={mark.name} className="absolute inset-y-0 border-l border-border/30" style={{ left: pct(mark.week) }} />)}
                  {currentWeek && <span className="absolute inset-y-0 z-10 w-0.5 bg-destructive/70" style={{ left: pct(currentWeek) }} aria-hidden />}
                  <Bars row={row} />
                  {sowDates.map((date) => (
                    <span
                      key={date}
                      className="absolute top-[13px] z-20 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-background bg-foreground"
                      style={{ left: pct(isoWeekOfKey(date)) }}
                      title={`Du sådde ${date}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {mySowDates.size > 0 && (
        <div className="text-xs text-muted-foreground">
          <Badge variant="secondary" className="mr-1.5">Tips</Badge>
          Prickarna visar när du faktiskt sådde. Ligger de utanför fönstret? Anteckna varför – det blir din egen lokala såkalender nästa år.
        </div>
      )}
    </div>
  );
}
