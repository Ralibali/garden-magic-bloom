import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Bot, Crown, ImagePlus, Leaf, Lock, MessageCircle, RefreshCw, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { FadeIn } from '@/components/animations';
import { useAuth } from '@/hooks/useAuth';
import GroProductSuggestion from '@/components/GroProductSuggestion';
import { recordProductActivity } from '@/lib/analytics';

const FREE_DAILY_LIMIT = 3;
const COACH_USAGE_KEY = 'gro-daily-usage';
const COACH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gardening-coach`;

type Msg = { role: 'user' | 'assistant'; content: string; images?: string[] };

function getDailyUsage(): { count: number; date: string } {
  try {
    const raw = localStorage.getItem(COACH_USAGE_KEY);
    return raw ? JSON.parse(raw) : { count: 0, date: '' };
  } catch {
    return { count: 0, date: '' };
  }
}

function incrementUsage() {
  const today = new Date().toISOString().slice(0, 10);
  const usage = getDailyUsage();
  const count = usage.date === today ? usage.count + 1 : 1;
  localStorage.setItem(COACH_USAGE_KEY, JSON.stringify({ count, date: today }));
  return count;
}

function getRemainingToday() {
  const today = new Date().toISOString().slice(0, 10);
  const usage = getDailyUsage();
  return usage.date === today ? Math.max(0, FREE_DAILY_LIMIT - usage.count) : FREE_DAILY_LIMIT;
}

async function compressImage(file: File, maxSide = 1280, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

async function streamChat({ messages, accessToken, onDelta, onDone, signal }: { messages: Msg[]; accessToken: string; onDelta: (text: string) => void; onDone: () => void; signal?: AbortSignal }) {
  const response = await fetch(COACH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error: any = new Error(body.message || body.error || `Fel ${response.status}`);
    error.status = response.status;
    error.code = body.error;
    throw error;
  }
  if (!response.body) throw new Error('Tomt svar från Gro');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index: number;
    while ((index = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(payload);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {}
    }
  }
  onDone();
}

function GroUpsell() {
  const navigate = useNavigate();
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[1.5rem] bg-background/88 p-4 backdrop-blur-md">
      <div className="premium-panel max-w-sm p-6 text-center">
        <div className="botanical-panel mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem]"><Sparkles className="h-7 w-7 text-lime-200" /></div>
        <h3 className="mt-5 font-serif text-2xl">Fortsätt samtalet med Gro</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Dina {FREE_DAILY_LIMIT} gratisfrågor för idag är använda. Plus ger obegränsade frågor och låter Gro hjälpa dig genom hela säsongen.</p>
        <div className="mt-4 rounded-2xl border border-border/60 bg-muted/40 p-3 text-left text-xs text-muted-foreground"><MessageCircle className="mr-1.5 inline h-3.5 w-3.5" /> Gro känner redan till dina bäddar, sådder, växter, skördar och tidigare säsonger.</div>
        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Plus · 99 kr per år</div>
        <Button onClick={() => navigate('/app/premium')} className="mt-3 w-full"><Crown className="h-4 w-4" /> Visa Plus</Button>
      </div>
    </div>
  );
}

export default function GardeningCoach() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPremium = user?.subscription_status === 'premium';
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [contextPrompt, setContextPrompt] = useState('');
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [remaining, setRemaining] = useState(getRemainingToday());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => window.setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 40);

  const getSession = async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Inte inloggad');
    return session;
  };

  const sendMessages = useCallback(async (nextMessages: Msg[]) => {
    setLoading(true);
    abortRef.current = new AbortController();
    let accumulated = '';
    const upsertAssistant = (chunk: string) => {
      accumulated += chunk;
      setMessages((previous) => {
        const last = previous[previous.length - 1];
        return last?.role === 'assistant'
          ? previous.map((message, index) => index === previous.length - 1 ? { ...message, content: accumulated } : message)
          : [...previous, { role: 'assistant', content: accumulated }];
      });
      scrollToBottom();
    };

    try {
      const session = await getSession();
      await streamChat({ messages: nextMessages, accessToken: session.access_token, onDelta: upsertAssistant, onDone: () => setLoading(false), signal: abortRef.current.signal });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        if (error.code === 'free_limit_reached' || error.status === 429) {
          localStorage.setItem(COACH_USAGE_KEY, JSON.stringify({ count: FREE_DAILY_LIMIT, date: new Date().toISOString().slice(0, 10) }));
          setRemaining(0);
          setMessages((previous) => previous[previous.length - 1]?.role === 'user' ? previous.slice(0, -1) : previous);
        } else {
          toast({ title: 'Gro kunde inte svara', description: error.message, variant: 'destructive' });
        }
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    void sendMessages([]);
  }, [initialized, sendMessages]);

  useEffect(() => {
    const prompt = typeof (location.state as any)?.prompt === 'string' ? (location.state as any).prompt : '';
    if (!prompt) return;
    setInput(prompt);
    setContextPrompt(prompt);
    window.history.replaceState({}, document.title);
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [location.state]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, 2 - pendingImages.length);
    for (const file of selected) {
      try {
        const dataUrl = await compressImage(file);
        const base64 = dataUrl.split(',')[1] || '';
        if (base64.length * 0.75 > 1_500_000) {
          toast({ title: 'Bilden är för stor', description: 'Välj en mindre bild.', variant: 'destructive' });
          continue;
        }
        setPendingImages((previous) => [...previous, dataUrl]);
      } catch {
        toast({ title: 'Kunde inte läsa bilden', variant: 'destructive' });
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !pendingImages.length) || loading) return;
    if (!isPremium && getRemainingToday() <= 0) {
      toast({ title: 'Dagskvoten är använd', description: `Du har använt dina ${FREE_DAILY_LIMIT} gratisfrågor idag.`, variant: 'destructive' });
      return;
    }

    const images = pendingImages;
    const userMessage: Msg = { role: 'user', content: text || 'Vad ser du på bilden?', images: images.length ? images : undefined };
    const nextMessages = [...messages.filter((message) => message.content || message.images?.length), userMessage];
    setInput('');
    setContextPrompt('');
    setPendingImages([]);
    setMessages((previous) => [...previous, userMessage]);
    if (!isPremium) {
      incrementUsage();
      setRemaining(getRemainingToday());
    }
    void recordProductActivity('gro_question_sent', { has_image: images.length > 0, source: (location.state as any)?.source || 'gro' });
    scrollToBottom();
    await sendMessages(nextMessages);
  };

  return (
    <div className="relative mx-auto flex h-[calc(100vh-11rem)] max-w-4xl flex-col overflow-hidden rounded-[1.6rem] border border-border/65 bg-card/82 shadow-[var(--card-shadow)] md:h-[calc(100vh-7.5rem)]">
      <FadeIn>
        <header className="botanical-panel flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08]"><Leaf className="h-5 w-5 text-lime-200" /></div><div><h1 className="font-serif text-xl text-white">Gro</h1><p className="text-xs text-white/55">Din odling, din historik, konkreta nästa steg</p></div></div>
          {!isPremium && <div className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-semibold text-white/70">{remaining} frågor kvar idag</div>}
        </header>
      </FadeIn>

      {!isPremium && remaining <= 0 && <GroUpsell />}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 scroll-smooth sm:p-5">
        {messages.map((message, index) => (
          <div key={index} className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10"><span className="text-sm">🌿</span></div>}
            <div className={`max-w-[86%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-border/45 bg-primary/5 text-foreground'}`}>
              {!!message.images?.length && <div className="mb-2 flex flex-wrap gap-2">{message.images.map((source, imageIndex) => <img key={imageIndex} src={source} alt="" className="max-h-40 rounded-xl border border-border/40" />)}</div>}
              {message.role === 'assistant' ? <><div className="prose prose-sm max-w-none prose-headings:my-2 prose-headings:text-foreground prose-li:text-foreground/90 prose-p:my-1 prose-p:text-foreground/90 prose-strong:text-foreground dark:prose-invert"><ReactMarkdown>{message.content}</ReactMarkdown></div>{!loading && index === messages.length - 1 && <GroProductSuggestion text={message.content} />}</> : <p className="whitespace-pre-wrap text-sm">{message.content}</p>}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== 'assistant' && <div className="flex items-end gap-2"><div className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">🌿</div><div className="rounded-2xl rounded-bl-md border border-border/45 bg-primary/5 px-4 py-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Gro tänker…</div></div></div>}
      </div>

      <footer className="border-t border-border/60 bg-background/65 p-3 backdrop-blur-xl sm:p-4">
        {contextPrompt && <div className="mb-2 flex items-start justify-between gap-3 rounded-xl border border-primary/15 bg-primary/6 px-3 py-2"><div className="flex gap-2 text-xs text-muted-foreground"><Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span>Frågan kommer från dagens personliga rekommendation. Justera texten eller skicka den som den är.</span></div><button onClick={() => { setContextPrompt(''); setInput(''); }} className="text-muted-foreground hover:text-foreground" aria-label="Ta bort förifylld fråga"><X className="h-3.5 w-3.5" /></button></div>}
        {!!pendingImages.length && <div className="mb-2 flex flex-wrap gap-2">{pendingImages.map((source, index) => <div key={index} className="relative"><img src={source} alt="" className="h-16 w-16 rounded-xl border border-border object-cover" /><button onClick={() => setPendingImages((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground" aria-label="Ta bort bild"><X className="h-3 w-3" /></button></div>)}</div>}
        <div className="flex gap-2"><input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleFiles(event.target.files)} /><Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={loading || pendingImages.length >= 2 || (!isPremium && remaining <= 0)} aria-label="Lägg till bild"><ImagePlus className="h-4 w-4" /></Button><Input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSend(); } }} placeholder={!isPremium && remaining <= 0 ? 'Plus krävs för fler frågor idag' : 'Fråga om din odling eller fotografera en planta…'} disabled={loading || (!isPremium && remaining <= 0)} className="flex-1" /><Button onClick={() => void handleSend()} disabled={loading || (!input.trim() && !pendingImages.length) || (!isPremium && remaining <= 0)} size="icon"><Send className="h-4 w-4" /></Button></div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">Gro ger AI-genererade råd och visar osäkerhet när underlaget inte räcker.</p>
      </footer>
    </div>
  );
}
