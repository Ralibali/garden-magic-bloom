import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Sprout, ArrowLeft, Sun, Droplets, MapPin, Ruler, Calendar, Leaf } from 'lucide-react';
import DOMPurify from 'dompurify';
import { formatMonthRange, CATEGORY_LABEL, ORG_AUTHOR, ORG_PUBLISHER, buildBreadcrumbs, rangeOrSingle } from '@/lib/seoData';
import { ArticleAttribution } from '@/components/ArticleAttribution';
import InlineSignupCTA from '@/components/InlineSignupCTA';

export default function VaxtDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: plant, isLoading, error } = useQuery({
    queryKey: ['seo-plant', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_plants')
        .select(`
          *,
          months:seo_plant_months ( activity, month:seo_months ( month_number, month_name, slug ) ),
          zones:seo_plant_zones ( suitability, notes, zone:seo_zones ( zone_number, slug, title ) )
        `)
        .eq('slug', slug!)
        .eq('published', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </PublicLayout>
    );
  }

  if (error || !plant) return <Navigate to="/vaxter" replace />;

  const sowIndoor = formatMonthRange(plant.sow_indoor_start, plant.sow_indoor_end);
  const sowOutdoor = formatMonthRange(plant.sow_outdoor_start, plant.sow_outdoor_end);
  const harvest = formatMonthRange(plant.harvest_start, plant.harvest_end);
  const germ = rangeOrSingle(plant.germination_days_min, plant.germination_days_max, 'dagar');
  const toHarvest = rangeOrSingle(plant.days_to_harvest_min, plant.days_to_harvest_max, 'dagar');
  const zoneRange = plant.zone_min && plant.zone_max ? `Zon ${plant.zone_min} till ${plant.zone_max}` : null;
  const faqArr = Array.isArray(plant.faq) ? plant.faq as Array<{ question: string; answer: string }> : [];

  const sanitizedHtml = plant.content_html ? DOMPurify.sanitize(plant.content_html) : '';

  const jsonLd: any[] = [
    {
      '@type': 'Article',
      headline: `Odla ${plant.name} i Sverige – Komplett guide`,
      description: plant.description_short,
      datePublished: plant.created_at,
      dateModified: plant.updated_at,
      author: ORG_AUTHOR,
      publisher: ORG_PUBLISHER,
      ...(plant.image_url ? { image: plant.image_url } : {}),
      about: {
        '@type': 'Thing',
        name: plant.name,
        ...(plant.latin_name ? { alternateName: plant.latin_name } : {}),
      },
    },
    buildBreadcrumbs([
      { name: 'Hem', url: 'https://odlingsdagboken.com' },
      { name: 'Växtguider', url: 'https://odlingsdagboken.com/vaxter' },
      { name: plant.name },
    ]),
  ];

  if (toHarvest && plant.days_to_harvest_max) {
    jsonLd.push({
      '@type': 'HowTo',
      name: `Så odlar du ${plant.name}`,
      description: plant.description_short,
      totalTime: `P${plant.days_to_harvest_max}D`,
      step: [
        sowIndoor && { '@type': 'HowToStep', name: 'Förodla', text: `Förodla inomhus under ${sowIndoor}.` },
        sowOutdoor && { '@type': 'HowToStep', name: 'Direktså', text: `Direktså utomhus under ${sowOutdoor}.` },
        plant.plant_spacing_cm && { '@type': 'HowToStep', name: 'Plantera', text: `Plantera med ${plant.plant_spacing_cm} cm avstånd.` },
        harvest && { '@type': 'HowToStep', name: 'Skörda', text: `Skörda under ${harvest}.` },
      ].filter(Boolean),
    });
  }

  if (faqArr.length > 0) {
    jsonLd.push({
      '@type': 'FAQPage',
      mainEntity: faqArr.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  return (
    <PublicLayout>
      <Seo
        title={`Odla ${plant.name} i Sverige – Komplett guide | Odlingsdagboken`}
        description={plant.description_short}
        path={`/vaxter/${plant.slug}`}
        ogType="article"
        ogImage={plant.image_url || undefined}
        ogImageAlt={plant.image_alt || plant.name}
        articleMeta={{
          publishedTime: plant.created_at,
          modifiedTime: plant.updated_at,
          section: plant.category || undefined,
          tags: [plant.name, plant.latin_name || ''].filter(Boolean),
        }}
        jsonLd={jsonLd}
      />

      <article className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <Link to="/vaxter" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Alla växtguider
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {plant.category && <Badge variant="secondary">{CATEGORY_LABEL[plant.category] || plant.category}</Badge>}
            {plant.difficulty && <Badge variant="outline">Svårighet: {plant.difficulty}</Badge>}
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif text-foreground leading-tight mb-3">
            Odla {plant.name} i Sverige – Komplett guide
          </h1>
          {plant.latin_name && (
            <p className="text-lg italic text-muted-foreground">{plant.latin_name}</p>
          )}
        </header>

        {plant.image_url && (
          <div className="rounded-2xl overflow-hidden mb-8 aspect-video">
            <img src={plant.image_url} alt={plant.image_alt || plant.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* SEO-critical: fact summary first, with semantic dl/dt/dd for AI extraction */}
        <Card className="border-border/50 mb-8">
          <CardContent className="p-6">
            <h2 className="font-serif text-lg text-foreground mb-4 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-primary" /> Snabbfakta om {plant.name}
            </h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {plant.latin_name && (<><dt className="text-muted-foreground">Latinskt namn</dt><dd className="font-medium italic">{plant.latin_name}</dd></>)}
              {plant.difficulty && (<><dt className="text-muted-foreground">Svårighetsgrad</dt><dd className="font-medium">{plant.difficulty}</dd></>)}
              {sowIndoor && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3 w-3" />Såtid inomhus</dt><dd className="font-medium">{sowIndoor}</dd></>)}
              {sowOutdoor && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3 w-3" />Såtid utomhus</dt><dd className="font-medium">{sowOutdoor}</dd></>)}
              {harvest && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Sprout className="h-3 w-3" />Skördetid</dt><dd className="font-medium">{harvest}</dd></>)}
              {germ && (<><dt className="text-muted-foreground">Groning</dt><dd className="font-medium">{germ}</dd></>)}
              {toHarvest && (<><dt className="text-muted-foreground">Tid till skörd</dt><dd className="font-medium">{toHarvest}</dd></>)}
              {plant.plant_spacing_cm && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Ruler className="h-3 w-3" />Plantavstånd</dt><dd className="font-medium">{plant.plant_spacing_cm} cm</dd></>)}
              {plant.row_spacing_cm && (<><dt className="text-muted-foreground">Radavstånd</dt><dd className="font-medium">{plant.row_spacing_cm} cm</dd></>)}
              {plant.planting_depth_cm && (<><dt className="text-muted-foreground">Sådjup</dt><dd className="font-medium">{plant.planting_depth_cm} cm</dd></>)}
              {plant.mature_height_cm && (<><dt className="text-muted-foreground">Höjd vid mognad</dt><dd className="font-medium">{plant.mature_height_cm} cm</dd></>)}
              {zoneRange && (<><dt className="text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3 w-3" />Odlingszon</dt><dd className="font-medium">{zoneRange}</dd></>)}
              {plant.sun_requirement && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Sun className="h-3 w-3" />Sol</dt><dd className="font-medium">{plant.sun_requirement}</dd></>)}
              {plant.water_requirement && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Droplets className="h-3 w-3" />Vatten</dt><dd className="font-medium">{plant.water_requirement}</dd></>)}
              {plant.soil_ph_min && plant.soil_ph_max && (<><dt className="text-muted-foreground">Jord-pH</dt><dd className="font-medium">{plant.soil_ph_min} – {plant.soil_ph_max}</dd></>)}
            </dl>
          </CardContent>
        </Card>

        {/* Lead paragraph */}
        <p className="text-lg text-foreground/85 leading-relaxed mb-8">{plant.description_long || plant.description_short}</p>

        {/* Main content */}
        {sanitizedHtml && (
          <div
            className="prose prose-lg max-w-none mb-10 [&>h2]:font-serif [&>h2]:text-2xl [&>h2]:text-foreground [&>h2]:mt-10 [&>h2]:mb-3 [&>h3]:font-serif [&>h3]:text-lg [&>h3]:text-foreground [&>h3]:mt-6 [&>h3]:mb-2 [&>p]:text-foreground/85 [&>p]:leading-relaxed [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&_a]:text-primary [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        )}

        {/* Companion planting */}
        {(plant.companion_plants?.length || plant.avoid_plants?.length) && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl text-foreground mb-3">Kompanionväxter</h2>
            {plant.companion_plants?.length ? (
              <p className="text-foreground/85 mb-3"><strong>Trivs bra med:</strong> {plant.companion_plants.join(', ')}.</p>
            ) : null}
            {plant.avoid_plants?.length ? (
              <p className="text-foreground/85"><strong>Undvik bredvid:</strong> {plant.avoid_plants.join(', ')}.</p>
            ) : null}
          </section>
        )}

        {/* Months / zones from relations */}
        {plant.months?.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl text-foreground mb-3">Året med {plant.name}</h2>
            <div className="flex flex-wrap gap-2">
              {plant.months.map((m: any, i: number) => m.month && (
                <Link key={i} to={`/manad/${m.month.slug}`} className="px-3 py-1.5 rounded-full bg-secondary text-xs hover:bg-secondary/70 transition-colors">
                  {m.month.month_name} <span className="text-muted-foreground">· {m.activity.replace('_', ' ')}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {plant.zones?.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl text-foreground mb-3">Lämpliga klimatzoner</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {plant.zones.map((z: any, i: number) => z.zone && (
                <Link key={i} to={`/zoner/${z.zone.slug}`} className="block p-3 rounded-lg border border-border/50 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-foreground">{z.zone.title}</span>
                    {z.suitability && <Badge variant="outline" className="text-[10px]">{z.suitability}</Badge>}
                  </div>
                  {z.notes && <p className="text-xs text-muted-foreground mt-1">{z.notes}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Mjuk inline-CTA mitt i innehållet */}
        <InlineSignupCTA
          title={`Vill du lyckas bättre med ${plant.name} nästa säsong?`}
          description="Spara när du sår, planterar ut och skördar. Då ser du vad som fungerar i din egen trädgård – inte bara vad som står i generella odlingsråd."
          buttonLabel="Börja logga gratis"
        />

        {/* FAQ */}
        {faqArr.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl text-foreground mb-4">Vanliga frågor om att odla {plant.name}</h2>
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

        <ArticleAttribution updatedAt={plant.updated_at} publishedAt={plant.created_at} />

        {/* Slut-CTA */}
        <InlineSignupCTA
          variant="card"
          title={`Logga din odling av ${plant.name} – år efter år`}
          description="Skapa en gratis dagbok och bygg upp din egen kunskap om vad som faktiskt fungerar i just din jord och din klimatzon."
          buttonLabel="Börja gratis"
          className="mt-12"
        />
      </article>
    </PublicLayout>
  );
}
