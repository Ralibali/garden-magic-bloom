import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Check, ChevronRight, CloudSun, Droplets, HeartPulse, Leaf, Sprout, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardPriorityResult, PriorityAction } from '@/lib/dashboardPriority';

interface Props {
  result: DashboardPriorityResult;
  greeting?: string;
  weatherLine?: string | null;
}

const iconFor: Record<PriorityAction['kind'], React.ComponentType<{ className?: string }>> = {
  plant_care: HeartPulse,
  reminder: AlertTriangle,
  sowing: Sprout,
  harvest: Leaf,
  weather: CloudSun,
};

export default function PrimaryActionCard({ result, greeting, weatherLine }: Props) {
  const navigate = useNavigate();
  const { primaryAction, secondaryActions, insight, allDone, nextCheck } = result;

  if (allDone) {
    return (
      <section
        className="premium-panel p-6 sm:p-8"
        aria-live="polite"
        aria-label="Klart för idag"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Check className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Idag</p>
              <h2 className="mt-1 font-serif text-2xl sm:text-3xl leading-tight">
                {greeting ? `${greeting} — klart för idag.` : 'Klart för idag.'}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-md leading-relaxed">
                {nextCheck
                  ? `Nästa förväntade kontroll: ${nextCheck.title} om ${nextCheck.inDays} ${nextCheck.inDays === 1 ? 'dag' : 'dagar'}.`
                  : 'Ingen åtgärd behövs just nu. Dokumentera dagens läge med ett foto om du vill.'}
              </p>
              {weatherLine && (
                <p className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <CloudSun className="h-3.5 w-3.5" aria-hidden="true" /> {weatherLine}
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/app/photos')} className="shrink-0">
            <Leaf className="h-4 w-4" aria-hidden="true" /> Lägg till foto
          </Button>
        </div>
      </section>
    );
  }

  if (!primaryAction) return null;
  const Icon = iconFor[primaryAction.kind] || Droplets;

  return (
    <section className="premium-panel overflow-hidden" aria-label="Dagens viktigaste åtgärd">
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Idag — viktigast</p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl leading-tight">{primaryAction.title}</h2>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
              {primaryAction.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={() => navigate(primaryAction.actionPath)}>
                {primaryAction.actionLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              {weatherLine && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <CloudSun className="h-3.5 w-3.5" aria-hidden="true" /> {weatherLine}
                </span>
              )}
            </div>
          </div>
        </div>

        {secondaryActions.length > 0 && (
          <ul className="mt-5 grid gap-2 border-t border-border/50 pt-4 sm:grid-cols-2" aria-label="Sekundära åtgärder">
            {secondaryActions.map((action) => {
              const SecIcon = iconFor[action.kind] || Droplets;
              return (
                <li key={action.id}>
                  <button
                    type="button"
                    onClick={() => navigate(action.actionPath)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                      <SecIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{action.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{action.description}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {insight && (
          <p className="mt-4 inline-flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" aria-hidden="true" />
            <span>{insight.text}</span>
          </p>
        )}
      </div>
    </section>
  );
}
