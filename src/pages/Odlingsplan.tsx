import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import PublicEmailCapture from '@/components/PublicEmailCapture';
import { ArrowRight, Check, Copy, Sprout } from 'lucide-react';
import { CURRENT_YEAR } from '@/lib/currentYear';

const zones = ['1', '2', '3', '4', '5', '6', '7', '8', 'Vet inte'];
const methods = ['Pallkrage', 'Växthus', 'Friland', 'Balkong', 'Krukor', 'Kolonilott'];
const levels = ['Nybörjare', 'Odlat några år', 'Erfaren'];
const cropTypes = ['Grönsaker', 'Örter', 'Bär', 'Blommor'];
const goals = ['Mer skörd', 'Enklare odling', 'Barnvänlig odling', 'Pollinatörsvänlig odling', 'Självhushållning'];

function ToggleGroup({ label, options, selected, setSelected, multi = false }: { label: string; options: string[]; selected: string[]; setSelected: (value: string[]) => void; multi?: boolean }) {
  const labelId = useId();
  return <div><div id={labelId} className="text-sm font-medium text-foreground">{label}</div><div role="group" aria-labelledby={labelId} className="grid grid-cols-2 gap-2 mt-2">{options.map(option => { const active = selected.includes(option); return <button key={option} type="button" onClick={() => multi ? setSelected(active ? selected.filter(item => item !== option) : [...selected, option]) : setSelected([option])} className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>{option}</button>; })}</div></div>;
}

export default function Odlingsplan() {
  const [zone, setZone] = useState(['3']);
  const [method, setMethod] = useState(['Pallkrage']);
  const [level, setLevel] = useState(['Odlat några år']);
  const [types, setTypes] = useState(['Grönsaker', 'Örter']);
  const [goal, setGoal] = useState(['Mer skörd']);
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  const plan = useMemo(() => {
    const isGreenhouse = method.includes('Växthus');
    const isBalcony = method.includes('Balkong') || method.includes('Krukor');
    const isBeginner = level.includes('Nybörjare');
    const crops = isBalcony ? ['Sallat', 'Basilika', 'Tomat i kruka', 'Jordgubbar', 'Ärtor'] : isGreenhouse ? ['Tomat', 'Gurka', 'Chili', 'Basilika', 'Sallat'] : ['Morot', 'Sallat', 'Potatis', 'Ärtor', 'Lök', 'Tomat'];
    const tips = [
      isBeginner ? 'Börja med få grödor och lyckas ordentligt, i stället för att så allt på en gång.' : 'Jämför årets resultat med tidigare säsonger så ser du snabbt vad som är värt att upprepa.',
      isGreenhouse ? 'Växthus ger värme, men kräver jämn vattning och luftning för att plantorna ska hålla sig friska.' : 'Skyddade lägen och fiberduk kan ge dig flera veckors starkare start på säsongen.',
      goal.includes('Mer skörd') ? 'Logga skörden per bädd. Då ser du vilka platser och grödor som faktiskt gav mest tillbaka.' : 'En enkel plan är ofta den bästa planen. Välj grödor du hinner sköta och följa upp.',
    ];
    return { crops, tips };
  }, [method, level, goal]);

  const planPayload = { type: 'odlingsplan', zone: zone[0], methods: method, level: level[0], cropTypes: types, goals: goal, recommendedCrops: plan.crops, createdAt: new Date().toISOString() };

  const createPlan = () => {
    try {
      localStorage.setItem('odlingsdagboken_public_odlingsplan', JSON.stringify(planPayload));
      localStorage.setItem('odlingsdagboken_latest_public_plan', JSON.stringify(planPayload));
    } catch {}
    setCreated(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetPlan = () => setCreated(false);
  const shareText = `Jag skapade min odlingsplan för ${CURRENT_YEAR} med Odlingsdagboken 🌱 Zon ${zone[0]}, ${method.join(', ').toLowerCase()} och mål: ${goal.join(', ').toLowerCase()}.`;

  return <div className="min-h-screen bg-background"><Seo title={`Odlingsplan ${CURRENT_YEAR} – skapa personlig plan för din trädgård`} description={`Skapa en personlig odlingsplan för ${CURRENT_YEAR}. Välj klimatzon, odlingssätt och grödor och få en tydlig plan för svensk odling.`} path="/odlingsplan" ogImage="https://odlingsdagboken.com/og-image.png" /><header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-40"><div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between"><Link to="/" className="flex items-center gap-2 font-serif font-semibold text-foreground"><Sprout className="h-5 w-5 text-primary" /> Odlingsdagboken</Link><Button asChild size="sm"><Link to="/login?mode=register">Börja gratis</Link></Button></div></header><main>
    {!created ? (
      <section className="bg-gradient-to-br from-background via-primary/5 to-accent/10"><div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-20 grid lg:grid-cols-[1fr_460px] gap-10 items-start"><div><p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4">Personlig odlingsplan</p><h1 className="font-serif text-4xl sm:text-5xl text-foreground leading-tight mb-5">Skapa din odlingsplan för {CURRENT_YEAR}</h1><p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-6">Svara på några enkla frågor om var du odlar, vad du vill odla och hur mycket erfarenhet du har. Odlingsdagboken skapar en tydlig plan för säsongen – anpassad för svenska förhållanden, klimatzoner och vanliga odlingssätt.</p><div className="grid sm:grid-cols-3 gap-3 max-w-2xl">{['Planera smartare', 'Odla tryggare', 'Spara i appen'].map(item => <div key={item} className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {item}</div>)}</div></div><div className="bg-card border border-border rounded-2xl shadow-xl p-5 sm:p-6 space-y-5"><ToggleGroup label="Vilken klimatzon odlar du i?" options={zones} selected={zone} setSelected={setZone} /><ToggleGroup label="Hur odlar du?" options={methods} selected={method} setSelected={setMethod} multi /><ToggleGroup label="Hur erfaren är du?" options={levels} selected={level} setSelected={setLevel} /><ToggleGroup label="Vad vill du odla?" options={cropTypes} selected={types} setSelected={setTypes} multi /><ToggleGroup label="Vad är ditt mål?" options={goals} selected={goal} setSelected={setGoal} multi /><Button onClick={createPlan} className="w-full gap-2" size="lg">Skapa min odlingsplan <ArrowRight className="h-4 w-4" /></Button></div></div></section>
    ) : (
      <section className="bg-gradient-to-br from-background via-primary/5 to-accent/10"><div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12"><div className="grid lg:grid-cols-[1fr_420px] gap-6 items-start"><div className="rounded-3xl border border-primary/20 bg-card p-5 sm:p-7 shadow-xl"><p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Din odlingsplan är klar 🌱</p><h1 className="font-serif text-3xl sm:text-5xl text-foreground leading-tight mb-4">Spara planen och få påminnelser</h1><p className="text-muted-foreground leading-relaxed mb-5">Planen är skapad direkt. Spara den nu så kan du få påminnelser, logga sådder och följa upp vad som faktiskt fungerade under säsongen.</p><div className="flex flex-wrap gap-2 mb-5">{plan.crops.map(crop => <span key={crop} className="rounded-full bg-primary/10 text-primary px-3 py-1 text-sm">{crop}</span>)}</div><div className="grid sm:grid-cols-2 gap-3 text-sm"><div className="rounded-2xl border border-border bg-background/70 p-4"><h2 className="font-medium text-foreground mb-1">När du bör starta</h2><p className="text-muted-foreground">Börja planera under vintern. Vänta med värmekrävande växter tills ljuset räcker.</p></div><div className="rounded-2xl border border-border bg-background/70 p-4"><h2 className="font-medium text-foreground mb-1">Växtföljd</h2><p className="text-muted-foreground">Logga bäddarna redan nu så blir nästa års planering enklare.</p></div></div><button type="button" onClick={resetPlan} className="text-xs text-muted-foreground hover:text-foreground mt-4">Ändra mina val</button></div><div className="space-y-4"><div className="bg-primary text-primary-foreground rounded-2xl p-5 sm:p-6"><h2 className="font-serif text-2xl mb-2">Spara i gratis konto</h2><p className="text-primary-foreground/85 mb-5 text-sm leading-relaxed">Skapa ett konto på samma enhet så lyfter Odlingsdagboken in planen i appen.</p><Button asChild variant="secondary" size="lg" className="w-full gap-2"><Link to="/login?mode=register&source=odlingsplan">Spara planen och få påminnelser <ArrowRight className="h-4 w-4" /></Link></Button></div><PublicEmailCapture source="odlingsplan" plan={planPayload} title="Vill du få odlingsplanen skickad till dig?" description="Spara din e-post och fortsätt när det passar. När du skapar konto på samma enhet finns planen redo i appen." /></div></div></div></section>
    )}

    {created && <section className="max-w-6xl mx-auto px-4 sm:px-8 py-10"><div className="grid md:grid-cols-3 gap-4 mb-8">{plan.tips.map((tip, index) => <div key={tip} className="bg-muted/40 border border-border rounded-2xl p-5"><span className="text-xs uppercase tracking-[0.15em] text-primary font-semibold">Experttips {index + 1}</span><p className="mt-2 text-sm text-muted-foreground leading-relaxed">{tip}</p></div>)}</div><div className="bg-card border border-border rounded-2xl p-6"><h2 className="font-serif text-xl text-foreground mb-2">Dela din odlingsplan</h2><p className="text-sm text-muted-foreground mb-4">Visa vad du planerar att odla i år och inspirera fler att komma igång.</p><div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground mb-4">{shareText}</div><Button variant="outline" className="gap-2" onClick={async () => { await navigator.clipboard?.writeText(shareText); setCopied(true); }}><Copy className="h-4 w-4" /> {copied ? 'Kopierat!' : 'Kopiera text'}</Button></div></section>}
  </main></div>;
}
