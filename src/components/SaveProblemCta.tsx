import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import { navigationForIntent, registerUrlForIntent, saveProductIntent, type ProductIntent } from '@/lib/productIntent';

interface SaveProblemCtaProps {
  crop: string;
  symptom: string;
  place?: string;
  moisture?: string;
  coldNights?: string;
  advice?: Array<{ title: string; text: string }>;
}

export default function SaveProblemCta({ crop, symptom, place, moisture, coldNights, advice }: SaveProblemCtaProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const go = () => {
    const intent: ProductIntent = {
      kind: 'save-problem',
      crop,
      symptom,
      place,
      moisture,
      coldNights,
      advice,
      returnTo: '/app/pests',
    };
    saveProductIntent(intent);
    try { trackEvent('cta_click', { label: 'save_problem_to_plant', page: 'odlingsakuten', crop, symptom }); } catch { /* noop */ }
    if (isAuthenticated) {
      const dest = navigationForIntent(intent);
      navigate(dest.path, { state: dest.state });
      return;
    }
    navigate(registerUrlForIntent(intent));
  };

  return (
    <div className="bg-primary text-primary-foreground rounded-2xl p-5 sm:p-6">
      <h2 className="font-serif text-2xl mb-2">Spara problemet på en växt</h2>
      <p className="text-primary-foreground/85 mb-5 text-sm leading-relaxed">
        Vi öppnar problemloggen med “{symptom.toLowerCase()}” och anteckningen att det gäller {crop.toLowerCase()}
        {place ? ` i ${place.toLowerCase()}` : ''}. Där kan du välja bädd, följa upp och se om plantan återhämtar sig.
        Det är en startpunkt, inte en säker diagnos.
      </p>
      <Button type="button" variant="secondary" size="lg" className="w-full gap-2" onClick={go}>
        {isAuthenticated ? 'Spara på en växt i dagboken' : 'Skapa konto och spara på en växt'}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
