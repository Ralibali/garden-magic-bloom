import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, Sprout, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'visitor-welcome-dismissed';
const CONSENT_KEY = 'cookie-consent';

export default function VisitorWelcomePopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const scheduleShow = () => {
      if (cancelled) return;
      timer = setTimeout(() => setShow(true), 8000);
    };

    const hasConsent = () => !!localStorage.getItem(CONSENT_KEY);

    if (hasConsent()) {
      scheduleShow();
      return () => { cancelled = true; if (timer) clearTimeout(timer); };
    }

    // Wait for cookie-consent choice before showing welcome popup.
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY && e.newValue) scheduleShow();
    };
    // Same-tab fallback: poll for the key (CookieConsent sets it in this tab).
    const poll = window.setInterval(() => {
      if (hasConsent()) {
        window.clearInterval(poll);
        scheduleShow();
      }
    }, 1000);

    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.clearInterval(poll);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[360px] z-50"
        >
          <div className="relative bg-card border border-border rounded-2xl shadow-lg p-5 pr-10">
            <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors" aria-label="Stäng">
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🌱</span>
              <div className="space-y-1.5">
                <h3 className="font-serif text-sm text-foreground leading-snug">
                  Välkommen till Odlingsdagboken!
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Logga sådder, skördar och växtföljd – se vad som funkar i din trädgård. Helt gratis att börja!
                </p>
                <div className="flex items-center gap-2 pt-1.5">
                  <Link to="/login" onClick={dismiss}>
                    <Button size="sm" className="rounded-xl text-xs gap-1 h-8">
                      <Sprout className="h-3 w-3" /> Skapa konto
                    </Button>
                  </Link>
                  <Link to="/blogg" onClick={dismiss} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
                    Läs bloggen <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
