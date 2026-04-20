import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, Users, MessageSquare, FileText, BarChart3, Search, Link2, Crown, MinusCircle, LayoutDashboard, Trash2, CheckCircle2, XCircle, Clock, CalendarDays, Sprout, Carrot, Camera, Bug, Sparkles } from 'lucide-react';
import { LayoutGrid } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import BlogEditor from '@/components/admin/BlogEditor';
import GlossaryManager from '@/components/admin/GlossaryManager';

const AnalyticsDashboard = React.lazy(() => import('@/components/admin/AnalyticsDashboard'));
const KeywordExplorer = React.lazy(() => import('@/components/admin/KeywordExplorer'));
const PlatformOverview = React.lazy(() => import('@/components/admin/PlatformOverview'));
const SeoContentManager = React.lazy(() => import('@/components/admin/SeoContentManager'));

export default function Admin() {
  const { user } = useAuth();

  const { data: roleCheck, isLoading } = useQuery({
    queryKey: ['admin-check'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('has_role', { _user_id: user!.id, _role: 'admin' });
      if (error) throw error;
      return { is_admin: data };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!roleCheck?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Shield className="h-12 w-12 text-destructive/50" />
        <h2 className="font-serif text-xl text-foreground">Åtkomst nekad</h2>
        <p className="text-sm text-muted-foreground">Du har inte behörighet att se den här sidan.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-serif text-foreground">Admin</h1>
          <p className="text-xs text-muted-foreground">Hantera användare, prenumerationer och feedback</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="h-4 w-4" /> Översikt</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Trafik</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" /> Användare</TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1.5"><MessageSquare className="h-4 w-4" /> Feedback</TabsTrigger>
          <TabsTrigger value="blog" className="gap-1.5"><FileText className="h-4 w-4" /> Blogg</TabsTrigger>
          <TabsTrigger value="glossary" className="gap-1.5"><Link2 className="h-4 w-4" /> Länkord</TabsTrigger>
          <TabsTrigger value="keywords" className="gap-1.5"><Search className="h-4 w-4" /> Nyckelord</TabsTrigger>
          <TabsTrigger value="seo-content" className="gap-1.5"><Sparkles className="h-4 w-4" /> SEO-innehåll</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <React.Suspense fallback={<Skeleton className="h-64" />}>
            <PlatformOverview />
          </React.Suspense>
        </TabsContent>
        <TabsContent value="analytics">
          <React.Suspense fallback={<Skeleton className="h-64" />}>
            <AnalyticsDashboard />
          </React.Suspense>
        </TabsContent>
        <TabsContent value="users"><AdminUsers /></TabsContent>
        <TabsContent value="feedback"><AdminFeedback /></TabsContent>
        <TabsContent value="blog"><BlogEditor /></TabsContent>
        <TabsContent value="glossary"><GlossaryManager /></TabsContent>
        <TabsContent value="keywords">
          <React.Suspense fallback={<Skeleton className="h-64" />}>
            <KeywordExplorer />
          </React.Suspense>
        </TabsContent>
        <TabsContent value="seo-content">
          <React.Suspense fallback={<Skeleton className="h-64" />}>
            <SeoContentManager />
          </React.Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdminUsers() {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState('');
  const [premiumDurations, setPremiumDurations] = useState<Record<string, string>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: activityStats } = useQuery({
    queryKey: ['admin-user-activity-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_activity_stats');
      if (error) throw error;
      return data as { user_id: string; beds_count: number; sowings_count: number; harvests_count: number; photos_count: number; seeds_count: number; pest_logs_count: number; last_activity: string | null }[];
    },
  });

  const statsMap = useMemo(() => {
    const map: Record<string, typeof activityStats extends (infer T)[] ? T : never> = {};
    (activityStats || []).forEach(s => { map[s.user_id] = s; });
    return map;
  }, [activityStats]);

  const grantMutation = useMutation({
    mutationFn: async ({ userId, days }: { userId: string; days: string }) => {
      if (days === 'lifetime') {
        const { error } = await supabase.from('profiles').update({
          subscription_status: 'premium',
          premium_expires_at: null,
        }).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('grant_premium_days', { _user_id: userId, _days: parseInt(days) });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Premium beviljat!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('profiles').update({ subscription_status: 'free', premium_expires_at: null }).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Premium borttaget.');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Användare raderad.');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64" />;

  const filteredUsers = userSearch
    ? (users || []).filter((u: any) =>
        (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
      )
    : (users || []);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök användare..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="pl-9 rounded-xl h-10"
        />
      </div>

      <p className="text-xs text-muted-foreground">{filteredUsers.length} användare</p>

      {!filteredUsers.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">Inga användare hittades.</p>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user: any) => {
            const isPremium = user.subscription_status === 'premium';
            const expiresAt = user.premium_expires_at ? new Date(user.premium_expires_at) : null;
            const isExpired = expiresAt && expiresAt < new Date();
            const isLifetime = isPremium && !expiresAt;
            const stats = statsMap[user.user_id];
            const isExpanded = expandedUser === user.user_id;

            return (
              <Card key={user.id} className="border-border/50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedUser(isExpanded ? null : user.user_id)}
                      className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/20 transition-colors"
                    >
                      <span className="text-sm font-bold text-primary">
                        {(user.display_name || user.email || '?')[0].toUpperCase()}
                      </span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => setExpandedUser(isExpanded ? null : user.user_id)} className="text-left w-full">
                        <p className="text-sm font-medium text-foreground truncate">{user.display_name || 'Namnlös'}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{user.email || '–'}</p>
                      </button>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {isPremium && !isExpired ? (
                          <Badge variant="secondary" className="text-[9px] bg-warning/10 text-warning border-warning/20">
                            <Crown className="h-2.5 w-2.5 mr-0.5" /> {isLifetime ? '♾️ Livstid' : 'Premium'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px]">Gratis</Badge>
                        )}
                        {user.terms_accepted_at ? (
                          <Badge variant="secondary" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Villkor
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                            <XCircle className="h-2.5 w-2.5 mr-0.5" /> Ej godkänt
                          </Badge>
                        )}
                        {user.climate_zone && (
                          <span className="text-[10px] text-muted-foreground">Zon {user.climate_zone}</span>
                        )}
                        {stats && (
                          <span className="text-[10px] text-muted-foreground">
                            {stats.beds_count}B · {stats.sowings_count}S · {stats.harvests_count}H · {stats.photos_count}F
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('sv-SE') : '–'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0 items-center">
                      {isPremium && !isExpired ? (
                        <div className="flex flex-col items-end gap-1">
                          {expiresAt ? (
                            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="h-2.5 w-2.5" />
                              Går ut {expiresAt.toLocaleDateString('sv-SE')}
                            </span>
                          ) : (
                            <span className="text-[9px] text-green-600 font-medium">♾️ Livstid</span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-7 text-destructive rounded-lg"
                            disabled={revokeMutation.isPending}
                            onClick={() => revokeMutation.mutate(user.user_id)}
                          >
                            Ta bort Premium
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Select value={premiumDurations[user.user_id] || '30'} onValueChange={(v) => setPremiumDurations(prev => ({ ...prev, [user.user_id]: v }))}>
                            <SelectTrigger className="h-7 w-[90px] text-[10px] rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7">7 dagar</SelectItem>
                              <SelectItem value="14">14 dagar</SelectItem>
                              <SelectItem value="30">30 dagar</SelectItem>
                              <SelectItem value="90">90 dagar</SelectItem>
                              <SelectItem value="365">1 år</SelectItem>
                              <SelectItem value="lifetime">♾️ Livstid</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-7 rounded-lg gap-1"
                            disabled={grantMutation.isPending}
                            onClick={() => grantMutation.mutate({ userId: user.user_id, days: premiumDurations[user.user_id] || '30' })}
                          >
                            <Crown className="h-3 w-3" /> Ge
                          </Button>
                        </>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/50 hover:text-destructive shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-serif">Radera användare?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Detta raderar <strong>{user.email || user.display_name}</strong> och all deras data permanent.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Avbryt</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                              onClick={() => deleteMutation.mutate(user.user_id)}
                            >
                              Radera
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Expanded usage details */}
                  {isExpanded && stats && (
                    <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
                      <UsageStat icon={LayoutGrid} label="Bäddar" value={stats.beds_count} />
                      <UsageStat icon={Sprout} label="Sådder" value={stats.sowings_count} />
                      <UsageStat icon={Carrot} label="Skördar" value={stats.harvests_count} />
                      <UsageStat icon={Camera} label="Foton" value={stats.photos_count} />
                      <UsageStat icon={Sprout} label="Frölager" value={stats.seeds_count} />
                      <UsageStat icon={Bug} label="Skadedjur" value={stats.pest_logs_count} />
                      <div className="col-span-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Senaste aktivitet: {stats.last_activity ? new Date(stats.last_activity).toLocaleDateString('sv-SE') : 'Ingen'}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UsageStat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div>
        <p className="text-sm font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function AdminFeedback() {
  const queryClient = useQueryClient();

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['admin-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      toast.success('Feedback uppdaterad');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-2">
      {(!feedback || feedback.length === 0) ? (
        <p className="text-sm text-muted-foreground text-center py-8">Ingen feedback ännu.</p>
      ) : feedback.map((fb: any) => (
        <Card key={fb.id} className="border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                fb.status === 'resolved' ? 'bg-green-500/10' :
                fb.status === 'in_progress' ? 'bg-warning/10' :
                'bg-muted/60'
              }`}>
                {fb.status === 'resolved' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                 fb.status === 'in_progress' ? <Clock className="h-4 w-4 text-warning" /> :
                 <MessageSquare className="h-4 w-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={fb.status === 'new' ? 'destructive' : fb.status === 'in_progress' ? 'secondary' : 'default'} className="text-[9px]">
                    {fb.status === 'new' ? 'Ny' : fb.status === 'in_progress' ? 'Pågår' : fb.status === 'resolved' ? 'Löst' : fb.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {fb.created_at ? new Date(fb.created_at).toLocaleDateString('sv-SE') : '–'}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{fb.message}</p>
              </div>
            </div>
            <div className="flex gap-1.5 mt-3 justify-end">
              {fb.status !== 'in_progress' && (
                <Button variant="outline" size="sm" className="text-[10px] h-7 rounded-lg gap-1"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ id: fb.id, status: 'in_progress' })}>
                  <Clock className="h-3 w-3" /> Pågår
                </Button>
              )}
              {fb.status !== 'resolved' && (
                <Button variant="outline" size="sm" className="text-[10px] h-7 rounded-lg gap-1 text-green-600"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ id: fb.id, status: 'resolved' })}>
                  <CheckCircle2 className="h-3 w-3" /> Löst
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}