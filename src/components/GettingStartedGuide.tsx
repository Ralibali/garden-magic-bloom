import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, CalendarDays, ChevronRight, LayoutGrid, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    num: 1,
    title: 'Skapa din första odlingsplats',
    description: 'Lägg upp pallkrage, växthus, kruka eller friland. Då får hela säsongen en tydlig struktur.',
    icon: LayoutGrid,
    path: '/app/beds',
    cta: 'Skapa plats',
  },
  {
    num: 2,
    title: 'Logga första sådden',
    description: 'Skriv in vad du sår och när. Det du antecknar nu blir guld nästa säsong.',
    icon: Sprout,
    path: '/app/sowings',
    cta: 'Logga sådd',
  },
  {
    num: 3,
    title: 'Kolla vad du kan göra den här veckan',
    description: 'Se såkalendern för din klimatzon och få en bättre tajming från start.',
    icon: CalendarDays,
    path: '/app/calendar',
    cta: 'Visa såkalender',
  },
];

export default function GettingStartedGuide() {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Badge variant="secondary" className="mb-3">Din första vecka</Badge>
            <CardTitle className="text-xl font-serif">Gör tre saker – så är Odlingsdagboken värdefull direkt 🌱</CardTitle>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              En tom app hjälper ingen. Börja med en plats, en sådd och en veckoplan – sedan kan du följa upp vad som faktiskt fungerar hos dig.
            </p>
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-primary/10 text-primary items-center justify-center shrink-0">
            <Bot className="h-6 w-6" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.num}
              onClick={() => navigate(s.path)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-background/70 hover:border-primary/40 hover:bg-background transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-primary">Steg {s.num}</span>
                  <span className="text-xs text-muted-foreground">· {s.cta}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
            </button>
          );
        })}
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <Button className="gap-2" onClick={() => navigate('/app/beds')}>
            Starta med första platsen <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate('/app/gro')}>
            Fråga Gro om min plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
