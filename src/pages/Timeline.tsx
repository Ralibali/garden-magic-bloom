import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sprout, Carrot, Leaf, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface TimelineEvent {
  id: string;
  date: string;
  type: 'sowing' | 'harvest';
  title: string;
  subtitle?: string;
  icon: typeof Sprout;
}

const Timeline = () => {
  const { data: sowings } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });
  const { data: harvests } = useQuery({ queryKey: ['harvests'], queryFn: api.getHarvests });

  const events: TimelineEvent[] = [
    ...(sowings || []).map((s: any) => ({
      id: `s-${s.id}`,
      date: s.sow_date,
      type: 'sowing' as const,
      title: `Sådde ${s.variety}`,
      subtitle: s.beds?.name ? `i ${s.beds.name}` : s.seed_brand ? `(${s.seed_brand})` : undefined,
      icon: Sprout,
    })),
    ...(harvests || []).map((h: any) => ({
      id: `h-${h.id}`,
      date: h.harvest_date,
      type: 'harvest' as const,
      title: `Skördade ${h.variety}`,
      subtitle: h.weight_grams ? `${(h.weight_grams / 1000).toFixed(1)} kg` : undefined,
      icon: Carrot,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by month
  const grouped: Record<string, TimelineEvent[]> = {};
  events.forEach(e => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  const monthNames = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tidslinje</h1>
        <p className="text-muted-foreground text-sm">Alla dina aktiviteter i kronologisk ordning.</p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Inga aktiviteter ännu. Börja logga sådder och skördar!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([key, items]) => {
            const [year, month] = key.split('-');
            return (
              <div key={key}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {monthNames[parseInt(month) - 1]} {year}
                </h2>
                <div className="relative pl-6 border-l-2 border-border space-y-3">
                  {items.map(event => (
                    <div key={event.id} className="relative">
                      <div className={`absolute -left-[25px] w-4 h-4 rounded-full border-2 border-background flex items-center justify-center ${event.type === 'sowing' ? 'bg-primary' : 'bg-accent'}`} />
                      <Card className="ml-2">
                        <CardContent className="p-3 flex items-center gap-3">
                          <event.icon className={`h-4 w-4 shrink-0 ${event.type === 'sowing' ? 'text-primary' : 'text-accent'}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                            {event.subtitle && <p className="text-xs text-muted-foreground">{event.subtitle}</p>}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{event.date}</span>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Timeline;
