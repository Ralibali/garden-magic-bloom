import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, MapPin, Search, Snowflake } from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Seo } from '@/hooks/useSeo';
import { useAuth } from '@/hooks/useAuth';
import { useOdlingszon } from '@/hooks/useOdlingszon';
import { registerUrl } from '@/lib/authReturn';
import { buildFrostGuide, FROST_PATH, frostForPlace, frostGuideJsonLd } from '@/lib/frostGuide';
import { SATIDER_PATH } from '@/lib/sowingGuide';

export default function SistaFrost() {
  const guide = useMemo(() => buildFrostGuide(), []);
  const { isAuthenticated } = useAuth();
  const { zone, setZone } = useOdlingszon(3);
  const [query, setQuery] = useState('');
  const hit = query.trim() ? frostForPlace(query, guide.year) : null;
  const searched = query.trim().length >= 3;
  const alertHref = isAuthenticated ? '/app/settings' : registerUrl({ source: 'sista-frost', returnTo: '/app/settings', zone });

  return (
    <PublicLayout>
      <Seo title={guide.title} description={guide.description} path={FROST_PATH} jsonLd={frostGuideJsonLd(guide)} />

      <article className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <nav aria-label="Brödsmulor" className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Odlingsdagboken</Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">Sista frost</span>
        </nav>

        <header className="mb-8">
          <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Snowflake className="h-3.5 w-3.5" aria-hidden="true" /> Frostkalender {guide.year}
          </p>
          <h1 className="mb-4 font-serif text-4xl leading-tight text-foreground sm:text-5xl">{guide.h1}</h1>
          <p className="text-lg leading-relaxed text-foreground/85" data-testid="quick-answer">{guide.quickAnswer}</p>
        </header>

        <section aria-labelledby="search-heading" className="mb-10 rounded-2xl border border-primary/25 bg-primary/[0.05] p-5">
          <h2 id="search-heading" className="mb-3 font-serif text-xl text-foreground">Sök din ort</h2>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              list="frost-places"
              placeholder="T.ex. Umeå, Malmö, Västerås"
              aria-label="Ort"
              className="pl-9"
            />
            <datalist id="frost-places">
              {guide.places.map((p) => <option key={p.place} value={p.place} />)}
            </datalist>
          </div>
          {hit ? (
            <div className="mt-4 space-y-1 text-sm" role="status">
              <p className="text-base font-semibold text-foreground">{hit.place} ligger i odlingszon {hit.zone} ({hit.region}).</p>
              <p>Sista frost normalt: <strong>vecka {hit.lastFrostWeek}</strong> ({hit.lastFrostDates}).</p>
              <p>Första höstfrost normalt: <strong>vecka {hit.firstFrostWeek}</strong> ({hit.firstFrostDates}).</p>
              <p>Frostkänsliga plantor ut tidigast: <strong>vecka {hit.plantOutWeek}</strong>. Frostfri säsong: cirka {hit.frostFreeWeeks} veckor.</p>
              {hit.zone !== zone && (
                <Button variant="link" className="h-auto p-0" onClick={() => setZone(hit.zone)}>Spara zon {hit.zone} som min zon på sajten</Button>
              )}
            </div>
          ) : searched ? (
            <p className="mt-4 text-sm text-muted-foreground" role="status">
              Vi har ingen uppgift om orten. Välj den närmaste större orten i listan, eller <Link to="/zoner" className="text-primary hover:underline">hitta din zon på kartan</Link>.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="zones-heading" className="mb-10">
          <h2 id="zones-heading" className="mb-3 font-serif text-2xl text-foreground">Sista och första frost per odlingszon</h2>
          <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card/70">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Normal sista vårfrost och första höstfrost per zon {guide.year}</caption>
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3">Zon</th>
                  <th scope="col" className="p-3">Sista vårfrost</th>
                  <th scope="col" className="p-3">Första höstfrost</th>
                  <th scope="col" className="p-3">Frostfritt</th>
                  <th scope="col" className="p-3">Tomater ut</th>
                </tr>
              </thead>
              <tbody>
                {guide.rows.map((row) => (
                  <tr key={row.zone} className={`border-t border-border/50 ${row.zone === zone ? 'bg-primary/[0.07]' : ''}`}>
                    <th scope="row" className="p-3 text-left align-top font-normal">
                      <span className="block font-semibold text-foreground">Zon {row.zone}</span>
                      <span className="block text-xs text-muted-foreground">{row.places.slice(0, 3).join(', ')}</span>
                    </th>
                    <td className="p-3 align-top"><span className="block font-medium">v.{row.lastFrostWeek}</span><span className="text-xs text-muted-foreground">{row.lastFrostDates}</span></td>
                    <td className="p-3 align-top"><span className="block font-medium">v.{row.firstFrostWeek}</span><span className="text-xs text-muted-foreground">{row.firstFrostDates}</span></td>
                    <td className="p-3 align-top">ca {row.frostFreeWeeks} veckor</td>
                    <td className="p-3 align-top">från v.{row.plantOutWeek}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Normalvärden för ett genomsnittligt år, datum för {guide.year}. Lokalt läge kan skilja en till två veckor åt båda hållen.</p>
        </section>

        <section className="mb-10 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/6 via-card to-accent/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="mb-1 flex items-center gap-2 font-serif text-xl text-foreground"><BellRing className="h-5 w-5 text-primary" aria-hidden="true" /> Få frostvarning innan det är för sent</h2>
            <p className="text-sm text-muted-foreground">Odlingsdagboken bevakar prognosen för din plats och varnar när en kall natt är på väg – och påminner om vilka plantor som står ute.</p>
          </div>
          <Button asChild className="shrink-0"><Link to={alertHref}>Slå på frostvarning <ArrowRight className="h-4 w-4" /></Link></Button>
        </section>

        <section aria-labelledby="places-heading" className="mb-10">
          <h2 id="places-heading" className="mb-3 font-serif text-2xl text-foreground">Sista frost ort för ort</h2>
          <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {guide.places.map((p) => (
              <li key={p.place} className="flex justify-between gap-2 border-b border-border/40 py-1.5">
                <span><MapPin className="mr-1 inline h-3 w-3 text-muted-foreground" aria-hidden="true" />{p.place} <span className="text-muted-foreground">(zon {p.zone})</span></span>
                <span className="text-muted-foreground">v.{p.lastFrostWeek} · {p.lastFrostDates}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="crops-heading" className="mb-10">
          <h2 id="crops-heading" className="mb-3 font-serif text-2xl text-foreground">Frostkänsliga grödor – när kan de ut?</h2>
          <div className="flex flex-wrap gap-2">
            {guide.crops.map((crop) => (
              <Link key={crop.slug} to={`${SATIDER_PATH}/${crop.slug}`} className="rounded-full border border-border/70 px-3 py-1.5 text-sm hover:border-primary/40">
                Såtider för {crop.name.toLowerCase()}
              </Link>
            ))}
            <Link to={SATIDER_PATH} className="rounded-full border border-border/70 px-3 py-1.5 text-sm text-primary hover:border-primary/40">Alla såtider</Link>
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="mb-10">
          <h2 id="faq-heading" className="mb-4 font-serif text-2xl text-foreground">Vanliga frågor om frost</h2>
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

        <p className="text-sm text-muted-foreground">
          Läs mer om <Link to="/zoner" className="text-primary hover:underline">Sveriges odlingszoner</Link> eller se <Link to="/odlingskalender" className="text-primary hover:underline">odlingskalendern månad för månad</Link>.
        </p>
      </article>
    </PublicLayout>
  );
}
