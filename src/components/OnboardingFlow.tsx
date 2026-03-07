import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GARDEN_CATEGORIES, GardenCategory } from '@/lib/gardenModules';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sprout } from 'lucide-react';

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

interface OnboardingFlowProps {
  onComplete: (data: { categories: GardenCategory[]; climateZone: number }) => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<GardenCategory[]>([]);
  const [climateZone, setClimateZone] = useState<number>(3);

  const toggleCategory = (cat: GardenCategory) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSkip = () => {
    onComplete({ categories: selectedCategories, climateZone });
  };

  const handleFinish = () => {
    onComplete({ categories: selectedCategories, climateZone });
  };

  const progressPercent = ((step + 1) / 3) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Steg {step + 1} av 3</span>
            <Sprout className="h-4 w-4 text-primary" />
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && (
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-foreground">Välkommen till Odlingsdagboken! 🌱</h1>
                  <p className="text-muted-foreground">Vi ställer två snabba frågor så att vi kan anpassa appen för dig.</p>
                </div>
                <Button size="lg" className="gap-2" onClick={() => setStep(1)}>
                  Kom igång <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-foreground">Vad odlar du?</h1>
                  <p className="text-sm text-muted-foreground">Välj ett eller flera alternativ. Du kan ändra detta senare i inställningar.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {GARDEN_CATEGORIES.map(cat => {
                    const selected = selectedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                          selected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-primary/30 bg-card'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{cat.emoji}</span>
                          <div>
                            <p className={`font-medium text-sm ${selected ? 'text-primary' : 'text-foreground'}`}>{cat.label}</p>
                            <p className="text-xs text-muted-foreground">{cat.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={handleSkip} className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">Hoppa över</button>
                  <Button className="gap-2" onClick={() => setStep(2)}>
                    Nästa <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-foreground">Var i Sverige odlar du?</h1>
                  <p className="text-sm text-muted-foreground">Vi anpassar såtider och råd efter din zon.</p>
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {ZONE_CITIES.map(({ zone, cities }) => (
                    <button
                      key={zone}
                      onClick={() => setClimateZone(zone)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                        climateZone === zone
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/30 bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium text-sm ${climateZone === zone ? 'text-primary' : 'text-foreground'}`}>
                          Zon {zone}
                        </span>
                        {climateZone === zone && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Vald</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{cities.join(', ')}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground italic">Osäker? Välj zonen för närmaste stad. Du kan alltid ändra detta senare i inställningar.</p>
                <div className="flex items-center justify-between">
                  <button onClick={handleSkip} className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">Hoppa över</button>
                  <Button className="gap-2" onClick={handleFinish}>
                    Klar – visa min odlingsdagbok <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
