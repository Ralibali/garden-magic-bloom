import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CalendarDays, Sprout } from 'lucide-react';

interface PublicPlanHandoffProps {
  plan: any;
  onNavigate: (path: string) => void;
  onDismiss: () => void;
}

export default function PublicPlanHandoff({ plan, onNavigate, onDismiss }: PublicPlanHandoffProps) {
  const crops = plan?.crops || plan?.recommendedCrops || [];
  const methods = plan?.methods || (plan?.method ? [plan.method] : []);
  const label = plan?.type === 'sakalender' ? 'såkalender' : 'odlingsplan';

  return (
    <Card className="border-primary/30 bg-primary text-primary-foreground shadow-sm overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3 gap-1"><CalendarDays className="h-3.5 w-3.5" /> Sparad från verktyget</Badge>
            <h2 className="font-serif text-2xl sm:text-3xl mb-2">Din {label} väntar på dig</h2>
            <p className="text-sm text-primary-foreground/85 leading-relaxed max-w-2xl">
              {crops.length > 0 ? `Du valde ${crops.slice(0, 6).join(', ')}${crops.length > 6 ? ' med flera' : ''}. ` : ''}
              {methods.length > 0 ? `Odlingssätt: ${methods.join(', ')}. ` : ''}
              Skapa en odlingsplats och logga första sådden så blir planen användbar i din odlingsdagbok.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-56">
            <Button variant="secondary" className="justify-between" onClick={() => onNavigate('/app/beds')}>Skapa odlingsplats <ArrowRight className="h-4 w-4" /></Button>
            <Button variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 justify-between" onClick={() => onNavigate('/app/sowings')}>Logga sådd <Sprout className="h-4 w-4" /></Button>
            <button type="button" onClick={onDismiss} className="text-xs text-primary-foreground/75 hover:text-primary-foreground">Dölj förslaget</button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
