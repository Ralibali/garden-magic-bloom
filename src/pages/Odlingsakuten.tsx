import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Sprout, Stethoscope } from 'lucide-react';

const plants = ['Tomat', 'Gurka', 'Chili', 'Paprika', 'Sallat', 'Potatis', 'Jordgubbar', 'Basilika', 'Annan växt'];
const problems = ['Gula blad', 'Bruna fläckar', 'Slokande planta', 'Dålig tillväxt', 'Angripna blad', 'Ingen blomning', 'Dålig skörd'];
const places = ['Pallkrage', 'Växthus', 'Friland', 'Kruka', 'Balkong'];
const moisture = ['Torr', 'Fuktig', 'Blöt', 'Vet ej'];
const coldNights = ['Ja', 'Nej', 'Vet ej'];

function PillGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${value === option ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function getDiagnosis(problem: string, moist: string, cold: string, plant: string) {
  const causes: { title: string; text: string }[] = [];

  if (cold === 'Ja' && ['Tomat', 'Gurka', 'Chili', 'Paprika', 'Basilika'].includes(plant)) {
    causes.push({
      title: 'Köldstress',
      text: 'Värmekrävande växter reagerar snabbt på kalla nätter. Skydda plantan med fiberduk, flytta krukor varmare och vänta med utplantering tills nätterna är stabila.',
    });
  }

  if (moist === 'Blöt') {
    causes.push({
      title: 'För mycket vatten',
      text: 'Blöt jord gör att rötterna får för lite syre. Låt jorden torka upp lätt, kontrollera dränering och vattna först när plantan faktiskt behöver det.',
    });
  }

  if (moist === 'Torr' || problem === 'Slokande planta') {
    causes.push({
      title: 'Ojämn vattning',
      text: 'Torr jord eller stora svängningar mellan torrt och blött stressar plantan. Vattna djupt och jämnt, gärna på morgonen.',
    });
  }

  if (problem === 'Gula blad' || problem === 'Dålig tillväxt') {
    causes.push({
      title: 'Näringsbrist eller svag rotstart',
      text: 'Gula blad och svag tillväxt beror ofta på näringsbrist, kall jord eller rötter som inte kommit igång. Ge mild näring och fokusera på jämn värme och fukt.',
    });
  }

  if (problem === 'Angripna blad' || problem === 'Bruna fläckar') {
    causes.push({
      title: 'Skadedjur eller svampsjukdom',
      text: 'Titta noga på bladens undersidor. Plocka bort hårt angripna blad, öka luftcirkulationen och undvik att blöta ner bladen i onödan.',
    });
  }

  if (causes.length === 0) {
    causes.push({
      title: 'Tillfällig stress',
      text: 'Många plantor reagerar på omplantering, väderomslag eller ojämn skötsel. Följ utvecklingen några dagar och anteckna vad du gör så ser du vad som hjälper.',
    });
  }

  return causes.slice(0, 3);
}

export default function Odlingsakuten() {
  const [plant, setPlant] = useState('Tomat');
  const [problem, setProblem] = useState('Gula blad');
  const [place, setPlace] = useState('Pallkrage');
  const [moist, setMoist] = useState('Fuktig');
  const [cold, setCold] = useState('Vet ej');
  const [created, setCreated] = useState(false);

  const diagnosis = useMemo(() => getDiagnosis(problem, moist, cold, plant), [problem, moist, cold, plant]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Odlingsakuten – felsök gula blad, skadedjur och svag tillväxt"
        description="Felsök vanliga odlingsproblem som gula blad, slokande plantor, skadedjur och dålig tillväxt. Få råd anpassade för svenska odlare."
        path="/odlingsakuten"
        ogImage="/og-image.png"
      />

      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-serif font-semibold text-foreground">
            <Sprout className="h-5 w-5 text-primary" /> Odlingsdagboken
          </Link>
          <Button asChild size="sm"><Link to="/login?mode=register">Börja gratis</Link></Button>
        </div>
      </header>

      <main>
        <section className="bg-gradient-to-br from-background via-primary/5 to-accent/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-20 grid lg:grid-cols-[1fr_460px] gap-10 items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4">Snabb felsökning</p>
              <h1 className="font-serif text-4xl sm:text-5xl text-foreground leading-tight mb-5">Odlingsakuten – vad är fel med min planta?</h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-6">Gula blad, slokande plantor, dålig tillväxt eller svag skörd? Svara på några frågor så får du en första vägledning om vad som kan vara fel – och vad du kan göra nu.</p>
              <div className="grid sm:grid-cols-3 gap-3 max-w-2xl">
                {['Snabba råd', 'Svenska förhållanden', 'Spara och följ upp'].map(item => <div key={item} className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {item}</div>)}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-xl p-5 sm:p-6 space-y-5">
              <PillGroup label="Vilken växt gäller det?" options={plants} value={plant} onChange={setPlant} />
              <PillGroup label="Vilket problem ser du?" options={problems} value={problem} onChange={setProblem} />
              <PillGroup label="Var odlas plantan?" options={places} value={place} onChange={setPlace} />
              <PillGroup label="Hur känns jorden?" options={moisture} value={moist} onChange={setMoist} />
              <PillGroup label="Har det varit kalla nätter nyligen?" options={coldNights} value={cold} onChange={setCold} />
              <Button onClick={() => setCreated(true)} className="w-full gap-2" size="lg">Felsök min planta <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </section>

        {created && (
          <section className="max-w-6xl mx-auto px-4 sm:px-8 py-14">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Första bedömning</p>
              <h2 className="font-serif text-3xl text-foreground mb-3">Det här är mest troligt</h2>
              <p className="text-muted-foreground max-w-3xl leading-relaxed">Utifrån att du odlar {plant.toLowerCase()} i {place.toLowerCase()} och ser “{problem.toLowerCase()}” är detta de vanligaste orsakerna. Se råden som en trygg startpunkt och följ upp plantans utveckling de närmaste dagarna.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-10">
              {diagnosis.map((item, index) => (
                <article key={item.title} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">{index + 1}</div>
                    <Stethoscope className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </article>
              ))}
            </div>

            <div className="bg-primary text-primary-foreground rounded-2xl p-6 sm:p-8">
              <h3 className="font-serif text-2xl mb-2">Spara problemet i din odlingsdagbok</h3>
              <p className="text-primary-foreground/85 mb-5 leading-relaxed">När du sparar problemet kan du anteckna vad du gjorde och följa upp om plantan återhämtade sig. Det är så erfaren odling byggs: observera, justera och lär av din egen trädgård.</p>
              <Button asChild variant="secondary" size="lg" className="gap-2"><Link to="/login?mode=register">Spara problemet gratis <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
