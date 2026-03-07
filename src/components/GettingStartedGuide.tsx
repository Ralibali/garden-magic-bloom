import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, LayoutGrid, Sprout, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    num: 1,
    title: 'Lägg till din första bädd',
    description: 'Skapa en odlingsbädd för att börja organisera din trädgård.',
    icon: LayoutGrid,
    path: '/app/beds',
  },
  {
    num: 2,
    title: 'Logga din första sådning',
    description: 'Registrera vad du sår och när – grunden för din odlingsdagbok.',
    icon: Sprout,
    path: '/app/sowings',
  },
  {
    num: 3,
    title: 'Kolla såkalendern för din zon',
    description: 'Se vad du kan så just nu baserat på din klimatzon.',
    icon: CalendarDays,
    path: '/app/calendar',
  },
];

export default function GettingStartedGuide() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold">Kom igång med din odling 🌱</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((s) => (
          <button
            key={s.num}
            onClick={() => navigate(s.path)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">{s.num}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
