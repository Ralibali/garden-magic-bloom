import React, { useEffect, useState } from 'react';
import { Seo } from '@/hooks/useSeo';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import heroGarden from '@/assets/hero-garden.jpg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sprout, ArrowRight, Mail, Lock, User, Loader2, Gift, Check, CalendarDays, Bot, Leaf } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type AuthMode = 'welcome' | 'login' | 'register' | 'forgot';

const registerBenefits = [
  'Spara din såkalender och odlingsplan',
  'Logga sådder, skördar och anteckningar',
  'Få 14 dagars Plus gratis utan betalkort',
];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, isAuthenticated, loading: authLoading } = useAuth();

  const initialMode = searchParams.get('mode');
  const [authMode, setAuthMode] = useState<AuthMode>(
    initialMode === 'login' ? 'login' : initialMode === 'register' ? 'register' : 'register'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [showReferralField, setShowReferralField] = useState(!!searchParams.get('ref'));
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate('/app', { replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/app', { replace: true });
    } catch (err: any) {
      toast({ title: 'Inloggning misslyckades', description: err.message || 'Kontrollera e-post och lösenord.', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(email, password, name);
      if (referralCode.trim() && data?.user?.id) {
        try { await supabase.rpc('process_referral', { _referral_code: referralCode.trim().toUpperCase(), _new_user_id: data.user.id }); } catch {}
      }
      toast({ title: 'Konto skapat! 🌱', description: 'Du kan nu logga in och börja bygga din odlingshistorik.' });
      setAuthMode('login');
    } catch (err: any) {
      toast({ title: 'Registrering misslyckades', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { toast({ title: 'Ange e-post', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      toast({ title: 'E-post skickad!', description: 'Kolla din inkorg.' });
    } catch (err: any) { toast({ title: 'Fel', description: err.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      <Seo
        title="Skapa gratis konto | Odlingsdagboken"
        description="Skapa ett gratis konto i Odlingsdagboken och börja spara såkalender, odlingsplan, skördar och anteckningar."
        path="/login"
        noindex
      />

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={heroGarden} alt="Svensk köksträdgård med odlingsbäddar" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium mb-5 w-fit">
            <Leaf className="h-3.5 w-3.5" /> Det du antecknar i år blir kunskap nästa år
          </div>
          <h2 className="font-serif text-5xl text-foreground mb-4 leading-tight">Odla smartare, år efter år</h2>
          <p className="text-muted-foreground text-lg max-w-md mb-6">Spara såkalender, odlingsplan, skördar och misstag på ett ställe. Nästa säsong slipper du gissa.</p>
          <div className="grid gap-3 max-w-md">
            {[
              ['Personlig såkalender', 'Planera sådd efter svenska förhållanden', CalendarDays],
              ['AI-coachen Gro', 'Få hjälp när plantorna inte mår bra', Bot],
              ['Skördelogg', 'Se vilka bäddar och grödor som gav mest', Sprout],
            ].map(([title, text, Icon]) => {
              const IconComponent = Icon as typeof Sprout;
              return (
                <div key={title as string} className="rounded-2xl border border-border bg-card/85 backdrop-blur-sm p-4 flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><IconComponent className="h-4 w-4" /></div>
                  <div><p className="font-medium text-foreground">{title as string}</p><p className="text-sm text-muted-foreground">{text as string}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-5 sm:p-6 bg-background noise-bg">
        <div className="w-full max-w-md relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sprout className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl text-foreground">Logga in på Odlingsdagboken</h1>
              <p className="text-xs text-muted-foreground">Din personliga odlingsassistent</p>
            </div>
          </Link>

          {authMode === 'welcome' && (
            <div className="animate-fade-in space-y-6">
              <div>
                <h2 className="font-serif text-3xl text-foreground mb-2">Välkommen!</h2>
                <p className="text-muted-foreground">Skapa en odlingsplan, logga skörd och lär av varje säsong.</p>
              </div>
              <div className="space-y-3">
                <Button onClick={() => setAuthMode('register')} className="w-full h-12 text-base font-medium">Skapa gratis konto <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button variant="outline" onClick={() => setAuthMode('login')} className="w-full h-12 text-base font-medium">Logga in</Button>
              </div>
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="animate-fade-in space-y-5">
              <div><h2 className="font-serif text-3xl text-foreground mb-2">Logga in</h2><p className="text-muted-foreground">Välkommen tillbaka. Fortsätt bygga din odlingshistorik.</p></div>
              <div className="space-y-4">
                <div><Label htmlFor="email" className="text-muted-foreground">E-post</Label><div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="email" type="email" placeholder="din@email.se" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required /></div></div>
                <div><Label htmlFor="password" className="text-muted-foreground">Lösenord</Label><div className="relative mt-1.5"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" required /></div></div>
              </div>
              <Button type="submit" className="w-full h-12 text-base font-medium" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Logga in <ArrowRight className="ml-2 h-4 w-4" /></Button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" className="text-primary hover:underline" onClick={() => setAuthMode('forgot')}>Glömt lösenord?</button>
                <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setAuthMode('register')}>Skapa gratis konto</button>
              </div>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="animate-fade-in space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium mb-4">
                  <Check className="h-3.5 w-3.5" /> Gratis att börja
                </div>
                <h2 className="font-serif text-3xl text-foreground mb-2">Börja odla smartare idag</h2>
                <p className="text-muted-foreground">Skapa ett gratis konto på under 30 sekunder. Spara din plan, logga skörden och lär dig vad som fungerar i just din trädgård.</p>
              </div>

              <div className="rounded-2xl border border-border bg-card/70 p-4 space-y-2">
                {registerBenefits.map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" /> {item}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div><Label htmlFor="name" className="text-muted-foreground">Namn</Label><div className="relative mt-1.5"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="name" type="text" placeholder="Ditt namn" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 h-11" required /></div></div>
                <div><Label htmlFor="reg-email" className="text-muted-foreground">E-post</Label><div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="reg-email" type="email" placeholder="din@email.se" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required /></div></div>
                <div><Label htmlFor="reg-password" className="text-muted-foreground">Lösenord</Label><div className="relative mt-1.5"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="reg-password" type="password" placeholder="Minst 8 tecken" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" minLength={8} required /></div></div>

                {!showReferralField ? (
                  <button type="button" onClick={() => setShowReferralField(true)} className="text-xs text-primary hover:underline">Har du en värvningskod?</button>
                ) : (
                  <div>
                    <Label htmlFor="referral" className="text-muted-foreground">Värvningskod</Label>
                    <div className="relative mt-1.5"><Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="referral" type="text" placeholder="T.ex. A1B2C3" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="pl-10 h-11 uppercase" maxLength={6} autoFocus /></div>
                    <p className="text-[10px] text-muted-foreground mt-1">Fyll i koden från en vän så får ni båda extra Plus-tid.</p>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <input type="checkbox" id="terms" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 rounded border-border" required />
                  <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">Jag har läst och godkänner <a href="/terms" target="_blank" className="text-primary hover:underline">användarvillkoren & integritetspolicyn</a>.</label>
                </div>
              </div>
              <div className="space-y-2">
                <Button type="submit" className="w-full h-12 text-base font-medium" disabled={loading || !acceptedTerms}>{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Skapa gratis konto <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <p className="text-[11px] text-center text-muted-foreground">Inget betalkort krävs · 14 dagars Plus gratis · Avsluta när du vill</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <Link to="/sakalender" className="text-muted-foreground hover:text-foreground">Se såkalender först</Link>
                <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setAuthMode('login')}>Jag har redan konto</button>
              </div>
            </form>
          )}

          {authMode === 'forgot' && (
            <form onSubmit={(e) => { e.preventDefault(); handleForgotPassword(); }} className="animate-fade-in space-y-5">
              <div><h3 className="font-serif text-3xl text-foreground mb-2">Återställ lösenord</h3><p className="text-muted-foreground">Ange din e-post så skickar vi en länk.</p></div>
              <div><Label htmlFor="forgot-email" className="text-muted-foreground">E-post</Label><div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="forgot-email" type="email" placeholder="din@email.se" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required /></div></div>
              <Button type="submit" className="w-full h-12 text-base font-medium" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Skicka återställningslänk</Button>
              <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setAuthMode('login')}>← Tillbaka till login</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
