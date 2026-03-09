import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeo } from '@/hooks/useSeo';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, CheckCircle, Sprout } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const navigate = useNavigate();

  useSeo({
    title: 'Återställ lösenord | Odlingsdagboken',
    description: 'Ange ditt nya lösenord för Odlingsdagboken.',
    path: '/reset-password',
    noindex: true,
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase sets the session from the URL hash automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if we already have a session (user clicked link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Lösenordet måste vara minst 6 tecken', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Lösenorden matchar inte', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast({ title: 'Lösenord uppdaterat! ✅' });
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err: any) {
      toast({ title: 'Fel', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background noise-bg">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sprout className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-serif text-2xl text-foreground">Odlingsdagboken</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">
            {success ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle className="h-12 w-12 text-primary mx-auto" />
                <h2 className="text-lg font-semibold text-foreground">Lösenord uppdaterat!</h2>
                <p className="text-sm text-muted-foreground">Du skickas till inloggningen...</p>
              </div>
            ) : !sessionReady ? (
              <div className="text-center space-y-3 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Verifierar din länk...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Nytt lösenord</h2>
                  <p className="text-sm text-muted-foreground mt-1">Ange ditt nya lösenord nedan.</p>
                </div>
                <div>
                  <Label htmlFor="new-password" className="text-muted-foreground">Nytt lösenord</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Minst 6 tecken"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10 h-11"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm-password" className="text-muted-foreground">Bekräfta lösenord</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Skriv lösenordet igen"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pl-10 h-11"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Uppdatera lösenord
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
