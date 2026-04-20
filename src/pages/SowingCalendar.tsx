import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Sprout, Sun, Snowflake, Leaf } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Seo } from '@/hooks/useSeo';

type SowWindow = {
  variety: string;
  family: string;
  familyColor: string;
  indoor: [number, number] | null; // [startMonth, endMonth]
  outdoor: [number, number];       // [startMonth, endMonth]
  harvest: [number, number];
  notes: string;
};

// Zone adjustments: offset in months from zone 3 (base). Positive = later start.
const ZONE_OFFSET: Record<number, number> = {
  1: -1, 2: -0.5, 3: 0, 4: 0.5, 5: 0.5, 6: 1, 7: 1, 8: 1.5,
};

const SOW_DATA: SowWindow[] = [
  { variety: 'Tomat', family: 'Nattskatta', familyColor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', indoor: [2, 3], outdoor: [5, 6], harvest: [7, 9], notes: 'Förodla inomhus. Plantera ut efter sista frost.' },
  { variety: 'Paprika', family: 'Nattskatta', familyColor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', indoor: [2, 3], outdoor: [5, 6], harvest: [7, 9], notes: 'Lång säsong – förodla tidigt.' },
  { variety: 'Chili', family: 'Nattskatta', familyColor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', indoor: [1, 2], outdoor: [5, 6], harvest: [8, 10], notes: 'Förodla redan i januari för bäst resultat.' },
  { variety: 'Gurka', family: 'Gurkväxt', familyColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', indoor: [3, 4], outdoor: [5, 6], harvest: [7, 9], notes: 'Känslig för kyla. Odla gärna i växthus.' },
  { variety: 'Squash', family: 'Gurkväxt', familyColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', indoor: [4, 4], outdoor: [5, 6], harvest: [7, 9], notes: 'Kan direktsås utomhus i zon 1-3.' },
  { variety: 'Pumpa', family: 'Gurkväxt', familyColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', indoor: [4, 4], outdoor: [5, 6], harvest: [9, 10], notes: 'Behöver lång, varm säsong.' },
  { variety: 'Sallat', family: 'Korgblommig', familyColor: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300', indoor: null, outdoor: [4, 8], harvest: [5, 10], notes: 'Så i omgångar var 3:e vecka.' },
  { variety: 'Spenat', family: 'Amarantväxt', familyColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', indoor: null, outdoor: [4, 5], harvest: [5, 6], notes: 'Trivs i svalka. Kan höstsås i aug-sep.' },
  { variety: 'Morot', family: 'Flockblommig', familyColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', indoor: null, outdoor: [4, 6], harvest: [7, 10], notes: 'Direktså. Gallra till 3 cm avstånd.' },
  { variety: 'Rödbetor', family: 'Amarantväxt', familyColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', indoor: null, outdoor: [5, 6], harvest: [7, 10], notes: 'Tål lätt frost. Bra höstgrönsak.' },
  { variety: 'Lök', family: 'Amaryllisväxt', familyColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', indoor: null, outdoor: [4, 5], harvest: [8, 9], notes: 'Plantera sättlök tidigt på våren.' },
  { variety: 'Vitlök', family: 'Amaryllisväxt', familyColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', indoor: null, outdoor: [9, 10], harvest: [7, 8], notes: 'Plantera på hösten för skörd nästa sommar.' },
  { variety: 'Ärtor', family: 'Baljväxt', familyColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300', indoor: null, outdoor: [4, 5], harvest: [6, 8], notes: 'Direktså. Ge klätterstöd.' },
  { variety: 'Bönor', family: 'Baljväxt', familyColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300', indoor: null, outdoor: [5, 6], harvest: [7, 9], notes: 'Frostömma. Vänta tills jorden är varm.' },
  { variety: 'Kål (alla)', family: 'Korsblommig', familyColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', indoor: [2, 3], outdoor: [5, 6], harvest: [7, 10], notes: 'Förodla broccoli, blomkål, vitkål inomhus.' },
  { variety: 'Grönkål', family: 'Korsblommig', familyColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', indoor: [3, 4], outdoor: [5, 7], harvest: [9, 12], notes: 'Blir godare efter frost! Kan stå kvar länge.' },
  { variety: 'Rädisor', family: 'Korsblommig', familyColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', indoor: null, outdoor: [4, 8], harvest: [5, 9], notes: 'Snabbväxande – klara på 4 veckor.' },
  { variety: 'Potatis', family: 'Nattskatta', familyColor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', indoor: null, outdoor: [4, 5], harvest: [7, 9], notes: 'Förgrona inomhus i mars. Kupas regelbundet.' },
  { variety: 'Dill', family: 'Flockblommig', familyColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', indoor: null, outdoor: [4, 7], harvest: [6, 9], notes: 'Så i omgångar. Självförande.' },
  { variety: 'Basilika', family: 'Kransblommig', familyColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', indoor: [3, 4], outdoor: [6, 6], harvest: [7, 9], notes: 'Värmekrävande. Bäst i växthus i norr.' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

function getMonthIcon(month: number) {
  if (month <= 2 || month === 12) return <Snowflake className="h-3 w-3" />;
  if (month <= 5) return <Leaf className="h-3 w-3" />;
  return <Sun className="h-3 w-3" />;
}

function adjustMonth(month: number, offset: number): number {
  return Math.max(1, Math.min(12, Math.round(month + offset)));
}

export default function SowingCalendar() {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const zone = selectedZone ?? profile?.climate_zone ?? 3;
  const offset = ZONE_OFFSET[zone] ?? 0;
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="space-y-6">
      <Seo
        title={`Såkalender zon ${zone} – Odlingsdagboken`}
        description={`Se rekommenderade såtider för 20+ grönsaker i klimatzon ${zone}. Förodling, direktsådd och skördtider.`}
        path="/app/calendar"
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> Såkalender
          </h1>
          <p className="text-sm text-muted-foreground">Rekommenderade tider för zon {zone}</p>
        </div>
        <Select value={String(zone)} onValueChange={(v) => setSelectedZone(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Välj zon" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(z => (
              <SelectItem key={z} value={String(z)}>Zon {z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400" /> Förodla inomhus</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary" /> Så/plantera utomhus</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-success" /> Skörd</span>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-card z-10 min-w-[140px]">Grönsak</th>
                {MONTHS.map((m, i) => (
                  <th key={m} className={`p-2 text-center font-medium min-w-[44px] ${i + 1 === currentMonth ? 'bg-primary/5 text-primary' : 'text-muted-foreground'}`}>
                    <div className="flex flex-col items-center gap-0.5">
                      {getMonthIcon(i + 1)}
                      <span className="text-[10px]">{m}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SOW_DATA.map((crop) => {
                const indoorStart = crop.indoor ? adjustMonth(crop.indoor[0], offset) : null;
                const indoorEnd = crop.indoor ? adjustMonth(crop.indoor[1], offset) : null;
                const outdoorStart = adjustMonth(crop.outdoor[0], offset);
                const outdoorEnd = adjustMonth(crop.outdoor[1], offset);
                const harvestStart = adjustMonth(crop.harvest[0], offset);
                const harvestEnd = adjustMonth(crop.harvest[1], offset);

                return (
                  <tr key={crop.variety} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                    <td className="p-3 sticky left-0 bg-card group-hover:bg-muted/30 transition-colors z-10">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">{crop.variety}</span>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 w-fit ${crop.familyColor}`}>{crop.family}</Badge>
                      </div>
                    </td>
                    {MONTHS.map((_, mi) => {
                      const month = mi + 1;
                      const isIndoor = indoorStart !== null && indoorEnd !== null && month >= indoorStart && month <= indoorEnd;
                      const isOutdoor = month >= outdoorStart && month <= outdoorEnd;
                      const isHarvest = month >= harvestStart && month <= harvestEnd;

                      let bgClass = '';
                      if (isIndoor) bgClass = 'bg-amber-400/60 dark:bg-amber-500/30';
                      else if (isOutdoor) bgClass = 'bg-primary/40 dark:bg-primary/25';
                      else if (isHarvest) bgClass = 'bg-success/40 dark:bg-success/25';

                      return (
                        <td key={mi} className={`p-1 text-center ${month === currentMonth ? 'bg-primary/5' : ''}`}>
                          {bgClass && (
                            <div className={`w-full h-6 rounded-sm ${bgClass}`} title={
                              isIndoor ? 'Förodla' : isOutdoor ? 'Så/plantera ut' : 'Skörd'
                            } />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Tips for current month */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            🌱 Att göra i {MONTHS[currentMonth - 1].toLowerCase()} (zon {zone})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {SOW_DATA.filter(crop => {
              const oStart = adjustMonth(crop.outdoor[0], offset);
              const oEnd = adjustMonth(crop.outdoor[1], offset);
              const iStart = crop.indoor ? adjustMonth(crop.indoor[0], offset) : null;
              const iEnd = crop.indoor ? adjustMonth(crop.indoor[1], offset) : null;
              return (currentMonth >= oStart && currentMonth <= oEnd) ||
                (iStart !== null && iEnd !== null && currentMonth >= iStart && currentMonth <= iEnd);
            }).map(crop => (
              <div key={crop.variety} className="flex items-start gap-2 text-sm">
                <Sprout className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-foreground">{crop.variety}</span>
                  <span className="text-muted-foreground"> – {crop.notes}</span>
                </div>
              </div>
            ))}
            {SOW_DATA.filter(crop => {
              const oStart = adjustMonth(crop.outdoor[0], offset);
              const oEnd = adjustMonth(crop.outdoor[1], offset);
              const iStart = crop.indoor ? adjustMonth(crop.indoor[0], offset) : null;
              const iEnd = crop.indoor ? adjustMonth(crop.indoor[1], offset) : null;
              return (currentMonth >= oStart && currentMonth <= oEnd) ||
                (iStart !== null && iEnd !== null && currentMonth >= iStart && currentMonth <= iEnd);
            }).length === 0 && (
              <p className="text-muted-foreground text-sm">Inga aktiva sådder den här månaden. Dags att planera!</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
