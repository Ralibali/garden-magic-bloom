import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRight, Sprout, Scissors, Snowflake } from 'lucide-react';
import { MONTH_NAMES_SV, MONTH_NAMES_TITLE, SEASON_LABEL, buildBreadcrumbs } from '@/lib/seoData';
import InlineSignupCTA from '@/components/InlineSignupCTA';
import CalendarZonePicker from '@/components/CalendarZonePicker';
import CalendarPdfDownload from '@/components/CalendarPdfDownload';
import { useOdlingszon } from '@/hooks/useOdlingszon';
import { getMonthActivities } from '@/lib/calendarMonth';
import { CURRENT_YEAR } from '@/lib/currentYear';

const ORIGIN = 'https://odlingsdagboken.com';

export default function OdlingskalenderIndex() {
  const { zone, setZone } = useOdlingszon();

  const { data: months = [] } = useQuery({
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

  const allMonths = MONTH_NAMES_SV.map((slug, i) => {
    const dbRow = months.find(m => m.month_number === i + 1);
    const activities = getMonthActivities(i + 1, zone);
    return {
      slug,
      monthNumber: i + 1,
      monthName: dbRow?.month_name || MONTH_NAMES_TITLE[i],
      season: dbRow?.season || null,
      intro: dbRow?.intro || null,
      activities,
    };
  });

  return (
    <PublicLayout>
      <Seo
        title={`Odlingskalender ${CURRENT_YEAR} – månad för månad i din zon`}
        description="Se vad du ska så, förodla, plantera och skörda varje månad. Anpassad efter svenska klimatzoner 1–8."
        path="/odlingskalender"
        jsonLd={[
          {
            '@type': 'CollectionPage',
            name: `Odlingskalender ${CURRENT_YEAR}`,
            url: `${ORIGIN}/odlingskalender`,
            inLanguage: 'sv-SE',
          },
          {
            '@type': 'ItemList',
            name: `Odlingskalender ${CURRENT_YEAR} – månad för månad`,
            itemListElement: allMonths.map((m, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `Odlingskalender för ${MONTH_NAMES_SV[i]}`,
              url: `${ORIGIN}/odlingskalender/${m.slug}`,
            })),
          },
          buildBreadcrumbs([
            { name: 'Hem', url: ORIGIN },
            { name: 'Odlingskalender' },
          ]),
        ]}
      />

      <section className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium mb-4">
            <Calendar className="h-3.5 w-3.5" /> Året i trädgården
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif text-foreground mb-3">Odlingskalender {CURRENT_YEAR}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Månad för månad, hela året: vad du förodlar, direktsår, planterar ut och skördar – med vecknummer
            räknade efter din egen klimatzon. Ingen generell kalender för hela Sverige, utan en för där du bor.
          </p>
        </header>

        <CalendarZonePicker zone={zone} onChange={setZone} className="mb-8" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allMonths.map(m => (
            <Link key={m.slug} to={`/odlingskalender/${m.slug}`} className="group block">
              <Card className="border-border/50 hover:shadow-md transition-all duration-300 h-full">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-xl text-foreground capitalize group-hover:text-primary transition-colors">
                      {m.monthName}
                    </h2>
                    {m.season && <Badge variant="secondary" className="text-[10px]">{SEASON_LABEL[m.season] || m.season}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {m.intro || `Sådder, utplantering, skörd och skötsel i ${MONTH_NAMES_SV[m.monthNumber - 1]} för zon ${zone}.`}
                  </p>
                  <ul className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[11px] text-muted-foreground">
                    {(m.activities.forodla.length + m.activities.direktsa.length) > 0 && (
                      <li className="inline-flex items-center gap-1">
                        <Sprout className="h-3 w-3 text-primary" aria-hidden="true" />
                        {m.activities.forodla.length + m.activities.direktsa.length} att så
                      </li>
                    )}
                    {m.activities.skorda.length > 0 && (
                      <li className="inline-flex items-center gap-1">
                        <Scissors className="h-3 w-3 text-primary" aria-hidden="true" />
                        {m.activities.skorda.length} att skörda
                      </li>
                    )}
                    {m.activities.other.length > 0 && (
                      <li className="inline-flex items-center gap-1">
                        <Snowflake className="h-3 w-3 text-primary" aria-hidden="true" />
                        {m.activities.other.length} sysslor
                      </li>
                    )}
                  </ul>
                  <span className="inline-flex items-center text-xs font-medium text-primary gap-1 pt-1">
                    Öppna {MONTH_NAMES_SV[m.monthNumber - 1]} <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          <Link to="/sakalender" className="rounded-2xl border border-border/60 bg-card/60 p-5 hover:shadow-md transition-shadow">
            <h2 className="font-serif text-lg text-foreground mb-1">Såkalender per gröda</h2>
            <p className="text-sm text-muted-foreground">Vill du veta när du sår tomat i zon fem? Bygg en såkalender gröda för gröda.</p>
          </Link>
          <Link to="/odlingsplan" className="rounded-2xl border border-border/60 bg-card/60 p-5 hover:shadow-md transition-shadow">
            <h2 className="font-serif text-lg text-foreground mb-1">Odlingsplan</h2>
            <p className="text-sm text-muted-foreground">Osäker på vad du ska odla i år? Svara på några frågor och få ett förslag.</p>
          </Link>
          <Link to="/zoner" className="rounded-2xl border border-border/60 bg-card/60 p-5 hover:shadow-md transition-shadow">
            <h2 className="font-serif text-lg text-foreground mb-1">Odlingszoner i Sverige</h2>
            <p className="text-sm text-muted-foreground">Vet du inte vilken zon du bor i? Läs om zon ett till åtta och vad de betyder.</p>
          </Link>
        </section>

        <CalendarPdfDownload zone={zone} className="mt-12" />

        <InlineSignupCTA
          variant="card"
          title="Låt odlingskalendern bli din egen dagbok"
          description="Skapa ett gratis konto – då sparas dina sådder, påminnelser och skördar månad för månad."
          buttonLabel="Börja gratis"
          className="mt-16"
        />
      </section>
    </PublicLayout>
  );
}
