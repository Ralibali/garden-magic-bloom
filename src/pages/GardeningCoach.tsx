import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Leaf, Send, RefreshCw, Crown, Sparkles, Lock, MessageCircle, ImagePlus, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from '@/hooks/use-toast';
import { FadeIn } from '@/components/animations';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import GroProductSuggestion from '@/components/GroProductSuggestion';

const FREE_DAILY_LIMIT = 3;
const COACH_USAGE_KEY = 'gro-daily-usage';

function getDailyUsage(): { count: number; date: string } {
  try {
    const raw = localStorage.getItem(COACH_USAGE_KEY);
    if (!raw) return { count: 0, date: '' };
    return JSON.parse(raw);
  } catch { return { count: 0, date: '' }; }
}

function incrementUsage(): number {
  const today = new Date().toISOString().split('T')[0];
  const usage = getDailyUsage();
  const newCount = usage.date === today ? usage.count + 1 : 1;
  localStorage.setItem(COACH_USAGE_KEY, JSON.stringify({ count: newCount, date: today }));
  return newCount;
}

function getRemainingToday(): number {
  const today = new Date().toISOString().split('T')[0];
  const usage = getDailyUsage();
  if (usage.date !== today) return FREE_DAILY_LIMIT;
  return Math.max(0, FREE_DAILY_LIMIT - usage.count);
}

const COACH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gardening-coach`;

type Msg = { role: 'user' | 'assistant'; content: string; images?: string[] };

async function compressImage(file: File, maxSide = 1280, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

async function streamChat({
  messages,
  accessToken,
  onDelta,
  onDone,
  signal,
}: {
  messages: Msg[];
  accessToken: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(COACH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const e: any = new Error(err.message || err.error || `Fel ${resp.status}`);
    e.status = resp.status;
    e.code = err.error;
    throw e;
  }
  if (!resp.body) throw new Error('No stream');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* partial */ }
    }
  }
  onDone();
}

function GroUpsell() {
  const navigate = useNavigate();
  const exampleQuestions = [
    'Varför gulnar mina tomatblad?',
    'När ska jag plantera ut squashen?',
    'Vilken bädd passar bäst för morötter i år?',
    'Hur ofta ska jag vattna mina chiliplantor?',
    'Vad kan jag så i juni i zon 3?',
  ];
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
      <div className="max-w-sm w-full mx-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto"><span className="text-3xl">🌿</span></div>
        <div className="space-y-2">
          <h3 className="font-serif text-xl font-semibold text-foreground">Lås upp obegränsad tillgång till Gro</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">Dina {FREE_DAILY_LIMIT} gratisfrågor för idag är slut. Med Plus kan du chatta obegränsat med Gro.</p>
        </div>
        <div className="space-y-2 text-left">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Exempel på frågor</p>
          <div className="space-y-1.5">
            {exampleQuestions.map(q => (
              <div key={q} className="text-sm text-foreground/80 bg-muted/50 border border-border/40 rounded-xl px-3.5 py-2.5 italic">"{q}"</div>
            ))}
          </div>
        </div>
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Plus · 99 kr/år</div>
          <Button onClick={() => navigate('/app/premium')} className="w-full gap-2"><Sparkles className="h-4 w-4" /> Uppgradera till Plus</Button>
        </div>
      </div>
    </div>
  );
}

const GardeningCoach = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPremium = user?.subscription_status === 'premium';
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [remaining, setRemaining] = useState(getRemainingToday());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
  };

  const getSession = async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inte inloggad');
    return session;
  };

  const sendMessages = useCallback(async (msgs: Msg[]) => {
    setLoading(true);
    abortRef.current = new AbortController();
    let accumulated = '';

    const upsertAssistant = (chunk: string) => {
      accumulated += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: accumulated } : m);
        }
        return [...prev, { role: 'assistant', content: accumulated }];
      });
      scrollToBottom();
    };

    try {
      const session = await getSession();
      await streamChat({
        messages: msgs,
        accessToken: session.access_token,
        onDelta: upsertAssistant,
        onDone: () => setLoading(false),
        signal: abortRef.current.signal,
      });
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        if (e.code === 'free_limit_reached' || e.status === 429) {
          localStorage.setItem(COACH_USAGE_KEY, JSON.stringify({ count: FREE_DAILY_LIMIT, date: new Date().toISOString().split('T')[0] }));
          setRemaining(0);
          setMessages(prev => prev[prev.length - 1]?.role === 'user' ? prev.slice(0, -1) : prev);
        } else {
          toast({ title: 'Fel', description: e.message, variant: 'destructive' });
        }
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      sendMessages([]);
    }
  }, [initialized, sendMessages]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const slots = 2 - pendingImages.length;
    const toUse = Array.from(files).slice(0, slots);
    for (const f of toUse) {
      try {
        const dataUrl = await compressImage(f);
        const b64 = dataUrl.split(',')[1] || '';
        if (b64.length * 0.75 > 1_500_000) {
          toast({ title: 'Bilden är för stor', description: 'Försök med en mindre bild.', variant: 'destructive' });
          continue;
        }
        setPendingImages(prev => [...prev, dataUrl]);
      } catch {
        toast({ title: 'Kunde inte läsa bilden', variant: 'destructive' });
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && pendingImages.length === 0) || loading) return;
    if (!isPremium && getRemainingToday() <= 0) {
      toast({ title: 'Dagskvot uppnådd', description: `Du har använt dina ${FREE_DAILY_LIMIT} gratisfrågor idag.`, variant: 'destructive' });
      return;
    }
    setInput('');
    const imgs = pendingImages;
    setPendingImages([]);
    if (!isPremium) {
      incrementUsage();
      setRemaining(getRemainingToday());
    }
    const userMsg: Msg = { role: 'user', content: text || (imgs.length ? 'Vad ser du på bilden?' : ''), images: imgs.length ? imgs : undefined };
    const newMsgs = [...messages.filter(m => m.content || (m.images && m.images.length)), userMsg];
    setMessages(prev => [...prev, userMsg]);
    scrollToBottom();
    await sendMessages(newMsgs);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-6rem)] max-w-3xl mx-auto relative">
      <FadeIn>
        <div className="flex items-center gap-3 pb-4 border-b border-border/60">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Leaf className="h-5 w-5 text-primary" /></div>
          <div><h1 className="text-xl font-bold text-foreground">Gro</h1><p className="text-xs text-muted-foreground">Din personliga odlingscoach</p></div>
        </div>
      </FadeIn>

      {!isPremium && remaining <= 0 && <GroUpsell />}

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-[hsl(152_36%_32%/0.12)] flex items-center justify-center shrink-0 mb-1"><span className="text-sm">🌿</span></div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-[hsl(152_36%_32%/0.06)] dark:bg-muted/60 text-foreground rounded-bl-md border border-border/40'}`}>
              {msg.images && msg.images.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {msg.images.map((src, k) => (
                    <img key={k} src={src} alt="" className="max-h-40 rounded-lg border border-border/40" />
                  ))}
                </div>
              )}
              {msg.role === 'assistant' ? (
                <>
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground prose-p:my-1 prose-ul:my-1 prose-headings:my-2">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {!loading && i === messages.length - 1 && <GroProductSuggestion text={msg.content} />}
                </>
              ) : (
                msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-8 h-8 rounded-full bg-[hsl(152_36%_32%/0.12)] flex items-center justify-center shrink-0 mb-1"><span className="text-sm">🌿</span></div>
            <div className="bg-[hsl(152_36%_32%/0.06)] dark:bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3 border border-border/40">
              <div className="flex items-center gap-2 text-muted-foreground"><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span className="text-sm">Gro tänker...</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border/60 pt-3 pb-1">
        {!isPremium && (
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] text-muted-foreground">
              {remaining > 0 ? `${remaining} av ${FREE_DAILY_LIMIT} gratisfrågor kvar idag` : 'Inga gratisfrågor kvar idag'}
            </span>
            {remaining <= 0 && (
              <button onClick={() => navigate('/app/premium')} className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1">
                <Crown className="h-3 w-3" /> Uppgradera till Plus
              </button>
            )}
          </div>
        )}

        {pendingImages.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {pendingImages.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="h-16 w-16 object-cover rounded-lg border border-border" />
                <button
                  onClick={() => setPendingImages(p => p.filter((_, k) => k !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  aria-label="Ta bort bild"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFiles(e.target.files)} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl shrink-0"
            onClick={() => fileRef.current?.click()}
            disabled={loading || pendingImages.length >= 2 || (!isPremium && remaining <= 0)}
            aria-label="Lägg till bild"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={!isPremium && remaining <= 0 ? 'Uppgradera till Plus för fler frågor...' : 'Ställ en fråga eller fota en planta...'}
            disabled={loading || (!isPremium && remaining <= 0)}
            className="flex-1 rounded-xl bg-muted/40 border-border/60"
          />
          <Button onClick={handleSend} disabled={loading || (!input.trim() && pendingImages.length === 0) || (!isPremium && remaining <= 0)} size="icon" className="rounded-xl shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">Gro ger AI-genererade råd. Dubbelkolla alltid med lokala förhållanden.</p>
      </div>
    </div>
  );
};

export default GardeningCoach;
