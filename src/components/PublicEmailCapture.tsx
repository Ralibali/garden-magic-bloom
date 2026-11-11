import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { hasTelemetryConsent } from '@/lib/privacyTelemetry';
import { plausibleEvent } from '@/lib/plausible';
import { normalizeLeadEmail, type PublicLeadSource } from '@/lib/leadPlanEmail';

interface PublicEmailCaptureProps {
  source: PublicLeadSource;
  plan: any;
  title?: string;
  description?: string;
  channel?: string;
}

export default function PublicEmailCapture({ source, plan, title, description, channel }: PublicEmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [pilot, setPilot] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Ange en giltig e-postadress, till exempel namn@exempel.se.');
      return;
    }

    if (loading || website) return;
    setLoading(true);
    setErrorMessage('');

    const normalizedEmail = normalizeLeadEmail(email);
    const lead = {
      email: normalizedEmail,
      source,
      plan,
      page_path: window.location.pathname,
      user_agent: navigator.userAgent,
      consent_marketing: marketingConsent,
    };

    try {
      plausibleEvent('Lead Capture Started', { source, marketing_consent: marketingConsent });
      await trackEvent('email_lead_started', { source, email: normalizedEmail });
      if (source === 'sakalender') {
        const { data, error } = await supabase.rpc('request_sowing_calendar', {
          p_email: normalizedEmail, p_plan: { ...plan, ...(channel && hasTelemetryConsent() ? { channel } : {}) },
          p_marketing: marketingConsent, p_pilot: pilot,
        });
        if (error) throw error;
        if (data === 'limited') {
          setErrorMessage('Du kan få högst tre planmejl per dygn. Kopiera planlänken för att fortsätta direkt.');
          return;
        }
        if (data !== 'accepted') throw new Error('calendar_request_failed');
        setSaved(true);
        void trackEvent('calendar_email_requested', { source: channel ?? source });
        return;
      }
      const { error } = await supabase.from('public_leads' as any).insert(lead as any);
      if (error) throw error;

      const delivery = await supabase.functions.invoke('lead-plan-email', { body: { email: normalizedEmail, source, plan, website } });
      if (delivery.error || !delivery.data?.queued) {
        setErrorMessage('Mejlet kunde inte läggas i kö. Försök igen senare.');
        return;
      }

      try {
        const leads = JSON.parse(localStorage.getItem('odlingsdagboken_public_leads') || '[]');
        leads.push({ ...lead, createdAt: new Date().toISOString(), stored: 'supabase' });
        localStorage.setItem('odlingsdagboken_public_leads', JSON.stringify(leads));
        localStorage.setItem('odlingsdagboken_lead_email', normalizedEmail);
      } catch {}

      await trackEvent('email_lead_submitted', { source, email: normalizedEmail, stored: 'supabase', plan_type: plan?.type, consent_marketing: marketingConsent });
      plausibleEvent('Lead Captured', { source, plan_type: String(plan?.type || source), marketing_consent: marketingConsent });
      setSaved(true);
    } catch (error) {
      console.error('[PublicEmailCapture]', error);
      plausibleEvent('Lead Capture Error', { source });
      setErrorMessage('Mejlet kunde inte beställas. Försök igen om en stund.');

      try {
        const leads = JSON.parse(localStorage.getItem('odlingsdagboken_public_leads') || '[]');
        leads.push({ ...lead, createdAt: new Date().toISOString(), stored: 'local_fallback' });
        localStorage.setItem('odlingsdagboken_public_leads', JSON.stringify(leads));
        localStorage.setItem('odlingsdagboken_lead_email', normalizedEmail);
      } catch {}
      await trackEvent('email_lead_local_fallback', { source, email: normalizedEmail, plan_type: plan?.type });
    } finally {
      setLoading(false);
    }
  };

  if (saved) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/10 p-5">
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Check className="h-4 w-4" /></div>
          <div>
            <h3 className="font-serif text-xl text-foreground mb-1">Kontrollera din inkorg</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Vi har tagit emot din begäran för {normalizeLeadEmail(email)}. {source === 'sakalender' ? 'Länken i mejlet öppnar planen även på en annan enhet.' : 'Din plan finns också kvar i den här webbläsaren.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5">
      <div className="flex gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Mail className="h-4 w-4" /></div>
        <div>
          <h3 className="font-serif text-xl text-foreground mb-1">{title || 'Vill du få planen skickad till dig?'}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description || 'Spara din e-post här och skapa sedan konto för att behålla planen, få påminnelser och följa upp säsongen.'}</p>
        </div>
      </div>
      <input
        type="text"
        name="website"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        className="sr-only"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <Input type="email" aria-label="E-postadress" aria-invalid={!!errorMessage} aria-describedby={errorMessage ? "lead-email-error" : undefined} placeholder="din@email.se" value={email} onChange={(event) => { setEmail(event.target.value); setErrorMessage(''); }} required className="h-11" />
        <Button type="submit" className="h-11 shrink-0" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Skicka planen
        </Button>
      </div>
      <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
        <input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} className="mt-0.5" />
        <span>Ja tack, skicka även relevanta odlingstips och påminnelser. Frivilligt och enkelt att avsluta.</span>
      </label>
      {source === 'sakalender' && plan.season === 2027 && <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
        <input type="checkbox" checked={pilot} onChange={e => setPilot(e.target.checked)} className="mt-0.5" />
        <span>Jag vill provodla med Odlingsdagboken våren 2027. Ni får kontakta mig om piloten.</span>
      </label>}
      {errorMessage ? <p id="lead-email-error" role="alert" className="text-sm text-destructive mt-2">{errorMessage}</p> : <p className="text-[11px] text-muted-foreground mt-2">Planmejlet skickas oavsett om du väljer odlingstips. Inget betalkort krävs.</p>}
    </form>
  );
}
