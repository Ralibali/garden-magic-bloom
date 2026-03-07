import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

const Statistics = () => {
  const { data: stats, isLoading } = useQuery({ queryKey: ['summary-stats'], queryFn: api.getSummaryStats });
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Statistik</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Bäddar</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats?.active_beds ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sådder i år</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats?.sowings_this_year ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Skörd i år</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{(stats?.harvest_kg ?? 0).toFixed(1)} kg</p></CardContent></Card>
      </div>

      {(stats?.active_beds === 0 && stats?.sowings_this_year === 0 && stats?.harvest_kg === 0) && (
        <Card className="bg-primary/5 border-primary/15">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Börja logga sådder så fylls statistiken på! 🌱</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Statistics;
