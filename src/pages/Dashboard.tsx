import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sprout, Carrot, LayoutGrid, Plus, CloudSun, Thermometer, CalendarDays, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

const MONTH_TIPS: Record<number, string> = {
  1: 'Beställ frön och planera årets odling. Rita en bäddplan!',
  2: 'Dags att förodla chili och paprika inomhus.',
  3: 'Förodla tomater, squash och kål. Börja härda av tidiga plantor.',
  4: 'Direktså rädisor, spenat och ärtor utomhus. Plantera ut lök.',
  5: 'Plantera ut tomater (efter sista frost). Så bönor och gurka.',
  6: 'Gallra, vattna och börja skörda sallat och rädisor.',
  7: 'Full skördesäsong! Så höstgrönsaker som grönkål och rödbetor.',
  8: 'Skörda och konservera. Så vintervicker som gröngödsling.',
  9: 'Sista skördarna. Plantera vitlök och höstlök.',
  10: 'Rensa bäddar. Täck med löv eller halm för vintern.',
  11: 'Kompostera och planera nästa säsong. Beställ frökataloger.',
  12: 'Vila! Bläddra i frökataloger och drömma om våren.',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentMonth = new Date().getMonth() + 1;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['summary-stats'],
    queryFn: api.getSummaryStats,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
  });

  const { data: weather } = useQuery({
    queryKey: ['weather'],
    queryFn: api.getWeather,
    staleTime: 600_000,
    retry: 1,
  });

  const { data: recentSowings } = useQuery({
    queryKey: ['sowings'],
    queryFn: api.getSowings,
    select: (data) => data?.slice(0, 5),
  });

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'odlare';
  const climateZone = profile?.climate_zone ?? 3;
  const temp = weather?.current?.temperature_2m;

  return (
    <div className="space-y-6">
      {/* Greeting + weather */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">God säsong, {displayName}! 🌱</h1>
          <p className="text-muted-foreground">Klimatzon {climateZone} · {MONTH_TIPS[currentMonth]}</p>
        </div>
        {temp !== undefined && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-xl px-4 py-2 w-fit">
            <Thermometer className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{Math.round(temp)}°C</span>
            <span>just nu</span>
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          <>{[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}</>
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
                  <Carrot className="h-4 w-4" /> Skörd i år
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-3xl font-bold">{(stats?.harvest_kg ?? 0).toFixed(1)} kg</p></CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Economy summary */}
      {stats && (stats.total_income > 0 || stats.total_expense > 0) && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/finance')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Ekonomi i år
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-success font-medium">+{stats.total_income} kr</span>
              <span className="text-destructive font-medium">−{stats.total_expense} kr</span>
              <span className={`font-bold ${stats.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                = {stats.profit} kr
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent sowings */}
      {recentSowings && recentSowings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Senaste sådder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentSowings.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Sprout className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-foreground">{s.variety}</span>
                    {s.beds?.name && <span className="text-muted-foreground">· {s.beds.name}</span>}
                  </div>
                  <span className="text-muted-foreground text-xs">{s.sow_date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/app/sowings')} className="gap-2">
          <Plus className="h-4 w-4" /> Ny sådning
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/harvests')} className="gap-2">
          <Carrot className="h-4 w-4" /> Logga skörd
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/calendar')} className="gap-2">
          <CalendarDays className="h-4 w-4" /> Såkalender
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
