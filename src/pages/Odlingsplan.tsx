import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Copy, Sprout } from 'lucide-react';

const zones = ['1', '2', '3', '4', '5', '6', '7', '8', 'Vet inte'];
const methods = ['Pallkrage', 'Växthus', 'Friland', 'Balkong', 'Krukor', 'Kolonilott'];
const levels = ['Nybörjare', 'Odlat några år', 'Erfaren'];
const cropTypes = ['Grönsaker', 'Örter', 'Bär', 'Blommor'];
const goals = ['Mer skörd', 'Enklare odling', 'Barnvänlig odling', 'Pollinatörsvänlig odling', 'Självhushållning'];

function ToggleGroup({ label, options, selected, setSelected, multi = false }: { label: string; options: string[]; selected: string[]; setSelected: (value: string[]) => void; multi?: boolean }) {
  return <div><label className="text-sm font-medium text-foreground">{label}</label><div className="grid grid-cols-2 gap-2 mt-2">{options.map(option => { const active = selected.includes(option); return <button key={option} type="button" onClick={() => multi ? setSelected(active ? selected.filter(item => item !== option) : [...selected, option]) : setSelected([option])} className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>{option}</button>; })}</div></div>;
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

  const createPlan = () => {
    const payload = { type: 'odlingsplan', zone: zone[0], methods: method, level: level[0], cropTypes: types, goals: goal, recommendedCrops: plan.crops, createdAt: new Date().toISOString() };
    try {
      localStorage.setItem('odlingsdagboken_public_odlingsplan', JSON.stringify(payload));
      localStorage.setItem('odlingsdagboken_latest_public_plan', JSON.stringify(payload));
    } catch {}
    setCreated(true);
  };

  const shareText = `Jag skapade min odlingsplan för 2026 med Odlingsdagboken 🌱 Zon ${zone[0]}, ${method.join(', ').toLowerCase()} och mål: ${goal.join(', ').toLowerCase()}.`;

  return <div className="min-h-screen bg-background"><Seo title="Odlingsplan 2026 – skapa personlig plan för din trädgård" description="Skapa en personlig odlingsplan för 2026. Välj klimatzon, odlingssätt och grödor och få en tydlig plan för svensk odling." path="/odlingsplan" ogImage="/og-image.png" /><header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-40"><div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between"><Link to="/" className="flex items-center gap-2 font-serif font-semibold text-foreground"><Sprout className="h-5 w-5 text-primary" /> Odlingsdagboken</Link><Button asChild size="sm"><Link to="/login?mode=register">Börja gratis</Link></Button></div></header><main><section className="bg-gradient-to-br from-background via-primary/5 to-accent/10"><div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-20 grid lg:grid-cols-[1fr_460px] gap-10 items-start"><div><p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4">Personlig odlingsplan</p><h1 className="font-serif text-4xl sm:text-5xl text-foreground leading-tight mb-5">Skapa din odlingsplan för 2026</h1><p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-6">Svara på några enkla frågor om var du odlar, vad du vill odla och hur mycket erfarenhet du har. Odlingsdagboken skapar en tydlig plan för säsongen – anpassad för svenska förhållanden, klimatzoner och vanliga odlingssätt.</p><div className="grid sm:grid-cols-3 gap-3 max-w-2xl">{['Planera smartare', 'Odla tryggare', 'Spara i appen'].map(item => <div key={item} className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {item}</div>)}</div></div><div className="bg-card border border-border rounded-2xl shadow-xl p-5 sm:p-6 space-y-5"><ToggleGroup label="Vilken klimatzon odlar du i?" options={zones} selected={zone} setSelected={setZone} /><ToggleGroup label="Hur odlar du?" options={methods} selected={method} setSelected={setMethod} multi /><ToggleGroup label="Hur erfaren är du?" options={levels} selected={level} setSelected={setLevel} /><ToggleGroup label="Vad vill du odla?" options={cropTypes} selected={types} setSelected={setTypes} multi /><ToggleGroup label="Vad är ditt mål?" options={goals} selected={goal} setSelected={setGoal} multi /><Button onClick={createPlan} className="w-full gap-2" size="lg">Skapa min odlingsplan <ArrowRight className="h-4 w-4" /></Button></div></div></section>{created && <section className="max-w-6xl mx-auto px-4 sm:px-8 py-14"><div className="mb-8"><p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Din odlingsplan</p><h2 className="font-serif text-3xl text-foreground mb-3">En tydlig start för säsongen</h2><p className="text-muted-foreground max-w-3xl leading-relaxed">Det här är en praktisk plan att börja med. Den viktigaste förbättringen kommer när du följer upp under säsongen: vad grodde, vad trivdes och vad gav faktiskt skörd i din egen odling?</p></div><div className="grid lg:grid-cols-3 gap-4 mb-8"><article className="bg-card border border-border rounded-2xl p-5"><h3 className="font-serif text-xl text-foreground mb-3">Rekommenderade grödor</h3><div className="flex flex-wrap gap-2">{plan.crops.map(crop => <span key={crop} className="rounded-full bg-primary/10 text-primary px-3 py-1 text-sm">{crop}</span>)}</div></article><article className="bg-card border border-border rounded-2xl p-5"><h3 className="font-serif text-xl text-foreground mb-3">När du bör starta</h3><p className="text-sm text-muted-foreground leading-relaxed">Börja planera under vintern. Starta långsamma grödor tidigt, men vänta med värmekrävande växter tills ljuset räcker och plantorna slipper bli rangliga.</p></article><article className="bg-card border border-border rounded-2xl p-5"><h3 className="font-serif text-xl text-foreground mb-3">Växtföljd</h3><p className="text-sm text-muted-foreground leading-relaxed">Odla inte samma växtfamilj på samma plats år efter år. Logga bäddarna redan nu så blir nästa års planering mycket enklare.</p></article></div><div className="grid md:grid-cols-3 gap-4 mb-10">{plan.tips.map((tip, index) => <div key={tip} className="bg-muted/40 border border-border rounded-2xl p-5"><span className="text-xs uppercase tracking-[0.15em] text-primary font-semibold">Experttips {index + 1}</span><p className="mt-2 text-sm text-muted-foreground leading-relaxed">{tip}</p></div>)}</div><div className="grid lg:grid-cols-[1fr_360px] gap-4"><div className="bg-primary text-primary-foreground rounded-2xl p-6 sm:p-8"><h3 className="font-serif text-2xl mb-2">Spara min odlingsplan gratis</h3><p className="text-primary-foreground/85 mb-5 leading-relaxed">Din plan är sparad i webbläsaren. Skapa ett gratis konto på samma enhet så lyfter Odlingsdagboken in planen i appen och gör den till nästa steg.</p><Button asChild variant="secondary" size="lg" className="gap-2"><Link to="/login?mode=register&source=odlingsplan">Spara i gratis konto <ArrowRight className="h-4 w-4" /></Link></Button></div><div className="bg-card border border-border rounded-2xl p-6"><h3 className="font-serif text-xl text-foreground mb-2">Dela din odlingsplan</h3><p className="text-sm text-muted-foreground mb-4">Visa vad du planerar att odla i år och inspirera fler att komma igång.</p><div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground mb-4">{shareText}</div><Button variant="outline" className="w-full gap-2" onClick={async () => { await navigator.clipboard?.writeText(shareText); setCopied(true); }}><Copy className="h-4 w-4" /> {copied ? 'Kopierat!' : 'Kopiera text'}</Button></div></div></section>}</main></div>;
}
