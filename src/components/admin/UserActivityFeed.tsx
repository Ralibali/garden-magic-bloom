import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  Search, Sprout, Carrot, Camera, Bug, LayoutGrid, UserPlus, MessageSquare,
  Leaf, Droplets, Package, NotebookPen, RefreshCw, Activity,
} from 'lucide-react';

export type ActivityRow = {
  activity_id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  activity_type: string;
  title: string | null;
  detail: string | null;
  occurred_at: string;
};

const TYPE_META: Record<string, { label: string; icon: typeof Sprout; tone: string }> = {
  signup: { label: 'Nytt konto', icon: UserPlus, tone: 'bg-primary/10 text-primary border-primary/20' },
  bed: { label: 'Bädd', icon: LayoutGrid, tone: 'bg-muted text-muted-foreground border-border' },
  sowing: { label: 'Sådd', icon: Sprout, tone: 'bg-primary/10 text-primary border-primary/20' },
  harvest: { label: 'Skörd', icon: Carrot, tone: 'bg-warning/10 text-warning border-warning/20' },
  photo: { label: 'Foto', icon: Camera, tone: 'bg-muted text-muted-foreground border-border' },
  plant: { label: 'Krukväxt', icon: Leaf, tone: 'bg-primary/10 text-primary border-primary/20' },
  care: { label: 'Växtvård', icon: Droplets, tone: 'bg-muted text-muted-foreground border-border' },
  seed: { label: 'Frölager', icon: Package, tone: 'bg-muted text-muted-foreground border-border' },
  pest: { label: 'Skadedjur', icon: Bug, tone: 'bg-destructive/10 text-destructive border-destructive/20' },
  feedback: { label: 'Feedback', icon: MessageSquare, tone: 'bg-warning/10 text-warning border-warning/20' },
  comment: { label: 'Kommentar', icon: MessageSquare, tone: 'bg-muted text-muted-foreground border-border' },
  season: { label: 'Säsong', icon: NotebookPen, tone: 'bg-muted text-muted-foreground border-border' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'nyss';
  if (min < 60) return `${min} min sedan`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} dgr sedan`;
  return new Date(iso).toLocaleDateString('sv-SE');
}

export function useUserActivity(limit = 200, userId?: string) {
  return useQuery({
    queryKey: ['admin-activity-feed', limit, userId ?? 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recent_user_activity' as any, {
        _limit: limit,
        _user_id: userId ?? null,
      } as any);
      if (error) throw error;
      return (data || []) as unknown as ActivityRow[];
    },
  });
}

export default function UserActivityFeed() {
  const [limit, setLimit] = useState(200);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const { data, isLoading, isFetching, refetch } = useUserActivity(limit);

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (data || []).filter((r) => {
      if (type !== 'all' && r.activity_type !== type) return false;
      if (!q) return true;
      return [r.display_name, r.email, r.title, r.detail].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [data, search, type]);

  const todayCount = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return (data || []).filter((r) => new Date(r.occurred_at) >= start).length;
  }, [data]);

  const activeUsers = useMemo(() => new Set((data || []).map((r) => r.user_id)).size, [data]);

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-border/50">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Händelser idag</p>
            <p className="text-xl font-serif text-foreground">{todayCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Aktiva användare</p>
            <p className="text-xl font-serif text-foreground">{activeUsers}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Visade händelser</p>
            <p className="text-xl font-serif text-foreground">{rows.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök användare, sort eller händelse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl h-10"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-10 w-full sm:w-[170px] rounded-xl text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla typer</SelectItem>
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="h-10 w-full sm:w-[120px] rounded-xl text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="100">100 senaste</SelectItem>
            <SelectItem value="200">200 senaste</SelectItem>
            <SelectItem value="500">500 senaste</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {!rows.length ? (
        <p className="text-sm text-muted-foreground text-center py-10">Inga händelser matchar filtret.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row) => {
            const meta = TYPE_META[row.activity_type] || { label: row.activity_type, icon: Activity, tone: 'bg-muted text-muted-foreground border-border' };
            const Icon = meta.icon;
            return (
              <Card key={row.activity_id} className="border-border/50">
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">
                        {row.display_name || row.email || 'Namnlös'}
                      </span>
                      <Badge variant="secondary" className={`text-[9px] ${meta.tone}`}>{meta.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {row.title}{row.detail ? ` · ${row.detail}` : ''}
                    </p>
                    {row.email && row.display_name && (
                      <p className="text-[10px] text-muted-foreground/70 truncate">{row.email}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                    {relativeTime(row.occurred_at)}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
