import React from 'react';
import { Seo } from '@/hooks/useSeo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LAST_UPDATED = '2026-07-12';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
      <Seo
        title="Användarvillkor & Integritetspolicy | Odlingsdagboken"
        description="Odlingsdagbokens användarvillkor, integritetspolicy, cookiepolicy, ångerrätt och AI-transparens enligt GDPR, LEK, distansavtalslagen, DSA och EU:s AI-förordning."
        path="/terms"
        jsonLd={[
          {
            '@type': 'WebPage',
            name: 'Användarvillkor & Integritetspolicy',
            url: 'https://odlingsdagboken.com/terms',
            isPartOf: { '@id': 'https://odlingsdagboken.com/#website' },
            dateModified: LAST_UPDATED,
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
          <p className="text-xs text-muted-foreground mb-2">odlingsdagboken.com · Senast uppdaterad: {LAST_UPDATED}</p>
          <p className="text-xs text-muted-foreground mb-6">
            Detta dokument utgör både (A) användarvillkor, (B) integritetspolicy enligt GDPR art. 13–14,
            (C) cookiepolicy enligt lagen om elektronisk kommunikation (LEK/2022:482),
            (D) konsumentinformation enligt distansavtalslagen (2005:59) och lagen om digitala tjänster,
            (E) transparensinformation enligt EU:s AI-förordning (2024/1689), samt
            (F) kontaktpunktsinformation enligt EU:s förordning om digitala tjänster (DSA, 2022/2065).
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">1. Tjänsteleverantör</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Tjänsten Odlingsdagboken (”tjänsten”, ”appen”, ”vi”, ”oss”) tillhandahålls av Aurora Media.<br />
            Kontakt: <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a><br />
            Webbplats: <a href="https://www.odlingsdagboken.com" className="text-primary hover:underline">www.odlingsdagboken.com</a>
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Aurora Media är personuppgiftsansvarig för behandlingen av personuppgifter i tjänsten och
            fungerar som <em>kontaktpunkt</em> enligt DSA för myndigheter och användare via samma e-postadress.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">2. Användarvillkor</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Genom att skapa ett konto godkänner du dessa villkor. Villkoren gäller tills vidare och kan uppdateras.
            Vid väsentliga ändringar informeras du minst 30 dagar i förväg via e-post eller i appen, och du kan säga upp
            kontot utan kostnad innan ändringen träder i kraft.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Du måste vara minst 16 år för att registrera dig. Är du under 18 år krävs målsmans godkännande.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Du ansvarar för att uppgifter du lämnar är korrekta och för allt som sker via ditt konto. Otillåten användning
            (t.ex. intrångsförsök, skrapning, spridning av olagligt eller stötande innehåll, hets mot folkgrupp, upphovsrättsintrång)
            är förbjuden och kan leda till att kontot stängs av utan återbetalning.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">3. Prenumeration, pris och betalning</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Grundfunktionerna är gratis. Odlingsdagboken Plus kostar 99 kr per år inklusive moms och förnyas automatiskt
            årligen tills du säger upp. Betalning sker via Stripe och stöder kort, Klarna och Swish. Du kan säga upp
            förnyelsen när som helst via Inställningar – tillgången till Plus finns kvar till periodens slut.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Priser anges i svenska kronor inklusive moms. Om moms eller lagstadgade avgifter ändras kan priset justeras
            från nästa förnyelse.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">4. Ångerrätt (distansavtalslagen 2005:59)</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Som konsument har du 14 dagars ångerrätt från det att avtalet ingicks. Vill du ångra dig, kontakta
            <a href="mailto:info@auroramedia.se" className="text-primary hover:underline"> info@auroramedia.se</a> inom
            14 dagar. Standardformulär finns hos Konsumentverket.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            <strong>Viktigt om digitala tjänster:</strong> Odlingsdagboken Plus levereras som en digital tjänst omedelbart efter köp.
            Vid beställning samtycker du uttryckligen till att leveransen påbörjas direkt och bekräftar att du därigenom
            förlorar ångerrätten så snart tjänsten fullgjorts (2 kap. 11 § distansavtalslagen). Har tjänsten bara delvis
            fullgjorts när du ångrar dig återbetalas den del av avgiften som motsvarar oanvänd tid.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">5. Personuppgifter & GDPR</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Vi behandlar personuppgifter i enlighet med EU:s dataskyddsförordning (GDPR, 2016/679) och svenska dataskyddslagen (2018:218).
          </p>

          <h3 className="font-serif text-base text-foreground mt-4 mb-1">5.1 Vilka uppgifter vi behandlar</h3>
          <ul className="text-sm text-foreground space-y-1 list-disc pl-5">
            <li><strong>Kontouppgifter:</strong> e-postadress, valfritt namn och lösenord (hashat).</li>
            <li><strong>Odlingsdata:</strong> bäddar, sådder, skördar, vattningar, foton, krukväxter, klimatzon, plats (vald ort för väder).</li>
            <li><strong>Betalningsdata:</strong> prenumerationsstatus och kund-ID hos Stripe. Fullständiga kortuppgifter hanteras enbart av Stripe.</li>
            <li><strong>Tekniska data:</strong> IP-adress, enhets- och webbläsartyp, händelseloggar för säkerhet och felsökning.</li>
            <li><strong>Statistik:</strong> anonymiserad användningsstatistik – endast efter cookie-samtycke.</li>
            <li><strong>Kommunikation:</strong> mejl du skickar till oss och supportärenden.</li>
          </ul>

          <h3 className="font-serif text-base text-foreground mt-4 mb-1">5.2 Rättslig grund</h3>
          <ul className="text-sm text-foreground space-y-1 list-disc pl-5">
            <li><strong>Avtal (art. 6.1.b):</strong> tillhandahålla, drifta och fakturera tjänsten.</li>
            <li><strong>Rättslig förpliktelse (art. 6.1.c):</strong> bokförings-, skatte- och konsumentlagstiftning.</li>
            <li><strong>Berättigat intresse (art. 6.1.f):</strong> säkerhet, missbruksskydd, produktförbättring, direkta produktutskick till befintliga kunder.</li>
            <li><strong>Samtycke (art. 6.1.a):</strong> icke-nödvändiga cookies, statistik, nyhetsbrev och AI-genererade råd. Kan återkallas när som helst.</li>
          </ul>

          <h3 className="font-serif text-base text-foreground mt-4 mb-1">5.3 Lagringstider</h3>
          <ul className="text-sm text-foreground space-y-1 list-disc pl-5">
            <li>Kontodata: så länge kontot är aktivt. Vid radering: borttag inom 30 dagar.</li>
            <li>Bokföringsunderlag (fakturor via Stripe): 7 år enligt bokföringslagen (1999:1078).</li>
            <li>Säkerhets- och åtkomstloggar: högst 12 månader.</li>
            <li>Cookie-samtycken: 12 månader eller tills du återkallar dem.</li>
            <li>Supportmejl: högst 24 månader efter avslutat ärende.</li>
          </ul>

          <h3 className="font-serif text-base text-foreground mt-4 mb-1">5.4 Dina rättigheter</h3>
          <ul className="text-sm text-foreground space-y-1 list-disc pl-5">
            <li>Rätt till <strong>information och tillgång</strong> (art. 15).</li>
            <li>Rätt till <strong>rättelse</strong> (art. 16) – ändra profil och uppgifter i appen.</li>
            <li>Rätt till <strong>radering</strong> (art. 17) – kan utföras direkt under Inställningar → Radera konto.</li>
            <li>Rätt till <strong>begränsning</strong> (art. 18) och <strong>invändning</strong> (art. 21) mot behandling som stöds av berättigat intresse.</li>
            <li>Rätt till <strong>dataportabilitet</strong> (art. 20) – exportera din data som CSV/PDF/JSON via Inställningar.</li>
            <li>Rätt att <strong>återkalla samtycke</strong> när som helst utan att det påverkar tidigare laglig behandling.</li>
            <li>Rätt att inte omfattas av helt automatiserat beslutsfattande med rättslig verkan – något sådant beslutsfattande sker inte i tjänsten.</li>
            <li>Rätt att <strong>lämna klagomål</strong> till <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Integritetsskyddsmyndigheten (IMY)</a>.</li>
          </ul>
          <p className="text-sm text-foreground leading-relaxed mt-2">
            Kontakta oss på <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a> för att utöva dina rättigheter. Vi svarar utan onödigt dröjsmål, senast inom 30 dagar.
          </p>

          <h3 className="font-serif text-base text-foreground mt-4 mb-1">5.5 Överföring utanför EU/EES</h3>
          <p className="text-sm text-foreground leading-relaxed">
            Data lagras i huvudsak inom EU/EES. Vissa underbiträden (t.ex. Stripe) kan behandla data i USA. Överföring
            sker då med EU-kommissionens standardavtalsklausuler (SCC) samt kompletterande skyddsåtgärder enligt Schrems II-domen.
          </p>

          <h3 className="font-serif text-base text-foreground mt-4 mb-1">5.6 Personuppgiftsincident</h3>
          <p className="text-sm text-foreground leading-relaxed">
            Vid personuppgiftsincident som kan innebära risk för dina rättigheter anmäler vi den till IMY inom 72 timmar
            och informerar dig utan onödigt dröjsmål.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">6. Underbiträden</h2>
          <p className="text-sm text-foreground leading-relaxed">
            För att kunna leverera tjänsten anlitar vi följande personuppgiftsbiträden. Skriftliga biträdesavtal enligt
            GDPR art. 28 finns med samtliga.
          </p>
          <ul className="text-sm text-foreground space-y-1 list-disc pl-5">
            <li><strong>Lovable Cloud</strong> – databas, autentisering, filsäkerhet, edge-funktioner. EU/EES.</li>
            <li><strong>Stripe Payments Europe</strong> – betalning, kortdata, fakturor. Irland/USA (SCC).</li>
            <li><strong>Brevo (Sendinblue)</strong> – nyhetsbrev och marknadsutskick, endast efter samtycke. EU.</li>
            <li><strong>Resend</strong> – transaktionsmejl (kontobekräftelser, återställning). EU/USA (SCC).</li>
            <li><strong>Lovable AI Gateway (Google Gemini)</strong> – AI-coachen ”Gro” samt eventuell foto-observationshjälp. EU-region, ingen träning på dina data.</li>
            <li><strong>Open-Meteo</strong> – väderprognos utifrån vald ort/klimatzon. EU.</li>
            <li><strong>Firecrawl</strong> – uppslag av produktinformation för affiliatelänkar (endast produktsidor, inga användardata skickas). EU/USA (SCC).</li>
          </ul>
          <p className="text-sm text-foreground leading-relaxed">
            Om vi byter underbiträde med tillgång till personuppgifter meddelar vi det via appen eller mejl i förväg.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">7. Cookies och liknande tekniker (LEK 2022:482)</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Vi använder cookies och lokal lagring i följande kategorier:
          </p>
          <ul className="text-sm text-foreground space-y-1 list-disc pl-5">
            <li><strong>Nödvändiga</strong> – inloggning, säkerhet, cookie-samtycke. Kräver inte samtycke.</li>
            <li><strong>Statistik</strong> – anonymiserad besöks- och funktionsstatistik. Aktiveras endast om du samtycker.</li>
            <li><strong>Marknadsföring</strong> – används inte i dagsläget; om detta införs ber vi om separat samtycke.</li>
          </ul>
          <p className="text-sm text-foreground leading-relaxed">
            Du kan när som helst ändra ditt val genom att rensa cookies i webbläsaren – bannern visas då på nytt. Utan
            samtycke visas endast innehåll och funktioner som är strikt nödvändiga.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">8. AI-funktioner – transparens enligt EU:s AI-förordning</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Tjänsten innehåller AI-genererat innehåll. Enligt art. 50 i AI-förordningen (EU 2024/1689) informerar vi tydligt om detta.
          </p>
          <ul className="text-sm text-foreground space-y-1 list-disc pl-5">
            <li>
              <strong>Odlingscoachen Gro</strong> använder en generativ språkmodell (Google Gemini via Lovable AI Gateway) för att
              ge personliga råd baserat på din odlingsdata (bäddar, sådder, skördar, krukväxter, klimatzon). Svaren kan innehålla fel
              och ska inte betraktas som professionell rådgivning. Du kan välja att inte använda funktionen.
            </li>
            <li>
              <strong>Foto-observationshjälp</strong> (om aktiverad) analyserar en uppladdad växtbild för att föreslå möjliga observationer.
              Detta är <em>ingen diagnos</em>, kan vara felaktigt och ersätter inte fackmässig växtskyddsbedömning. Bilden skickas krypterat
              till AI-leverantören, används inte för modellträning och lagras inte utanför sessionen.
            </li>
            <li>Inget beslut som har rättslig verkan för dig fattas automatiskt av AI.</li>
            <li>AI-modellernas leverantörer får inte använda dina uppmaningar eller data för att träna sina modeller.</li>
          </ul>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">9. Användargenererat innehåll och immateriella rättigheter</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Du behåller alla rättigheter till text, foton och data du laddar upp. Du ger oss en icke-exklusiv, kostnadsfri licens att
            lagra, visa och tekniskt bearbeta ditt innehåll enbart i syfte att drifta tjänsten åt dig. Innehållet är privat som utgångspunkt –
            det delas bara när du själv aktivt delar en profil eller ett inlägg.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Programvaran, designen, texterna och guiderna på odlingsdagboken.com skyddas av upphovsrätt och får inte kopieras utan tillstånd.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">10. Affiliatelänkar och sponsring</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Vissa artiklar och produkttips innehåller affiliatelänkar. Om du köper via länken kan vi få en liten ersättning – utan extra kostnad för dig.
            Ersättningen påverkar inte vilka produkter vi rekommenderar. Detta uppfyller informationsplikten enligt marknadsföringslagen (2008:486).
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">11. Anmäl olagligt innehåll (DSA)</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Enligt EU:s förordning om digitala tjänster (DSA) kan du anmäla innehåll du anser vara olagligt genom att mejla
            <a href="mailto:info@auroramedia.se" className="text-primary hover:underline"> info@auroramedia.se</a>. Ange exakt URL, en beskrivning av
            varför innehållet är olagligt samt dina kontaktuppgifter. Vi bekräftar mottagandet utan onödigt dröjsmål och fattar
            beslut samt informerar berörda parter enligt art. 16–17 DSA. Beslut kan överklagas till oss inom sex månader.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">12. E-post och marknadsföring</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Vi skickar transaktionsmejl (t.ex. kontobekräftelse, kvitton, säkerhetsvarningar) med stöd av avtalet.
            Nyhetsbrev och erbjudanden skickas endast till dig som samtyckt eller är befintlig kund enligt undantaget för
            liknande produkter i marknadsföringslagen 19 §. Du kan när som helst avregistrera dig via länken i varje utskick.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">13. Säkerhet</h2>
          <p className="text-sm text-foreground leading-relaxed">
            All trafik krypteras med TLS. Lösenord lagras hashade. Bilder ligger i privat lagring med signerade tidsbegränsade
            länkar. Databasen skyddas med radnivåsäkerhet (RLS) så att varje användare endast når sin egen data. Du ansvarar
            för att hålla ditt lösenord hemligt och rekommenderas välja ett unikt starkt lösenord på minst åtta tecken.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">14. Ansvarsbegränsning</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Tjänsten tillhandahålls i befintligt skick. Odlingsråd, prognoser och AI-svar är vägledande. Vi ansvarar inte för
            uteblivna skördar, ekonomisk skada eller indirekt skada. Konsumenträttigheter enligt tvingande lag begränsas inte.
            Vårt totala ansvar under ett kalenderår är begränsat till erlagd avgift under samma år.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">15. Tvistelösning</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Svensk lag tillämpas. Är du missnöjd, kontakta oss först. Tvist kan därefter prövas av
            <a href="https://www.arn.se" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"> Allmänna reklamationsnämnden (ARN)</a>,
            Box 174, 101 23 Stockholm, eller av allmän domstol.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            EU-kommissionens plattform för tvistlösning online (ODR) finns på
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"> ec.europa.eu/consumers/odr</a>.
          </p>

          {/* ---------------------------------------------------------------- */}
          <h2 className="font-serif text-lg text-foreground mt-6 mb-2">16. Kontakt</h2>
          <p className="text-sm text-foreground leading-relaxed">
            Aurora Media / Odlingsdagboken<br />
            E-post: <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a><br />
            Webbplats: <a href="https://www.odlingsdagboken.com" className="text-primary hover:underline">www.odlingsdagboken.com</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
