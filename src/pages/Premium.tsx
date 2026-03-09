import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Bell, BarChart3, Download, TrendingUp, Star, Loader2, Settings, Sparkles, ArrowRight, CalendarDays, Sprout, BookOpen, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const PRICES = {
  yearly: 'price_1T99UJHzffTezY826uLS56sV',
};

const premiumFeatures = [
  { text: 'Smarta påminnelser per klimatzon', icon: '🔔' },
  { text: 'Växtföljdshistorik – fler än 1 år', icon: '🔄' },
  { text: 'Avancerad statistik & trender', icon: '📊' },
  { text: 'Säsongsanteckningar per bädd', icon: '📝' },
  { text: 'Exportera data (PDF/CSV)', icon: '📥' },
  { text: 'Ekonomi & odlingsbudget', icon: '💰' },
  { text: 'Prioriterad support', icon: '⭐' },
  { text: 'Alla framtida funktioner', icon: '🚀' },
];

const highlights = [
  { icon: Bell, title: 'Smarta påminnelser', desc: 'Automatiska påminnelser anpassade efter din klimatzon – dags att förodla, plantera ut eller skörda.' },
  { icon: RotateCcw, title: 'Växtföljd', desc: 'Se hela historiken per bädd och planera rätt rotation för friskare jord.' },
  { icon: TrendingUp, title: 'Skördestatistik', desc: 'Jämför skördar mellan säsonger och hitta dina bästa sorter.' },
  { icon: BookOpen, title: 'Säsongsanteckningar', desc: '"Vad lärde jag mig i år?" – din personliga dagbok per bädd.' },
  { icon: BarChart3, title: 'Detaljerad ekonomi', desc: 'Spåra kostnader för frö, jord och verktyg – se vad odlingen kostar.' },
  { icon: Download, title: 'Exportera rapporter', desc: 'PDF eller CSV för din egen bokföring.' },
];

const testimonials = [
  { name: 'Anna-Lena', location: 'Dalarna', text: 'Äntligen en app som förstår svenska odlingsförhållanden! Påminnelserna för zon 4 stämmer perfekt.' },
  { name: 'Per-Olof', location: 'Skåne', text: 'Växtföljden har gjort att jag undviker samma misstag varje år. Helt ovärderligt.' },
  { name: 'Margareta', location: 'Gotland', text: 'Enklaste odlingsappen jag testat. Registrerar en skörd på 10 sekunder!' },
];

export default function Premium() {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [searchParams] = useSearchParams();
  const isPremium = user?.subscription_status === 'premium';

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      const syncSubscription = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('check-subscription');
          if (!error && data?.subscribed) {
            toast({ title: '🎉 Välkommen till Plus!', description: 'Din uppgradering är klar. Njut av alla funktioner!' });
            window.location.replace('/app/premium');
          } else {
            setTimeout(async () => {
              const { data: retryData } = await supabase.functions.invoke('check-subscription');
              if (retryData?.subscribed) {
                window.location.replace('/app/premium');
              } else {
                toast({ title: 'Betalningen behandlas', description: 'Det kan ta någon minut. Ladda om sidan snart.' });
              }
            }, 3000);
          }
        } catch {
          toast({ title: 'Betalningen behandlas', description: 'Ladda om sidan om en stund.' });
        }
      };
      syncSubscription();
    }
  }, [searchParams]);

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: 'Fel', description: err.message || 'Kunde inte öppna kundportalen.', variant: 'destructive' });
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleCheckout = async (priceId: string, planName: string) => {
    if (!user) {
      toast({ title: 'Logga in först', description: 'Du behöver vara inloggad för att uppgradera.', variant: 'destructive' });
      return;
    }
    setLoadingPlan(planName);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', { body: { priceId } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
      else throw new Error('Ingen checkout-URL returnerades');
    } catch (err: any) {
      toast({ title: 'Kunde inte starta betalning', description: err.message || 'Något gick fel.', variant: 'destructive' });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-10 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_70%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-primary/15 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <Sparkles className="h-4 w-4" />
            Plus
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif text-foreground mb-3">
            Uppgradera din odling
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
            Smarta påminnelser, växtföljdshistorik och detaljerad statistik – allt du behöver för att odla smartare.
          </p>
        </div>
      </div>

      {/* Single pricing card */}
      <Card className="bg-card border-2 border-primary shadow-lg relative overflow-hidden max-w-md mx-auto">
        <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-semibold py-1.5 text-center tracking-wide uppercase">
          Alla nya konton får 7 dagars Plus gratis
        </div>
        <CardContent className="p-6 pt-10 text-center">
          <h3 className="font-serif text-lg text-foreground mb-1">Odlingsdagboken Plus</h3>
          <p className="text-muted-foreground text-sm mb-5">Allt du behöver för en lyckad odlingssäsong</p>
          <div className="mb-2">
            <span className="text-5xl font-bold text-foreground">99</span>
            <span className="text-lg text-muted-foreground ml-1">kr/år</span>
          </div>
          <p className="text-xs text-muted-foreground mb-5">Bara ~8 kr/månad</p>
          <Button
            className="w-full h-12 gap-2 text-base font-semibold shadow-[0_4px_14px_0_hsl(var(--primary)/0.3)]"
            onClick={() => handleCheckout(PRICES.yearly, 'yearly')}
            disabled={!!loadingPlan || isPremium}
          >
            {loadingPlan === 'yearly' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
            {isPremium ? 'Du har redan Plus' : 'Prova gratis i 7 dagar'}
          </Button>
        </CardContent>
      </Card>

      {/* What's included */}
      <div>
        <h2 className="font-serif text-xl sm:text-2xl text-foreground text-center mb-5">Allt som ingår i Plus</h2>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {premiumFeatures.map((f) => (
                <div key={f.text} className="flex items-center gap-3 py-1.5">
                  <span className="text-base shrink-0">{f.icon}</span>
                  <span className="text-sm text-foreground">{f.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {highlights.map((f) => (
          <Card key={f.title} className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Testimonials */}
      <div>
        <h2 className="font-serif text-xl text-foreground text-center mb-4">Vad säger våra odlare?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="bg-card border-border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-0.5 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-xs text-foreground italic mb-2">"{t.text}"</p>
                <p className="text-[10px] text-muted-foreground font-medium">{t.name}, {t.location}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* No commitment */}
      <Card className="bg-primary/5 border-primary/15">
        <CardContent className="p-5 sm:p-6 text-center">
          <h3 className="font-serif text-lg text-foreground mb-2">Ingen bindningstid</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Avbryt när du vill. Inga dolda avgifter. Dina data finns kvar om du går tillbaka till gratis.
          </p>
        </CardContent>
      </Card>

      {/* Manage subscription */}
      {isPremium && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 shadow-sm">
          <CardContent className="p-5 sm:p-6 text-center space-y-3">
            <div className="inline-flex items-center gap-2 text-foreground font-semibold text-lg">
              <Crown className="h-5 w-5 text-warning" />
              Du har Plus!
            </div>
            {user?.subscription_end && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span>Betald t.o.m. <span className="font-medium text-foreground">{format(new Date(user.subscription_end), 'd MMMM yyyy', { locale: sv })}</span></span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">Hantera din prenumeration, byt betalmetod eller avsluta.</p>
            <Button variant="outline" className="gap-2" onClick={handleManageSubscription} disabled={loadingPortal}>
              {loadingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
              Hantera prenumeration
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bottom CTA */}
      {!isPremium && (
        <div className="text-center pb-4">
          <Button
            size="lg"
            className="h-12 px-10 text-base gap-2 shadow-[0_4px_14px_0_hsl(var(--primary)/0.3)]"
            onClick={() => handleCheckout(PRICES.yearly, 'yearly')}
            disabled={!!loadingPlan}
          >
            {loadingPlan === 'yearly' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />}
            Prova gratis i 7 dagar – 99 kr/år
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Frågor? <a href="mailto:hej@odlingsdagboken.se" className="text-primary hover:underline">hej@odlingsdagboken.se</a>
          </p>
        </div>
      )}
    </div>
  );
}
