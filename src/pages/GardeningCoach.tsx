import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, Leaf } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from '@/hooks/use-toast';

const COACH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gardening-coach`;

const GardeningCoach = () => {
  const [tips, setTips] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchTips = useCallback(async () => {
    setLoading(true);
    setTips('');
    setHasLoaded(true);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Inte inloggad');

      const resp = await fetch(COACH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({}),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Kunde inte hämta tips');
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setTips(accumulated);
            }
          } catch { /* partial json */ }
        }
      }
    } catch (e: any) {
      toast({ title: 'Fel', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Odlingscoachen
          </h1>
          <p className="text-muted-foreground text-sm">Personliga tips baserat på din odling och klimatzon</p>
        </div>
        <Button onClick={fetchTips} disabled={loading} className="gap-2">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Tänker...' : hasLoaded ? 'Nya tips' : 'Hämta tips'}
        </Button>
      </div>

      {!hasLoaded && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Leaf className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Din personliga odlingsrådgivare</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1">
                Odlingscoachen analyserar dina sådder, krukväxter och klimatzon för att ge dig skräddarsydda tips – just nu.
              </p>
            </div>
            <Button onClick={fetchTips} size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" /> Hämta mina tips
            </Button>
          </CardContent>
        </Card>
      )}

      {hasLoaded && (
        <Card>
          <CardContent className="py-6">
            {loading && !tips && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analyserar din odling...</span>
              </div>
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground">
              <ReactMarkdown>{tips}</ReactMarkdown>
            </div>
            {!loading && tips && (
              <p className="text-[11px] text-muted-foreground mt-6 pt-4 border-t">
                💡 Tipsen är AI-genererade och baserade på din odlingsdata. Dubbelkolla alltid med lokala förhållanden.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GardeningCoach;
