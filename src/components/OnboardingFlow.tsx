import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GARDEN_CATEGORIES, GardenCategory } from '@/lib/gardenModules';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Leaf, MapPin, Sparkles } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

const ZONE_CITIES = [
  { zone: 1, cities: ['Malmö', 'Helsingborg', 'Ystad', 'Trelleborg'] },
  { zone: 2, cities: ['Göteborg', 'Kalmar', 'Karlskrona', 'Halmstad', 'Växjö'] },
  { zone: 3, cities: ['Stockholm', 'Linköping', 'Örebro', 'Norrköping'] },
  { zone: 4, cities: ['Västerås', 'Gävle', 'Karlstad', 'Eskilstuna', 'Borlänge'] },
  { zone: 5, cities: ['Falun', 'Sundsvall', 'Hudiksvall'] },
  { zone: 6, cities: ['Östersund', 'Umeå', 'Härnösand', 'Sollefteå'] },
  { zone: 7, cities: ['Luleå', 'Skellefteå', 'Piteå'] },
  { zone: 8, cities: ['Kiruna', 'Gällivare', 'Jokkmokk', 'Arvidsjaur'] },
];

const GROWING_METHODS = ['Pallkrage', 'Växthus', 'Friland', 'Balkong', 'Krukor', 'Kolonilott'];
const POPULAR_CROPS = ['Tomat', 'Gurka', 'Chili', 'Morot', 'Sallat', 'Potatis', 'Lök', 'Basilika', 'Jordgubbar', 'Ärtor'];
const EXPERIENCE_LEVELS = [
  { id: 'beginner', title: 'Jag är ganska ny', text: 'Visa tydliga steg och förklara varför.' },
  { id: 'intermediate', title: 'Jag har odlat några år', text: 'Blanda snabba råd med fördjupning.' },
  { id: 'experienced', title: 'Jag är erfaren', text: 'Prioritera statistik, historik och planering.' },
];

interface OnboardingFlowProps {
  onComplete: (data: { categories: GardenCategory[]; climateZone: number }) => void | Promise<void>;
}

function ToggleButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`text-left p-3.5 rounded-2xl border transition-all duration-200 ${active ? 'border-primary bg-primary/10 shadow-sm text-primary' : 'border-border hover:border-primary/35 bg-card text-foreground'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{children}</span>
        {active && <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Check className="h-3 w-3" /></span>}
      </div>
    </button>
  );
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<GardenCategory[]>(['kokstradgard']);
  const [climateZone, setClimateZone] = useState(3);
  const [methods, setMethods] = useState<string[]>(['Pallkrage']);
  const [crops, setCrops] = useState<string[]>(['Tomat', 'Sallat']);
  const [experience, setExperience] = useState('intermediate');
  const [saving, setSaving] = useState(false);

  const toggleCategory = (category: GardenCategory) => {
    setSelectedCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  };

  const toggleArray = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const finish = async () => {
    if (!selectedCategories.length) {
      toast({ title: 'Välj minst ett odlingsområde', description: 'Det gör att vi kan visa rätt verktyg för dig.', variant: 'destructive' });
      setStep(1);
      return;
    }

    setSaving(true);
    const plan = { categories: selectedCategories, methods, crops, experience, climateZone, createdAt: new Date().toISOString() };

    try {
      localStorage.setItem('odlingsdagboken_onboarding_plan', JSON.stringify(plan));
      await onComplete({ categories: selectedCategories, climateZone });
      const profile = await api.getProfile();
      const currentPreferences = profile?.preferences && typeof profile.preferences === 'object' && !Array.isArray(profile.preferences)
        ? profile.preferences as Record<string, unknown>
        : {};
      await api.updateProfile({
        climate_zone: climateZone,
        onboarding_completed: true,
        preferences: {
          ...currentPreferences,
          garden_categories: selectedCategories,
          onboarding_plan: plan,
          growing_methods: methods,
          preferred_crops: crops,
          experience_level: experience,
          last_active_at: new Date().toISOString(),
          last_activity: 'onboarding_completed',
        },
      });
      await trackEvent('onboarding_completed', { categories: selectedCategories, methods, crops, climate_zone: climateZone, experience });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error: any) {
      toast({ title: 'Kunde inte spara dina val', description: error?.message || 'Försök igen.', variant: 'destructive' });
      setSaving(false);
    }
  };

  const progressPercent = ((step + 1) / 5) * 100;
  const experienceLabel = EXPERIENCE_LEVELS.find((level) => level.id === experience)?.title;

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/10 p-2 sm:p-4 rounded-3xl">
      <div className="w-full max-w-3xl">
        <div className="mb-5 px-1">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-muted-foreground">Din personliga start · steg {step + 1} av 5</span><span className="text-xs text-primary font-medium">{Math.round(progressPercent)} %</span></div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        <div className="bg-card border border-border rounded-3xl shadow-xl p-5 sm:p-8 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22 }}>
              {step === 0 && <div className="text-center space-y-6 py-4 sm:py-8"><div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto"><Leaf className="h-8 w-8" /></div><div className="space-y-3"><p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Välkommen till din odling</p><h1 className="font-serif text-3xl sm:text-5xl">Låt appen börja med en plan – inte en tom skärm</h1><p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">På ungefär en minut anpassar vi verktyg, såtider och nästa steg efter vad du odlar och var i Sverige du bor.</p></div><Button size="lg" className="gap-2 h-12 px-7" onClick={() => setStep(1)}>Anpassa min dagbok <ArrowRight className="h-4 w-4" /></Button></div>}

              {step === 1 && <div className="space-y-6"><div><p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">Vad vill du hålla koll på?</p><h1 className="font-serif text-3xl mb-2">Välj dina odlingsområden</h1><p className="text-sm text-muted-foreground">Vi visar färre, mer relevanta funktioner. Du kan ändra detta senare.</p></div><div className="grid sm:grid-cols-2 gap-3">{GARDEN_CATEGORIES.map((category) => <button key={category.id} type="button" onClick={() => toggleCategory(category.id)} className={`text-left rounded-2xl border p-4 transition-all ${selectedCategories.includes(category.id) ? 'border-primary bg-primary/8 shadow-sm' : 'border-border hover:border-primary/30'}`}><div className="flex gap-3"><span className="text-2xl">{category.emoji}</span><div className="flex-1"><div className="flex items-center justify-between gap-2"><p className="font-medium">{category.label}</p>{selectedCategories.includes(category.id) && <Check className="h-4 w-4 text-primary" />}</div><p className="text-xs text-muted-foreground mt-1">{category.description}</p></div></div></button>)}</div><div className="flex justify-end"><Button className="gap-2" disabled={!selectedCategories.length} onClick={() => setStep(2)}>Nästa <ArrowRight className="h-4 w-4" /></Button></div></div>}

              {step === 2 && <div className="space-y-6"><div><p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">Din säsong</p><h1 className="font-serif text-3xl mb-2">Hur och vad odlar du?</h1><p className="text-sm text-muted-foreground">Välj det som stämmer bäst just nu.</p></div><div><p className="text-sm font-medium mb-2">Odlingssätt</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{GROWING_METHODS.map((method) => <ToggleButton key={method} active={methods.includes(method)} onClick={() => toggleArray(method, setMethods)}>{method}</ToggleButton>)}</div></div><div><p className="text-sm font-medium mb-2">Några grödor du vill odla</p><div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{POPULAR_CROPS.map((crop) => <ToggleButton key={crop} active={crops.includes(crop)} onClick={() => toggleArray(crop, setCrops)}>{crop}</ToggleButton>)}</div></div><div className="flex items-center justify-between"><Button variant="ghost" onClick={() => setStep(1)}>Tillbaka</Button><Button className="gap-2" disabled={!methods.length} onClick={() => setStep(3)}>Nästa <ArrowRight className="h-4 w-4" /></Button></div></div>}

              {step === 3 && <div className="space-y-6"><div><p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">Lokala råd</p><h1 className="font-serif text-3xl mb-2">Vilken odlingszon ligger närmast?</h1><p className="text-sm text-muted-foreground">Zonen används för frost, såtider och utplantering. Exemplen är ungefärliga.</p></div><div className="grid sm:grid-cols-2 gap-2 max-h-[48vh] overflow-y-auto pr-1">{ZONE_CITIES.map(({ zone, cities }) => <button key={zone} type="button" onClick={() => setClimateZone(zone)} className={`text-left p-3.5 rounded-2xl border transition-all ${climateZone === zone ? 'border-primary bg-primary/8 shadow-sm' : 'border-border hover:border-primary/30'}`}><div className="flex items-center justify-between"><span className="font-medium text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Zon {zone}</span>{climateZone === zone && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Vald</span>}</div><p className="text-xs text-muted-foreground mt-1 ml-6">{cities.join(', ')}</p></button>)}</div><div className="flex items-center justify-between"><Button variant="ghost" onClick={() => setStep(2)}>Tillbaka</Button><Button className="gap-2" onClick={() => setStep(4)}>Nästa <ArrowRight className="h-4 w-4" /></Button></div></div>}

              {step === 4 && <div className="space-y-6"><div><p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">Nivå och sammanfattning</p><h1 className="font-serif text-3xl mb-2">Hur mycket guidning passar dig?</h1><p className="text-sm text-muted-foreground">Det påverkar hur detaljerade rekommendationerna blir.</p></div><div className="grid gap-3">{EXPERIENCE_LEVELS.map((level) => <button key={level.id} type="button" onClick={() => setExperience(level.id)} className={`text-left rounded-2xl border p-4 transition-all ${experience === level.id ? 'border-primary bg-primary/8' : 'border-border hover:border-primary/30'}`}><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{level.title}</p><p className="text-xs text-muted-foreground mt-1">{level.text}</p></div>{experience === level.id && <Check className="h-4 w-4 text-primary shrink-0" />}</div></button>)}</div><div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 flex gap-3"><Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" /><div><p className="text-sm font-medium">Din startprofil är klar</p><p className="text-sm text-muted-foreground mt-1">{selectedCategories.length} odlingsområde{selectedCategories.length === 1 ? '' : 'n'}, zon {climateZone}, {crops.length} valda grödor och nivån “{experienceLabel}”. Valen sparas nu även i ditt konto.</p></div></div><div className="flex items-center justify-between"><Button variant="ghost" onClick={() => setStep(3)}>Tillbaka</Button><Button className="gap-2" onClick={finish} disabled={saving}>{saving ? 'Sparar din plan…' : 'Öppna min Odlingsdagbok'} {!saving && <ArrowRight className="h-4 w-4" />}</Button></div></div>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
