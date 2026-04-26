import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Mail } from 'lucide-react';

interface PublicEmailCaptureProps {
  source: 'sakalender' | 'odlingsplan';
  plan: any;
  title?: string;
  description?: string;
}

export default function PublicEmailCapture({ source, plan, title, description }: PublicEmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    try {
      const leads = JSON.parse(localStorage.getItem('odlingsdagboken_public_leads') || '[]');
      leads.push({ email: email.trim(), source, plan, createdAt: new Date().toISOString() });
      localStorage.setItem('odlingsdagboken_public_leads', JSON.stringify(leads));
      localStorage.setItem('odlingsdagboken_lead_email', email.trim());
    } catch {}
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/10 p-5">
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Check className="h-4 w-4" /></div>
          <div>
            <h3 className="font-serif text-xl text-foreground mb-1">Toppen – planen är markerad som sparad</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Skapa ett gratis konto på samma enhet så plockar Odlingsdagboken upp planen och visar nästa steg inne i appen.</p>
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
        <Button type="submit" className="h-11 shrink-0">Spara planen</Button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Inget betalkort krävs. Du kan skapa konto när du vill spara planen permanent.</p>
    </form>
  );
}
