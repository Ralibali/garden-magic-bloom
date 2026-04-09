import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Users, MousePointerClick, BarChart3, TrendingUp, TrendingDown, Monitor, Smartphone, Tablet, ArrowDownRight, Crown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, FunnelChart, Funnel, LabelList, Cell } from 'recharts';

type Period = '24h' | '7d' | '30d' | '90d';

function periodToHours(p: Period): number {
  return { '24h': 24, '7d': 168, '30d': 720, '90d': 2160 }[p];
}

function fromDate(p: Period): string {
  return new Date(Date.now() - periodToHours(p) * 3600_000).toISOString();
}

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>('7d');
  const [tab, setTab] = useState('pages');

  const since = fromDate(period);
  const prevSince = new Date(Date.now() - periodToHours(period) * 2 * 3600_000).toISOString();

  const { data: pageViews = [], isLoading: pvLoading } = useQuery({
    queryKey: ['admin-pv', period],
    queryFn: async () => {
      const { data } = await supabase.from('page_views').select('*').gte('created_at', since).order('created_at', { ascending: true });
      return (data || []) as any[];
    },
  });

  const { data: prevPageViews = [] } = useQuery({
    queryKey: ['admin-pv-prev', period],
    queryFn: async () => {
      const { data } = await supabase.from('page_views').select('session_id').gte('created_at', prevSince).lt('created_at', since);
      return (data || []) as any[];
    },
  });

  const { data: clickEvents = [], isLoading: ceLoading } = useQuery({
    queryKey: ['admin-ce', period],
    queryFn: async () => {
      const { data } = await supabase.from('click_events').select('*').gte('created_at', since).order('created_at', { ascending: true });
      return (data || []) as any[];
    },
  });

  const kpis = useMemo(() => {
    const totalViews = pageViews.length;
    const uniqueSessions = new Set(pageViews.map((v: any) => v.session_id)).size;
    const prevUnique = new Set(prevPageViews.map((v: any) => v.session_id)).size;
    const uniqueDelta = prevUnique > 0 ? Math.round(((uniqueSessions - prevUnique) / prevUnique) * 100) : 0;
    const pagesPerVisit = uniqueSessions > 0 ? (totalViews / uniqueSessions).toFixed(1) : '0';
    const ctaClicks = clickEvents.filter((e: any) => e.event_name === 'cta_click').length;
    const ctaRate = totalViews > 0 ? ((ctaClicks / totalViews) * 100).toFixed(1) : '0';

    // Bounce rate: sessions with only 1 page view
    const sessionCounts: Record<string, number> = {};
    pageViews.forEach((v: any) => { sessionCounts[v.session_id] = (sessionCounts[v.session_id] || 0) + 1; });
    const totalSessions = Object.keys(sessionCounts).length;
    const bounceSessions = Object.values(sessionCounts).filter(c => c === 1).length;
    const bounceRate = totalSessions > 0 ? ((bounceSessions / totalSessions) * 100).toFixed(0) : '0';

    return { totalViews, uniqueSessions, uniqueDelta, pagesPerVisit, ctaClicks, ctaRate, bounceRate };
  }, [pageViews, prevPageViews, clickEvents]);

  // Hourly chart data for 24h view
  const hourlyData = useMemo(() => {
    if (period !== '24h') return null;
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, views: 0 }));
    pageViews.forEach((v: any) => {
      const h = new Date(v.created_at).getHours();
      hours[h].views++;
    });
    return hours;
  }, [pageViews, period]);

  // Deep-dive data
  const pageStats = useMemo(() => {
    const map: Record<string, { views: number; sessions: Set<string> }> = {};
    pageViews.forEach((v: any) => {
      if (!map[v.path]) map[v.path] = { views: 0, sessions: new Set() };
      map[v.path].views++;
      map[v.path].sessions.add(v.session_id);
    });
    return Object.entries(map).map(([path, d]) => ({ path, views: d.views, unique: d.sessions.size })).sort((a, b) => b.views - a.views);
  }, [pageViews]);

  const blogStats = useMemo(() => pageStats.filter(p => p.path.startsWith('/blogg/') || p.path.startsWith('/guider/')), [pageStats]);

  const clickStats = useMemo(() => {
    const map: Record<string, number> = {};
    clickEvents.forEach((e: any) => { map[e.event_name] = (map[e.event_name] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [clickEvents]);

  const ctaStats = useMemo(() => {
    const ctas = clickEvents.filter((e: any) => e.event_name === 'cta_click');
    const map: Record<string, number> = {};
    ctas.forEach((e: any) => { map[e.element_text || 'Unknown'] = (map[e.element_text || 'Unknown'] || 0) + 1; });
    return Object.entries(map).map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count);
  }, [clickEvents]);

  const sourceStats = useMemo(() => {
    const map: Record<string, number> = {};
    pageViews.forEach((v: any) => {
      const ref = v.referrer || 'Direkt';
      try { const u = new URL(ref); map[u.hostname] = (map[u.hostname] || 0) + 1; } catch { map[ref] = (map[ref] || 0) + 1; }
    });
    return Object.entries(map).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
  }, [pageViews]);

  const deviceStats = useMemo(() => {
    const map: Record<string, number> = {};
    pageViews.forEach((v: any) => { const dt = v.device_type || 'unknown'; map[dt] = (map[dt] || 0) + 1; });
    return Object.entries(map).map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count);
  }, [pageViews]);

  // Conversion funnel data
  const funnelData = useMemo(() => {
    const visitors = new Set(pageViews.map((v: any) => v.session_id)).size;
    const loginPageViews = pageViews.filter((v: any) => v.path === '/login').length;
    const registerClicks = clickEvents.filter((e: any) =>
      e.event_name === 'cta_click' && (e.element_text?.includes('Skapa') || e.element_text?.includes('Kom igång') || e.element_text?.includes('register'))
    ).length;
    const premiumClicks = clickEvents.filter((e: any) =>
      e.event_name === 'cta_click' && (e.element_text?.includes('Plus') || e.element_text?.includes('Premium') || e.element_text?.includes('Uppgradera'))
    ).length;

    return [
      { name: 'Besökare', value: visitors, fill: 'hsl(var(--primary))' },
      { name: 'Loginsida', value: loginPageViews, fill: 'hsl(var(--primary) / 0.8)' },
      { name: 'Registreringsklick', value: registerClicks, fill: 'hsl(var(--primary) / 0.6)' },
      { name: 'Plus-intresse', value: premiumClicks, fill: 'hsl(var(--warning))' },
    ];
  }, [pageViews, clickEvents]);

  // Churn points – where free users drop off
  const dropOffStats = useMemo(() => {
    const sessionPaths: Record<string, string[]> = {};
    pageViews.forEach((v: any) => {
      if (!sessionPaths[v.session_id]) sessionPaths[v.session_id] = [];
      sessionPaths[v.session_id].push(v.path);
    });
    // Last page per session (potential drop-off point)
    const lastPages: Record<string, number> = {};
    Object.values(sessionPaths).forEach(paths => {
      const last = paths[paths.length - 1];
      lastPages[last] = (lastPages[last] || 0) + 1;
    });
    return Object.entries(lastPages)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [pageViews]);

  const isLoading = pvLoading || ceLoading;

  const DeviceIcon = ({ type }: { type: string }) => {
    if (type === 'mobile') return <Smartphone className="h-4 w-4" />;
    if (type === 'tablet') return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-1.5 flex-wrap">
        {(['24h', '7d', '30d', '90d'] as Period[]).map(p => (
          <Button key={p} size="sm" variant={period === p ? 'default' : 'outline'} className="rounded-lg text-xs h-8" onClick={() => setPeriod(p)}>
            {p === '24h' ? '24 tim' : p === '7d' ? '7 dagar' : p === '30d' ? '30 dagar' : '90 dagar'}
          </Button>
        ))}
      </div>

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={<Eye className="h-4 w-4" />} label="Sidvisningar" value={kpis.totalViews} />
          <KpiCard icon={<Users className="h-4 w-4" />} label="Unika besökare" value={kpis.uniqueSessions} delta={kpis.uniqueDelta} />
          <KpiCard icon={<BarChart3 className="h-4 w-4" />} label="Sidor/besök" value={kpis.pagesPerVisit} />
          <KpiCard icon={<MousePointerClick className="h-4 w-4" />} label="CTA-klick" value={kpis.ctaClicks} />
          <KpiCard icon={<MousePointerClick className="h-4 w-4" />} label="CTA-rate" value={`${kpis.ctaRate}%`} />
          <KpiCard icon={<TrendingDown className="h-4 w-4" />} label="Avvisningsfrekvens" value={`${kpis.bounceRate}%`} />
        </div>
      )}

      {/* 24h chart */}
      {hourlyData && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-3">Sidvisningar per timme</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Deep-dive tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="pages">Sidor</TabsTrigger>
          <TabsTrigger value="blog">Blogg</TabsTrigger>
          <TabsTrigger value="clicks">Klick</TabsTrigger>
          <TabsTrigger value="cta">CTA</TabsTrigger>
          <TabsTrigger value="sources">Källor</TabsTrigger>
          <TabsTrigger value="devices">Enheter</TabsTrigger>
        <TabsTrigger value="funnel">Tratt</TabsTrigger>
        <TabsTrigger value="churn">Avhopp</TabsTrigger>
        </TabsList>

        <TabsContent value="pages"><DataTable headers={['Sida', 'Visningar', 'Unika']} rows={pageStats.map(p => [p.path, p.views, p.unique])} /></TabsContent>
        <TabsContent value="blog"><DataTable headers={['Blogginlägg', 'Visningar', 'Unika']} rows={blogStats.map(p => [p.path, p.views, p.unique])} /></TabsContent>
        <TabsContent value="clicks"><DataTable headers={['Händelse', 'Antal']} rows={clickStats.map(c => [c.name, c.count])} /></TabsContent>
        <TabsContent value="cta"><DataTable headers={['CTA-text', 'Klick']} rows={ctaStats.map(c => [c.text, c.count])} /></TabsContent>
        <TabsContent value="sources"><DataTable headers={['Källa', 'Visningar']} rows={sourceStats.map(s => [s.source, s.count])} /></TabsContent>
        <TabsContent value="devices">
          <DataTable headers={['Enhet', 'Visningar']} rows={deviceStats.map(d => [d.device, d.count])} />
        </TabsContent>
        <TabsContent value="funnel">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-primary" /> Konverteringstratt
              </p>
              <div className="space-y-2">
                {funnelData.map((item, i) => {
                  const maxVal = Math.max(...funnelData.map(d => d.value), 1);
                  const pct = Math.round((item.value / maxVal) * 100);
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-32 shrink-0">{item.name}</span>
                      <div className="flex-1 h-8 bg-muted/30 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full rounded-lg transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: item.fill }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground">
                          {item.value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-border/50">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {funnelData[0].value > 0 && funnelData[2].value > 0 && (
                    <span>Registreringsrate: <strong className="text-foreground">{((funnelData[2].value / funnelData[0].value) * 100).toFixed(1)}%</strong></span>
                  )}
                  {funnelData[2].value > 0 && funnelData[3].value > 0 && (
                    <span>Plus-konvertering: <strong className="text-foreground">{((funnelData[3].value / funnelData[2].value) * 100).toFixed(1)}%</strong></span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="churn">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" /> Avhoppspunkter (sista sidan per session)
              </p>
              <DataTable headers={['Sida', 'Sessioner avslutade här']} rows={dropOffStats.map(d => [d.path, d.count])} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string | number; delta?: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">{icon}<span className="text-[10px] uppercase tracking-wide">{label}</span></div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {delta !== undefined && delta !== 0 && (
            <span className={`text-xs flex items-center gap-0.5 ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta > 0 ? '+' : ''}{delta}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return <p className="p-4 text-sm text-muted-foreground text-center">Ingen data för denna period.</p>;
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {headers.map(h => <th key={h} className="text-left p-3 text-muted-foreground font-medium text-xs">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((row, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                  {row.map((cell, j) => <td key={j} className="p-3 text-foreground">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
