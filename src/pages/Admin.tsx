import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, Users, MessageSquare, FileText, BarChart3, Search, Link2, Crown, MinusCircle } from 'lucide-react';
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

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Analys</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" /> Användare</TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1.5"><MessageSquare className="h-4 w-4" /> Feedback</TabsTrigger>
          <TabsTrigger value="blog" className="gap-1.5"><FileText className="h-4 w-4" /> Blogg</TabsTrigger>
          <TabsTrigger value="glossary" className="gap-1.5"><Link2 className="h-4 w-4" /> Länkord</TabsTrigger>
          <TabsTrigger value="keywords" className="gap-1.5"><Search className="h-4 w-4" /> Nyckelord</TabsTrigger>
        </TabsList>

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
