import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarDays, Check, LayoutGrid, Sparkles, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

function localPlan(): { methods?: string[]; crops?: string[] } {
  try { return JSON.parse(localStorage.getItem('odlingsdagboken_onboarding_plan') || '{}'); }
  catch { return {}; }
}

export default function GettingStartedGuide() {
  const navigate = useNavigate();
  const fallbackPlan = useMemo(localPlan, []);
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
  const { data: beds = [] } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });
  const { data: sowings = [] } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });
  const storedPlan = (profile?.preferences as any)?.onboarding_plan || {};
  const plan = Object.keys(storedPlan).length ? storedPlan : fallbackPlan;
  const crop = plan.crops?.[0] || 'Tomat';
  const place = plan.methods?.[0] || 'Odlingsplats';
  const hasBed = beds.length > 0;
  const hasSowing = sowings.length > 0;

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/8 via-card to-accent/8 shadow-md overflow-hidden">
      <CardHeader className="pb-3"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><Badge variant="secondary" className="mb-3 gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Din snabbstart</Badge><CardTitle className="text-2xl font-serif">Gör dagboken användbar på två steg</CardTitle><p className="text-sm text-muted-foreground mt-2 max-w-2xl">Börja med en {place.toLowerCase()} och logga sedan en första gröda, exempelvis <strong className="text-foreground">{crop}</strong>. Valen följer nu med mellan dina enheter.</p></div><div className="rounded-2xl bg-background/70 border border-border px-4 py-3 text-center"><p className="text-2xl font-bold text-primary">{Number(hasBed) + Number(hasSowing)}/2</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">klart</p></div></div></CardHeader>
      <CardContent className="space-y-4"><div className="grid md:grid-cols-2 gap-3"><button onClick={() => navigate('/app/beds')} className={`rounded-2xl border p-4 flex gap-3 text-left hover:border-primary/40 ${hasBed ? 'border-primary/25 bg-primary/5' : 'border-border bg-background/70'}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasBed ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>{hasBed ? <Check className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}</div><div><p className="text-xs font-semibold text-primary mb-1">1. Skapa en plats</p><p className="font-medium">{hasBed ? beds[0]?.name : place}</p><p className="text-xs text-muted-foreground mt-1">Samlar sådd, skörd och lärdomar.</p></div></button><button onClick={() => navigate('/app/sowings', { state: { prefill: { variety: crop } } })} className={`rounded-2xl border p-4 flex gap-3 text-left hover:border-primary/40 ${hasSowing ? 'border-primary/25 bg-primary/5' : 'border-border bg-background/70'}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasSowing ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>{hasSowing ? <Check className="h-5 w-5" /> : <Sprout className="h-5 w-5" />}</div><div><p className="text-xs font-semibold text-primary mb-1">2. Logga första sådden</p><p className="font-medium">{hasSowing ? sowings[0]?.variety : crop}</p><p className="text-xs text-muted-foreground mt-1">Starten på din odlingshistorik.</p></div></button></div><div className="flex flex-col sm:flex-row gap-2"><Button className="gap-2" onClick={() => navigate(hasBed ? '/app/sowings' : '/app/beds')}>{hasBed ? 'Logga första sådden' : 'Skapa första platsen'} <ArrowRight className="h-4 w-4" /></Button><Button variant="outline" className="gap-2" onClick={() => navigate('/app/calendar')}><CalendarDays className="h-4 w-4" /> Se såkalendern</Button></div></CardContent>
    </Card>
  );
}
