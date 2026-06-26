import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Check, Crown, LayoutGrid, Loader2, Sparkles, Sprout, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';

const YEARLY_PRICE_ID = 'price_1T99UJHzffTezY826uLS56sV';

const features = [
  { icon: LayoutGrid, title: 'Obegränsade bäddar', text: 'Bygg upp hela odlingen utan gratisversionens gräns på tre bäddar.' },
  { icon: Sprout, title: 'Obegränsad sålogg', text: 'Fortsätt logga efter gratisversionens första tio sådder.' },
  { icon: Sparkles, title: 'Mer hjälp av Gro', text: 'Få fler personliga svar om sådd, växtproblem och planering utifrån din odling.' },
  { icon: BarChart3, title: 'Statistik och trender', text: 'Jämför säsonger, se skörd per månad och hitta vilka sorter som ger bäst resultat.' },
  { icon: TrendingUp, title: 'Skördens uppskattade värde', text: 'Se hur mycket årets skörd ungefär motsvarar i butiksvärde.' },
];

export default function Premium() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const isPremium = user?.subscription_status === 'premium';

  useEffect(() => {
    if (searchParams.get('success') !== 'true') return;
    let cancelled = false;
    const verify = async () => {
      const { data } = await supabase.functions.invoke('check-subscription');
      if (!cancelled && data?.subscribed) {
        void trackEvent('subscription_activated', { plan: 'yearly', price_sek: 99 });
        toast({ title: 'Välkommen till Plus! 🌱', description: 'Din uppgradering är aktiv.' });
        window.history.replaceState({}, '', '/app/premium');
      }
    };
    void verify();
    return () => { cancelled = true; };
  }, [searchParams]);

  const checkout = async () => {
    setLoading(true);
    void trackEvent('checkout_started', { plan: 'yearly', price_sek: 99 });
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', { body: { priceId: YEARLY_PRICE_ID } });
      if (error) throw error;
      if (!data?.url) throw new Error('Ingen betalningslänk returnerades.');
      window.location.href = data.url;
    } catch (error: any) {
      void trackEvent('checkout_failed', { message: error?.message });
      toast({ title: 'Kunde inte starta betalningen', description: error?.message || 'Försök igen.', variant: 'destructive' });
      setLoading(false);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (!data?.url) throw new Error('Kundportalen kunde inte öppnas.');
      window.location.href = data.url;
    } catch (error: any) {
      toast({ title: 'Kunde inte öppna abonnemanget', description: error?.message || 'Försök igen.', variant: 'destructive' });
      setPortalLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/12 via-card to-accent/10 p-6 sm:p-10"><div className="relative grid lg:grid-cols-[1.3fr_.7fr] gap-8 items-center"><div><div className="inline-flex items-center gap-2 rounded-full bg-primary/12 text-primary px-3 py-1 text-xs font-semibold mb-4"><Sparkles className="h-3.5 w-3.5" /> Odlingsdagboken Plus</div><h1 className="font-serif text-4xl sm:text-5xl leading-tight mb-4">Lär dig mer av varje bädd och varje säsong</h1><p className="text-muted-foreground text-lg max-w-2xl">Plus tar bort gränsen på tre bäddar och tio sådder och låser upp mer Gro och full statistik.</p><div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> 14 dagar gratis</span><span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Inget betalkort vid konto</span><span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> 99 kr per år</span></div></div><Card className="border-2 border-primary shadow-xl"><CardContent className="p-6 text-center"><Crown className="h-8 w-8 text-primary mx-auto mb-3" /><p className="font-serif text-xl">Plus årsvis</p><div className="my-4"><span className="text-5xl font-bold">99</span><span className="text-muted-foreground"> kr/år</span></div><p className="text-xs text-muted-foreground mb-5">Motsvarar cirka 8 kr per månad</p>{isPremium ? <Button variant="outline" className="w-full h-11" onClick={openPortal} disabled={portalLoading}>{portalLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Hantera abonnemang</Button> : <Button className="w-full h-11" onClick={checkout} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}Prova Plus gratis</Button>}</CardContent></Card></div></section>

      <section><div className="text-center max-w-2xl mx-auto mb-6"><h2 className="font-serif text-3xl mb-2">Det här är upplåst i Plus</h2><p className="text-sm text-muted-foreground">Samma erbjudande här som på den publika prissidan.</p></div><div className="grid sm:grid-cols-2 gap-4">{features.map(({ icon: Icon, title, text }) => <Card key={title} className="hover:shadow-md transition-shadow"><CardContent className="p-5 flex gap-4"><div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="h-5 w-5" /></div><div><h3 className="font-medium mb-1">{title}</h3><p className="text-sm text-muted-foreground leading-relaxed">{text}</p></div></CardContent></Card>)}</div></section>

      {!isPremium && <section className="rounded-3xl bg-primary text-primary-foreground p-6 sm:p-9 text-center"><h2 className="font-serif text-3xl mb-3">Testa hela upplevelsen i 14 dagar</h2><p className="text-primary-foreground/80 max-w-xl mx-auto mb-5">Börja med din egen odling och avgör sedan om historiken, Gro och statistiken ger dig tillräckligt värde.</p><Button variant="secondary" size="lg" onClick={checkout} disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Starta gratisperioden</Button></section>}
    </div>
  );
}
