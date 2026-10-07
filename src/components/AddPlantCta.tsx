import type { MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { guideCropForVaxt } from '@/lib/sowingGuide';
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

  const guideCrop = guideCropForVaxt({ name: crop, slug: slug || '' });
  const intent: ProductIntent = { kind: 'add-plant', crop, slug, returnTo: '/app/sowings' };
  const dest = navigationForIntent(intent);
  const href = isAuthenticated ? dest.path : registerUrlForIntent(intent);

  const go = (event: MouseEvent<HTMLAnchorElement>) => {
    saveProductIntent(intent);
    try { trackEvent('cta_click', { label: 'add_plant_to_garden', page: 'vaxt', crop }); } catch { /* noop */ }
    if (isAuthenticated) {
      event.preventDefault();
      navigate(dest.path, { state: dest.state });
    }
  };

  return (
    <aside
      aria-label={`Lägg till ${crop} i din odling`}
      data-cta="add-plant"
      className={`rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/6 via-card to-accent/5 p-5 sm:p-6 ${className}`}
    >
      <h2 className="font-serif text-xl text-foreground mb-2">Planera {crop.toLocaleLowerCase('sv')}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        Se såtiderna direkt utan konto. Med ett gratis konto kan du sedan spara till din egen odling.
      </p>
      {!isAuthenticated && <Button asChild size="lg" className="mb-3 mr-3 gap-2 min-h-11"><Link to={`/sakalender?crop=${encodeURIComponent(guideCrop?.name || crop)}`}>Visa min såkalender <ArrowRight className="h-4 w-4" /></Link></Button>}
      <Button asChild variant={isAuthenticated ? 'default' : 'outline'} size="lg" className="gap-2 min-h-[44px]">
        <Link to={href} onClick={go}>
          <Sprout className="h-4 w-4" />
          {isAuthenticated ? `Lägg till ${crop}` : 'Spara till konto'}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </aside>
  );
}
