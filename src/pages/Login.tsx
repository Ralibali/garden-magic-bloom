import React, { useEffect, useRef, useState } from 'react';
import { Seo } from '@/hooks/useSeo';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import heroGarden from '@/assets/hero-garden.jpg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  Gift,
  Leaf,
  Loader2,
  Lock,
  Mail,
  Sprout,
  User,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { plausibleEvent } from '@/lib/plausible';

type AuthMode = 'login' | 'register' | 'forgot' | 'verify';

const registerBenefits = [
  'Spara din personliga såkalender och odlingsplan',
  'Logga sådder, skördar och lärdomar',
  'Få 14 dagars Plus gratis utan betalkort',
];

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.98 11.98 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.98 11.98 0 0 0 0 10.76l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.94 11.94 0 0 0 12 0 11.98 11.98 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.36 12.72c.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.71-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.18-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.74 2.21 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.87.69 1.18-.02 1.93-1.08 2.65-2.15.84-1.23 1.18-2.42 1.2-2.48-.03-.01-2.3-.88-2.28-3.53zM14.2 5.9c.61-.74 1.02-1.77.91-2.8-.88.04-1.94.59-2.57 1.32-.56.65-1.05 1.7-.92 2.7.98.08 1.98-.5 2.58-1.22z" />
    </svg>
  );
}


function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative" aria-hidden="true">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
      <div className="relative flex justify-center"><span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span></div>
    </div>
  );
}

function authError(message?: string) {
  const value = (message || '').toLowerCase();
  if (value.includes('invalid login credentials')) return 'Fel e-postadress eller lösenord.';
  if (value.includes('email not confirmed')) return 'Bekräfta e-postadressen innan du loggar in. Du kan skicka länken igen nedan.';
  if (value.includes('already registered')) return 'Det finns redan ett konto med den e-postadressen. Logga in eller återställ lösenordet.';
  if (value.includes('rate') || value.includes('too many')) return 'För många försök på kort tid. Vänta en stund och försök igen.';
  if (value.includes('password')) return 'Lösenordet behöver vara minst åtta tecken.';
  return message || 'Något gick fel. Försök igen.';
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, isAuthenticated, loading: authLoading } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>(searchParams.get('mode') === 'login' ? 'login' : 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [showReferralField, setShowReferralField] = useState(!!searchParams.get('ref'));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const formViewTracked = useRef(false);
  const source = searchParams.get('source') || 'direct';

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate('/app', { replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const queryEmail = searchParams.get('email');
    let storedEmail = '';
    try {
      storedEmail = localStorage.getItem('odlingsdagboken_lead_email') || '';
    } catch {}
    setEmail(current => current || queryEmail || storedEmail);
  }, [searchParams]);

  useEffect(() => {
    if (authMode !== 'register' || formViewTracked.current) return;
    formViewTracked.current = true;
    plausibleEvent('Signup Form Viewed', { source });
  }, [authMode, source]);

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    plausibleEvent('Signup Started', { method: 'google' });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/app` },
      });
      if (error) throw error;
      // Webbläsaren omdirigerar till Google — laddningsläget lämnas kvar.
    } catch (error: any) {
      plausibleEvent('Signup Error', { reason: 'google_unavailable' });
      toast({
        title: 'Google-inloggning är inte aktiverad ännu',
        description: 'Skapa konto med e-post istället – det tar under en minut.',
        variant: 'destructive',
      });
      setGoogleLoading(false);
    }
  };

  const renderGoogleButton = () => (
    <Button type="button" variant="outline" className="w-full h-12 gap-3 font-medium" onClick={handleGoogleAuth} disabled={googleLoading || appleLoading || loading}>
      {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
      Fortsätt med Google
    </Button>
  );

  const handleAppleAuth = async () => {
    setAppleLoading(true);
    plausibleEvent('Signup Started', { method: 'apple' });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: `${window.location.origin}/app` },
      });
      if (error) throw error;
      // Webbläsaren omdirigerar till Apple — laddningsläget lämnas kvar.
    } catch (error: any) {
      plausibleEvent('Signup Error', { reason: 'apple_unavailable' });
      toast({
        title: 'Apple-inloggning är inte aktiverad ännu',
        description: 'Skapa konto med e-post istället – det tar under en minut.',
        variant: 'destructive',
      });
      setAppleLoading(false);
    }
  };

  const renderAppleButton = () => (
    <Button type="button" variant="outline" className="w-full h-12 gap-3 font-medium" onClick={handleAppleAuth} disabled={appleLoading || googleLoading || loading}>
      {appleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AppleIcon />}
      Fortsätt med Apple
    </Button>
  );



  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/app', { replace: true });
    } catch (error: any) {
      toast({ title: 'Kunde inte logga in', description: authError(error.message), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const data = await register(normalizedEmail, password, name.trim());

      if (referralCode.trim() && data?.user?.id) {
        try {
          await supabase.rpc('process_referral', {
            _referral_code: referralCode.trim().toUpperCase(),
            _new_user_id: data.user.id,
          });
        } catch {}
      }

      if (data?.session) {
        toast({ title: 'Välkommen! 🌱', description: 'Nu anpassar vi Odlingsdagboken efter din odling.' });
        navigate('/app', { replace: true });
      } else {
        setVerificationEmail(normalizedEmail);
        setAuthMode('verify');
        plausibleEvent('Signup Confirmation Required', { source });
      }
    } catch (error: any) {
      toast({ title: 'Kunde inte skapa kontot', description: authError(error.message), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      toast({ title: 'Återställningslänken är skickad', description: 'Kontrollera även skräpposten om du inte ser mejlet.' });
    } catch (error: any) {
      toast({ title: 'Kunde inte skicka länken', description: authError(error.message), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    if (!verificationEmail) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      });
      if (error) throw error;
      plausibleEvent('Signup Confirmation Resent', { source });
      toast({ title: 'Ny länk skickad', description: 'Kontrollera inkorgen och skräpposten.' });
    } catch (error: any) {
      toast({ title: 'Kunde inte skicka en ny länk', description: authError(error.message), variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  const renderPasswordField = (id: string, autoComplete: string) => (
    <div className="relative mt-1.5">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        id={id}
        type={showPassword ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={authMode === 'register' ? 'Minst 8 tecken' : undefined}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="pl-10 pr-11 h-11"
        minLength={authMode === 'register' ? 8 : undefined}
        required
      />
      <button
        type="button"
        onClick={() => setShowPassword(current => !current)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <Seo title="Skapa gratis konto | Odlingsdagboken" description="Skapa ett gratis konto och börja spara såkalender, odlingsplan, skördar och anteckningar." path="/login" noindex />

      <aside className="hidden lg:flex lg:w-[48%] relative overflow-hidden">
        <img src={heroGarden} alt="Svensk köksträdgård med odlingsbäddar" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/65 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium mb-5 w-fit"><Leaf className="h-3.5 w-3.5" /> Det du antecknar i år blir kunskap nästa år</div>
          <h2 className="font-serif text-5xl text-foreground mb-4 leading-tight">Odla smartare, år efter år</h2>
          <p className="text-muted-foreground text-lg max-w-md mb-6">Spara såkalender, odlingsplan, skörd och misstag på ett ställe. Nästa säsong slipper du gissa.</p>
          <div className="grid gap-3 max-w-md">
            {[
              ['Personlig såkalender', 'Planera efter svenska förhållanden', CalendarDays],
              ['AI-coachen Gro', 'Få hjälp utifrån din egen odling', Bot],
              ['Skördelogg', 'Se vilka bäddar och grödor som gav mest', Sprout],
            ].map(([title, text, Icon]) => {
              const FeatureIcon = Icon as typeof Sprout;
              return <div key={title as string} className="rounded-2xl border border-border bg-card/85 backdrop-blur-sm p-4 flex gap-3"><div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><FeatureIcon className="h-4 w-4" /></div><div><p className="font-medium text-foreground">{title as string}</p><p className="text-sm text-muted-foreground">{text as string}</p></div></div>;
            })}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-5 sm:p-8 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-7 hover:opacity-80 transition-opacity"><div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center"><Sprout className="h-5 w-5 text-primary" /></div><div><h1 className="font-serif text-xl text-foreground">Odlingsdagboken</h1><p className="text-xs text-muted-foreground">Din personliga odlingsassistent</p></div></Link>

          <div className="rounded-3xl border border-border bg-card/95 shadow-xl p-5 sm:p-7">
            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div><h2 className="font-serif text-3xl mb-2">Välkommen tillbaka</h2><p className="text-sm text-muted-foreground">Fortsätt bygga din odlingshistorik.</p></div>
                {renderGoogleButton()}
                {renderAppleButton()}
                <AuthDivider label="eller med e-post" />
                <div className="space-y-4">
                  <div><Label htmlFor="email">E-post</Label><div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10 h-11" required /></div></div>
                  <div><Label htmlFor="password">Lösenord</Label>{renderPasswordField('password', 'current-password')}</div>
                </div>
                <Button type="submit" className="w-full h-12" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Logga in <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <div className="flex justify-between text-sm"><button type="button" className="text-primary hover:underline" onClick={() => setAuthMode('forgot')}>Glömt lösenord?</button><button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setAuthMode('register')}>Skapa konto</button></div>
              </form>
            )}

            {authMode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div><div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium mb-4"><Check className="h-3.5 w-3.5" /> Gratis att börja</div><h2 className="font-serif text-3xl mb-2">Spara din odling</h2><p className="text-sm text-muted-foreground">Skapa kontot på under en minut. Din plan på den här enheten följer med automatiskt.</p></div>
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 space-y-2">{registerBenefits.map(item => <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-primary shrink-0" />{item}</div>)}</div>
                {renderGoogleButton()}
                <AuthDivider label="eller med e-post" />
                <div className="space-y-4">
                  <div><Label htmlFor="name">Förnamn</Label><div className="relative mt-1.5"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="name" autoComplete="given-name" value={name} onChange={(event) => setName(event.target.value)} className="pl-10 h-11" required /></div></div>
                  <div><Label htmlFor="reg-email">E-post</Label><div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="reg-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10 h-11" required /></div></div>
                  <div><Label htmlFor="reg-password">Lösenord</Label>{renderPasswordField('reg-password', 'new-password')}<p className="mt-1.5 text-[11px] text-muted-foreground">Minst 8 tecken. Använd gärna en unik lösenfras.</p></div>
                  {!showReferralField ? <button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowReferralField(true)}>Har du en värvningskod?</button> : <div><Label htmlFor="referral">Värvningskod</Label><div className="relative mt-1.5"><Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="referral" value={referralCode} onChange={(event) => setReferralCode(event.target.value.toUpperCase())} className="pl-10 h-11 uppercase" maxLength={6} /></div></div>}
                </div>
                <Button type="submit" className="w-full h-12" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Skapa gratis konto <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">Genom att skapa ett konto godkänner du <a href="/terms" target="_blank" rel="noreferrer" className="text-primary hover:underline">villkoren och integritetspolicyn</a>.</p>
                <div className="flex justify-between text-sm"><Link to="/sakalender" className="text-muted-foreground hover:text-foreground">Testa såkalendern</Link><button type="button" className="text-primary hover:underline" onClick={() => setAuthMode('login')}>Jag har konto</button></div>
              </form>
            )}

            {authMode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div><h2 className="font-serif text-3xl mb-2">Återställ lösenord</h2><p className="text-sm text-muted-foreground">Vi skickar en säker länk till din e-post.</p></div>
                <div><Label htmlFor="forgot-email">E-post</Label><div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="forgot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10 h-11" required /></div></div>
                <Button type="submit" className="w-full h-12" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Skicka återställningslänk</Button>
                <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setAuthMode('login')}>← Tillbaka</button>
              </form>
            )}

            {authMode === 'verify' && (
              <div className="text-center py-4 space-y-5">
                <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto"><Mail className="h-7 w-7" /></div>
                <div><h2 className="font-serif text-3xl mb-2">Bekräfta din e-post</h2><p className="text-sm text-muted-foreground leading-relaxed">Vi har skickat en bekräftelselänk till <strong className="text-foreground">{verificationEmail}</strong>. Klicka på länken så öppnas din sparade odlingsplan.</p></div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4 text-left text-sm text-muted-foreground">Mejlet brukar komma inom någon minut. Kontrollera skräpposten och fliken Kampanjer om det inte syns.</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" asChild><a href="https://mail.google.com" target="_blank" rel="noreferrer">Öppna Gmail</a></Button>
                  <Button variant="outline" asChild><a href="https://outlook.live.com" target="_blank" rel="noreferrer">Öppna Outlook</a></Button>
                </div>
                <Button className="w-full" onClick={resendConfirmation} disabled={resending}>{resending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Skicka en ny bekräftelselänk</Button>
                <Button variant="outline" className="w-full" onClick={() => setAuthMode('login')}>Jag har bekräftat – logga in</Button>
                <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => { setEmail(verificationEmail); setAuthMode('register'); }}>Ändra e-postadress</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
