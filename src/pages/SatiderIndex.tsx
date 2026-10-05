import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Sprout } from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';
import CalendarCrossLink from '@/components/CalendarCrossLink';
import { Seo } from '@/hooks/useSeo';
import { useOdlingszon } from '@/hooks/useOdlingszon';
import { getWeekGuide, isoWeekOfKey } from '@/lib/gardenCalendar';
import { localDateKey } from '@/lib/gardenToday';
import {
  buildSowingGuideIndex,
  cropSlug,
  guideSeasonYear,
  SATIDER_PATH,
  SITE_ORIGIN,
  ZONE_REGION,
  zoneCalendarLinks,
  ZONES,
} from '@/lib/sowingGuide';

export default function SatiderIndex() {
  const year = guideSeasonYear();
  const { zone, setZone } = useOdlingszon(3);
  const groups = useMemo(() => buildSowingGuideIndex(year, zone), [year, zone]);
  const today = localDateKey();
  const week = isoWeekOfKey(today);
  const now = useMemo(() => {
    const guide = getWeekGuide(zone, week);
    return [
      { label: 'Förodla inomhus', crops: guide.forodla },
      { label: 'Så på friland', crops: guide.direktsa },
      { label: 'Plantera ut', crops: guide.planteraUt },
    ].filter((group) => group.crops.length);
  }, [zone, week]);
  const calendar = zoneCalendarLinks(zone);
  const allCrops = groups.flatMap((group) => group.crops);

  return (
    <PublicLayout>
      <Seo
        title={`Såtider ${year} – när ska man så? Alla grödor, zon 1–8`}
        description={`När ska man så tomater, sätta potatis eller så morötter? Se såtider för ${allCrops.length} grödor i din odlingszon, vecka för vecka med datum för ${year}.`}
        path={SATIDER_PATH}
        jsonLd={[
          {
            '@type': 'CollectionPage',
            '@id': `${SITE_ORIGIN}${SATIDER_PATH}#page`,
            url: `${SITE_ORIGIN}${SATIDER_PATH}`,
            name: `Såtider ${year}`,
            inLanguage: 'sv-SE',
            isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: allCrops.map((crop, i) => ({ '@type': 'ListItem', position: i + 1, name: crop.name, url: `${SITE_ORIGIN}${SATIDER_PATH}/${crop.slug}` })),
            },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Odlingsdagboken', item: `${SITE_ORIGIN}/` },
              { '@type': 'ListItem', position: 2, name: 'Såtider' },
            ],
          },
        ]}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <header className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Såtider {year}</p>
          <h1 className="mb-4 font-serif text-4xl leading-tight text-foreground sm:text-5xl">När ska man så? Såtider för {allCrops.length} grödor</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Välj din odlingszon och se när du ska förodla, så, plantera ut och skörda – vecka för vecka med datum. Tiderna kommer från samma såmatris som Odlingsdagbokens kalender.
          </p>
        </header>

        <div className="mb-8 flex flex-wrap items-center gap-1.5" role="group" aria-label="Välj din zon">
          <span className="mr-1 text-sm font-medium">Din zon:</span>
          {ZONES.map((z) => (
            <button
              key={z}
              type="button"
              aria-pressed={z === zone}
              onClick={() => setZone(z)}
              title={ZONE_REGION[z]}
              className={`h-9 min-w-9 rounded-full border px-2 text-sm font-semibold transition-colors ${z === zone ? 'border-primary bg-primary text-primary-foreground' : 'border-border/70 hover:border-primary/40'}`}
            >
              {z}
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">{ZONE_REGION[zone]}</span>
        </div>

        <section aria-labelledby="now-heading" className="mb-10 rounded-2xl border border-primary/25 bg-primary/[0.05] p-5">
          <h2 id="now-heading" className="mb-3 flex items-center gap-2 font-serif text-xl text-foreground">
            <Sprout className="h-5 w-5 text-primary" aria-hidden="true" /> Den här veckan i zon {zone} (v.{week})
          </h2>
          {now.length ? (
            <div className="space-y-2">
              {now.map((group) => (
                <p key={group.label} className="text-sm">
                  <span className="font-semibold">{group.label}:</span>{' '}
                  {group.crops.map((crop, i) => (
                    <span key={crop.name}>
                      {i > 0 && ', '}
                      <Link to={`${SATIDER_PATH}/${cropSlug(crop.name)}`} className={`hover:underline ${crop.closesNow ? 'font-medium text-destructive' : 'text-primary'}`}>
                        {crop.name.toLowerCase()}{crop.closesNow ? ' (sista veckan)' : ''}
                      </Link>
                    </span>
                  ))}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Inget att så just nu i zon {zone}. Ett bra läge att planera nästa säsong.</p>
          )}
        </section>

        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.category} aria-labelledby={`cat-${group.category}`}>
              <h2 id={`cat-${group.category}`} className="mb-3 font-serif text-2xl text-foreground">{group.title}</h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.crops.map((crop) => (
                  <li key={crop.slug}>
                    <Link to={`${SATIDER_PATH}/${crop.slug}`} className="block rounded-xl border border-border/60 bg-card/60 p-3 transition-colors hover:border-primary/40">
                      <span className="block font-medium text-foreground">Såtider för {crop.name.toLowerCase()}</span>
                      <span className="block text-xs text-muted-foreground">Zon {zone}: {crop.summary}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section aria-labelledby="subscribe-heading" className="mt-12 rounded-2xl border border-border/60 p-5">
          <h2 id="subscribe-heading" className="mb-1 flex items-center gap-2 font-serif text-lg text-foreground">
            <CalendarPlus className="h-5 w-5 text-primary" aria-hidden="true" /> Få såtiderna för zon {zone} i din kalender
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">Gratis prenumeration – en påminnelse varje vecka där något ska förodlas, sås eller planteras ut. Inget konto behövs.</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <a href={calendar.google} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border/70 px-3 py-1.5 hover:border-primary/40">Google Kalender</a>
            <a href={calendar.webcal} className="rounded-full border border-border/70 px-3 py-1.5 hover:border-primary/40">Apple Kalender / iPhone</a>
            <a href={calendar.https} className="rounded-full border border-border/70 px-3 py-1.5 hover:border-primary/40">Ladda ner .ics</a>
          </div>
        </section>

        <CalendarCrossLink className="mt-8" />
      </div>
    </PublicLayout>
  );
}
