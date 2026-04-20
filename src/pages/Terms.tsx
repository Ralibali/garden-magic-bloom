import React from 'react';
import { Seo } from '@/hooks/useSeo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
      <Seo
        title="Användarvillkor & Integritetspolicy | Odlingsdagboken"
        description="Läs Odlingsdagbokens användarvillkor och integritetspolicy. Information om dataskydd, cookies och dina rättigheter."
        path="/terms"
        jsonLd={[
          {
            '@type': 'WebPage',
            name: 'Användarvillkor & Integritetspolicy',
            url: 'https://odlingsdagboken.com/terms',
            isPartOf: { '@id': 'https://odlingsdagboken.com/#website' },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://odlingsdagboken.com' },
              { '@type': 'ListItem', position: 2, name: 'Villkor', item: 'https://odlingsdagboken.com/terms' },
            ],
          },
        ]}
      />
      <Button variant="ghost" size="sm" className="mb-4 gap-1.5 rounded-xl" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Tillbaka
      </Button>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6 sm:p-8 prose prose-sm max-w-none">
          <h1 className="font-serif text-2xl sm:text-3xl text-foreground mb-1">Användarvillkor & Integritetspolicy</h1>
          <p className="text-xs text-muted-foreground mb-6">odlingsdagboken.com | Senast uppdaterad: 2026-03-07</p>

          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">1. Allmänt</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Dessa villkor gäller när du skapar ett konto och använder tjänsten odlingsdagboken.com ("vi", "oss", "tjänsten").
            Genom att registrera dig bekräftar du att du har läst, förstått och godkänt dessa villkor.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Du måste vara minst 16 år gammal för att använda tjänsten. Om du är under 18 år krävs målsmans godkännande.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Villkoren gäller tills vidare och kan uppdateras. Du meddelas vid väsentliga förändringar.
          </p>

          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">2. Personuppgifter & GDPR</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Vi behandlar dina personuppgifter i enlighet med EU:s dataskyddsförordning (GDPR) samt den svenska dataskyddslagen (2018:218).
          </p>

          <h3 className="font-serif text-base text-foreground mt-4 mb-1">Vilka uppgifter vi samlar in:</h3>
          <ul className="text-sm text-foreground space-y-1 list-disc pl-5">
            <li>Namn och e-postadress vid registrering</li>
            <li>Uppgifter du själv lämnar i tjänsten (odlingsdata, sådder, skördar, ekonomi)</li>
            <li>Tekniska data (t.ex. IP-adress, enhetstyp, cookies)</li>
          </ul>

          <h3 className="font-serif text-base text-foreground mt-4 mb-1">Rättslig grund för behandlingen:</h3>
          <ul className="text-sm text-foreground space-y-1 list-disc pl-5">
            <li><strong>Avtal</strong> – för att kunna tillhandahålla tjänsten du registrerat dig för</li>
            <li><strong>Samtycke</strong> – för marknadsföring och nyhetsbrev</li>
            <li><strong>Berättigat intresse</strong> – för säkerhet, felsökning och förbättring av tjänsten</li>
          </ul>

          <h3 className="font-serif text-base text-foreground mt-4 mb-1">Dina rättigheter enligt GDPR:</h3>
          <ul className="text-sm text-foreground space-y-1 list-disc pl-5">
            <li>Rätt till tillgång – du kan begära ett utdrag av dina uppgifter</li>
            <li>Rätt till rättelse – du kan korrigera felaktiga uppgifter</li>
            <li>Rätt till radering ("rätten att bli glömd") – du kan radera ditt konto och all data via Inställningar</li>
            <li>Rätt till dataportabilitet – exportera dina uppgifter som CSV via Inställningar</li>
            <li>Rätt att invända mot behandling</li>
            <li>Rätt att återkalla samtycke när som helst</li>
          </ul>
          <p className="text-sm text-foreground leading-relaxed mt-2">
            Du kan utöva rätten till radering och dataportabilitet direkt i appen under Inställningar. För övriga förfrågningar, kontakta oss på: <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a>
          </p>

          <h3 className="font-serif text-base text-foreground mt-4 mb-1">Personuppgiftsansvarig:</h3>
          <p className="text-sm text-foreground leading-relaxed">
            Odlingsdagboken / odlingsdagboken.com<br />
            E-post: <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a><br />
            Du har rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY): <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.imy.se</a>
          </p>

          <h3 className="font-serif text-base text-foreground mt-4 mb-1">Tredjeparter & Underbiträden:</h3>
          <p className="text-sm text-foreground leading-relaxed">
            Vi använder följande tjänsteleverantörer för att driva appen. Dina uppgifter kan överföras till dessa:
          </p>
          <ul className="text-sm text-foreground space-y-1 list-disc pl-5">
            <li><strong>Lovable Cloud</strong> (databas, autentisering, backend) – EU/EES</li>
            <li><strong>Stripe</strong> (betalningshantering) – USA, med EU Standard Contractual Clauses</li>
            <li><strong>AI-tjänst (Lovable AI)</strong> – Odlingscoachen "Gro" använder AI för att ge personliga råd. Din odlingsdata (bäddar, sådder, skördar, krukväxter, klimatzon) skickas till AI-modellen för att generera tips. Ingen data lagras av AI-tjänsten utanför sessionen. Rättslig grund: berättigat intresse (förbättring av tjänsten).</li>
          </ul>

          <h3 className="font-serif text-base text-foreground mt-4 mb-1">AI-behandling:</h3>
          <p className="text-sm text-foreground leading-relaxed">
            Funktionen "Gro" (Odlingscoachen) analyserar din odlingsdata i realtid med hjälp av AI för att ge dig personliga odlingsråd. 
            Data som behandlas inkluderar: namn, klimatzon, bäddar, sådder, skördar och krukväxter. 
            AI-genererade svar lagras inte – varje session börjar från noll. Du kan välja att inte använda funktionen.
          </p>

          <h3 className="font-serif text-base text-foreground mt-4 mb-1">Lagringstid:</h3>
          <p className="text-sm text-foreground leading-relaxed">
            Dina uppgifter lagras så länge ditt konto är aktivt eller så länge det krävs enligt lag.
            Vid avslut av konto raderas personuppgifter inom 30 dagar, om inget annat krävs enligt lag.
          </p>

          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">3. E-postkommunikation & Marknadsföring</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Genom att godkänna villkoren ger du ditt samtycke till att odlingsdagboken.com får kontakta dig via e-post med:
          </p>
          <ul className="text-sm text-foreground space-y-1 list-disc pl-5">
            <li><strong>Nyhetsbrev</strong> – nyheter, tips och inspiration om grönsaksodling</li>
            <li><strong>Erbjudanden</strong> – kampanjer, rabatter och relevanta produkter</li>
            <li><strong>Produktuppdateringar</strong> – information om nya funktioner och förbättringar</li>
          </ul>
          <p className="text-sm text-foreground leading-relaxed mt-2">
            Du kan när som helst avprenumerera via avprenumerationslänken i varje utskick eller genom att kontakta oss direkt.
          </p>

          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">4. Cookies</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Vi använder cookies och liknande tekniker för att tjänsten ska fungera korrekt.
            Cookies för analys och marknadsföring används endast efter ditt samtycke.
            Du kan hantera cookieinställningar i din webbläsare.
          </p>

          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">5. Säkerhet</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Vi vidtar tekniska och organisatoriska åtgärder för att skydda dina personuppgifter.
            Du ansvarar för att hålla ditt lösenord hemligt.
          </p>

          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">6. Ansvarsbegränsning</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Tjänsten tillhandahålls "i befintligt skick". Vi garanterar inte oavbruten eller felfri drift.
            odlingsdagboken.com ansvarar inte för indirekt skada, utebliven vinst eller dataförlust.
          </p>

          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">7. Tillämplig lag & Tvistelösning</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Dessa villkor regleras av svensk lag.
            Tvister kan hänskjutas till Allmänna reklamationsnämnden (ARN) eller allmän domstol i Sverige.
          </p>

          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">8. Kontakt</h2>
          <p className="text-sm text-foreground leading-relaxed">
            odlingsdagboken.com<br />
            E-post: <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a><br />
            Webbplats: <a href="https://www.odlingsdagboken.com" className="text-primary hover:underline">www.odlingsdagboken.com</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
