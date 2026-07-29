import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sprout, X } from 'lucide-react';
import { hasDecision, CONSENT_EVENT } from '@/lib/cookieConsent';
import { useAuth } from '@/hooks/useAuth';
import { plausibleEvent } from '@/lib/plausible';

const DISMISS_KEY = 'odb_sticky_signup_dismissed';
const SHOWN_KEY = 'odb_sticky_signup_shown';
const SCROLL_TRIGGER_VH = 0.55;

/**
 * Flytande konverteringslist för anonyma besökare på publika sidor.
 * Visas efter att besökaren scrollat en bit (engagemang), först efter att
 * cookie-beslut fattats (så den aldrig kolliderar med cookie-bannern), och
 * aldrig på /login där registreringsformuläret redan finns.
 * Stängs per session via sessionStorage.
 */
export default function StickySignupBar() {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const isLoginPage = location.pathname === '/login';

  useEffect(() => {
    if (dismissed || isLoginPage || loading || isAuthenticated) return;

    const maybeShow = () => {
      if (!hasDecision()) return; // cookie-bannern har företräde
      if (window.scrollY < window.innerHeight * SCROLL_TRIGGER_VH) return;
      setVisible(true);
      try {
        if (!sessionStorage.getItem(SHOWN_KEY)) {
          sessionStorage.setItem(SHOWN_KEY, '1');
          plausibleEvent('Sticky Signup Shown');
        }
      } catch {
        /* noop */
      }
    };

    const onScroll = () => maybeShow();
    const onConsent = () => maybeShow();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener(CONSENT_EVENT, onConsent);
    maybeShow(); // ifall sidan laddas redan nerscrollad med beslut taget

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener(CONSENT_EVENT, onConsent);
    };
  }, [dismissed, isLoginPage, loading, isAuthenticated, location.pathname]);

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* noop */
    }
  };

  const show = visible && !dismissed && !isLoginPage && !loading && !isAuthenticated;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="fixed inset-x-3 bottom-3 sm:inset-x-0 sm:bottom-5 z-40 flex justify-center pointer-events-none"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div
            role="complementary"
            aria-label="Skapa gratis konto"
            className="pointer-events-auto relative flex items-center gap-3 rounded-2xl border border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl px-4 py-3 sm:px-5 w-full max-w-xl"
          >
            <span className="botanical-panel w-10 h-10 rounded-xl hidden sm:flex items-center justify-center shrink-0">
              <Sprout className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug">
                Spara det här i din egen odlingsdagbok
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Gratis · inget betalkort · tar under en minut
              </p>
            </div>
            <Button asChild size="sm" className="gap-1.5 shrink-0 min-h-[40px]">
              <Link
                to="/login?mode=register&source=sticky_bar"
                onClick={() => plausibleEvent('Sticky Signup Clicked', { page: location.pathname })}
              >
                Börja gratis <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Stäng"
              className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground flex items-center justify-center shadow-sm transition-colors"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
