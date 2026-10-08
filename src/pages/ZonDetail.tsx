import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Sprout, ArrowLeft, MapPin, Snowflake, Calendar, Thermometer } from 'lucide-react';
import DOMPurify from 'dompurify';
import { ORG_AUTHOR, ORG_PUBLISHER, buildBreadcrumbs } from '@/lib/seoData';
import { ArticleAttribution } from '@/components/ArticleAttribution';
import InlineSignupCTA from '@/components/InlineSignupCTA';
import PublicNotFound from '@/components/PublicNotFound';
import { getLocalZoneGuide, LOCAL_ZONE_GUIDES } from '@/lib/localZoneGuides';

export default function ZonDetail() {
  const { slug } = useParams<{ slug: string }>();
  const localZone = getLocalZoneGuide(slug);

  const { data: zone, isLoading } = useQuery({
    queryKey: ['seo-zone', slug],
    initialData: localZone ?? undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_zones')
        .select('*')
        .eq('slug', slug!)
        .eq('published', true)
        .maybeSingle();
      if (error) throw error;
      return data ?? localZone;
    },
    enabled: !!slug,
  });

  const { data: linkedPlants = [] } = useQuery({
    queryKey: ['seo-zone-plants', zone?.id],
    enabled: !!zone?.id && !zone.id.startsWith('local:'),
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
  if (!zone) return <PublicNotFound path={`/zoner/${slug || ''}`} title="Zonguiden hittades inte" description="Zonguiden finns inte eller är inte publicerad." backTo="/zoner" backLabel="Alla odlingszoner" />;

  const sanitized = zone.content_html ? DOMPurify.sanitize(zone.content_html) : '';
  const localContent = zone.id.startsWith('local:') ? LOCAL_ZONE_GUIDES.find(item => item.slug === slug) : null;
  const hasClimateFacts = zone.typical_regions?.length || zone.frost_free_days_min || zone.last_frost_typical || zone.first_frost_typical || zone.winter_temp_min != null;
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

        {hasClimateFacts ? <Card className="border-border/50 mb-8">
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
        </Card> : null}

        {localContent && <div className="max-w-none mb-10 space-y-6 text-foreground/85 leading-relaxed [&_a]:text-primary [&_a]:underline">
          <p>Svensk Trädgårds zonkarta beskriver härdighet hos träd och buskar. För grönsakernas sådd behöver du även följa sortens anvisningar och vädret där du odlar.</p>
          {localContent.sections.map(section => <section key={section.heading} className="space-y-3"><h2 className="font-serif text-2xl text-foreground">{section.heading}</h2><p>{section.text}</p></section>)}
          <h2 className="font-serif text-2xl text-foreground">Fortsätt planeringen</h2>
          <ul><li><Link to="/sakalender">Öppna såkalendern</Link></li><li><Link to="/sista-frost">Läs om sista frost</Link></li><li><Link to="/vaxter">Utforska växtguiderna</Link></li></ul>
          <p>Källor om zonindelning: <a href="https://svensktradgard.se/tradgardsrad/zonkartan/digitala-zonkartan">Svensk Trädgårds zonkarta</a> och <a href="https://svensktradgard.se/tradgardsrad/zonkartan/utlasa-zonkartan/">så tolkar du zonkartan</a>. Checklistorna ovan är Odlingsdagbokens förslag för din egen planering.</p>
        </div>}

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

        <InlineSignupCTA />

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

        <InlineSignupCTA
          variant="card"
          title={`Anpassa appen efter ${zone.title}`}
          description="Skapa en gratis dagbok – appen anpassar tips och påminnelser efter din klimatzon."
          buttonLabel="Börja gratis"
          className="mt-12"
        />
      </article>
    </PublicLayout>
  );
}
