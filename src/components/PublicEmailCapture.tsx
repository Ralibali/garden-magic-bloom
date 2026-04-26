import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';

interface PublicEmailCaptureProps {
  source: 'sakalender' | 'odlingsplan';
  plan: any;
  title?: string;
  description?: string;
}

export default function PublicEmailCapture({ source, plan, title, description }: PublicEmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    const lead = {
      email: normalizedEmail,
      source,
      plan,
      page_path: window.location.pathname,
      user_agent: navigator.userAgent,
      consent_marketing: true,
    };

    try {
      await trackEvent('email_lead_started', { source, email: normalizedEmail });
      const { error } = await supabase.from('public_leads' as any).insert(lead as any);
      if (error) throw error;

      try {
        const leads = JSON.parse(localStorage.getItem('odlingsdagboken_public_leads') || '[]');
        leads.push({ ...lead, createdAt: new Date().toISOString(), stored: 'supabase' });
        localStorage.setItem('odlingsdagboken_public_leads', JSON.stringify(leads));
        localStorage.setItem('odlingsdagboken_lead_email', normalizedEmail);
      } catch {}

      await trackEvent('email_lead_submitted', { source, email: normalizedEmail, stored: 'supabase', plan_type: plan?.type });
      setSaved(true);
    } catch (error) {
      console.error('[PublicEmailCapture]', error);
      setErrorMessage('Kunde inte spara till databasen just nu. Din plan finns ändå kvar i webbläsaren, så du kan skapa konto direkt.');

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
            <h3 className="font-serif text-xl text-foreground mb-1">Toppen – planen är sparad</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Vi har sparat din e-post och planen. Skapa ett gratis konto på samma enhet så plockar Odlingsdagboken upp planen och visar nästa steg inne i appen.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5">
      <div className="flex gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Mail className="h-4 w-4" /></div>
        <div>
          <h3 className="font-serif text-xl text-foreground mb-1">{title || 'Vill du få planen skickad till dig?'}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description || 'Spara din e-post här och skapa sedan konto för att behålla planen, få påminnelser och följa upp säsongen.'}</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input type="email" placeholder="din@email.se" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
        <Button type="submit" className="h-11 shrink-0" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Spara planen
        </Button>
      </div>
      {errorMessage ? <p className="text-[11px] text-destructive mt-2">{errorMessage}</p> : <p className="text-[11px] text-muted-foreground mt-2">Inget betalkort krävs. Du kan skapa konto när du vill spara planen permanent.</p>}
    </form>
  );
}
