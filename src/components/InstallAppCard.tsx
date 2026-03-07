import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallAppCard() {
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const wasDismissed = localStorage.getItem('install-card-dismissed');
    if (wasDismissed) setDismissed(true);
  }, []);

  if (isStandalone || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('install-card-dismissed', '1');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 shadow-sm overflow-hidden relative">
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <p className="font-serif text-sm text-foreground mb-1">Installera Odlingsdagboken</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Få appen direkt på din hemskärm – fungerar som en vanlig app, utan App Store!
                </p>
                {isIOS ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 text-xs text-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">1</span>
                      <span>Tryck på <Share className="h-3 w-3 inline text-primary -mt-0.5" /> <strong>Dela</strong>-knappen i webbläsaren</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">2</span>
                      <span>Välj <strong>"Lägg till på hemskärmen"</strong></span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">3</span>
                      <span>Tryck <strong>Lägg till</strong> – klart! 🎉</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 text-xs text-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">1</span>
                      <span>Tryck på <strong>⋮ menyn</strong> i webbläsaren</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">2</span>
                      <span>Välj <strong>"Installera app"</strong> eller <strong>"Lägg till på startskärm"</strong></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
