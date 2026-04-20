import { Seo } from '@/hooks/useSeo';
import PublicLayout from '@/components/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Building2, Sprout, Leaf, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function OmOss() {
  return (
    <PublicLayout>
      <Seo
        title="Om Aurora Media AB & Odlingsdagboken | Teamet bakom"
        description="Möt Christoffer och teamet bakom Odlingsdagboken. Aurora Media AB (org.nr 559272-0220) bygger digitala verktyg för svenska hobbyodlare."
        path="/om-oss"
        jsonLd={[
          {
            '@type': 'Organization',
            name: 'Aurora Media AB',
            legalName: 'Aurora Media AB',
            url: 'https://odlingsdagboken.com',
            email: 'info@auroramedia.se',
            taxID: '559272-0220',
            description: 'Aurora Media AB utvecklar Odlingsdagboken – Sveriges digitala odlingsdagbok för hobbyodlare.',
            address: { '@type': 'PostalAddress', addressCountry: 'SE' },
          },
          {
            '@type': 'AboutPage',
            name: 'Om Odlingsdagboken',
            url: 'https://odlingsdagboken.com/om-oss',
            inLanguage: 'sv-SE',
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://odlingsdagboken.com' },
              { '@type': 'ListItem', position: 2, name: 'Om oss' },
            ],
          },
        ]}
      />

      <article className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium mb-4">
            <Heart className="h-3.5 w-3.5" /> Vårt uppdrag
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif text-foreground mb-4 leading-tight">
            Bakom Odlingsdagboken
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Vi bygger digitala verktyg som hjälper svenska hobbyodlare att lyckas – från första sådden till sista skörden.
          </p>
        </header>

        <section className="prose prose-lg max-w-none mb-12">
          <h2 className="font-serif text-2xl text-foreground mb-3">Vår historia</h2>
          <p className="text-foreground/85 leading-relaxed mb-4">
            Odlingsdagboken startade som ett personligt projekt av Christoffer, grundaren av Aurora Media AB.
            Efter flera säsonger med kalkylblad, anteckningsböcker och glömda såtider blev det tydligt att svenska hobbyodlare
            saknar ett verktyg som faktiskt förstår våra åtta klimatzoner, korta säsong och unika utmaningar.
          </p>
          <p className="text-foreground/85 leading-relaxed mb-4">
            I dag används appen av tusentals odlare – från Skåne till Norrbotten – för att planera bäddar, logga skördar,
            få väderbaserade tips och prata med vår AI-coach Gro.
          </p>

          <h2 className="font-serif text-2xl text-foreground mt-10 mb-3">Vad vi tror på</h2>
          <ul className="space-y-3 list-none pl-0">
            <li className="flex gap-3">
              <Leaf className="h-5 w-5 text-primary shrink-0 mt-1" />
              <div>
                <strong className="text-foreground">Riktig kunskap för riktiga trädgårdar.</strong>
                <p className="text-muted-foreground text-base mt-1">
                  Allt innehåll är anpassat efter svenska odlingsförhållanden – inte amerikanska zoner eller engelska säsonger.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Sprout className="h-5 w-5 text-primary shrink-0 mt-1" />
              <div>
                <strong className="text-foreground">Ett enkelt verktyg som växer med dig.</strong>
                <p className="text-muted-foreground text-base mt-1">
                  Allt från första pallkragen till en hel köksträdgård får plats i samma dagbok.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Heart className="h-5 w-5 text-primary shrink-0 mt-1" />
              <div>
                <strong className="text-foreground">Hållbart, transparent, svenskt.</strong>
                <p className="text-muted-foreground text-base mt-1">
                  Inga mörka mönster, ingen datahandel. Bara ett verktyg du kan lita på.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <Card className="border-border/50 mb-12">
          <CardContent className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-xl text-foreground m-0">Företagsuppgifter</h2>
            </div>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Bolag</dt>
                <dd className="font-medium text-foreground">Aurora Media AB</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Organisationsnummer</dt>
                <dd className="font-medium text-foreground">559272-0220</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Land</dt>
                <dd className="font-medium text-foreground">Sverige</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Kontakt</dt>
                <dd>
                  <a href="mailto:info@auroramedia.se" className="font-medium text-primary inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> info@auroramedia.se
                  </a>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="text-center bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-2xl p-8 border border-border/30">
          <span className="text-3xl mb-3 block">🌱</span>
          <h2 className="font-serif text-xl text-foreground mb-2">Bli en del av odlargemenskapen</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            Skapa din gratis odlingsdagbok och lyckas bättre i trädgården.
          </p>
          <Link to="/login">
            <Button size="lg" className="rounded-xl gap-2">
              <Sprout className="h-4 w-4" /> Skapa konto
            </Button>
          </Link>
        </div>
      </article>
    </PublicLayout>
  );
}
