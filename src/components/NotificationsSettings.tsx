import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Bell, MapPin, Search, Play, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import WeeklyEmailSettings from './WeeklyEmailSettings';

type Geo = { lat: number; lon: number; name: string; country?: string };

export default function NotificationsSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
  const { supported, permission, isSubscribed, subscribe, unsubscribe, loading } = usePushNotifications();

  const [frostEnabled, setFrostEnabled] = useState<boolean>(true);
  const [dailyBriefingEnabled, setDailyBriefingEnabled] = useState<boolean>(true);
  const [weeklyEmailEnabled, setWeeklyEmailEnabled] = useState<boolean>(true);
  const [locationName, setLocationName] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Geo[]>([]);
  const [searching, setSearching] = useState(false);
  const [runningBriefing, setRunningBriefing] = useState(false);
  const [briefingResult, setBriefingResult] = useState<null | {
    hasSubscription: boolean;
    briefingEnabled: boolean;
    taskCount: number;
    tasks: string[];
    pushSent: boolean;
    pushDelivered: number;
    pushFailed: number;
  }>(null);

  useEffect(() => {
    if (profile) {
      setFrostEnabled((profile as any).frost_alerts_enabled ?? true);
      setDailyBriefingEnabled((profile as any).daily_briefing_enabled ?? true);
      setWeeklyEmailEnabled((profile as any).weekly_email_enabled ?? true);
      setLocationName((profile as any).location_name || '');
    }
  }, [profile]);

  const togglePush = async (next: boolean) => {
    try {
      if (next) await subscribe();
      else await unsubscribe();
      toast({ title: next ? 'Notiser aktiverade' : 'Notiser avaktiverade' });
    } catch (e: any) {
      toast({ title: 'Fel', description: e.message, variant: 'destructive' });
    }
  };

  const toggleFrost = async (next: boolean) => {
    setFrostEnabled(next);
    if (!user) return;
    await supabase.from('profiles').update({ frost_alerts_enabled: next } as any).eq('user_id', user.id);
    qc.invalidateQueries({ queryKey: ['profile'] });
  };

  const toggleDailyBriefing = async (next: boolean) => {
    setDailyBriefingEnabled(next);
    if (!user) return;
    await supabase.from('profiles').update({ daily_briefing_enabled: next } as any).eq('user_id', user.id);
    qc.invalidateQueries({ queryKey: ['profile'] });
  };



  const runBriefingNow = async () => {
    setRunningBriefing(true);
    setBriefingResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('run-my-briefing', { body: {} });
      if (error) throw error;
      setBriefingResult(data);
      if (data?.pushSent) {
        toast({ title: 'Briefing skickad', description: 'Kolla dina notiser.' });
      } else if (!data?.hasSubscription) {
        toast({ title: 'Ingen push-prenumeration', description: 'Aktivera push-notiser först.', variant: 'destructive' });
      } else if (data?.taskCount === 0) {
        toast({ title: 'Inga uppgifter idag', description: 'Inget att briefa om just nu.' });
      } else {
        toast({ title: 'Kunde inte leverera push', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Fel', description: e.message, variant: 'destructive' });
    } finally {
      setRunningBriefing(false);
    }
  };

  const runSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(search)}&count=5&language=sv`);
      const j = await r.json();
      setResults((j.results || []).map((x: any) => ({ lat: x.latitude, lon: x.longitude, name: x.name, country: x.country })));
    } catch (e: any) {
      toast({ title: 'Sökfel', description: e.message, variant: 'destructive' });
    } finally { setSearching(false); }
  };

  const pickLocation = async (g: Geo) => {
    if (!user) return;
    await supabase.from('profiles').update({
      location_lat: g.lat, location_lon: g.lon, location_name: g.name,
    } as any).eq('user_id', user.id);
    setLocationName(g.name);
    setResults([]);
    setSearch('');
    qc.invalidateQueries({ queryKey: ['profile'] });
    toast({ title: `Ort satt till ${g.name}` });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notiser</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!supported && (
            <p className="text-sm text-muted-foreground">Webbnotiser stöds inte i denna webbläsare.</p>
          )}
          {supported && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Push-notiser</p>
                <p className="text-xs text-muted-foreground">Behörighet: {permission}</p>
              </div>
              <Switch checked={isSubscribed} disabled={loading} onCheckedChange={togglePush} />
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">❄️ Frostvarningar</p>
              <p className="text-xs text-muted-foreground">Få en pling kvällen innan natten blir kall.</p>
            </div>
            <Switch checked={frostEnabled} onCheckedChange={toggleFrost} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">🌱 Dagens 3 – morgonbriefing</p>
              <p className="text-xs text-muted-foreground">Dagens viktigaste uppgifter kl 06:45. Skickas bara när något behöver göras.</p>
            </div>
            <Switch checked={dailyBriefingEnabled} onCheckedChange={toggleDailyBriefing} />
          </div>
          <div className="rounded-lg border border-border/60 p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Kör briefing nu</p>
                <p className="text-xs text-muted-foreground">Testa Dagens 3 direkt — skickar push om du har det på.</p>
              </div>
              <Button size="sm" variant="outline" onClick={runBriefingNow} disabled={runningBriefing} className="gap-1.5">
                {runningBriefing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {runningBriefing ? 'Kör…' : 'Kör nu'}
              </Button>
            </div>
            {briefingResult && (
              <div className="text-xs space-y-1 pt-2 border-t border-border/40">
                <p><span className="text-muted-foreground">Push-prenumeration:</span> {briefingResult.hasSubscription ? '✅ aktiv' : '❌ saknas'}</p>
                <p><span className="text-muted-foreground">Uppgifter hittade:</span> {briefingResult.taskCount}</p>
                {briefingResult.tasks.length > 0 && (
                  <ul className="pl-4 list-disc space-y-0.5">
                    {briefingResult.tasks.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                )}
                <p><span className="text-muted-foreground">Push levererad:</span> {briefingResult.pushDelivered} / {briefingResult.pushDelivered + briefingResult.pushFailed}</p>
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-border/40">
            <p className="text-sm font-medium flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Din ort {locationName && <span className="text-xs text-muted-foreground">(nu: {locationName})</span>}</p>
            <p className="text-xs text-muted-foreground mb-2">Mer exakt än klimatzonen. Lämna tomt så används zonen.</p>
            <div className="flex gap-2">
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="t.ex. Linköping" onKeyDown={e => { if (e.key === 'Enter') runSearch(); }} />
              <Button variant="outline" onClick={runSearch} disabled={searching} className="gap-1"><Search className="h-4 w-4" /> Sök</Button>
            </div>
            {results.length > 0 && (
              <ul className="mt-2 border border-border rounded-lg divide-y">
                {results.map((g, i) => (
                  <li key={i}>
                    <button onClick={() => pickLocation(g)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
                      {g.name}{g.country ? `, ${g.country}` : ''} <span className="text-xs text-muted-foreground">({g.lat.toFixed(2)}, {g.lon.toFixed(2)})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
      <WeeklyEmailSettings enabled={weeklyEmailEnabled} onOptimisticChange={setWeeklyEmailEnabled} />
    </>
  );
}
