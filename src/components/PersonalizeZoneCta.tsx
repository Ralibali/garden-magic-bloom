import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOdlingszon } from '@/hooks/useOdlingszon';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { placesForZone, ZONE_PLACES, zoneForPlace } from '@/lib/swedishZones';
import { navigationForIntent, registerUrlForIntent, saveProductIntent, type ProductIntent } from '@/lib/productIntent';
import { toast } from '@/hooks/use-toast';

interface PersonalizeZoneCtaProps {
  className?: string;
  source: 'odlingskalender' | 'zoner';
}

export default function PersonalizeZoneCta({ className = '', source }: PersonalizeZoneCtaProps) {
  const { isAuthenticated } = useAuth();
  const { zone, setZone } = useOdlingszon();
  const navigate = useNavigate();
  const [place, setPlace] = useState(placesForZone(zone)[0] || 'Stockholm');
  const [saving, setSaving] = useState(false);

  const places = useMemo(() => ZONE_PLACES.flatMap((row) => row.places.map((name) => ({ name, zone: row.zone }))), []);

  const onPlace = (next: string) => {
    setPlace(next);
    const mapped = zoneForPlace(next);
    if (mapped) setZone(mapped);
  };

  const go = async () => {
    const intent: ProductIntent = { kind: 'personalize-zone', zone, place, returnTo: '/app/calendar' };
    saveProductIntent(intent);
    try { trackEvent('cta_click', { label: 'personalize_zone', page: source, zone, place }); } catch { /* noop */ }
    if (isAuthenticated) {
      setSaving(true);
      try {
        await api.updateProfile({ climate_zone: zone });
      } catch {
        toast({ title: 'Zonen sparades lokalt', description: 'Kalendern i appen använder zonen. Profilen uppdateras när anslutningen fungerar.' });
      } finally {
        setSaving(false);
      }
      const dest = navigationForIntent(intent);
      navigate(dest.path, { state: dest.state });
      return;
    }
    navigate(registerUrlForIntent(intent));
  };

  return (
    <aside
      aria-label="Anpassa efter plats och zon"
      className={`rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/6 via-card to-accent/5 p-5 sm:p-6 ${className}`}
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-primary font-semibold mb-2">Personlig kalender</p>
      <h2 className="font-serif text-xl text-foreground mb-2">Anpassa efter min plats</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        Välj en ungefärlig ort så sätter vi odlingszon {zone}. Inloggad sparas zonen i din profil och öppnar såkalendern. Utan konto tar vi med valet till registreringen.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <label className="block text-sm">
          <span className="text-muted-foreground text-xs font-medium">Närmaste exempelort</span>
          <select
            value={place}
            onChange={(event) => onPlace(event.target.value)}
            className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
          >
            {places.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name} · zon {item.zone}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <p className="inline-flex items-center gap-2 text-sm text-foreground rounded-xl border border-border bg-background px-3 h-11 w-full">
            <MapPin className="h-4 w-4 text-primary" /> Zon {zone}
          </p>
        </div>
      </div>
      <Button type="button" size="lg" className="gap-2 min-h-[44px]" onClick={go} disabled={saving}>
        {isAuthenticated ? 'Spara zonen och öppna min kalender' : 'Skapa konto med den här zonen'}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </aside>
  );
}
