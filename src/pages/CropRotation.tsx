import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

// Vegetable family classification
const FAMILY_MAP: Record<string, { family: string; color: string; label: string }> = {
  tomat: { family: 'nightshade', color: 'bg-red-100 text-red-800 border-red-200', label: 'Nattskatta' },
  paprika: { family: 'nightshade', color: 'bg-red-100 text-red-800 border-red-200', label: 'Nattskatta' },
  chili: { family: 'nightshade', color: 'bg-red-100 text-red-800 border-red-200', label: 'Nattskatta' },
  potatis: { family: 'nightshade', color: 'bg-red-100 text-red-800 border-red-200', label: 'Nattskatta' },
  aubergine: { family: 'nightshade', color: 'bg-red-100 text-red-800 border-red-200', label: 'Nattskatta' },
  morot: { family: 'root', color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Rotfrukt' },
  palsternacka: { family: 'root', color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Rotfrukt' },
  betor: { family: 'root', color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Rotfrukt' },
  rödbeta: { family: 'root', color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Rotfrukt' },
  rödbetor: { family: 'root', color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Rotfrukt' },
  lök: { family: 'root', color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Rotfrukt' },
  vitlök: { family: 'root', color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Rotfrukt' },
  böna: { family: 'legume', color: 'bg-green-100 text-green-800 border-green-200', label: 'Baljväxt' },
  bönor: { family: 'legume', color: 'bg-green-100 text-green-800 border-green-200', label: 'Baljväxt' },
  ärtor: { family: 'legume', color: 'bg-green-100 text-green-800 border-green-200', label: 'Baljväxt' },
  ärta: { family: 'legume', color: 'bg-green-100 text-green-800 border-green-200', label: 'Baljväxt' },
  kål: { family: 'brassica', color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Kål' },
  broccoli: { family: 'brassica', color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Kål' },
  blomkål: { family: 'brassica', color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Kål' },
  grönkål: { family: 'brassica', color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Kål' },
  vitkål: { family: 'brassica', color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Kål' },
  rödkål: { family: 'brassica', color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Kål' },
  rädisa: { family: 'brassica', color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Kål' },
};

const DEFAULT_FAMILY = { family: 'other', color: 'bg-muted text-muted-foreground border-border', label: 'Övrigt' };

function getFamily(variety: string) {
  const lower = variety.toLowerCase();
  for (const [key, val] of Object.entries(FAMILY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return DEFAULT_FAMILY;
}

interface BedYear {
  bedId: string;
  bedName: string;
  year: number;
  varieties: string[];
  families: string[];
  summary?: { went_well?: string; didnt_work?: string; grow_again?: string; learnings?: string };
}

export default function CropRotation() {
  const { data: beds, isLoading: bedsLoading } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });
  const { data: sowings, isLoading: sowingsLoading } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });
  const { data: summaries, isLoading: summariesLoading } = useQuery({ queryKey: ['season-summaries'], queryFn: () => api.getSeasonSummaries() });

  const isLoading = bedsLoading || sowingsLoading || summariesLoading;

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];

  // Build grid data
  const gridData: BedYear[][] = (beds || []).map((bed: any) => {
    return years.map((year) => {
      const yearSowings = (sowings || []).filter(
        (s: any) => s.bed_id === bed.id && new Date(s.sow_date).getFullYear() === year
      );
      const varieties = yearSowings.map((s: any) => s.variety);
      const families = [...new Set(varieties.map((v: string) => getFamily(v).family))];
      const summary = (summaries || []).find((s: any) => s.bed_id === bed.id && s.year === year);
      return { bedId: bed.id, bedName: bed.name, year, varieties, families, summary };
    });
  });

  // Detect same-family warnings
  function hasRepeatWarning(bedRow: BedYear[], yearIdx: number): string | null {
    if (yearIdx === 0) return null;
    const prev = bedRow[yearIdx - 1];
    const curr = bedRow[yearIdx];
    const repeated = curr.families.filter(f => f !== 'other' && prev.families.includes(f));
    if (repeated.length > 0) {
      const labels = repeated.map(f => {
        const entry = Object.values(FAMILY_MAP).find(v => v.family === f);
        return entry?.label || f;
      });
      return `Samma växtfamilj som förra året (${labels.join(', ')}) – byt plats för bättre växtföljd`;
    }
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif text-foreground">Växtföljd 🔄</h1>
        <p className="text-sm text-muted-foreground mt-1">Se vad du odlat i varje bädd – och undvik att odla samma familj på samma plats</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Nattskatta', color: 'bg-red-100 text-red-800 border-red-200' },
          { label: 'Rotfrukt', color: 'bg-orange-100 text-orange-800 border-orange-200' },
          { label: 'Baljväxt', color: 'bg-green-100 text-green-800 border-green-200' },
          { label: 'Kål', color: 'bg-blue-100 text-blue-800 border-blue-200' },
          { label: 'Övrigt', color: 'bg-muted text-muted-foreground border-border' },
        ].map(l => (
          <Badge key={l.label} variant="outline" className={`${l.color} text-xs`}>{l.label}</Badge>
        ))}
      </div>

      {(!beds || beds.length === 0) ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Skapa bäddar först för att se växtföljden. 🌿
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-sm font-serif text-foreground p-3 border-b border-border w-40">Bädd</th>
                {years.map(y => (
                  <th key={y} className="text-left text-sm font-serif text-foreground p-3 border-b border-border">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gridData.map((bedRow, rowIdx) => (
                <tr key={bedRow[0]?.bedId} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-3 font-medium text-sm text-foreground">{bedRow[0]?.bedName}</td>
                  {bedRow.map((cell, colIdx) => {
                    const warning = hasRepeatWarning(bedRow, colIdx);
                    return (
                      <td key={cell.year} className="p-3 align-top">
                        <div className="space-y-1.5">
                          {cell.varieties.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">Inget odlat</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {cell.varieties.map((v, i) => {
                                const fam = getFamily(v);
                                return (
                                  <Badge key={i} variant="outline" className={`${fam.color} text-[10px] sm:text-xs`}>
                                    {v}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                          {warning && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-amber-600">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  <span className="text-[10px] font-medium">Upprepad familj</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">{warning}</TooltipContent>
                            </Tooltip>
                          )}
                          {cell.summary?.learnings && (
                            <p className="text-[10px] text-muted-foreground italic mt-1">📝 {cell.summary.learnings}</p>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
