import type { MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import { navigationForIntent, registerUrlForIntent, saveProductIntent, type ProductIntent } from '@/lib/productIntent';

interface Props {
  crop: string;
  /** Visad text, t.ex. "tomater". */
  label: string;
  zone?: number;
  className?: string;
}

/**
 * Från en publik såtidssida rakt in i appens säsongsplanerare med grödan
 * förvald. Utan konto går vägen via registreringen och tillbaka hit.
 */
export default function PlanSeasonCta({ crop, label, zone, className = '' }: Props) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const intent: ProductIntent = { kind: 'plan-season', crops: [crop], zone, returnTo: '/app/calendar' };
  const dest = navigationForIntent(intent);
  const href = isAuthenticated ? dest.path : registerUrlForIntent(intent);

  const go = (event: MouseEvent<HTMLAnchorElement>) => {
    saveProductIntent(intent);
    try { trackEvent('cta_click', { label: 'plan_season', page: 'satider', crop }); } catch { /* noop */ }
    if (isAuthenticated) {
      event.preventDefault();
      navigate(dest.path, { state: dest.state });
    }
  };

  return (
    <aside
      aria-label={`Lägg in ${label} i din odlingskalender`}
      data-cta="plan-season"
      className={`rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/6 via-card to-accent/5 p-5 sm:p-6 ${className}`}
    >
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" /> Missa inget såfönster
      </p>
      <h2 className="mb-2 font-serif text-xl text-foreground">Lägg in {label} i din odlingskalender</h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Odlingsdagboken gör om tiderna ovan till påminnelser för din zon – förodling, utplantering och skörd – och räknar fram när just dina plantor ska ut. Gratis att börja.
      </p>
      <Button asChild>
        <Link to={href} onClick={go}>
          Planera {label} i min kalender <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </aside>
  );
}
