import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ThumbsUp, ThumbsDown, Leaf, Sparkles, AlertTriangle, HeartHandshake, Sprout } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { COMPANION_DATA } from '@/lib/weatherTips';
import { analyzeUserSowings } from '@/lib/companionAnalysis';
import { normalizeSowingStatus } from '@/lib/sowingLifecycle';
import AppEmptyState from '@/components/AppEmptyState';
import { FadeIn } from '@/components/animations';

const CompanionPlanting = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: sowings } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });

  const plants = Object.keys(COMPANION_DATA);
  const q = search.trim().toLowerCase();
  const filtered = plants.filter(p => p.toLowerCase().includes(q));

  // Analysera användarens aktiva sådder mot samplanteringstabellen
  const analysis = useMemo(() => {
    const active = (sowings || []).filter((s: any) => normalizeSowingStatus(s.status) !== 'done');
    return analyzeUserSowings(active);
  }, [sowings]);

  const hasActiveSowings = (sowings || []).some((s: any) => normalizeSowingStatus(s.status) !== 'done');
  const hasAnalysis = analysis.good.length > 0 || analysis.bad.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <FadeIn>
        <section className="premium-panel relative overflow-hidden p-5 sm:p-6">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative">
            <span className="section-kicker mb-3"><Sparkles className="h-3.5 w-3.5" /> Naturens egen skyddsverkstad</span>
            <h1 className="page-title">Samplantering</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Rätt grannar håller skadedjur borta och hjälper varandra att växa. Vi kollar din odling mot beprövade kombinationer.</p>
          </div>
        </section>
      </FadeIn>

      {/* Analys av användarens faktiska odling */}
      {hasActiveSowings && (
        <FadeIn delay={0.05}>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">I din odling just nu</h2>

            {analysis.bad.length > 0 && (
              <div className="space-y-2">
                {analysis.bad.map((pair) => (
                  <Card key={`bad-${pair.plantA}-${pair.plantB}-${pair.bedName ?? ''}`} className="border-destructive/30 bg-destructive/5">
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><AlertTriangle className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{pair.plantA} + {pair.plantB} — undvik ihop</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {pair.bedName ? `Båda finns i ${pair.bedName}. Överväg att flytta en av dem nästa säsong.` : 'Du odlar båda i år. Håll dem gärna i olika bäddar.'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {analysis.good.length > 0 && (
              <div className="space-y-2">
                {analysis.good.map((pair) => (
                  <Card key={`good-${pair.plantA}-${pair.plantB}-${pair.bedName ?? ''}`} className="border-primary/25 bg-primary/5">
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><HeartHandshake className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{pair.plantA} + {pair.plantB} — bra grannar!</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {pair.bedName ? `Samplanterade i ${pair.bedName}. Snyggt jobbat!` : 'Du odlar båda — de trivs gärna nära varandra.'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!hasAnalysis && (
              <Card><CardContent className="p-4 text-sm text-muted-foreground">Dina aktiva sådder matchar inga kända samplanteringspar ännu — bläddra i listan nedan för inspiration.</CardContent></Card>
            )}
          </section>
        </FadeIn>
      )}

      {!hasActiveSowings && (sowings !== undefined) && (
        <FadeIn delay={0.05}>
          <AppEmptyState
            icon={Sprout}
            title="Logga dina sådder för personliga tips"
            description="När du har aktiva sådder visar vi vilka av dina grödor som är bra grannar — och vilka som bör flyttas isär."
            actionLabel="Logga en sådd"
            onAction={() => navigate('/app/sowings')}
          />
        </FadeIn>
      )}

      {/* Referensbibliotek */}
      <FadeIn delay={0.1}>
        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Alla kombinationer</h2>
            <div className="relative sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Sök växt…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          {!filtered.length ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Ingen växt matchar ”{search}”.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(plant => {
                const info = COMPANION_DATA[plant];
                return (
                  <Card key={plant} className="hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--card-shadow-hover)]">
                    <CardContent className="space-y-3 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold"><Leaf className="h-4 w-4 text-primary" />{plant}</p>
                      {info.good.length > 0 && (
                        <div>
                          <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground"><ThumbsUp className="h-3 w-3 text-green-600" /> Bra grannar</p>
                          <div className="flex flex-wrap gap-1">
                            {info.good.map(g => <Badge key={g} variant="secondary" className="border-0 bg-green-50 text-[10px] text-green-700 dark:bg-green-950 dark:text-green-300">{g}</Badge>)}
                          </div>
                        </div>
                      )}
                      {info.bad.length > 0 && (
                        <div>
                          <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground"><ThumbsDown className="h-3 w-3 text-red-500" /> Undvik</p>
                          <div className="flex flex-wrap gap-1">
                            {info.bad.map(b => <Badge key={b} variant="secondary" className="border-0 bg-red-50 text-[10px] text-red-700 dark:bg-red-950 dark:text-red-300">{b}</Badge>)}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </FadeIn>
    </div>
  );
};

export default CompanionPlanting;
