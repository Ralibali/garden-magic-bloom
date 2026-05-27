import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Loader2, Sprout, Search } from 'lucide-react';
import { CATEGORY_LABEL, formatMonthRange } from '@/lib/seoData';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';

export default function VaxterIndex() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);

  const { data: plants = [], isLoading } = useQuery({
    queryKey: ['seo-plants-index'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_plants')
        .select('id, slug, name, latin_name, category, description_short, image_url, image_alt, difficulty, harvest_start, harvest_end, sow_indoor_start, sow_indoor_end')
        .eq('published', true)
        .order('featured', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    return plants.filter(p => {
      if (cat && p.category !== cat) return false;
      if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !p.latin_name?.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [plants, q, cat]);

  const categories = useMemo(() => {
    const set = new Set(plants.map(p => p.category).filter(Boolean));
    return Array.from(set) as string[];
  }, [plants]);

  return (
    <PublicLayout>
      <Seo
        title="Växtguider – grönsaker, frukter & örter | Odlingsdagboken"
        description="Komplett guide till att odla grönsaker, frukter, bär, kryddor och blommor i Sverige. Såtider, skörd, skötsel och svårighetsgrad för varje växt."
        path="/vaxter"
        jsonLd={[
          {
            '@type': 'CollectionPage',
            name: 'Växtguider',
            description: 'Komplett bibliotek med växtguider för svenska odlingsförhållanden.',
            url: 'https://odlingsdagboken.com/vaxter',
            inLanguage: 'sv-SE',
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://odlingsdagboken.com' },
              { '@type': 'ListItem', position: 2, name: 'Växtguider' },
            ],
          },
          plants.length > 0 && {
            '@type': 'ItemList',
            itemListElement: plants.slice(0, 50).map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `https://odlingsdagboken.com/vaxter/${p.slug}`,
              name: p.name,
            })),
          },
        ].filter(Boolean) as any}
      />

      <section className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium mb-4">
            <Sprout className="h-3.5 w-3.5" /> Växtbibliotek
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif text-foreground mb-3">Odla allt – från ärta till äpple</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Bläddra bland våra växtguider med såtider, skörd och skötsel anpassat efter svenska klimatzoner.
          </p>
        </header>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="vaxter-sok"
              aria-label="Sök växt"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Sök växt…"
              className="pl-9 rounded-xl"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCat(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                cat === null ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >Alla</button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  cat === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >{CATEGORY_LABEL[c] || c}</button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {plants.length === 0
              ? 'Inga växtguider publicerade än. De första kommer snart!'
              : 'Inga växter matchar din sökning.'}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(p => (
              <Link key={p.id} to={`/vaxter/${p.slug}`} className="group">
                <Card className="border-border/50 overflow-hidden hover:shadow-md transition-all duration-300 h-full">
                  {p.image_url ? (
                    <div className="aspect-video overflow-hidden bg-secondary/30">
                      <img src={p.image_url} alt={p.image_alt || p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-primary/8 to-accent/8 flex items-center justify-center text-4xl">🌱</div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.category && <Badge variant="secondary" className="text-[9px]">{CATEGORY_LABEL[p.category] || p.category}</Badge>}
                      {p.difficulty && <Badge variant="outline" className="text-[9px]">{p.difficulty}</Badge>}
                    </div>
                    <h3 className="font-serif text-lg text-foreground leading-snug group-hover:text-primary transition-colors">{p.name}</h3>
                    {p.latin_name && <p className="text-xs italic text-muted-foreground">{p.latin_name}</p>}
                    {p.description_short && <p className="text-sm text-muted-foreground line-clamp-2">{p.description_short}</p>}
                    {(p.harvest_start || p.sow_indoor_start) && (
                      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground pt-1">
                        {formatMonthRange(p.sow_indoor_start, p.sow_indoor_end) && (
                          <span>Sådd: <strong className="text-foreground/80">{formatMonthRange(p.sow_indoor_start, p.sow_indoor_end)}</strong></span>
                        )}
                        {formatMonthRange(p.harvest_start, p.harvest_end) && (
                          <span>Skörd: <strong className="text-foreground/80">{formatMonthRange(p.harvest_start, p.harvest_end)}</strong></span>
                        )}
                      </div>
                    )}
                    <span className="inline-flex items-center text-xs font-medium text-primary gap-1 pt-1">
                      Läs guiden <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
