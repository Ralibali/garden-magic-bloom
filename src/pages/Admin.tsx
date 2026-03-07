import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, Users, MessageSquare, FileText, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

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
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Översikt</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" /> Användare</TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1.5"><MessageSquare className="h-4 w-4" /> Feedback</TabsTrigger>
          <TabsTrigger value="blog" className="gap-1.5"><FileText className="h-4 w-4" /> Blogg</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><AdminOverview /></TabsContent>
        <TabsContent value="users"><AdminUsers /></TabsContent>
        <TabsContent value="feedback"><AdminFeedback /></TabsContent>
        <TabsContent value="blog"><AdminBlog /></TabsContent>
      </Tabs>
    </div>
  );
}

function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [profiles, beds, sowings, harvests, feedback] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('beds').select('id', { count: 'exact', head: true }),
        supabase.from('sowings').select('id', { count: 'exact', head: true }),
        supabase.from('harvests').select('id', { count: 'exact', head: true }),
        supabase.from('feedback').select('id', { count: 'exact', head: true }),
      ]);
      return {
        users: profiles.count || 0,
        beds: beds.count || 0,
        sowings: sowings.count || 0,
        harvests: harvests.count || 0,
        feedback: feedback.count || 0,
      };
    },
  });

  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  const stats = [
    { label: 'Användare', value: data?.users, icon: Users },
    { label: 'Bäddar', value: data?.beds, icon: BarChart3 },
    { label: 'Sådder', value: data?.sowings, icon: BarChart3 },
    { label: 'Skördar', value: data?.harvests, icon: BarChart3 },
    { label: 'Feedback', value: data?.feedback, icon: MessageSquare },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map(s => (
        <Card key={s.label}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdminUsers() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
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
                <th className="text-left p-3 text-muted-foreground font-medium">Zon</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Registrerad</th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map((u: any) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="p-3">{u.display_name || '–'}</td>
                  <td className="p-3 text-muted-foreground">{u.email || '–'}</td>
                  <td className="p-3">{u.climate_zone || '–'}</td>
                  <td className="p-3">
                    <Badge variant={u.subscription_status === 'premium' ? 'default' : 'secondary'} className="text-xs">
                      {u.subscription_status}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString('sv-SE')}</td>
                </tr>
              ))}
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

function AdminBlog() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif text-lg">Bloggposter ({posts?.length})</CardTitle></CardHeader>
      <CardContent className="p-0 divide-y divide-border">
        {(!posts || posts.length === 0) ? (
          <p className="p-6 text-center text-muted-foreground">Inga bloggposter ännu.</p>
        ) : posts.map((p: any) => (
          <div key={p.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{p.title}</p>
              <p className="text-xs text-muted-foreground">{p.slug} · {p.category}</p>
            </div>
            <Badge variant={p.is_published ? 'default' : 'secondary'} className="text-xs">
              {p.is_published ? 'Publicerad' : 'Utkast'}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
