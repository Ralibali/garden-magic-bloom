import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getPlantProfile, getPlantImage, getBuyLinks } from '@/lib/plantProfileData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  ArrowLeft, Sun, CloudSun, Cloud, Droplets, Thermometer,
  Plus, ExternalLink, Sprout, Scissors, Lightbulb, Users, Ban, Leaf,
} from 'lucide-react';

const LIGHT_MAP: Record<string, { icon: React.ReactNode; label: string }> = {
  sol: { icon: <Sun className="h-4 w-4 text-amber-500" />, label: 'Full sol' },
  halvskugga: { icon: <CloudSun className="h-4 w-4 text-blue-400" />, label: 'Halvskugga' },
  skugga: { icon: <Cloud className="h-4 w-4 text-muted-foreground" />, label: 'Skugga' },
};

const WATER_MAP: Record<string, { label: string; color: string }> = {
  lågt: { label: 'Lite vatten', color: 'text-muted-foreground' },
  medel: { label: 'Medel vattning', color: 'text-blue-400' },
  högt: { label: 'Mycket vatten', color: 'text-blue-600' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  lätt: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medel: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  avancerad: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const PlantProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: plant, isLoading } = useQuery({
    queryKey: ['plant', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Växten hittades inte.</p>
        <Button variant="link" onClick={() => navigate('/app/plants')}>← Tillbaka till växtbiblioteket</Button>
      </div>
    );
  }

  const profile = getPlantProfile(plant.name_sv);
  const imageUrl = getPlantImage(plant.name_sv, plant.subcategory);
  const buyLinks = getBuyLinks(plant.name_sv);
  const light = LIGHT_MAP[plant.light || ''];
  const water = WATER_MAP[plant.water || ''];
  const diffClass = DIFFICULTY_COLORS[profile.difficulty] || '';

  const handleAddToGarden = () => {
    if (plant.category === 'trädgård') {
      navigate('/app/sowings', { state: { prefill: { variety: plant.name_sv } } });
    } else {
      navigate('/app/my-plants', { state: { prefill: { plant_id: plant.id, custom_name: plant.name_sv, watering_interval_days: plant.watering_interval_days || 7 } } });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/app/plants')} className="gap-1.5 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Växtbibliotek
      </Button>

      {/* Hero image + title */}
      <div className="rounded-xl overflow-hidden border border-border">
        <AspectRatio ratio={16 / 9}>
          <img src={imageUrl} alt={plant.name_sv} className="w-full h-full object-cover" loading="eager" />
        </AspectRatio>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{plant.name_sv}</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="secondary">{plant.category === 'trädgård' ? '🌱 Trädgård' : '🪴 Krukväxt'}</Badge>
          {plant.subcategory && <Badge variant="outline">{plant.subcategory}</Badge>}
          <Badge className={diffClass}>{profile.difficulty === 'lätt' ? '🟢' : profile.difficulty === 'medel' ? '🟡' : '🔴'} {profile.difficulty}</Badge>
        </div>
      </div>

      {/* Description */}
      <p className="text-muted-foreground leading-relaxed">{profile.description}</p>

      {/* Quick facts grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {light && (
          <Card>
            <CardContent className="py-3 flex flex-col items-center gap-1 text-center">
              {light.icon}
              <span className="text-xs font-medium">{light.label}</span>
            </CardContent>
          </Card>
        )}
        {water && (
          <Card>
            <CardContent className="py-3 flex flex-col items-center gap-1 text-center">
              <Droplets className={`h-4 w-4 ${water.color}`} />
              <span className="text-xs font-medium">{water.label}</span>
            </CardContent>
          </Card>
        )}
        {plant.temp_min != null && (
          <Card>
            <CardContent className="py-3 flex flex-col items-center gap-1 text-center">
              <Thermometer className="h-4 w-4 text-red-400" />
              <span className="text-xs font-medium">{plant.temp_min}–{plant.temp_max}°C</span>
            </CardContent>
          </Card>
        )}
        {plant.watering_interval_days && (
          <Card>
            <CardContent className="py-3 flex flex-col items-center gap-1 text-center">
              <Droplets className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-medium">Var {plant.watering_interval_days}:e dag</span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Growing calendar (garden plants) */}
      {plant.category === 'trädgård' && (plant.sow_month || plant.plant_out_month || plant.harvest_month) && (
        <Card>
          <CardContent className="py-4 space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5"><Sprout className="h-4 w-4" /> Odlingskalender</h2>
            <div className="grid gap-2 text-sm">
              {plant.sow_month && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌱</span>
                  <div><span className="font-medium">Förodla inomhus</span><p className="text-muted-foreground">{plant.sow_month}</p></div>
                </div>
              )}
              {plant.plant_out_month && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌿</span>
                  <div><span className="font-medium">Plantera ut</span><p className="text-muted-foreground">{plant.plant_out_month}</p></div>
                </div>
              )}
              {plant.harvest_month && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥕</span>
                  <div><span className="font-medium">Skörd</span><p className="text-muted-foreground">{plant.harvest_month}</p></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Care tips */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5"><Scissors className="h-4 w-4" /> Skötselråd</h2>
          <ul className="space-y-2">
            {profile.careTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Leaf className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Harvest tip */}
      {profile.harvestTip && (
        <Card>
          <CardContent className="py-4 space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-amber-500" /> Skördetips</h2>
            <p className="text-sm text-muted-foreground">{profile.harvestTip}</p>
          </CardContent>
        </Card>
      )}

      {/* Companion planting */}
      {(profile.companions?.length || profile.enemies?.length) && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5"><Users className="h-4 w-4" /> Samplantering</h2>
            {profile.companions?.length ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">✅ Bra grannar</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.companions.map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                </div>
              </div>
            ) : null}
            {profile.enemies?.length ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Ban className="h-3 w-3" /> Undvik bredvid</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.enemies.map(e => <Badge key={e} variant="outline" className="text-xs text-destructive border-destructive/30">{e}</Badge>)}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Fun fact */}
      {profile.funFact && (
        <Card className="bg-accent/30 border-accent">
          <CardContent className="py-4">
            <p className="text-sm"><span className="font-semibold">💡 Visste du?</span> {profile.funFact}</p>
          </CardContent>
        </Card>
      )}

      {/* Buy links */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <h2 className="text-sm font-semibold">🛒 Köp {plant.name_sv}</h2>
          <div className="grid gap-2">
            {buyLinks.map(link => (
              <a key={link.store} href={link.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors text-sm">
                <span className="font-medium text-foreground">{link.store}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add to garden CTA */}
      <Button className="w-full gap-2" size="lg" onClick={handleAddToGarden}>
        <Plus className="h-4 w-4" />
        {plant.category === 'trädgård' ? 'Lägg till i såloggen' : 'Lägg till i mina växter'}
      </Button>
    </div>
  );
};

export default PlantProfilePage;
