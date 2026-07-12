import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Cookie } from 'lucide-react';
import { acceptAll, rejectAll, saveConsent, getConsent, hasDecision } from '@/lib/cookieConsent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!hasDecision()) {
      const t = window.setTimeout(() => setVisible(true), 900);
      return () => window.clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const openHandler = () => {
      const current = getConsent();
      setAnalytics(!!current?.analytics);
      setMarketing(!!current?.marketing);
      setPrefsOpen(true);
    };
    window.addEventListener('open-cookie-preferences', openHandler);
    return () => window.removeEventListener('open-cookie-preferences', openHandler);
  }, []);

  const handleAcceptAll = () => { acceptAll(); setVisible(false); setPrefsOpen(false); };
  const handleRejectAll = () => { rejectAll(); setVisible(false); setPrefsOpen(false); };
  const handleSavePrefs = () => {
    saveConsent({ analytics, marketing });
    setVisible(false);
    setPrefsOpen(false);
  };
  const openPrefs = () => {
    const current = getConsent();
    setAnalytics(!!current?.analytics);
    setMarketing(!!current?.marketing);
    setPrefsOpen(true);
  };

  return (
    <>
      {visible && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie-samtycke"
          className="fixed bottom-16 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[60] sm:max-w-sm animate-fade-in"
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Cookie className="h-[18px] w-[18px] text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Du väljer vad vi mäter</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nödvändiga cookies håller dig inloggad. Vi använder även cookies för statistik och marknadsföring – med ditt samtycke. <a href="/terms" className="text-primary hover:underline">Läs mer</a>
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button onClick={handleAcceptAll} size="sm" className="flex-1">Godkänn alla</Button>
                <Button onClick={handleRejectAll} variant="outline" size="sm" className="flex-1">Bara nödvändiga</Button>
              </div>
              <button
                onClick={openPrefs}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 self-center"
              >
                Anpassa inställningar
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cookie-inställningar</DialogTitle>
            <DialogDescription>
              Välj vilka kategorier av cookies du samtycker till. Du kan när som helst ändra dig från vår cookiepolicy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/40">
              <div className="space-y-1">
                <p className="text-sm font-medium">Nödvändiga</p>
                <p className="text-xs text-muted-foreground">
                  Krävs för att du ska kunna logga in, spara sådder och använda appen. Kan inte stängas av.
                </p>
              </div>
              <Switch checked disabled aria-label="Nödvändiga cookies (alltid aktiva)" />
            </div>

            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border">
              <div className="space-y-1">
                <label htmlFor="cookie-analytics" className="text-sm font-medium cursor-pointer">Analys</label>
                <p className="text-xs text-muted-foreground">
                  Hjälper oss förstå vad som fungerar (Plausible, sidvisningar, scrolldjup). Ingen försäljning till tredje part.
                </p>
              </div>
              <Switch
                id="cookie-analytics"
                checked={analytics}
                onCheckedChange={setAnalytics}
                aria-label="Analyscookies"
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border">
              <div className="space-y-1">
                <label htmlFor="cookie-marketing" className="text-sm font-medium cursor-pointer">Marknadsföring</label>
                <p className="text-xs text-muted-foreground">
                  Låter oss mäta effekten av annonser (Google Ads-taggen) så vi kan visa mer relevant innehåll.
                </p>
              </div>
              <Switch
                id="cookie-marketing"
                checked={marketing}
                onCheckedChange={setMarketing}
                aria-label="Marknadsföringscookies"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleRejectAll} className="sm:flex-1">Bara nödvändiga</Button>
            <Button variant="outline" onClick={handleSavePrefs} className="sm:flex-1">Spara val</Button>
            <Button onClick={handleAcceptAll} className="sm:flex-1">Godkänn alla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
