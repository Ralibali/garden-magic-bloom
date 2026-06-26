import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

const KEY = 'cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(KEY)) {
      const timer = window.setTimeout(() => setVisible(true), 900);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const save = (value: 'accepted' | 'declined') => {
    localStorage.setItem(KEY, value);
    setVisible(false);
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: value }));
    if (value === 'accepted' && typeof (window as any).loadGoogleAds === 'function') (window as any).loadGoogleAds();
  };

  if (!visible) return null;
  return <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[60] sm:max-w-sm animate-fade-in"><div className="bg-card border border-border rounded-2xl shadow-xl p-5"><div className="flex items-start gap-3 mb-3"><div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Cookie className="h-[18px] w-[18px] text-primary" /></div><div><p className="text-sm font-medium mb-1">Du väljer vad vi mäter</p><p className="text-xs text-muted-foreground leading-relaxed">Nödvändiga cookies håller dig inloggad. Med ditt samtycke mäter vi också vad som hjälper oss förbättra tjänsten. <a href="/terms" className="text-primary hover:underline">Läs mer</a></p></div></div><div className="flex gap-2"><Button onClick={() => save('accepted')} size="sm" className="flex-1">Tillåt statistik</Button><Button onClick={() => save('declined')} variant="outline" size="sm" className="flex-1">Bara nödvändiga</Button></div></div></div>;
}
