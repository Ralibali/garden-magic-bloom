import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> Admin</h1>
      <Card><CardContent className="py-8 text-center text-muted-foreground">
        Admin-panelen kommer att byggas ut i kommande steg.
      </CardContent></Card>
    </div>
  );
}
