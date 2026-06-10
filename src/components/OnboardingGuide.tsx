import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sprout, LayoutGrid, Carrot, CalendarDays, ArrowRight, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import heroGarden from '@/assets/hero-garden.jpg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const ONBOARDING_KEY = 'odlingsdagboken-onboarding-done';

const steps = [
  {
    image: heroGarden,
    emoji: '👋',
    title: 'Välkommen till Odlingsdagboken!',
    subtitle: 'Din digitala odlingsassistent',
    description: 'Här loggar du sådder, skördar och bäddar – och ser vad som faktiskt funkar i din trädgård, år efter år. Låt oss visa dig runt!',
    color: 'from-primary/20 to-accent/10',
  },
  {
    image: null,
    emoji: '🌱',
    title: 'Logga sådder & skördar',
    subtitle: 'Håll koll på hela säsongen',
    description: 'Registrera vad du sår, när du sår och i vilken bädd. Logga skördar med vikt så du ser vilka sorter som presterar bäst.',
    features: [
      { icon: Sprout, text: 'Sålogg med datum' },
      { icon: Carrot, text: 'Skörd i kg per sort' },
    ],
    color: 'from-primary/15 to-success/10',
  },
  {
    image: null,
    emoji: '📋',
    title: 'Bäddar & växtföljd',
    subtitle: 'Se vad du odlat var – år för år',
    description: 'Namnge dina bäddar och koppla sådder till dem. Skriv säsongsanteckningar och undvik att odla samma sak på samma plats.',
    features: [
      { icon: LayoutGrid, text: 'Bäddöversikt' },
      { icon: CalendarDays, text: 'Växtföljdshistorik' },
    ],
    color: 'from-warning/15 to-primary/10',
  },
  {
    image: null,
    emoji: '✨',
    title: 'Allt redo!',
    subtitle: 'Börja logga din första säsong',
    description: 'Du har 14 dagars Plus gratis – obegränsade bäddar, smarta påminnelser och full växtföljd. Tips: Lägg appen på hemskärmen!',
    highlights: [
      { icon: Sprout, text: 'Logga sådder', desc: 'Bygg din dagbok!' },
      { icon: Carrot, text: 'Väg skördar', desc: 'Se vad som funkar' },
      { icon: CalendarDays, text: 'Såkalender', desc: 'Anpassad per zon' },
      { icon: Sparkles, text: 'AI-tips', desc: 'Dagliga odlingstips' },
    ],
    color: 'from-success/15 to-warning/10',
  },
];

export default function OnboardingGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const localDone = localStorage.getItem(ONBOARDING_KEY);
    if (localDone) return;

    supabase
      .from('profiles')
      .select('preferences')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const prefs = (data?.preferences as Record<string, any>) ?? {};
        if (prefs.onboarding_done) {
          localStorage.setItem(ONBOARDING_KEY, '1');
          return;
        }
        setTimeout(() => setOpen(true), 800);
      });
  }, [user?.id]);

  const finish = () => {
    setOpen(false);
    localStorage.setItem(ONBOARDING_KEY, '1');
    if (user?.id) {
      supabase
        .from('profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          const prefs = (data?.preferences as Record<string, any>) ?? {};
          void supabase
            .from('profiles')
            .update({ preferences: { ...prefs, onboarding_done: true } })
            .eq('user_id', user.id);
        });
    }
  };

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else finish();
  };

  const current = steps[step];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-border/60 gap-0 [&>button]:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {current.image ? (
              <div className="relative h-44 overflow-hidden">
                <img src={current.image} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                <div className="absolute bottom-4 left-5"><span className="text-3xl">{current.emoji}</span></div>
                <button onClick={finish} className="absolute top-3 right-3 p-1.5 rounded-full bg-foreground/20 backdrop-blur-md text-primary-foreground/80 hover:bg-foreground/30 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className={`relative h-36 bg-gradient-to-br ${current.color} flex items-center justify-center`}>
                <motion.span className="text-6xl" initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
                  {current.emoji}
                </motion.span>
                <button onClick={finish} className="absolute top-3 right-3 p-1.5 rounded-full bg-foreground/10 text-foreground/50 hover:bg-foreground/15 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="px-6 pt-4 pb-6">
              <h2 className="font-serif text-xl text-foreground mb-1">{current.title}</h2>
              <p className="text-xs text-primary font-medium mb-2">{current.subtitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{current.description}</p>

              {current.features && (
                <div className="flex gap-3 mb-5">
                  {current.features.map((f) => (
                    <div key={f.text} className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2 flex-1">
                      <f.icon className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-medium text-foreground">{f.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {current.highlights && (
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {current.highlights.map((h) => (
                    <div key={h.text} className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/40">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <h.icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-foreground leading-tight">{h.text}</p>
                        <p className="text-[10px] text-muted-foreground">{h.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <button key={i} onClick={() => setStep(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-border hover:bg-muted-foreground/30'}`} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <Button variant="ghost" size="sm" className="h-9 px-3 text-xs rounded-xl text-muted-foreground" onClick={() => setStep(step - 1)}>Tillbaka</Button>
                  )}
                  <Button size="sm" className="h-9 px-5 text-xs rounded-xl gap-1.5" onClick={next}>
                    {step === steps.length - 1 ? 'Kom igång!' : 'Nästa'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {step === 0 && (
                <button onClick={finish} className="w-full text-center text-[11px] text-muted-foreground/60 mt-3 hover:text-muted-foreground transition-colors">Hoppa över</button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
