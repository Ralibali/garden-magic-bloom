import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, CalendarDays, CheckCircle2, ClipboardList, Droplets, Sprout, SunMedium } from 'lucide-react';

const MONTH_ACTIONS: Record<number, { title: string; text: string; actions: string[] }> = {
  1: { title: 'Planera lugnt – säsongen börjar här', text: 'Välj grödor, kontrollera fröer och skapa en tydlig grund för året.', actions: ['Gör odlingsplan', 'Inventera fröer', 'Välj årets sorter'] },
  2: { title: 'Starta de långsamma grödorna', text: 'Chili, paprika och vissa perenner mår bra av en tidig start med gott om ljus.', actions: ['Förodla chili', 'Kontrollera ljus', 'Planera bäddar'] },
  3: { title: 'Nu börjar odlingsåret på riktigt', text: 'Tomat, kål och många blommor kan startas nu. Prioritera starka, kompakta plantor.', actions: ['Förodla tomat', 'Så kål', 'Planera utplantering'] },
  4: { title: 'Dags att växla upp', text: 'Direktså tåliga grödor och förbered plats för de mer värmekrävande plantorna.', actions: ['Direktså rädisor', 'Förodla gurka', 'Förbered bäddar'] },
  5: { title: 'Utplantering med fingertoppskänsla', text: 'Härda plantorna och låt nattens temperatur styra mer än kalendern.', actions: ['Härda plantor', 'Kolla frostrisk', 'Plantera ut säkert'] },
  6: { title: 'Skötsel som ger utdelning', text: 'Jämn vattning, gallring och stöd är de små insatserna som bygger stor skörd.', actions: ['Vattna jämnt', 'Gallra rader', 'Stöd tomater'] },
  7: { title: 'Skörda och följ upp', text: 'Logga skörden medan den händer. Det är nu nästa års kunskap skapas.', actions: ['Logga skörd', 'Så ny sallat', 'Följ upp bäddar'] },
  8: { title: 'Förläng säsongen', text: 'Sensommaren passar både nya sådder och anteckningar om vad som fungerat.', actions: ['Så spenat', 'Logga skörd', 'Anteckna lärdomar'] },
  9: { title: 'Sammanfatta medan du minns', text: 'Fånga detaljerna nu – sorterna, platserna och besluten som gjorde skillnad.', actions: ['Summera säsongen', 'Plantera vitlök', 'Spara frön'] },
  10: { title: 'Stäng säsongen smart', text: 'Täck jorden, städa lagom och lämna tydliga anteckningar till ditt framtida jag.', actions: ['Täck bäddar', 'Summera skörd', 'Planera växtföljd'] },
  11: { title: 'Bygg kunskap inför nästa år', text: 'Jämför skörd, bäddar och sorter när tempot i trädgården har sjunkit.', actions: ['Jämför statistik', 'Planera rotation', 'Skriv önskelista'] },
  12: { title: 'Dröm, planera och förbättra', text: 'Titta bakåt och välj vad du vill göra enklare, bättre eller helt annorlunda.', actions: ['Se årsrapport', 'Välj fröer', 'Skapa plan'] },
};

interface DashboardActionCenterProps {
  climateZone: number;
  currentMonth: number;
  isNewUser: boolean;
  onNavigate: (path: string) => void;
}

export default function DashboardActionCenter({ climateZone, currentMonth, isNewUser, onNavigate }: DashboardActionCenterProps) {
  const month = MONTH_ACTIONS[currentMonth] || MONTH_ACTIONS[3];
  const monthLabel = new Intl.DateTimeFormat('sv-SE', { month: 'long' }).format(new Date()).replace(/^./, (letter) => letter.toUpperCase());
  const focusActions = isNewUser ? ['Skapa en odlingsplats', 'Lägg in första grödan', 'Kolla veckans råd'] : month.actions;

  return (
    <section className="botanical-panel relative overflow-hidden rounded-[1.8rem] p-5 sm:p-7 lg:p-8">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />
      <div className="absolute -right-5 -top-8 h-40 w-40 rounded-full border border-white/10" />
      <div className="absolute bottom-0 left-[42%] h-32 w-32 translate-y-1/2 rounded-full bg-white/[0.04] blur-2xl" />

      <div className="relative grid gap-7 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/75"><SunMedium className="h-3.5 w-3.5 text-lime-200" /> Fokus i {monthLabel}</span>
            <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold text-white/65">Klimatzon {climateZone}</span>
          </div>
          <h2 className="max-w-2xl font-serif text-3xl leading-[1.05] tracking-[-0.035em] text-white sm:text-4xl">{isNewUser ? 'Din odlingsdagbok är redo. Nu skapar vi ditt första värde.' : month.title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/68 sm:text-base">{isNewUser ? 'Lägg in en plats och en sådd. Därefter kan appen börja ge personliga råd, påminnelser och statistik i stället för generella exempel.' : month.text}</p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button className="bg-white text-emerald-950 hover:bg-white/92 shadow-xl" onClick={() => onNavigate(isNewUser ? '/app/beds' : '/app/calendar')}>{isNewUser ? 'Skapa första platsen' : 'Öppna såkalendern'} <ArrowRight className="h-4 w-4" /></Button>
            <Button className="border border-white/15 bg-white/[0.07] text-white shadow-none hover:bg-white/[0.13]" onClick={() => onNavigate('/app/gro')}><Bot className="h-4 w-4 text-lime-200" /> Fråga Gro</Button>
          </div>
        </div>

        <div className="rounded-[1.45rem] border border-white/12 bg-black/10 p-3.5 backdrop-blur-sm">
          <div className="flex items-center justify-between px-1 pb-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Veckans fokus</p><p className="mt-1 text-sm font-semibold text-white">Tre små steg framåt</p></div><CalendarDays className="h-5 w-5 text-lime-200" /></div>
          <div className="space-y-2">
            {focusActions.map((action, index) => {
              const Icon = index === 0 ? ClipboardList : index === 1 ? Sprout : Droplets;
              return <div key={action} className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.055] p-3 transition-colors hover:bg-white/[0.09]"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lime-100"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{action}</p><p className="mt-0.5 text-[10px] text-white/45">{index === 0 ? 'Viktigast först' : index === 1 ? 'Tar under en minut' : 'Bra att följa upp'}</p></div><CheckCircle2 className="h-4 w-4 text-white/20 transition-colors group-hover:text-lime-200" /></div>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
