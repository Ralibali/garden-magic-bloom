import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface InlineSignupCTAProps {
  /** Optional override of the headline */
  title?: string;
  /** Optional override of the body text */
  description?: string;
  /** Optional override of the button text */
  buttonLabel?: string;
  /** Visual density – 'soft' fits inside articles, 'card' is a stronger end-of-page CTA */
  variant?: 'soft' | 'card';
  className?: string;
}

/**
 * Återanvändbar mjuk konverterings-CTA för publika SEO-sidor.
 * Länkar alltid till registreringsläget på /login.
 */
export default function InlineSignupCTA({
  title = 'Vill du komma ihåg vad som fungerar i din egen odling?',
  description = 'Skapa ett gratis konto i Odlingsdagboken och logga sådder, skördar och anteckningar år efter år.',
  buttonLabel = 'Börja gratis',
  variant = 'soft',
  className = '',
}: InlineSignupCTAProps) {
  const isCard = variant === 'card';

  return (
    <aside
      aria-label="Kom igång med Odlingsdagboken"
      className={`my-10 rounded-2xl border ${
        isCard
          ? 'border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6 sm:p-8 text-center shadow-sm'
          : 'border-border/60 bg-card/60 p-5 sm:p-6'
      } ${className}`}
    >
      <h2 className={`font-serif text-foreground ${isCard ? 'text-xl mb-2' : 'text-lg mb-1.5'}`}>
        {title}
      </h2>
      <p className={`text-sm text-muted-foreground leading-relaxed ${isCard ? 'max-w-md mx-auto mb-5' : 'mb-4'}`}>
        {description}
      </p>
      <div className={isCard ? 'flex justify-center' : ''}>
        <Button asChild size={isCard ? 'lg' : 'default'} className="gap-2">
          <Link to="/login?mode=register">
            {buttonLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <p className={`text-[11px] text-muted-foreground ${isCard ? 'mt-3' : 'mt-2'}`}>
        Inget betalkort krävs · 14 dagars Plus gratis
      </p>
    </aside>
  );
}
