import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Camera, ChevronDown, Droplets, HeartPulse, Sparkles, TrendingDown, TrendingUp, Minus, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { buildPlantWeeklySummary } from '@/lib/plantWeeklySummary';

interface PlantWeeklyCareSummaryProps {
  variant?: 'central' | 'compact';
}

export default function PlantWeeklyCareSummary({ variant = 'central' }: PlantWeeklyCareSummaryProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['plant-weekly-summary'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const sinceIso = new Date(Date.now() - 8 * 86_400_000).toISOString();
      const [plantsResult, eventsResult, wateringResult, photosResult] = await Promise.all([
        supabase.from('my_plants').select('*, plants(name_sv, watering_interval_days)'),
        supabase.from('plant_care_events' as any).select('*').gte('occurred_at', new Date(Date.now() - 40 * 86_400_000).toISOString()).order('occurred_at', { ascending: false }).limit(2000),
        supabase.from('watering_log').select('*').gte('watered_at', new Date(Date.now() - 40 * 86_400_000).toISOString()).order('watered_at', { ascending: false }).limit(2000),
        supabase.from('plant_photos').select('id, my_plant_id, taken_at, created_at').gte('created_at', sinceIso).limit(500),
      ]);
      const plants = plantsResult.data || [];
      const eventsByPlant = new Map<string, any[]>();
      ((eventsResult.data || []) as any[]).forEach(event => {
        if (!event.plant_id) return;
        const list = eventsByPlant.get(event.plant_id) || [];
        list.push(event);
        eventsByPlant.set(event.plant_id, list);
      });
      const wateringsByPlant = new Map<string, any[]>();
      (wateringResult.data || []).forEach((event: any) => {
        if (!event.plant_id) return;
        const list = wateringsByPlant.get(event.plant_id) || [];
        list.push(event);
        wateringsByPlant.set(event.plant_id, list);
      });
      return buildPlantWeeklySummary({
        plants,
        eventsByPlant,
        wateringsByPlant,
        photos: (photosResult.data || []) as any[],
      });
    },
  });

  if (isLoading) {
    return (
      <section className="premium-panel p-5 sm:p-6" aria-busy="true">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Bygger din växtvecka…</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="mt-4 h-24 rounded-2xl" />
      </section>
    );
  }

  const summary = data;
  if (!summary) return null;

  if (!summary.hasData) {
    return (
      <section className="premium-panel p-5 sm:p-6" aria-label="Din växtvecka">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="section-kicker mb-3"><CalendarDays className="h-3.5 w-3.5" /> Senaste sju dagarna</span>
            <h2 className="font-serif text-2xl sm:text-3xl">Din växtvecka</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Veckan är fortfarande stilla. En snabb jordkontroll räcker för att appen ska börja bygga en personlig rytm.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/app/my-plants')}>
            <HeartPulse className="h-4 w-4" /> Öppna växter
          </Button>
        </div>
      </section>
    );
  }

  const metrics: Array<{ label: string; value: number; Icon: typeof Droplets }> = [
    { label: 'kontroller', value: summary.healthChecks, Icon: HeartPulse },
    { label: 'vattningar', value: summary.waterings, Icon: Droplets },
    { label: 'nya foton', value: summary.photos, Icon: Camera },
    { label: 'förbättrats', value: summary.improved.length, Icon: TrendingUp },
  ];

  if (variant === 'compact') {
    const hasDetails = summary.improved.length + summary.stable.length + summary.declining.length + summary.upcoming.length > 0;
    return (
      <section className="rounded-[1.75rem] border border-border/60 bg-card/80 p-4 sm:p-5" aria-label="Din växtvecka">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="section-kicker"><CalendarDays className="h-3.5 w-3.5" /> Din växtvecka</span>
          <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => navigate('/app/my-plants')}>
            Öppna växter <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
          {metrics.map(({ label, value, Icon }) => (
            <div key={label} className="rounded-2xl border border-border/50 bg-background/40 p-2.5 sm:p-3">
              <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <p className="mt-1.5 text-xl font-bold tabular-nums leading-none">{value}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        {summary.insight && (
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>{summary.insight}</span>
          </p>
        )}
        {hasDetails && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExpanded(current => !current)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
              aria-expanded={expanded}
            >
              {expanded ? 'Dölj veckodetaljer' : 'Visa veckodetaljer'}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {expanded && (
              <div className="mt-3 space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <TrendPill title="Har förbättrats" tone="positive" Icon={TrendingUp} items={summary.improved} />
                  <TrendPill title="Stabila" tone="neutral" Icon={Minus} items={summary.stable} />
                  <TrendPill title="Behöver koll" tone="warning" Icon={TrendingDown} items={summary.declining} />
                </div>
                {summary.upcoming.length > 0 && (
                  <div className="rounded-2xl border border-border/50 bg-background/40 p-3">
                    <p className="flex items-center gap-2 text-xs font-semibold"><CalendarDays className="h-3.5 w-3.5 text-primary" /> Behöver kontroll kommande dagar</p>
                    <ul className="mt-2 space-y-1">
                      {summary.upcoming.map(item => (
                        <li key={item.id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="truncate">{item.name}</span>
                          <span className="shrink-0 text-muted-foreground">{item.daysUntil === 0 ? 'idag' : `om ${item.daysUntil} ${item.daysUntil === 1 ? 'dag' : 'dagar'}`}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    );
  }


  return (
    <section className="premium-panel p-5 sm:p-6" aria-label="Din växtvecka">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="section-kicker mb-3"><CalendarDays className="h-3.5 w-3.5" /> Senaste sju dagarna</span>
          <h2 className="font-serif text-2xl sm:text-3xl">Din växtvecka</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            En lugn sammanställning av vad som hände och vad som väntar de närmaste dagarna.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate('/app/my-plants')}>
          Öppna växter <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        {metrics.slice(0, 3).map(({ label, value, Icon }) => (
          <div key={label} className="metric-card p-3 sm:p-4">
            <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {(summary.improved.length > 0 || summary.stable.length > 0 || summary.declining.length > 0) && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <TrendPill title="Har förbättrats" tone="positive" Icon={TrendingUp} items={summary.improved} />
          <TrendPill title="Stabila" tone="neutral" Icon={Minus} items={summary.stable} />
          <TrendPill title="Behöver koll" tone="warning" Icon={TrendingDown} items={summary.declining} />
        </div>
      )}

      {summary.upcoming.length > 0 && (
        <div className="mt-5 rounded-2xl border border-border/60 bg-card/72 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" /> Behöver kontroll kommande dagar
          </p>
          <ul className="mt-3 space-y-1.5">
            {summary.upcoming.map(item => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{item.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.daysUntil === 0 ? 'idag' : `om ${item.daysUntil} ${item.daysUntil === 1 ? 'dag' : 'dagar'}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.insight && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-primary/15 bg-primary/5 p-3 text-xs leading-relaxed text-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>{summary.insight}</span>
        </p>
      )}
    </section>
  );
}

function TrendPill({ title, tone, Icon, items }: { title: string; tone: 'positive' | 'neutral' | 'warning'; Icon: typeof TrendingUp; items: Array<{ id: string; name: string }> }) {
  const toneClass =
    tone === 'positive' ? 'border-emerald-300/40 bg-emerald-500/8 text-emerald-800 dark:text-emerald-300' :
    tone === 'warning' ? 'border-rose-300/40 bg-rose-500/8 text-rose-800 dark:text-rose-300' :
    'border-border/60 bg-muted/30 text-muted-foreground';
  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold"><Icon className="h-3.5 w-3.5" aria-hidden="true" /> {title}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{items.length}</p>
      {items.length > 0 && (
        <p className="mt-0.5 truncate text-[11px] opacity-80">{items.slice(0, 2).map(i => i.name).join(', ')}{items.length > 2 ? '…' : ''}</p>
      )}
    </div>
  );
}
