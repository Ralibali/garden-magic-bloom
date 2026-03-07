import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sprout, Carrot, LayoutGrid, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['summary-stats'],
    queryFn: api.getSummaryStats,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
  });

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'odlare';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">God säsong, {displayName}! 🌱</h1>
        <p className="text-muted-foreground">Här är en översikt av din odling.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <>{[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}</>
        ) : (
          <>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/beds')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" /> Aktiva bäddar
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-3xl font-bold">{stats?.active_beds ?? 0}</p></CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/sowings')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sprout className="h-4 w-4" /> Sådder i år
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-3xl font-bold">{stats?.sowings_this_year ?? 0}</p></CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/harvests')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Carrot className="h-4 w-4" /> Skördar i år
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-3xl font-bold">{(stats?.harvest_kg ?? 0).toFixed(1)} kg</p></CardContent>
            </Card>
          </>
        )}
      </div>

      <Button onClick={() => navigate('/app/sowings')} className="gap-2">
        <Plus className="h-4 w-4" /> Lägg till sådning
      </Button>
    </div>
  );
};

export default Dashboard;
