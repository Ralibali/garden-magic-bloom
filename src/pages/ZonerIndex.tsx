import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MapPin, ArrowRight } from 'lucide-react';

export default function ZonerIndex() {
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['seo-zones-index'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_zones')
        .select('id, slug, zone_number, title, description, typical_regions')
        .eq('published', true)
        .order('zone_number');
      if (error) throw error;
      return data;
    },
  });

  // Scaffold all 8 zones
  const allZones = Array.from({ length: 8 }, (_, i) => {
    const num = i + 1;
    const dbRow = zones.find(z => z.zone_number === num);
    return dbRow || { id: `zon-${num}`, slug: `zon-${num}`, zone_number: num, title: `Zon ${num}`, description: null, typical_regions: null, _placeholder: true };
  });

  return (
    <PublicLayout>
      <Seo
        title="Klimatzoner i Sverige – Odla efter din zon | Odlingsdagboken"
        description="Sveriges åtta odlingszoner. Hitta din zon och se vilka växter, såtider och frostrisker som gäller där du bor."
        path="/zoner"
        jsonLd={[
          {
            '@type': 'CollectionPage',
            name: 'Klimatzoner i Sverige',
            url: 'https://odlingsdagboken.com/zoner',
            inLanguage: 'sv-SE',
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://odlingsdagboken.com' },
              { '@type': 'ListItem', position: 2, name: 'Klimatzoner' },
            ],
          },
        ]}
      />

      <section className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium mb-4">
            <MapPin className="h-3.5 w-3.5" /> Sveriges klimatzoner
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif text-foreground mb-3">Hitta din odlingszon</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Sverige delas in i åtta odlingszoner, från Skåne (zon ett) till norra fjälltrakterna (zon åtta). Din zon avgör vilka växter som trivs och när du kan så.
          </p>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {allZones.map(z => {
              const placeholder = (z as any)._placeholder;
              const Wrapper = placeholder ? 'div' : Link;
              const props = placeholder ? {} : { to: `/zoner/${z.slug}` };
              return (
                <Wrapper key={z.id} {...(props as any)} className={placeholder ? 'opacity-50 cursor-not-allowed' : 'group block'}>
                  <Card className="border-border/50 hover:shadow-md transition-all duration-300 h-full">
                    <CardContent className="p-5 space-y-2">
                      <div className="text-3xl font-serif text-primary">{z.zone_number}</div>
                      <h2 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">{z.title}</h2>
                      {z.typical_regions?.length > 0 && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{z.typical_regions.slice(0, 3).join(', ')}</p>
                      )}
                      {!placeholder && (
                        <span className="inline-flex items-center text-xs font-medium text-primary gap-1 pt-1">
                          Läs mer <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </Wrapper>
              );
            })}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
