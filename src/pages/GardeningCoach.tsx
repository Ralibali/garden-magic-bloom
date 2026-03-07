import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Leaf, Send, RefreshCw, Crown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from '@/hooks/use-toast';
import { FadeIn } from '@/components/animations';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

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

type Msg = { role: 'user' | 'assistant'; content: string };

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
    throw new Error(err.error || `Fel ${resp.status}`);
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

const GardeningCoach = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPremium = user?.subscription_status === 'premium';
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [remaining, setRemaining] = useState(getRemainingToday());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
        toast({ title: 'Fel', description: e.message, variant: 'destructive' });
      }
      setLoading(false);
    }
  }, []);

  // Auto-load greeting on mount
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      sendMessages([]); // empty = triggers proactive greeting
    }
  }, [initialized, sendMessages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Check daily limit for free users
    if (!isPremium && getRemainingToday() <= 0) {
      toast({
        title: 'Dagskvot uppnådd',
        description: `Du har använt dina ${FREE_DAILY_LIMIT} gratisfrågor idag. Uppgradera till Plus för obegränsad tillgång!`,
        variant: 'destructive',
      });
      return;
    }

    setInput('');
    if (!isPremium) {
      incrementUsage();
      setRemaining(getRemainingToday());
    }
    const userMsg: Msg = { role: 'user', content: text };
    const newMsgs = [...messages.filter(m => m.content), userMsg];
    setMessages(prev => [...prev, userMsg]);
    scrollToBottom();
    await sendMessages(newMsgs);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] max-w-3xl mx-auto">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center gap-3 pb-4 border-b border-border/60">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Gro</h1>
            <p className="text-xs text-muted-foreground">Din personliga odlingscoach</p>
          </div>
        </div>
      </FadeIn>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted/60 text-foreground rounded-bl-md'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground prose-p:my-1 prose-ul:my-1 prose-headings:my-2">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span className="text-sm">Gro tänker...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/60 pt-3 pb-1">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ställ en fråga till Gro..."
            disabled={loading}
            className="flex-1 rounded-xl bg-muted/40 border-border/60"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="rounded-xl shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Gro ger AI-genererade råd baserade på din odlingsdata. Dubbelkolla alltid med lokala förhållanden.
        </p>
      </div>
    </div>
  );
};

export default GardeningCoach;
