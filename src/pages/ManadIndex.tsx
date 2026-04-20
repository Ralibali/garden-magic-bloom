import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, ArrowRight } from 'lucide-react';
import { MONTH_NAMES_SV, MONTH_NAMES_TITLE, SEASON_LABEL } from '@/lib/seoData';

export default function ManadIndex() {
  const { data: months = [], isLoading } = useQuery({
    queryKey: ['seo-months-index'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_months')
        .select('id, slug, month_number, month_name, season, intro, title')
        .eq('published', true)
        .order('month_number');
      if (error) throw error;
      return data;
    },
  });

  // Always show all 12 months as scaffolding even if DB empty
  const allMonths = MONTH_NAMES_SV.map((slug, i) => {
    const dbRow = months.find(m => m.month_number === i + 1);
    return dbRow || { id: slug, slug, month_number: i + 1, month_name: MONTH_NAMES_TITLE[i], season: null, intro: null, title: null, _placeholder: true };
  });

  return (
    <PublicLayout>
      <Seo
        title="Odla efter månad – Vad gör jag i trädgården nu? | Odlingsdagboken"
        description="Komplett månadsguide för svenska hobbyodlare. Vad ska sås, skördas och göras i januari, februari, mars och resten av året."
        path="/manad"
        jsonLd={[
          {
            '@type': 'CollectionPage',
            name: 'Månadsguider för odling',
            url: 'https://odlingsdagboken.com/manad',
            inLanguage: 'sv-SE',
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://odlingsdagboken.com' },
              { '@type': 'ListItem', position: 2, name: 'Månadsguider' },
            ],
          },
        ]}
      />

      <section className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium mb-4">
            <Calendar className="h-3.5 w-3.5" /> Året i trädgården
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif text-foreground mb-3">Vad gör jag i trädgården just nu?</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            En guide för varje månad – sådder, skörd, frostvarningar och skötsel anpassat efter svenskt klimat.
          </p>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allMonths.map(m => {
              const isPlaceholder = (m as any)._placeholder;
              const Wrapper = isPlaceholder ? 'div' : Link;
              const wrapperProps = isPlaceholder ? {} : { to: `/manad/${m.slug}` };
              return (
                <Wrapper key={m.id} {...(wrapperProps as any)} className={isPlaceholder ? 'opacity-50 cursor-not-allowed' : 'group block'}>
                  <Card className="border-border/50 hover:shadow-md transition-all duration-300 h-full">
                    <CardContent className="p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <h2 className="font-serif text-xl text-foreground capitalize group-hover:text-primary transition-colors">
                          {m.month_name}
                        </h2>
                        {m.season && <Badge variant="secondary" className="text-[10px]">{SEASON_LABEL[m.season] || m.season}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {m.intro || (isPlaceholder ? 'Innehåll kommer snart.' : m.title)}
                      </p>
                      {!isPlaceholder && (
                        <span className="inline-flex items-center text-xs font-medium text-primary gap-1 pt-1">
                          Läs guiden <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
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
