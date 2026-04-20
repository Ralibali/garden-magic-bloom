import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Sprout, ArrowLeft, Thermometer, Sun, Snowflake, CheckCircle2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { ORG_AUTHOR, ORG_PUBLISHER, buildBreadcrumbs, SEASON_LABEL } from '@/lib/seoData';
import { ArticleAttribution } from '@/components/ArticleAttribution';

export default function ManadDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: month, isLoading } = useQuery({
    queryKey: ['seo-month', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_months')
        .select('*')
        .eq('slug', slug!)
        .eq('published', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Plants linked to this month via relation table
  const { data: linkedPlants = [] } = useQuery({
    queryKey: ['seo-month-plants', month?.id],
    enabled: !!month?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('seo_plant_months')
        .select('activity, plant:seo_plants(slug, name, category, image_url, image_alt)')
        .eq('month_id', month!.id);
      return (data || []).filter(d => d.plant && (d.plant as any).slug);
    },
  });

  if (isLoading) {
    return <PublicLayout><div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></PublicLayout>;
  }
  if (!month) return <Navigate to="/manad" replace />;

  const sanitized = month.content_html ? DOMPurify.sanitize(month.content_html) : '';
  const faqArr = Array.isArray(month.faq) ? month.faq as Array<{ question: string; answer: string }> : [];

  // Group plants by activity
  const plantsByActivity: Record<string, typeof linkedPlants> = {};
  linkedPlants.forEach(lp => {
    if (!plantsByActivity[lp.activity]) plantsByActivity[lp.activity] = [];
    plantsByActivity[lp.activity].push(lp);
  });
  const activityLabels: Record<string, string> = {
    'så_inomhus': 'Så inomhus',
    'så_utomhus': 'Så utomhus',
    'plantera_ut': 'Plantera ut',
    'skörda': 'Skörda',
    'skötsel': 'Skötsel',
  };

  const jsonLd: any[] = [
    {
      '@type': 'Article',
      headline: month.title,
      description: month.intro || `Odlingsguide för ${month.month_name}.`,
      datePublished: month.created_at,
      dateModified: month.updated_at,
      author: ORG_AUTHOR,
      publisher: ORG_PUBLISHER,
      about: { '@type': 'Thing', name: month.month_name },
    },
    buildBreadcrumbs([
      { name: 'Hem', url: 'https://odlingsdagboken.com' },
      { name: 'Månadsguider', url: 'https://odlingsdagboken.com/manad' },
      { name: month.month_name },
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
        title={`${month.title} | Odlingsdagboken`}
        description={month.intro?.slice(0, 160) || `Allt om att odla i ${month.month_name} – sådder, skörd och skötsel.`}
        path={`/manad/${month.slug}`}
        ogType="article"
        articleMeta={{ publishedTime: month.created_at, modifiedTime: month.updated_at }}
        jsonLd={jsonLd}
      />

      <article className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <Link to="/manad" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Alla månader
        </Link>

        <header className="mb-8">
          {month.season && <Badge variant="secondary" className="mb-3">{SEASON_LABEL[month.season] || month.season}</Badge>}
          <h1 className="text-4xl sm:text-5xl font-serif text-foreground leading-tight mb-3">{month.title}</h1>
          {month.intro && <p className="text-lg text-muted-foreground">{month.intro}</p>}
        </header>

        <Card className="border-border/50 mb-8">
          <CardContent className="p-6">
            <h2 className="font-serif text-lg text-foreground mb-4">Snabbfakta om {month.month_name}</h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {month.avg_temp_south != null && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Thermometer className="h-3 w-3" />Medeltemp södra Sverige</dt><dd className="font-medium">{month.avg_temp_south}°C</dd></>)}
              {month.avg_temp_middle != null && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Thermometer className="h-3 w-3" />Mellersta Sverige</dt><dd className="font-medium">{month.avg_temp_middle}°C</dd></>)}
              {month.avg_temp_north != null && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Thermometer className="h-3 w-3" />Norra Sverige</dt><dd className="font-medium">{month.avg_temp_north}°C</dd></>)}
              {month.daylight_hours_avg != null && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Sun className="h-3 w-3" />Dagsljus</dt><dd className="font-medium">{month.daylight_hours_avg} timmar</dd></>)}
              {month.frost_risk && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Snowflake className="h-3 w-3" />Frostrisk</dt><dd className="font-medium">{month.frost_risk}</dd></>)}
            </dl>
          </CardContent>
        </Card>

        {month.tasks?.length > 0 && (
          <section className="mb-8">
            <h2 className="font-serif text-2xl text-foreground mb-3">Att göra i trädgården</h2>
            <ul className="space-y-2">
              {month.tasks.map((t: string, i: number) => (
                <li key={i} className="flex gap-2 text-foreground/85">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {sanitized && (
          <div
            className="prose prose-lg max-w-none mb-10 [&>h2]:font-serif [&>h2]:text-2xl [&>h2]:text-foreground [&>h2]:mt-10 [&>h2]:mb-3 [&>h3]:font-serif [&>h3]:text-lg [&>h3]:text-foreground [&>h3]:mt-6 [&>h3]:mb-2 [&>p]:text-foreground/85 [&>p]:leading-relaxed [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&_a]:text-primary [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: sanitized }}
          />
        )}

        {Object.entries(plantsByActivity).map(([activity, plants]) => (
          <section key={activity} className="mb-8">
            <h2 className="font-serif text-2xl text-foreground mb-3">{activityLabels[activity] || activity} i {month.month_name}</h2>
            <div className="flex flex-wrap gap-2">
              {plants.map((p: any) => p.plant && (
                <Link key={p.plant.slug} to={`/vaxter/${p.plant.slug}`} className="px-3 py-1.5 rounded-full bg-secondary text-xs hover:bg-secondary/70 transition-colors text-foreground">
                  {p.plant.name}
                </Link>
              ))}
            </div>
          </section>
        ))}

        {faqArr.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl text-foreground mb-4">Vanliga frågor om {month.month_name}</h2>
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

        <ArticleAttribution updatedAt={month.updated_at} publishedAt={month.created_at} />

        <div className="text-center bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-2xl p-8 border border-border/30 mt-12">
          <h2 className="font-serif text-xl text-foreground mb-2">Planera {month.month_name} i din egen dagbok</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            Få påminnelser, väderdata och anpassade förslag baserat på din klimatzon.
          </p>
          <Link to="/login">
            <Button size="lg" className="rounded-xl gap-2"><Sprout className="h-4 w-4" /> Skapa konto</Button>
          </Link>
        </div>
      </article>
    </PublicLayout>
  );
}
