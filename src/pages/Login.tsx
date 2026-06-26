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

type AuthMode = 'login' | 'register' | 'forgot' | 'verify';

const registerBenefits = [
  'Spara din personliga såkalender och odlingsplan',
  'Logga sådder, skördar och lärdomar',
  'Få 14 dagars Plus gratis utan betalkort',
];

function authError(message?: string) {
  const value = (message || '').toLowerCase();
  if (value.includes('invalid login credentials')) return 'Fel e-postadress eller lösenord.';
  if (value.includes('already registered')) return 'Det finns redan ett konto med den e-postadressen.';
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate('/app', { replace: true });
  }, [authLoading, isAuthenticated, navigate]);

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
            {authMode === 'login' && <form onSubmit={handleLogin} className="space-y-5"><div><h2 className="font-serif text-3xl mb-2">Välkommen tillbaka</h2><p className="text-sm text-muted-foreground">Fortsätt bygga din odlingshistorik.</p></div><div className="space-y-4"><div><Label htmlFor="email">E-post</Label><div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required /></div></div><div><Label htmlFor="password">Lösenord</Label><div className="relative mt-1.5"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" required /></div></div></div><Button type="submit" className="w-full h-12" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Logga in <ArrowRight className="ml-2 h-4 w-4" /></Button><div className="flex justify-between text-sm"><button type="button" className="text-primary hover:underline" onClick={() => setAuthMode('forgot')}>Glömt lösenord?</button><button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setAuthMode('register')}>Skapa konto</button></div></form>}

            {authMode === 'register' && <form onSubmit={handleRegister} className="space-y-5"><div><div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium mb-4"><Check className="h-3.5 w-3.5" /> Gratis att börja</div><h2 className="font-serif text-3xl mb-2">Börja odla smartare</h2><p className="text-sm text-muted-foreground">Skapa ett konto på under en minut. Inget betalkort krävs.</p></div><div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 space-y-2">{registerBenefits.map((item) => <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-primary shrink-0" />{item}</div>)}</div><div className="space-y-4"><div><Label htmlFor="name">Förnamn</Label><div className="relative mt-1.5"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 h-11" required /></div></div><div><Label htmlFor="reg-email">E-post</Label><div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="reg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required /></div></div><div><Label htmlFor="reg-password">Lösenord</Label><div className="relative mt-1.5"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="reg-password" type="password" autoComplete="new-password" placeholder="Minst 8 tecken" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" minLength={8} required /></div></div>{!showReferralField ? <button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowReferralField(true)}>Har du en värvningskod?</button> : <div><Label htmlFor="referral">Värvningskod</Label><div className="relative mt-1.5"><Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="referral" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="pl-10 h-11 uppercase" maxLength={6} /></div></div>}<div className="flex items-start gap-2"><input type="checkbox" id="terms" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1" required /><label htmlFor="terms" className="text-xs text-muted-foreground">Jag godkänner <a href="/terms" target="_blank" rel="noreferrer" className="text-primary hover:underline">villkoren och integritetspolicyn</a>.</label></div></div><Button type="submit" className="w-full h-12" disabled={loading || !acceptedTerms}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Skapa gratis konto <ArrowRight className="ml-2 h-4 w-4" /></Button><div className="flex justify-between text-sm"><Link to="/sakalender" className="text-muted-foreground hover:text-foreground">Testa såkalendern</Link><button type="button" className="text-primary hover:underline" onClick={() => setAuthMode('login')}>Jag har konto</button></div></form>}

            {authMode === 'forgot' && <form onSubmit={handleForgotPassword} className="space-y-5"><div><h2 className="font-serif text-3xl mb-2">Återställ lösenord</h2><p className="text-sm text-muted-foreground">Vi skickar en säker länk till din e-post.</p></div><div><Label htmlFor="forgot-email">E-post</Label><div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required /></div></div><Button type="submit" className="w-full h-12" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Skicka återställningslänk</Button><button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setAuthMode('login')}>← Tillbaka</button></form>}

            {authMode === 'verify' && <div className="text-center py-4 space-y-5"><div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto"><Mail className="h-7 w-7" /></div><div><h2 className="font-serif text-3xl mb-2">Bekräfta din e-post</h2><p className="text-sm text-muted-foreground leading-relaxed">Vi har skickat en bekräftelselänk till <strong className="text-foreground">{verificationEmail}</strong>. Klicka på länken för att öppna din Odlingsdagbok.</p></div><div className="rounded-2xl border border-border bg-muted/30 p-4 text-left text-sm text-muted-foreground">Kontrollera skräpposten om mejlet inte syns. Det kan dröja någon minut.</div><Button variant="outline" className="w-full" onClick={() => setAuthMode('login')}>Jag har bekräftat – logga in</Button></div>}
          </div>
        </div>
      </main>
    </div>
  );
}
