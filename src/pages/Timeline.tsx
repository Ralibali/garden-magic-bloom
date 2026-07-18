import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sprout, Carrot, Calendar, Shovel, Sparkles, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import AppEmptyState from '@/components/AppEmptyState';
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animations';
import { cn } from '@/lib/utils';

type EventType = 'sowing' | 'transplant' | 'harvest';

interface TimelineEvent {
  id: string;
  date: string;
  type: EventType;
  title: string;
  subtitle?: string;
  icon: typeof Sprout;
}

const TYPE_META: Record<EventType, { label: string; dot: string; text: string }> = {
  sowing: { label: 'Sådd', dot: 'bg-primary', text: 'text-primary' },
  transplant: { label: 'Utplantering', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-300' },
  harvest: { label: 'Skörd', dot: 'bg-accent', text: 'text-accent' },
};

const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

const Timeline = () => {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<EventType | 'alla'>('alla');
  const { data: sowings, isLoading: sowingsLoading } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });
  const { data: harvests, isLoading: harvestsLoading } = useQuery({ queryKey: ['harvests'], queryFn: api.getHarvests });

  const isLoading = sowingsLoading || harvestsLoading;

  const events: TimelineEvent[] = useMemo(() => {
    const all: TimelineEvent[] = [
      ...(sowings || []).map((s: any) => ({
        id: `s-${s.id}`,
        date: s.sow_date,
        type: 'sowing' as const,
        title: `Sådde ${s.variety}`,
        subtitle: [s.beds?.name ? `i ${s.beds.name}` : null, s.seed_brand ? `(${s.seed_brand})` : null].filter(Boolean).join(' ') || undefined,
        icon: Sprout,
      })),
      // Utplanteringar — sätts automatiskt när en sådd markeras som utplanterad
      ...(sowings || [])
        .filter((s: any) => s.transplant_date)
        .map((s: any) => ({
          id: `t-${s.id}`,
          date: s.transplant_date,
          type: 'transplant' as const,
          title: `Planterade ut ${s.variety}`,
          subtitle: s.beds?.name ? `i ${s.beds.name}` : undefined,
          icon: Shovel,
        })),
      ...(harvests || []).map((h: any) => ({
        id: `h-${h.id}`,
        date: h.harvest_date,
        type: 'harvest' as const,
        title: `Skördade ${h.variety}`,
        subtitle: [h.weight_grams ? `${(h.weight_grams / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 1 })} kg` : null, h.beds?.name ? `från ${h.beds.name}` : null].filter(Boolean).join(' · ') || undefined,
        icon: Carrot,
      })),
    ];
    const filtered = typeFilter === 'alla' ? all : all.filter((e) => e.type === typeFilter);
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sowings, harvests, typeFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {};
    events.forEach((e) => {
      const d = new Date(e.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <FadeIn>
        <section className="premium-panel relative overflow-hidden p-5 sm:p-6">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative">
            <span className="section-kicker mb-3"><Sparkles className="h-3.5 w-3.5" /> Din odling i kronologisk ordning</span>
            <h1 className="page-title">Tidslinje</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Varje sådd, utplantering och skörd samlad — din personliga odlingsdagbok, månad för månad.</p>
          </div>
        </section>
      </FadeIn>

      {!isLoading && events.length > 0 && (
        <FadeIn delay={0.05}>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {(['alla', 'sowing', 'transplant', 'harvest'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
                  typeFilter === key
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border/70 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
                )}
              >
                {key === 'alla' ? 'Alla händelser' : TYPE_META[key].label}
              </button>
            ))}
          </div>
        </FadeIn>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 rounded-[1.35rem]" />)}</div>
      ) : events.length === 0 ? (
        <AppEmptyState
          icon={Calendar}
          title={typeFilter === 'alla' ? 'Din tidslinje väntar på sitt första inlägg' : 'Inga sådana händelser ännu'}
          description={typeFilter === 'alla' ? 'När du börjar logga sådder, utplanteringar och skördar byggs din personliga odlingshistorik upp här — månad för månad, år efter år.' : 'Prova ett annat filter eller logga en ny aktivitet.'}
          actionLabel={typeFilter === 'alla' ? 'Logga första sådden' : 'Visa alla händelser'}
          onAction={() => (typeFilter === 'alla' ? navigate('/app/sowings') : setTypeFilter('alla'))}
          secondaryLabel={typeFilter === 'alla' ? 'Registrera skörd' : undefined}
          onSecondary={typeFilter === 'alla' ? () => navigate('/app/harvests') : undefined}
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([key, items]) => {
            const [year, month] = key.split('-');
            return (
              <div key={key}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {MONTH_NAMES[parseInt(month, 10) - 1]} {year}
                </h2>
                <StaggerContainer className="relative space-y-3 border-l-2 border-border pl-6">
                  {items.map((event) => (
                    <StaggerItem key={event.id} className="relative">
                      <div className={cn('absolute -left-[25px] top-3.5 h-4 w-4 rounded-full border-2 border-background', TYPE_META[event.type].dot)} />
                      <Card className="ml-2 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--card-shadow-hover)]">
                        <CardContent className="flex items-center gap-3 p-3.5">
                          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60', TYPE_META[event.type].text)}>
                            <event.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                            {event.subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.subtitle}</p>}
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{event.date}</span>
                        </CardContent>
                      </Card>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Timeline;
