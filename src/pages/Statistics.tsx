import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Sprout, Carrot, LayoutGrid, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animations';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(280 67% 55%)',
  'hsl(199 89% 48%)',
  'hsl(346 77% 50%)',
  'hsl(168 76% 42%)',
  'hsl(45 93% 47%)',
];

const Statistics = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;

  const { data: stats, isLoading } = useQuery({ queryKey: ['summary-stats'], queryFn: api.getSummaryStats });
  const { data: harvests } = useQuery({ queryKey: ['harvests'], queryFn: api.getHarvests });
  const { data: sowings } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });

  // Harvest per month (current year vs previous year)
  const harvestByMonth = useMemo(() => {
    if (!harvests) return [];
    const months = MONTH_NAMES.map((name, i) => ({ name, current: 0, previous: 0 }));
    harvests.forEach((h: any) => {
      const date = new Date(h.harvest_date);
      const month = date.getMonth();
      const year = date.getFullYear();
      const kg = (h.weight_grams || 0) / 1000;
      if (year === currentYear) months[month].current += kg;
      else if (year === prevYear) months[month].previous += kg;
    });
    return months.map(m => ({ ...m, current: +m.current.toFixed(2), previous: +m.previous.toFixed(2) }));
  }, [harvests, currentYear, prevYear]);

  // Sowings by variety (current year)
  const sowingsByVariety = useMemo(() => {
    if (!sowings) return [];
    const counts: Record<string, number> = {};
    sowings.forEach((s: any) => {
      const year = new Date(s.sow_date).getFullYear();
      if (year === currentYear) {
        counts[s.variety] = (counts[s.variety] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [sowings, currentYear]);

  // Year-over-year comparison
  const yoyComparison = useMemo(() => {
    if (!harvests || !sowings) return null;
    const currHarvest = harvests.filter((h: any) => new Date(h.harvest_date).getFullYear() === currentYear);
    const prevHarvest = harvests.filter((h: any) => new Date(h.harvest_date).getFullYear() === prevYear);
    const currSowings = sowings.filter((s: any) => new Date(s.sow_date).getFullYear() === currentYear);
    const prevSowings = sowings.filter((s: any) => new Date(s.sow_date).getFullYear() === prevYear);

    const currKg = currHarvest.reduce((s: number, h: any) => s + (h.weight_grams || 0), 0) / 1000;
    const prevKg = prevHarvest.reduce((s: number, h: any) => s + (h.weight_grams || 0), 0) / 1000;

    return {
      harvestKgCurr: currKg,
      harvestKgPrev: prevKg,
      harvestDiff: prevKg > 0 ? ((currKg - prevKg) / prevKg * 100) : null,
      sowingsCurr: currSowings.length,
      sowingsPrev: prevSowings.length,
      sowingsDiff: prevSowings.length > 0 ? ((currSowings.length - prevSowings.length) / prevSowings.length * 100) : null,
    };
  }, [harvests, sowings, currentYear, prevYear]);

  // Top varieties by harvest weight
  const topVarieties = useMemo(() => {
    if (!harvests) return [];
    const weights: Record<string, number> = {};
    harvests.forEach((h: any) => {
      if (new Date(h.harvest_date).getFullYear() === currentYear) {
        weights[h.variety] = (weights[h.variety] || 0) + (h.weight_grams || 0);
      }
    });
    return Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([variety, grams]) => ({ variety, kg: +(grams / 1000).toFixed(2) }));
  }, [harvests, currentYear]);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  const isEmpty = stats?.active_beds === 0 && stats?.sowings_this_year === 0 && stats?.harvest_kg === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Statistik {currentYear}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> Bäddar</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.active_beds ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Sprout className="h-4 w-4" /> Sådder i år</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.sowings_this_year ?? 0}</p>
            {yoyComparison?.sowingsDiff !== null && yoyComparison?.sowingsDiff !== undefined && (
              <DiffBadge diff={yoyComparison.sowingsDiff} label={`vs ${prevYear}`} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Carrot className="h-4 w-4" /> Skörd i år</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{(stats?.harvest_kg ?? 0).toFixed(1)} kg</p>
            {yoyComparison?.harvestDiff !== null && yoyComparison?.harvestDiff !== undefined && (
              <DiffBadge diff={yoyComparison.harvestDiff} label={`vs ${prevYear}`} />
            )}
          </CardContent>
        </Card>
      </div>

      {isEmpty ? (
        <Card className="bg-primary/5 border-primary/15">
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-muted-foreground">Börja logga sådder och skördar så fylls statistiken på automatiskt! 🌱</p>
            <Button onClick={() => navigate('/app/sowings')} className="gap-2"><Sprout className="h-4 w-4" /> Lägg till din första sådning</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Harvest per month bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skörd per månad (kg)</CardTitle>
              <p className="text-xs text-muted-foreground">{currentYear} jämfört med {prevYear}</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={harvestByMonth} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`${value} kg`]}
                  />
                  <Bar dataKey="current" name={String(currentYear)} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="previous" name={String(prevYear)} fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sowings by variety pie chart */}
            {sowingsByVariety.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sådder per sort {currentYear}</CardTitle>
                  <p className="text-xs text-muted-foreground">Topp {sowingsByVariety.length} sorter</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={sowingsByVariety}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                        style={{ fontSize: 11 }}
                      >
                        {sowingsByVariety.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }}
                        formatter={(value: number) => [`${value} sådder`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Top varieties by harvest */}
            {topVarieties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bästa sorter efter skörd 🏆</CardTitle>
                  <p className="text-xs text-muted-foreground">Topp 5 i år</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topVarieties.map((v, i) => {
                    const maxKg = topVarieties[0].kg;
                    const pct = maxKg > 0 ? (v.kg / maxKg) * 100 : 0;
                    return (
                      <div key={v.variety} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{i + 1}. {v.variety}</span>
                          <span className="text-muted-foreground">{v.kg} kg</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};

function DiffBadge({ diff, label }: { diff: number; label: string }) {
  const isPositive = diff >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs mt-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}{diff.toFixed(0)}% {label}
    </span>
  );
}

export default Statistics;
