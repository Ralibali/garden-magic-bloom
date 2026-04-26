import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Bot, CalendarDays, CheckCircle2, ClipboardList, Droplets, Sprout } from 'lucide-react';

const MONTH_ACTIONS: Record<number, { title: string; text: string; actions: string[] }> = {
  1: { title: 'Planera lugnt – säsongen börjar här', text: 'Januari är perfekt för att välja grödor, kontrollera fröer och lägga grunden för en bättre odlingssäsong.', actions: ['Gör odlingsplan', 'Inventera fröer', 'Välj årets tomater'] },
  2: { title: 'Starta långsamma grödor', text: 'Chili, paprika och vissa perenner vill gärna komma igång tidigt om du har bra ljus.', actions: ['Förodla chili', 'Kontrollera extraljus', 'Planera bäddar'] },
  3: { title: 'Nu börjar odlingsåret på riktigt', text: 'Tomat, kål och många blommor kan startas nu. Men håll koll på ljuset – rangliga plantor är sällan starka plantor.', actions: ['Förodla tomat', 'Så kål', 'Planera utplantering'] },
  4: { title: 'Dags att växla upp', text: 'Många sådder kan startas i april. Direktså tåliga grödor och förbered plats för värmekrävande plantor.', actions: ['Direktså rädisor', 'Förodla gurka', 'Förbered bäddar'] },
  5: { title: 'Utplantering med fingertoppskänsla', text: 'Maj är fantastisk men lurig. Vänta med frostkänsliga plantor tills nätterna är stabila.', actions: ['Härda plantor', 'Kolla frostrisk', 'Plantera ut säkert'] },
  6: { title: 'Nu handlar det om skötsel', text: 'Vattning, gallring och stöd gör stor skillnad. Små insatser nu syns tydligt i skörden.', actions: ['Vattna jämnt', 'Gallra rader', 'Stöd tomater'] },
  7: { title: 'Skörda och följ upp', text: 'Logga skörden direkt när den händer. Det är nu du bygger kunskapen som gör nästa år bättre.', actions: ['Logga skörd', 'Så ny sallat', 'Följ upp bäddar'] },
  8: { title: 'Förläng säsongen', text: 'Sensommaren är perfekt för nya sådder, skörd och anteckningar om vad som fungerade.', actions: ['Så spenat', 'Logga skörd', 'Anteckna lärdomar'] },
  9: { title: 'Sammanfatta medan du minns', text: 'Skriv ner vad som fungerade innan detaljerna försvinner. Det här är nyckeln till smartare odling nästa år.', actions: ['Summera säsongen', 'Plantera vitlök', 'Spara frön'] },
  10: { title: 'Stäng säsongen smart', text: 'Rensa, täck jord och skriv ner dina lärdomar. Bra avslut ger bättre start nästa år.', actions: ['Täck bäddar', 'Summera skörd', 'Planera växtföljd'] },
  11: { title: 'Bygg kunskap inför nästa år', text: 'När tempot lugnar sig är det perfekt att jämföra skörd, bäddar och sorter.', actions: ['Jämför statistik', 'Planera rotation', 'Skriv önskelista'] },
  12: { title: 'Dröm, planera och förbättra', text: 'December är perfekt för att titta bakåt och bestämma vad du vill göra bättre nästa säsong.', actions: ['Se årsrapport', 'Välj fröer', 'Skapa plan'] },
};

interface DashboardActionCenterProps {
  climateZone: number;
  currentMonth: number;
  isNewUser: boolean;
  onNavigate: (path: string) => void;
}

export default function DashboardActionCenter({ climateZone, currentMonth, isNewUser, onNavigate }: DashboardActionCenterProps) {
  const month = MONTH_ACTIONS[currentMonth] || MONTH_ACTIONS[3];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/6 via-card to-accent/8 shadow-sm overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-5 lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="secondary" className="gap-1"><CalendarDays className="h-3.5 w-3.5" /> Den här veckan</Badge>
              <Badge variant="outline">Klimatzon {climateZone}</Badge>
              {isNewUser && <Badge className="bg-primary text-primary-foreground">Ny startplan</Badge>}
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-2">{isNewUser ? 'Din odlingsdagbok är redo – nu gör vi den användbar direkt' : month.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {isNewUser
                ? 'Börja med en odlingsplats, en första sådd och en tydlig veckoplan. När du har de tre sakerna på plats blir appen en riktig odlingsassistent – inte bara ett tomt arkiv.'
                : month.text}
            </p>
          </div>
          <div className="grid sm:grid-cols-3 lg:grid-cols-1 gap-2 lg:w-72">
            <Button className="justify-between gap-2" onClick={() => onNavigate(isNewUser ? '/app/beds' : '/app/calendar')}>
              {isNewUser ? 'Skapa första platsen' : 'Visa såkalender'} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-between gap-2" onClick={() => onNavigate(isNewUser ? '/app/sowings' : '/app/sowings')}>
              {isNewUser ? 'Logga första sådden' : 'Logga sådd'} <Sprout className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-between gap-2" onClick={() => onNavigate('/app/gro')}>
              Fråga Gro <Bot className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mt-5">
          {(isNewUser ? ['Skapa en odlingsplats', 'Lägg in första grödan', 'Kolla veckans råd'] : month.actions).map((action, index) => (
            <div key={action} className="rounded-2xl border border-border bg-background/70 p-3 flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {index === 0 ? <ClipboardList className="h-4 w-4" /> : index === 1 ? <Sprout className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{action}</p>
                <p className="text-xs text-muted-foreground">{index === 0 ? 'Viktigast först' : index === 1 ? 'Tar under en minut' : 'Bra att följa upp'}</p>
              </div>
            </div>
          ))}
        </div>

        {!isNewUser && (
          <div className="mt-5 rounded-2xl bg-primary/10 border border-primary/20 p-4 flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Proffstips:</strong> Logga små saker direkt – sådatum, väder, vattning och problem. Det är detaljerna som avslöjar varför nästa skörd blir bättre.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
