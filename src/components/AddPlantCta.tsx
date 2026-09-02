import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sprout, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import { navigationForIntent, registerUrlForIntent, saveProductIntent, type ProductIntent } from '@/lib/productIntent';

interface AddPlantCtaProps {
  crop: string;
  slug?: string;
  className?: string;
}

export default function AddPlantCta({ crop, slug, className = '' }: AddPlantCtaProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const go = () => {
    const intent: ProductIntent = { kind: 'add-plant', crop, slug, returnTo: '/app/sowings' };
    saveProductIntent(intent);
    try { trackEvent('cta_click', { label: 'add_plant_to_garden', page: 'vaxt', crop }); } catch { /* noop */ }
    if (isAuthenticated) {
      const dest = navigationForIntent(intent);
      navigate(dest.path, { state: dest.state });
      return;
    }
    navigate(registerUrlForIntent(intent));
  };

  return (
    <aside
      aria-label={`Lägg till ${crop} i din odling`}
      className={`rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/6 via-card to-accent/5 p-5 sm:p-6 ${className}`}
    >
      <h2 className="font-serif text-xl text-foreground mb-2">Lägg till {crop} i min odling</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        Prefyll såloggen med {crop.toLowerCase()} så du kan välja bädd, sådatum och sort. Utan konto skickas du till registrering och tillbaka hit efteråt.
      </p>
      <Button type="button" size="lg" className="gap-2 min-h-[44px]" onClick={go}>
        <Sprout className="h-4 w-4" />
        {isAuthenticated ? `Lägg till ${crop}` : `Skapa konto och lägg till ${crop}`}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </aside>
  );
}
