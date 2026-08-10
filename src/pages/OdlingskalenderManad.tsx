import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Thermometer, Sun, Snowflake, CheckCircle2, Plus } from 'lucide-react';
import DOMPurify from 'dompurify';
import {
  ORG_AUTHOR,
  ORG_PUBLISHER,
  buildBreadcrumbs,
  SEASON_LABEL,
  MONTH_NAMES_SV,
  MONTH_NAMES_TITLE,
} from '@/lib/seoData';
import { ArticleAttribution } from '@/components/ArticleAttribution';
import InlineSignupCTA from '@/components/InlineSignupCTA';
import PublicNotFound from '@/components/PublicNotFound';
import CalendarZonePicker from '@/components/CalendarZonePicker';
import { useOdlingszon } from '@/hooks/useOdlingszon';
import { CALENDAR_SECTIONS, getMonthActivities, type CalendarCrop } from '@/lib/calendarMonth';
import { useAuth } from '@/hooks/useAuth';
import { CURRENT_YEAR } from '@/lib/currentYear';
import { trackEvent } from '@/lib/analytics';

const ORIGIN = 'https://odlingsdagboken.com';

export default function OdlingskalenderManad() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { zone, setZone } = useOdlingszon();

  const monthIndex = MONTH_NAMES_SV.indexOf((slug || '') as (typeof MONTH_NAMES_SV)[number]);
  const monthNumber = monthIndex + 1;

  const { data: month } = useQuery({
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
    enabled: !!slug && monthIndex >= 0,
  });

  // Zonen från profilen vinner när användaren är inloggad.
  useQuery({
    queryKey: ['profile-zone', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('climate_zone').eq('id', user!.id).maybeSingle();
      const profileZone = Number.parseInt(String(data?.climate_zone ?? ''), 10);
      if (Number.isFinite(profileZone) && profileZone >= 1 && profileZone <= 8) setZone(profileZone);
      return data ?? null;
    },
  });

  if (monthIndex < 0) {
    return (
      <PublicNotFound
        path={`/odlingskalender/${slug || ''}`}
        title="Månaden hittades inte"
        description="Den där månaden finns inte i odlingskalendern."
        backTo="/odlingskalender"
        backLabel="Hela odlingskalendern"
      />
    );
  }

  const monthName = MONTH_NAMES_SV[monthIndex];
  const monthTitle = MONTH_NAMES_TITLE[monthIndex];
  const data = getMonthActivities(monthNumber, zone);

  const sanitized = month?.content_html ? DOMPurify.sanitize(month.content_html) : '';
  const faqArr = Array.isArray(month?.faq) ? (month!.faq as Array<{ question: string; answer: string }>) : [];
  const dbTasks: string[] = Array.isArray(month?.tasks) ? (month!.tasks as string[]) : [];

  const prevMonth = MONTH_NAMES_SV[(monthIndex + 11) % 12];
  const nextMonth = MONTH_NAMES_SV[(monthIndex + 1) % 12];

  const addToDiary = (crop: CalendarCrop, activity: string) => {
    const payload = {
      type: 'sakalender',
      zone: String(zone),
      method: 'Pallkrage',
      crops: [crop.name],
      month: monthName,
      activity,
      createdAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem('odlingsdagboken_latest_public_plan', JSON.stringify(payload));
    } catch {}
    trackEvent('calendar_add_to_diary', { crop: crop.name, month: monthName, zone, activity });
    if (user) {
      navigate('/app/sowings', { state: { prefillCrop: crop.name, month: monthName, zone } });
    } else {
      navigate('/login?mode=register', { state: { plan: payload, prefillCrop: crop.name } });
    }
  };

  const jsonLd: any[] = [
    {
      '@type': 'Article',
      headline: `Odlingskalender för ${monthName}`,
      description:
        month?.intro ||
        `Vad du ska förodla, direktså, plantera ut och skörda i ${monthName}, anpassat efter svenska klimatzoner.`,
      datePublished: month?.created_at,
      dateModified: month?.updated_at,
      author: ORG_AUTHOR,
      publisher: ORG_PUBLISHER,
      about: { '@type': 'Thing', name: monthTitle },
    },
    buildBreadcrumbs([
      { name: 'Hem', url: ORIGIN },
      { name: 'Odlingskalender', url: `${ORIGIN}/odlingskalender` },
      { name: monthTitle },
    ]),
  ];
  for (const section of CALENDAR_SECTIONS) {
    const crops = data[section.key];
    if (!crops.length) continue;
    jsonLd.push({
      '@type': 'ItemList',
      name: section.heading(monthName),
      numberOfItems: crops.length,
      itemListElement: crops.map((crop, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crop.name,
      })),
    });
  }
  if (faqArr.length) {
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
        title={`Odlingskalender ${monthName} – så, plantera och skörda i zon ${zone}`}
        description={
          month?.intro?.slice(0, 160) ||
          `Odlingskalender för ${monthName} ${CURRENT_YEAR}: förodling, direktsådd, utplantering, skörd och skötsel med vecknummer för din klimatzon.`
        }
        path={`/odlingskalender/${monthName}`}
        canonical={`${ORIGIN}/odlingskalender/${monthName}`}
        ogType="article"
        articleMeta={{ publishedTime: month?.created_at, modifiedTime: month?.updated_at }}
        jsonLd={jsonLd}
      />

      <article className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <Link to="/odlingskalender" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Hela odlingskalendern
        </Link>

        <header className="mb-8">
          {month?.season && <Badge variant="secondary" className="mb-3">{SEASON_LABEL[month.season] || month.season}</Badge>}
          <h1 className="text-4xl sm:text-5xl font-serif text-foreground leading-tight mb-3">
            Odlingskalender för {monthName}
          </h1>
          <p className="text-lg text-muted-foreground">
            {month?.intro ||
              `Allt du gör i odlingen i ${monthName} – med vecknummer räknade efter din klimatzon, inte efter ett medelvärde för hela Sverige.`}
          </p>
        </header>

        <CalendarZonePicker zone={zone} onChange={setZone} className="mb-10" />

        {(month?.avg_temp_south != null || month?.frost_risk) && (
          <Card className="border-border/50 mb-10">
            <CardContent className="p-6">
              <h2 className="font-serif text-lg text-foreground mb-4">Snabbfakta om {monthName}</h2>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {month?.avg_temp_south != null && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Thermometer className="h-3 w-3" />Medeltemp södra Sverige</dt><dd className="font-medium">{month.avg_temp_south}°C</dd></>)}
                {month?.avg_temp_middle != null && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Thermometer className="h-3 w-3" />Mellersta Sverige</dt><dd className="font-medium">{month.avg_temp_middle}°C</dd></>)}
                {month?.avg_temp_north != null && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Thermometer className="h-3 w-3" />Norra Sverige</dt><dd className="font-medium">{month.avg_temp_north}°C</dd></>)}
                {month?.daylight_hours_avg != null && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Sun className="h-3 w-3" />Dagsljus</dt><dd className="font-medium">{month.daylight_hours_avg} timmar</dd></>)}
                {month?.frost_risk && (<><dt className="text-muted-foreground flex items-center gap-1.5"><Snowflake className="h-3 w-3" />Frostrisk</dt><dd className="font-medium">{month.frost_risk}</dd></>)}
              </dl>
            </CardContent>
          </Card>
        )}

        {CALENDAR_SECTIONS.map(section => {
          const crops = data[section.key];
          if (!crops.length) return null;
          return (
            <section key={section.key} className="mb-10">
              <h2 className="font-serif text-2xl text-foreground mb-4 capitalize">{section.heading(monthName)}</h2>
              <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 overflow-hidden">
                {crops.map(crop => (
                  <li key={crop.name} className="flex flex-wrap items-center justify-between gap-3 bg-card/50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{crop.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {crop.weekLabel} i zon {zone}
                        {crop.note ? ` · ${crop.note}` : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addToDiary(crop, section.key)}
                      className="shrink-0 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Lägg till i min odlingsdagbok
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {data.other.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl text-foreground mb-4">Övrigt i {monthName}</h2>
            <ul className="space-y-3">
              {data.other.map(task => (
                <li key={task.title} className="rounded-2xl border border-border/60 bg-card/50 p-4">
                  <p className="font-medium text-foreground mb-1">{task.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {dbTasks.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl text-foreground mb-3">Att göra i trädgården i {monthName}</h2>
            <ul className="space-y-2">
              {dbTasks.map((t, i) => (
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

        <InlineSignupCTA />

        {faqArr.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl text-foreground mb-4">Vanliga frågor om {monthName}</h2>
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

        <nav aria-label="Fler månader" className="grid gap-3 sm:grid-cols-2 mb-10">
          <Link to={`/odlingskalender/${prevMonth}`} className="rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-sm hover:shadow-sm transition-shadow">
            <span className="text-xs text-muted-foreground block">Föregående</span>
            <span className="inline-flex items-center gap-1 text-foreground capitalize">
              <ArrowLeft className="h-3.5 w-3.5" /> Odlingskalender för {prevMonth}
            </span>
          </Link>
          <Link to={`/odlingskalender/${nextMonth}`} className="rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-sm hover:shadow-sm transition-shadow sm:text-right">
            <span className="text-xs text-muted-foreground block">Nästa</span>
            <span className="inline-flex items-center gap-1 text-foreground capitalize">
              Odlingskalender för {nextMonth} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </nav>

        {month && <ArticleAttribution updatedAt={month.updated_at} publishedAt={month.created_at} />}

        <InlineSignupCTA
          variant="card"
          title={`Planera ${monthName} i din egen dagbok`}
          description="Få påminnelser, väderdata och anpassade förslag baserat på din klimatzon – helt gratis."
          buttonLabel="Börja gratis"
          className="mt-12"
        />
      </article>
    </PublicLayout>
  );
}
