import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GARDEN_CATEGORIES, GardenCategory } from '@/lib/gardenModules';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Leaf, Sprout } from 'lucide-react';

const ZONE_CITIES: { zone: number; cities: string[] }[] = [
  { zone: 1, cities: ['Malmö', 'Helsingborg', 'Ystad', 'Trelleborg', 'Landskrona'] },
  { zone: 2, cities: ['Göteborg', 'Kalmar', 'Karlskrona', 'Halmstad', 'Växjö'] },
  { zone: 3, cities: ['Stockholm', 'Linköping', 'Örebro', 'Norrköping', 'Västervik'] },
  { zone: 4, cities: ['Västerås', 'Gävle', 'Karlstad', 'Eskilstuna', 'Borlänge'] },
  { zone: 5, cities: ['Falun', 'Sundsvall', 'Östersund (södra)', 'Hudiksvall'] },
  { zone: 6, cities: ['Östersund', 'Umeå', 'Härnösand', 'Sollefteå'] },
  { zone: 7, cities: ['Luleå', 'Skellefteå', 'Piteå'] },
  { zone: 8, cities: ['Kiruna', 'Gällivare', 'Jokkmokk', 'Arvidsjaur'] },
];

const GROWING_METHODS = ['Pallkrage', 'Växthus', 'Friland', 'Balkong', 'Krukor', 'Kolonilott'];
const POPULAR_CROPS = ['Tomat', 'Gurka', 'Chili', 'Morot', 'Sallat', 'Potatis', 'Lök', 'Basilika', 'Jordgubbar', 'Ärtor'];
const EXPERIENCE_LEVELS = ['Nybörjare', 'Odlat några år', 'Erfaren odlare'];

interface OnboardingFlowProps {
  onComplete: (data: { categories: GardenCategory[]; climateZone: number }) => void;
}

function ToggleButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-xl border-2 transition-all duration-200 ${
        active ? 'border-primary bg-primary/8 shadow-sm text-primary' : 'border-border hover:border-primary/30 bg-card text-foreground'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{children}</span>
        {active && <Check className="h-4 w-4 shrink-0" />}
      </div>
    </button>
  );
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<GardenCategory[]>([]);
  const [climateZone, setClimateZone] = useState<number>(3);
  const [methods, setMethods] = useState<string[]>(['Pallkrage']);
  const [crops, setCrops] = useState<string[]>(['Tomat', 'Sallat']);
  const [experience, setExperience] = useState('Odlat några år');

  const toggleCategory = (cat: GardenCategory) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const toggleArray = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]);
  };

  const finish = () => {
    try {
      localStorage.setItem('odlingsdagboken_onboarding_plan', JSON.stringify({ methods, crops, experience, climateZone, createdAt: new Date().toISOString() }));
    } catch {}
    onComplete({ categories: selectedCategories, climateZone });
  };

  const progressPercent = ((step + 1) / 5) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/10 p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Steg {step + 1} av 5</span>
            <Sprout className="h-4 w-4 text-primary" />
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        <div className="bg-card border border-border rounded-3xl shadow-xl p-5 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 0 && (
                <div className="text-center space-y-6 py-4">
                  <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Leaf className="h-8 w-8" />
                  </div>
                  <div className="space-y-3">
                    <h1 className="font-serif text-3xl sm:text-4xl text-foreground">Nu bygger vi din första odlingsplan</h1>
                    <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">Svara på några snabba frågor så anpassar vi Odlingsdagboken efter din odling. Målet är enkelt: du ska veta vad nästa steg är direkt.</p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div className="rounded-xl border border-border p-3">Svenska såtider</div>
                    <div className="rounded-xl border border-border p-3">Klimatzon</div>
                    <div className="rounded-xl border border-border p-3">Din egen plan</div>
                  </div>
                  <Button size="lg" className="gap-2" onClick={() => setStep(1)}>
                    Skapa min plan <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-serif text-3xl text-foreground mb-2">Hur odlar du?</h1>
                    <p className="text-sm text-muted-foreground">Välj ett eller flera sätt. Det gör råden mer relevanta.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {GROWING_METHODS.map(method => <ToggleButton key={method} active={methods.includes(method)} onClick={() => toggleArray(method, setMethods)}>{method}</ToggleButton>)}
                  </div>
                  <div className="flex justify-end"><Button className="gap-2" onClick={() => setStep(2)}>Nästa <ArrowRight className="h-4 w-4" /></Button></div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-serif text-3xl text-foreground mb-2">Vad vill du odla i år?</h1>
                    <p className="text-sm text-muted-foreground">Välj några favoriter. Du kan lägga till fler senare.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {POPULAR_CROPS.map(crop => <ToggleButton key={crop} active={crops.includes(crop)} onClick={() => toggleArray(crop, setCrops)}>{crop}</ToggleButton>)}
                  </div>
                  <div className="flex items-center justify-between"><Button variant="ghost" onClick={() => setStep(1)}>Tillbaka</Button><Button className="gap-2" onClick={() => setStep(3)}>Nästa <ArrowRight className="h-4 w-4" /></Button></div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-serif text-3xl text-foreground mb-2">Var i Sverige odlar du?</h1>
                    <p className="text-sm text-muted-foreground">Klimatzonen påverkar sådd, utplantering och frostrisk.</p>
                  </div>
                  <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                    {ZONE_CITIES.map(({ zone, cities }) => (
                      <button
                        key={zone}
                        onClick={() => setClimateZone(zone)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 ${climateZone === zone ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30 bg-card'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-medium text-sm ${climateZone === zone ? 'text-primary' : 'text-foreground'}`}>Zon {zone}</span>
                          {climateZone === zone && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Vald</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{cities.join(', ')}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between"><Button variant="ghost" onClick={() => setStep(2)}>Tillbaka</Button><Button className="gap-2" onClick={() => setStep(4)}>Nästa <ArrowRight className="h-4 w-4" /></Button></div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-serif text-3xl text-foreground mb-2">Hur mycket stöd vill du ha?</h1>
                    <p className="text-sm text-muted-foreground">Det här hjälper oss visa rätt nivå av råd och uppgifter.</p>
                  </div>
                  <div className="grid gap-3">
                    {EXPERIENCE_LEVELS.map(level => <ToggleButton key={level} active={experience === level} onClick={() => setExperience(level)}>{level}</ToggleButton>)}
                  </div>
                  <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
                    <p className="text-sm font-medium text-foreground mb-1">Din startplan är klar 🌱</p>
                    <p className="text-sm text-muted-foreground">Vi sparar dina val och visar nästa steg på dashboarden: skapa bädd, logga första sådden och kolla veckans odlingsråd.</p>
                  </div>
                  <div className="flex items-center justify-between"><Button variant="ghost" onClick={() => setStep(3)}>Tillbaka</Button><Button className="gap-2" onClick={finish}>Visa min odlingsdagbok <ArrowRight className="h-4 w-4" /></Button></div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
