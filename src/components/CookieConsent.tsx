import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

const CONSENT_KEY = 'cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on load
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
    // Trigger Google Ads loading
    if (typeof (window as any).loadGoogleAds === 'function') {
      (window as any).loadGoogleAds();
    }
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[60] sm:max-w-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Cookie className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Vi använder cookies 🍪</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vi sparar bara nödvändiga cookies för att appen ska fungera. Inga spårningscookies utan ditt samtycke.{' '}
              <a href="/terms" className="text-primary hover:underline">Läs om vår cookiepolicy</a>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={accept} size="sm" className="flex-1 h-9 text-sm">
            Acceptera
          </Button>
          <Button onClick={decline} variant="outline" size="sm" className="flex-1 h-9 text-sm">
            Bara nödvändiga
          </Button>
        </div>
      </div>
    </div>
  );
}
