import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, CalendarPlus, Leaf, MapPin } from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';
import PublicNotFound from '@/components/PublicNotFound';
import PlanSeasonCta from '@/components/PlanSeasonCta';
import { Badge } from '@/components/ui/badge';
import { Seo } from '@/hooks/useSeo';
import { useOdlingszon } from '@/hooks/useOdlingszon';
import { usePublishedSeoSlugs } from '@/hooks/usePublishedSeoSlugs';
import {
  buildSowingGuide,
  guideSeasonYear,
  SATIDER_PATH,
  sowingGuideJsonLd,
  stepLabel,
  vaxtSlugFor,
  zoneCalendarLinks,
  ZONES,
} from '@/lib/sowingGuide';

export default function SatiderCrop() {
  const { slug } = useParams<{ slug: string }>();
  const year = guideSeasonYear();
  const guide = useMemo(() => buildSowingGuide(slug, year), [slug, year]);
  const { zone, setZone } = useOdlingszon(3);
  const published = usePublishedSeoSlugs();

  if (!guide) {
    return (
      <PublicNotFound
        path={`${SATIDER_PATH}/${slug ?? ''}`}
        title="Grödan finns inte i såtiderna"
        description="Vi har ingen såtidssida för den här grödan ännu. Se alla grödor i översikten."
        backTo={SATIDER_PATH}
        backLabel="Alla såtider"
      />
    );
  }

  const mine = guide.rows.find((row) => row.zone === zone) ?? guide.rows[2];
  const vaxtSlug = published.data ? vaxtSlugFor(guide.crop, published.data.plants) : null;
  const zoneSlugs = new Set(published.data?.zones.map((z) => z.slug) ?? []);
  const calendar = zoneCalendarLinks(zone);

  return (
    <PublicLayout>
      <Seo
        title={guide.title}
        description={guide.description}
        path={`${SATIDER_PATH}/${guide.slug}`}
        ogType="article"
        jsonLd={sowingGuideJsonLd(guide)}
      />

      <article className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <nav aria-label="Brödsmulor" className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Odlingsdagboken</Link>
          <span className="mx-1.5">/</span>
          <Link to={SATIDER_PATH} className="hover:text-foreground">Såtider</Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{guide.crop}</span>
        </nav>

        <header className="mb-8">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="secondary">{guide.categoryTitle}</Badge>
            <Badge variant="outline">Såtider {guide.year}</Badge>
          </div>
          <h1 className="mb-4 font-serif text-4xl leading-tight text-foreground sm:text-5xl">{guide.h1}</h1>
          <p className="text-lg leading-relaxed text-foreground/85" data-testid="quick-answer">{guide.quickAnswer}</p>
        </header>

        <section aria-labelledby="zone-heading" className="mb-10">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 id="zone-heading" className="font-serif text-2xl text-foreground">Såtider för {guide.query} i zon 1–8</h2>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Välj din zon">
              <span className="mr-1 text-xs text-muted-foreground">Din zon:</span>
              {ZONES.map((z) => (
                <button
                  key={z}
                  type="button"
                  aria-pressed={z === zone}
                  onClick={() => setZone(z)}
                  className={`h-8 w-8 rounded-full border text-xs font-semibold transition-colors ${z === zone ? 'border-primary bg-primary text-primary-foreground' : 'border-border/70 hover:border-primary/40'}`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card/70">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Veckor och ungefärliga datum för {guide.year} per odlingszon</caption>
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3">Zon</th>
                  {guide.steps.map((step) => <th key={step} scope="col" className="p-3">{stepLabel(guide.crop, step)}</th>)}
                </tr>
              </thead>
              <tbody>
                {guide.rows.map((row) => {
                  const zoneSlug = `zon-${row.zone}`;
                  const active = row.zone === zone;
                  return (
                    <tr key={row.zone} className={`border-t border-border/50 ${active ? 'bg-primary/[0.07]' : ''}`} aria-current={active ? 'true' : undefined}>
                      <th scope="row" className="p-3 text-left align-top font-normal">
                        <span className="block font-semibold text-foreground">
                          {zoneSlugs.has(zoneSlug) ? <Link to={`/zoner/${zoneSlug}`} className="hover:text-primary hover:underline">Zon {row.zone}</Link> : `Zon ${row.zone}`}
                          {active && <span className="ml-1.5 text-[10px] font-semibold uppercase text-primary">din</span>}
                        </span>
                        <span className="block text-xs text-muted-foreground">{row.places.slice(0, 2).join(', ')}</span>
                      </th>
                      {guide.steps.map((step) => {
                        const w = row.steps[step];
                        return (
                          <td key={step} className="p-3 align-top">
                            {w ? (
                              <>
                                <span className="block font-medium text-foreground">{w.weeks}</span>
                                <span className="block text-xs text-muted-foreground">{w.dates}</span>
                              </>
                            ) : row.protectedOnly && step === 'skorda' ? (
                              <span className="text-xs text-amber-700 dark:text-amber-400">Växthus</span>
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Veckor enligt Odlingsdagbokens såmatris, datum för {guide.year}. Lokalt läge, sort och väder kan flytta tiderna – titta alltid på fröpåsen och jordtemperaturen.
          </p>
          {mine.note && mine.note !== guide.tip && (
            <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"><strong>Zon {mine.zone}:</strong> {mine.note}</p>
          )}
        </section>

        {guide.tip && (
          <section className="mb-10 flex gap-3 rounded-2xl border border-border/60 bg-card/60 p-5">
            <Leaf className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="mb-1 font-serif text-lg text-foreground">Odlingstips för {guide.query}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{guide.tip}</p>
            </div>
          </section>
        )}

        <PlanSeasonCta crop={guide.crop} label={guide.query} zone={zone} className="mb-10" />

        <section aria-labelledby="subscribe-heading" className="mb-10 rounded-2xl border border-border/60 p-5">
          <h2 id="subscribe-heading" className="mb-1 flex items-center gap-2 font-serif text-lg text-foreground">
            <CalendarPlus className="h-5 w-5 text-primary" aria-hidden="true" /> Såkalendern för zon {zone} i din mobil
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Prenumerera gratis – varje vecka där något ska förodlas, sås eller planteras ut dyker upp i din vanliga kalender. Inget konto behövs.
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            <a href={calendar.google} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border/70 px-3 py-1.5 hover:border-primary/40">Google Kalender</a>
            <a href={calendar.webcal} className="rounded-full border border-border/70 px-3 py-1.5 hover:border-primary/40">Apple Kalender / iPhone</a>
            <a href={calendar.https} className="rounded-full border border-border/70 px-3 py-1.5 hover:border-primary/40">Ladda ner .ics</a>
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="mb-10">
          <h2 id="faq-heading" className="mb-4 font-serif text-2xl text-foreground">Vanliga frågor om att {guide.verb} {guide.query}</h2>
          <div className="space-y-3">
            {guide.faqs.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-border/50 p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-2 font-medium text-foreground">
                  {faq.question}
                  <span className="text-lg leading-none text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="more-heading" className="grid gap-4 sm:grid-cols-2">
          <h2 id="more-heading" className="sr-only">Läs vidare</h2>
          {guide.months.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Månad för månad</p>
              <ul className="space-y-1.5 text-sm">
                {guide.months.map((month) => (
                  <li key={month.number}>
                    <Link to={`/odlingskalender/${month.name}`} className="font-medium text-primary hover:underline">Odlingskalender för {month.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Mer om {guide.query}</p>
            <ul className="space-y-1.5 text-sm">
              {vaxtSlug && (
                <li><Link to={`/vaxter/${vaxtSlug}`} className="font-medium text-primary hover:underline">Odla {guide.crop.toLowerCase()} – hela odlingsguiden</Link></li>
              )}
              {guide.related.map((crop) => (
                <li key={crop.slug}><Link to={`${SATIDER_PATH}/${crop.slug}`} className="text-primary hover:underline">Såtider för {crop.name.toLowerCase()}</Link></li>
              ))}
              <li><Link to={SATIDER_PATH} className="inline-flex items-center gap-1 text-primary hover:underline">Alla såtider <ArrowRight className="h-3.5 w-3.5" /></Link></li>
            </ul>
          </div>
        </section>

        <p className="mt-10 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Osäker på din zon? <Link to="/zoner" className="text-primary hover:underline">Hitta din odlingszon</Link>.
        </p>
      </article>
    </PublicLayout>
  );
}
