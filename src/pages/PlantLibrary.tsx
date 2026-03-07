import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sprout, Flower2, Sun, CloudSun, Cloud, Droplets, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

const LIGHT_ICONS: Record<string, React.ReactNode> = {
  sol: <Sun className="h-3.5 w-3.5 text-amber-500" />, 
  halvskugga: <CloudSun className="h-3.5 w-3.5 text-blue-400" />,
  skugga: <Cloud className="h-3.5 w-3.5 text-muted-foreground" />,
};

const WATER_LABELS: Record<string, string> = { lågt: 'Lite vatten', medel: 'Medel', högt: 'Mycket vatten' };

const SUBCATEGORY_LABELS: Record<string, string> = {
  grönsak: '🥬 Grönsaker', ört: '🌿 Örter', bär: '🍓 Bär', frukt: '🍎 Frukt',
  populär: '🪴 Populära', luftrenande: '🌬️ Luftrenande', tropisk: '🌴 Tropiska',
};

const PlantLibrary = () => {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'trädgård' | 'krukväxt'>('trädgård');
  const [selected, setSelected] = useState<any>(null);
  const navigate = useNavigate();

  const { data: plants, isLoading } = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('*').order('name_sv');
      if (error) throw error;
      return data;
    },
  });

  const filtered = plants?.filter(p => {
    if (p.category !== tab) return true && false; // type guard
    if (p.category !== tab) return false;
    if (!search.trim()) return true;
    return p.name_sv.toLowerCase().includes(search.toLowerCase());
  }).filter(p => p.category === tab);

  // Group by subcategory
  const grouped = filtered?.reduce<Record<string, any[]>>((acc, p) => {
    const key = p.subcategory || 'övrigt';
    (acc[key] = acc[key] || []).push(p);
    return acc;
  }, {}) || {};

  const handleAddToGarden = (plant: any) => {
    if (plant.category === 'trädgård') {
      navigate('/app/sowings', { state: { prefill: { variety: plant.name_sv } } });
    } else {
      navigate('/app/my-plants', { state: { prefill: { plant_id: plant.id, custom_name: plant.name_sv, watering_interval_days: plant.watering_interval_days || 7 } } });
    }
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Flower2 className="h-6 w-6" /> Växtbibliotek</h1>
        <p className="text-muted-foreground">Hitta rätt växt och lägg till den i din odling</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Tabs value={tab} onValueChange={v => setTab(v as any)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="trädgård" className="gap-1.5"><Sprout className="h-4 w-4" /> Trädgård</TabsTrigger>
            <TabsTrigger value="krukväxt" className="gap-1.5"><Flower2 className="h-4 w-4" /> Krukväxter</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Sök växt…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : !filtered?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Inga växter hittades. Prova ett annat sökord! 🌱</CardContent></Card>
      ) : (
        Object.entries(grouped).map(([sub, items]) => (
          <div key={sub}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">{SUBCATEGORY_LABELS[sub] || sub}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((p: any) => (
                <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(p)}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">{p.name_sv}</p>
                      <div className="flex items-center gap-1.5">
                        {LIGHT_ICONS[p.light]}
                        <Droplets className={`h-3.5 w-3.5 ${p.water === 'högt' ? 'text-blue-500' : p.water === 'lågt' ? 'text-muted-foreground' : 'text-blue-300'}`} />
                      </div>
                    </div>
                    {(p.sow_month || p.harvest_month) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.sow_month && `Så: ${p.sow_month}`}
                        {p.plant_out_month && ` · Ut: ${p.plant_out_month}`}
                        {p.harvest_month && ` · Skörd: ${p.harvest_month}`}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Plant detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected?.name_sv}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{selected.category === 'trädgård' ? '🌱 Trädgård' : '🪴 Krukväxt'}</Badge>
                {selected.light && <Badge variant="outline" className="gap-1">{LIGHT_ICONS[selected.light]} {selected.light}</Badge>}
                {selected.water && <Badge variant="outline" className="gap-1"><Droplets className="h-3 w-3" /> {WATER_LABELS[selected.water]}</Badge>}
              </div>
              
              {selected.temp_min != null && (
                <p className="text-sm text-muted-foreground">Temperatur: {selected.temp_min}–{selected.temp_max}°C</p>
              )}

              {selected.category === 'trädgård' && (
                <div className="text-sm space-y-1">
                  {selected.sow_month && <p>🌱 Förodla inomhus: <strong>{selected.sow_month}</strong></p>}
                  {selected.plant_out_month && <p>🌿 Plantera ut: <strong>{selected.plant_out_month}</strong></p>}
                  {selected.harvest_month && <p>🥕 Skörd: <strong>{selected.harvest_month}</strong></p>}
                </div>
              )}

              {selected.category === 'krukväxt' && selected.watering_interval_days && (
                <p className="text-sm text-muted-foreground">💧 Vattna var {selected.watering_interval_days}:e dag</p>
              )}

              <Button className="w-full gap-2" onClick={() => handleAddToGarden(selected)}>
                <Plus className="h-4 w-4" />
                {selected.category === 'trädgård' ? 'Lägg till i såloggen' : 'Lägg till i mina växter'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlantLibrary;
