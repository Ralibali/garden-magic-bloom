import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, Users, MessageSquare, FileText, BarChart3, Search, Link2, Crown, MinusCircle, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import BlogEditor from '@/components/admin/BlogEditor';
import GlossaryManager from '@/components/admin/GlossaryManager';

const AnalyticsDashboard = React.lazy(() => import('@/components/admin/AnalyticsDashboard'));
const KeywordExplorer = React.lazy(() => import('@/components/admin/KeywordExplorer'));
const PlatformOverview = React.lazy(() => import('@/components/admin/PlatformOverview'));

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
      <div className="flex items-center justify-center py-20">
        <Card><CardContent className="py-8 text-center">
          <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Du har inte behörighet att se den här sidan.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-serif flex items-center gap-2"><Shield className="h-6 w-6" /> Admin</h1>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="h-4 w-4" /> Översikt</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Trafik</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" /> Användare</TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1.5"><MessageSquare className="h-4 w-4" /> Feedback</TabsTrigger>
          <TabsTrigger value="blog" className="gap-1.5"><FileText className="h-4 w-4" /> Blogg</TabsTrigger>
          <TabsTrigger value="glossary" className="gap-1.5"><Link2 className="h-4 w-4" /> Länkord</TabsTrigger>
          <TabsTrigger value="keywords" className="gap-1.5"><Search className="h-4 w-4" /> Nyckelord</TabsTrigger>
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
      </Tabs>
    </div>
  );
}

function AdminUsers() {
  const queryClient = useQueryClient();
  const [grantDays, setGrantDays] = useState<Record<string, string>>({});

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const grantMutation = useMutation({
    mutationFn: async ({ userId, days }: { userId: string; days: number }) => {
      const { error } = await supabase.rpc('grant_premium_days', { _user_id: userId, _days: days });
      if (error) throw error;
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

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif text-lg">Användare ({users?.length})</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-muted-foreground font-medium">Namn</th>
                <th className="text-left p-3 text-muted-foreground font-medium">E-post</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Går ut</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Hantera premium</th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map((u: any) => {
                const isPremium = u.subscription_status === 'premium';
                const expiresAt = u.premium_expires_at ? new Date(u.premium_expires_at) : null;
                const isExpired = expiresAt && expiresAt < new Date();
                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="p-3">
                      <div>{u.display_name || '–'}</div>
                      <div className="text-xs text-muted-foreground">{u.climate_zone ? `Zon ${u.climate_zone}` : ''}</div>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{u.email || '–'}</td>
                    <td className="p-3">
                      <Badge variant={isPremium && !isExpired ? 'default' : 'secondary'} className="text-xs">
                        {isPremium && !isExpired ? 'premium' : 'free'}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {expiresAt ? expiresAt.toLocaleDateString('sv-SE') : '–'}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <Select value={grantDays[u.user_id] || '30'} onValueChange={(v) => setGrantDays(prev => ({ ...prev, [u.user_id]: v }))}>
                          <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 dagar</SelectItem>
                            <SelectItem value="30">30 dagar</SelectItem>
                            <SelectItem value="90">90 dagar</SelectItem>
                            <SelectItem value="365">1 år</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={grantMutation.isPending}
                          onClick={() => grantMutation.mutate({ userId: u.user_id, days: parseInt(grantDays[u.user_id] || '30') })}
                        >
                          <Crown className="h-3 w-3" /> Ge
                        </Button>
                        {isPremium && !isExpired && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive gap-1"
                            disabled={revokeMutation.isPending}
                            onClick={() => revokeMutation.mutate(u.user_id)}
                          >
                            <MinusCircle className="h-3 w-3" /> Ta bort
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminFeedback() {
  const { data: feedback, isLoading } = useQuery({
    queryKey: ['admin-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif text-lg">Feedback ({feedback?.length})</CardTitle></CardHeader>
      <CardContent className="p-0 divide-y divide-border">
        {(!feedback || feedback.length === 0) ? (
          <p className="p-6 text-center text-muted-foreground">Ingen feedback ännu.</p>
        ) : feedback.map((f: any) => (
          <div key={f.id} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={f.status === 'new' ? 'destructive' : 'secondary'} className="text-xs">{f.status}</Badge>
              <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString('sv-SE')}</span>
            </div>
            <p className="text-sm text-foreground">{f.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
