import { ArrowRight, Brain, Flower2, HeartPulse, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PlantGettingStartedGuide() {
  const navigate = useNavigate();

  return (
    <section className="premium-panel overflow-hidden">
      <div className="grid lg:grid-cols-[1.05fr_.95fr]">
        <div className="p-5 sm:p-7">
          <span className="section-kicker"><Sparkles className="h-3.5 w-3.5" /> Din första växtprofil</span>
          <h2 className="mt-4 font-serif text-3xl">Börja med en växt du ser varje dag</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Välj art eller skriv ett eget namn. Efter en snabb jord- och hälsokontroll börjar appen lära sig när just ditt exemplar behöver vatten.</p>
          <Button className="mt-5 gap-2" onClick={() => navigate('/app/my-plants')}><Flower2 className="h-4 w-4" /> Lägg till min första växt <ArrowRight className="h-4 w-4" /></Button>
        </div>
        <div className="botanical-panel p-5 sm:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">Så blir råden personliga</p>
          <div className="mt-4 space-y-3">
            <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3"><HeartPulse className="h-5 w-5 shrink-0 text-lime-200" /><div><p className="text-sm font-semibold text-white">1. Kolla jord och blad</p><p className="mt-1 text-xs text-white/55">Torr, lagom eller blöt? Pigg eller stressad?</p></div></div>
            <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3"><Brain className="h-5 w-5 shrink-0 text-lime-200" /><div><p className="text-sm font-semibold text-white">2. Appen lär sig rytmen</p><p className="mt-1 text-xs text-white/55">Historiken vägs ihop med art, placering och årstid.</p></div></div>
            <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3"><Sparkles className="h-5 w-5 shrink-0 text-lime-200" /><div><p className="text-sm font-semibold text-white">3. Du får bättre råd</p><p className="mt-1 text-xs text-white/55">Appen säger när du bör kontrollera, vänta eller agera.</p></div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
