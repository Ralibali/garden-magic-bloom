import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasAiConsent, setAiConsent } from '@/lib/aiConsent';
import { Button } from './ui/button';
import { toast } from 'sonner';

export default function AiConsentGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState(() => hasAiConsent(user?.id));
  useEffect(() => {
    const refresh = () => setAllowed(hasAiConsent(user?.id));
    refresh(); window.addEventListener('ai-consent-change', refresh); window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('ai-consent-change', refresh); window.removeEventListener('storage', refresh); };
  }, [user?.id]);
  if (allowed && hasAiConsent(user?.id)) return <>{children}</>;
  return <section className="max-w-xl mx-auto rounded-3xl border bg-card p-6 sm:p-8 space-y-4">
    <Leaf className="h-9 w-9 text-primary" /><h1 className="font-serif text-3xl">Låt Gro lära känna din odling</h1>
    <p className="text-sm leading-relaxed">Gro använder Googles Gemini via Lovables AI-tjänst. När du använder Gro skickas dina frågor, valda bilder och odlingsuppgifter från ditt konto dit: namn, växter, platser, anteckningar, sådder, skördar, problem och påminnelser.</p>
    <p className="text-sm leading-relaxed">Samma val gäller när du ber om AI-analys av en växtbild eller fröpåse. Fältdagbokens lokala innehåll delas inte. Du kan återkalla valet i Inställningar. Redan skickade uppgifter kan inte tas tillbaka genom att återkalla.</p>
    <p className="text-sm text-muted-foreground">AI kan ha fel. Dela bara uppgifter du vill använda i rådgivningen. Övriga odlingsverktyg fungerar utan AI.</p>
    <Link to="/terms" className="text-sm underline text-primary inline-block">Läs om integritet och AI</Link>
    <Button className="w-full min-h-12" onClick={() => { if (!user) return; try { setAiConsent(user.id, true); } catch { toast.error('Valet kunde inte sparas. Försök igen.'); } }}>Jag godkänner delningen och vill använda AI</Button>
    <Button asChild variant="outline" className="w-full"><Link to="/app/odlingar">Fortsätt utan AI</Link></Button>
  </section>;
}
