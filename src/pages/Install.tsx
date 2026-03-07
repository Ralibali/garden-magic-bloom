import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Smartphone, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </button>

        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🌱</span>
          </div>
          <h1 className="text-2xl font-bold">Installera Odlingsdagboken</h1>
          <p className="text-muted-foreground">Få appen direkt på din hemskärm</p>
        </div>

        {isInstalled ? (
          <Card>
            <CardContent className="py-8 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="font-semibold text-lg">Redan installerad!</h2>
              <p className="text-muted-foreground text-sm">Odlingsdagboken finns på din hemskärm.</p>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Card>
            <CardContent className="py-6 space-y-4">
              <Button onClick={handleInstall} className="w-full gap-2" size="lg">
                <Download className="h-5 w-5" /> Installera appen
              </Button>
              <p className="text-xs text-muted-foreground text-center">Ingen appbutik behövs – installeras direkt!</p>
            </CardContent>
          </Card>
        ) : isIOS ? (
          <Card>
            <CardContent className="py-6 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><Smartphone className="h-5 w-5" /> Så installerar du på iPhone/iPad</h2>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3"><span className="font-bold text-primary shrink-0">1.</span> Tryck på delningsikonen <span className="inline-block">⬆️</span> i Safari</li>
                <li className="flex gap-3"><span className="font-bold text-primary shrink-0">2.</span> Scrolla ner och välj <strong>"Lägg till på hemskärmen"</strong></li>
                <li className="flex gap-3"><span className="font-bold text-primary shrink-0">3.</span> Tryck <strong>"Lägg till"</strong></li>
              </ol>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><Smartphone className="h-5 w-5" /> Så installerar du appen</h2>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3"><span className="font-bold text-primary shrink-0">1.</span> Öppna menyn i din webbläsare (⋮ eller ⋯)</li>
                <li className="flex gap-3"><span className="font-bold text-primary shrink-0">2.</span> Välj <strong>"Installera app"</strong> eller <strong>"Lägg till på hemskärmen"</strong></li>
                <li className="flex gap-3"><span className="font-bold text-primary shrink-0">3.</span> Bekräfta installationen</li>
              </ol>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '⚡', label: 'Snabb', desc: 'Laddar blixtsnabbt' },
            { icon: '📱', label: 'Offline', desc: 'Fungerar utan wifi' },
            { icon: '🔔', label: 'Påminnelser', desc: 'Missa aldrig vattning' },
          ].map(f => (
            <Card key={f.label}>
              <CardContent className="py-4 px-2">
                <div className="text-2xl mb-1">{f.icon}</div>
                <p className="text-xs font-medium">{f.label}</p>
                <p className="text-[10px] text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Install;
