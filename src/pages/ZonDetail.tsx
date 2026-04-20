import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Sprout, ArrowLeft, MapPin, Snowflake, Calendar, Thermometer } from 'lucide-react';
import DOMPurify from 'dompurify';
import { ORG_AUTHOR, ORG_PUBLISHER, buildBreadcrumbs } from '@/lib/seoData';
import { ArticleAttribution } from '@/components/ArticleAttribution';

export default function ZonDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: zone, isLoading } = useQuery({
    queryKey: ['seo-zone', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_zones')
        .select('*')
        .eq('slug', slug!)
        .eq('published', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: linkedPlants = [] } = useQuery({
    queryKey: ['seo-zone-plants', zone?.id],
    enabled: !!zone?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('seo_plant_zones')
        .select('suitability, notes, plant:seo_plants(slug, name, category, image_url, image_alt, description_short)')
        .eq('zone_id', zone!.id);
      return (data || []).filter(d => d.plant && (d.plant as any).slug);
    },
  });

  if (isLoading) {
    return <PublicLayout><div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></PublicLayout>;
  }
  if (!zone) return <Navigate to="/zoner" replace />;

  const sanitized = zone.content_html ? DOMPurify.sanitize(zone.content_html) : '';
  const faqArr = Array.isArray(zone.faq) ? zone.faq as Array<{ question: string; answer: string }> : [];

  const jsonLd: any[] = [
    {
      '@type': 'Article',
      headline: zone.title,
      description: zone.description || `Komplett guide till odlingszon ${zone.zone_number} i Sverige.`,
      datePublished: zone.created_at,
      dateModified: zone.updated_at,
      author: ORG_AUTHOR,
      publisher: ORG_PUBLISHER,
    },
    buildBreadcrumbs([
      { name: 'Hem', url: 'https://odlingsdagboken.com' },
      { name: 'Klimatzoner', url: 'https://odlingsdagboken.com/zoner' },
      { name: zone.title },
    ]),
  ];
  if (faqArr.length) {
    jsonLd.push({
      '@type': 'FAQPage',
      mainEntity: faqArr.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    });
  }

  return (
    <PublicLayout>
      <Seo
        title={`${zone.title} – Odlingsguide | Odlingsdagboken`}
        description={zone.description?.slice(0, 160) || `Allt om att odla i ${zone.title} – klimat, växter och säsong.`}
        path={`/zoner/${zone.slug}`}
        ogType="article"
        articleMeta={{ publishedTime: zone.created_at, modifiedTime: zone.updated_at }}
        jsonLd={jsonLd}
      />

      <article className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <Link to="/zoner" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Alla zoner
        </Link>

        <header className="mb-8">
          <Badge variant="secondary" className="mb-3">Zon {zone.zone_number}</Badge>
          <h1 className="text-4xl sm:text-5xl font-serif text-foreground leading-tight mb-3">{zone.title}</h1>
          {zone.description && <p className="text-lg text-muted-foreground">{zone.description}</p>}
        </header>

        <Card className="border-border/50 mb-8">
          <CardContent className="p-6">
            <h2 className="font-serif text-lg text-foreground mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Klimatfakta
            </h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {zone.typical_regions?.length > 0 && (<><dt className="text-muted-foreground">Typiska regioner</dt><dd className="font-medium">{zone.typical_regions.join(', ')}</dd></>)}
              {zone.frost_free_days_min && zone.frost_free_days_max && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3 w-3" />Frostfria dagar</dt><dd className="font-medium">{zone.frost_free_days_min}–{zone.frost_free_days_max}</dd></>)}
              {zone.last_frost_typical && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Snowflake className="h-3 w-3" />Sista frost</dt><dd className="font-medium">{zone.last_frost_typical}</dd></>)}
              {zone.first_frost_typical && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Snowflake className="h-3 w-3" />Första frost</dt><dd className="font-medium">{zone.first_frost_typical}</dd></>)}
              {zone.winter_temp_min != null && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Thermometer className="h-3 w-3" />Lägsta vintertemperatur</dt><dd className="font-medium">{zone.winter_temp_min}°C</dd></>)}
            </dl>
          </CardContent>
        </Card>

        {sanitized && (
          <div
            className="prose prose-lg max-w-none mb-10 [&>h2]:font-serif [&>h2]:text-2xl [&>h2]:text-foreground [&>h2]:mt-10 [&>h2]:mb-3 [&>h3]:font-serif [&>h3]:text-lg [&>h3]:text-foreground [&>h3]:mt-6 [&>h3]:mb-2 [&>p]:text-foreground/85 [&>p]:leading-relaxed [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&_a]:text-primary [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: sanitized }}
          />
        )}

        {linkedPlants.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl text-foreground mb-4">Lämpliga växter för {zone.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {linkedPlants.map((lp: any) => lp.plant && (
                <Link key={lp.plant.slug} to={`/vaxter/${lp.plant.slug}`} className="block p-4 rounded-xl border border-border/50 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-foreground">{lp.plant.name}</span>
                    {lp.suitability && <Badge variant="outline" className="text-[10px]">{lp.suitability}</Badge>}
                  </div>
                  {lp.notes && <p className="text-xs text-muted-foreground">{lp.notes}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {faqArr.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl text-foreground mb-4">Vanliga frågor om {zone.title}</h2>
            <div className="space-y-3">
              {faqArr.map((f, i) => (
                <details key={i} className="group border border-border/50 rounded-xl p-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="cursor-pointer font-medium text-foreground flex items-center justify-between gap-2">
                    {f.question}
                    <span className="text-muted-foreground group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                  </summary>
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <ArticleAttribution updatedAt={zone.updated_at} publishedAt={zone.created_at} />

        <div className="text-center bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-2xl p-8 border border-border/30 mt-12">
          <h2 className="font-serif text-xl text-foreground mb-2">Anpassa appen efter {zone.title}</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            Skapa en gratis dagbok – appen anpassar tips och påminnelser efter din klimatzon.
          </p>
          <Link to="/login">
            <Button size="lg" className="rounded-xl gap-2"><Sprout className="h-4 w-4" /> Skapa konto</Button>
          </Link>
        </div>
      </article>
    </PublicLayout>
  );
}
