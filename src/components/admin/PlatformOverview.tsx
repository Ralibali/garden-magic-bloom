import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, Crown, Sprout, FileText, MessageSquare, TrendingUp, TrendingDown,
  Carrot, LayoutGrid, Eye, Newspaper
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(280 67% 55%)',
  'hsl(199 89% 48%)',
];

export default function PlatformOverview() {
  // Fetch all platform data in parallel
  const { data: profiles = [], isLoading: pLoading } = useQuery({
    queryKey: ['admin-all-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('created_at, subscription_status, premium_expires_at, climate_zone, onboarding_completed');
      return (data || []) as any[];
    },
  });

  const { data: pageViews = [] } = useQuery({
    queryKey: ['admin-pv-30d-overview'],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase.from('page_views').select('created_at, session_id').gte('created_at', since);
      return (data || []) as any[];
    },
  });

  const { data: sowings = [] } = useQuery({
    queryKey: ['admin-all-sowings'],
    queryFn: async () => {
      const { data } = await supabase.from('sowings').select('created_at, variety').order('created_at', { ascending: false }).limit(1000);
      return (data || []) as any[];
    },
  });

  const { data: harvests = [] } = useQuery({
    queryKey: ['admin-all-harvests'],
    queryFn: async () => {
      const { data } = await supabase.from('harvests').select('created_at, weight_grams, variety').order('created_at', { ascending: false }).limit(1000);
      return (data || []) as any[];
    },
  });

  const { data: blogPosts = [] } = useQuery({
    queryKey: ['admin-all-blogposts'],
    queryFn: async () => {
      const { data } = await supabase.from('blog_posts').select('id, title, is_published, published_at, slug').order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['admin-feedback-count'],
    queryFn: async () => {
      const { data } = await supabase.from('feedback').select('id, status, created_at').order('created_at', { ascending: false }).limit(100);
      return (data || []) as any[];
    },
  });

  // KPI calculations
  const kpis = useMemo(() => {
    const now = new Date();
    const totalUsers = profiles.length;
    const premiumUsers = profiles.filter((p: any) => {
      if (p.subscription_status !== 'premium') return false;
      if (p.premium_expires_at && new Date(p.premium_expires_at) < now) return false;
      return true;
    }).length;
    const conversionRate = totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : '0';
    const onboardedPct = totalUsers > 0 ? ((profiles.filter((p: any) => p.onboarding_completed).length / totalUsers) * 100).toFixed(0) : '0';

    // New users last 7 days
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const newUsersWeek = profiles.filter((p: any) => new Date(p.created_at) >= weekAgo).length;

    // Visitors last 30 days
    const uniqueVisitors30d = new Set(pageViews.map((v: any) => v.session_id)).size;

    // Total harvest kg
    const totalHarvestKg = harvests.reduce((s: number, h: any) => s + (h.weight_grams || 0), 0) / 1000;

    const publishedPosts = blogPosts.filter((p: any) => p.is_published).length;
    const newFeedback = feedback.filter((f: any) => f.status === 'new').length;

    return { totalUsers, premiumUsers, conversionRate, onboardedPct, newUsersWeek, uniqueVisitors30d, totalHarvestKg, totalSowings: sowings.length, publishedPosts, newFeedback };
  }, [profiles, pageViews, harvests, sowings, blogPosts, feedback]);

  // User growth chart (last 12 weeks)
  const userGrowthData = useMemo(() => {
    const weeks: { label: string; users: number; premium: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekEnd = new Date(Date.now() - i * 7 * 86400000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 86400000);
      const label = `v${getWeekNumber(weekEnd)}`;
      const users = profiles.filter((p: any) => {
        const d = new Date(p.created_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      const premium = profiles.filter((p: any) => {
        const d = new Date(p.created_at);
        return d >= weekStart && d < weekEnd && p.subscription_status === 'premium';
      }).length;
      weeks.push({ label, users, premium });
    }
    return weeks;
  }, [profiles]);

  // Zone distribution
  const zoneData = useMemo(() => {
    const map: Record<string, number> = {};
    profiles.forEach((p: any) => {
      const z = p.climate_zone ? `Zon ${p.climate_zone}` : 'Ej angiven';
      map[z] = (map[z] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [profiles]);

  // Subscription funnel
  const funnelData = useMemo(() => {
    const total = profiles.length;
    const onboarded = profiles.filter((p: any) => p.onboarding_completed).length;
    const premium = kpis.premiumUsers;
    return [
      { step: 'Registrerade', count: total, pct: 100 },
      { step: 'Onboardade', count: onboarded, pct: total > 0 ? Math.round((onboarded / total) * 100) : 0 },
      { step: 'Premium', count: premium, pct: total > 0 ? Math.round((premium / total) * 100) : 0 },
    ];
  }, [profiles, kpis.premiumUsers]);

  if (pLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatsCard icon={Users} label="Användare totalt" value={kpis.totalUsers} sub={`+${kpis.newUsersWeek} senaste 7d`} />
        <StatsCard icon={Crown} label="Premium" value={kpis.premiumUsers} sub={`${kpis.conversionRate}% konvertering`} highlight />
        <StatsCard icon={Eye} label="Besökare (30d)" value={kpis.uniqueVisitors30d} />
        <StatsCard icon={Sprout} label="Sådder totalt" value={kpis.totalSowings} />
        <StatsCard icon={Carrot} label="Total skörd" value={`${kpis.totalHarvestKg.toFixed(0)} kg`} />
      </div>

      {/* Second row: content + feedback */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat icon={Newspaper} label="Publicerade inlägg" value={kpis.publishedPosts} />
        <MiniStat icon={MessageSquare} label="Ny feedback" value={kpis.newFeedback} highlight={kpis.newFeedback > 0} />
        <MiniStat icon={LayoutGrid} label="Onboarding-rate" value={`${kpis.onboardedPct}%`} />
        <MiniStat icon={FileText} label="Bloggutkast" value={blogPosts.filter((p: any) => !p.is_published).length} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User growth */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nya användare per vecka</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="users" name="Alla" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
                <Area type="monotone" dataKey="premium" name="Premium" stroke="hsl(38 92% 50%)" fill="hsl(38 92% 50% / 0.15)" strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Konverteringstratt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {funnelData.map((step, i) => (
              <div key={step.step} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{step.step}</span>
                  <span className="text-muted-foreground">{step.count} ({step.pct}%)</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${step.pct}%`,
                      backgroundColor: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
                {i < funnelData.length - 1 && funnelData[i + 1] && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    {step.count - funnelData[i + 1].count} avhopp ({step.count > 0 ? Math.round(((step.count - funnelData[i + 1].count) / step.count) * 100) : 0}%)
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Zone distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Klimatzoner</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={zoneData} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name" label={false}>
                  {zoneData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top varieties across platform */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Populäraste sorterna (sådder)</CardTitle>
          </CardHeader>
          <CardContent>
            <TopVarietiesList sowings={sowings} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ icon: Icon, label, value, sub, highlight }: { icon: any; label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-primary/30 bg-primary/5' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <Icon className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`rounded-lg p-2 ${highlight ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TopVarietiesList({ sowings }: { sowings: any[] }) {
  const top = useMemo(() => {
    const counts: Record<string, number> = {};
    sowings.forEach((s: any) => { counts[s.variety] = (counts[s.variety] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [sowings]);

  if (top.length === 0) return <p className="text-sm text-muted-foreground">Ingen data ännu.</p>;

  const max = top[0][1];
  return (
    <div className="space-y-2">
      {top.map(([variety, count], i) => (
        <div key={variety} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">{variety}</span>
            <span className="text-muted-foreground">{count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function getWeekNumber(d: Date): number {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
}
