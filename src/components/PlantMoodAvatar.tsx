import { Leaf } from 'lucide-react';
import type { PlantCareStatus } from '@/lib/plantCareIntelligence';

interface PlantMoodAvatarProps {
  score: number;
  status: PlantCareStatus;
  size?: 'sm' | 'md' | 'lg';
}

const box = { sm: 'h-12 w-12', md: 'h-16 w-16', lg: 'h-24 w-24' };
const leaf = { sm: 'h-5 w-5', md: 'h-7 w-7', lg: 'h-10 w-10' };

function mood(score: number, status: PlantCareStatus) {
  if (status === 'urgent' || score < 45) return { face: '🥺', shell: 'from-rose-100 via-orange-50 to-amber-100 dark:from-rose-950/60 dark:via-orange-950/30 dark:to-amber-950/40', leafTone: 'text-orange-500', sway: 'animate-[pulse_2.4s_ease-in-out_infinite]' };
  if (status === 'due' || score < 65) return { face: '😕', shell: 'from-amber-100 via-yellow-50 to-lime-100 dark:from-amber-950/55 dark:via-yellow-950/30 dark:to-lime-950/35', leafTone: 'text-lime-600', sway: 'animate-[pulse_3.2s_ease-in-out_infinite]' };
  if (status === 'soon' || score < 85) return { face: '🙂', shell: 'from-lime-100 via-emerald-50 to-teal-100 dark:from-lime-950/45 dark:via-emerald-950/30 dark:to-teal-950/35', leafTone: 'text-emerald-600', sway: 'animate-[bounce_3s_ease-in-out_infinite]' };
  return { face: '😊', shell: 'from-emerald-100 via-green-50 to-lime-100 dark:from-emerald-950/50 dark:via-green-950/30 dark:to-lime-950/40', leafTone: 'text-emerald-600', sway: 'animate-[bounce_2.8s_ease-in-out_infinite]' };
}

export default function PlantMoodAvatar({ score, status, size = 'md' }: PlantMoodAvatarProps) {
  const state = mood(score, status);
  return (
    <div className={`relative ${box[size]} shrink-0 rounded-[1.4rem] bg-gradient-to-br ${state.shell} shadow-[inset_0_1px_rgba(255,255,255,.7),0_14px_30px_-18px_rgba(16,85,48,.45)]`} aria-label={`Växtens visuella mående: ${score} av 100`}>
      <div className={`absolute left-1/2 top-[18%] -translate-x-1/2 ${state.sway}`}>
        <Leaf className={`${leaf[size]} ${state.leafTone} -rotate-12 fill-current opacity-90`} />
      </div>
      <div className="absolute inset-x-0 bottom-[12%] text-center leading-none" style={{ fontSize: size === 'lg' ? 26 : size === 'md' ? 20 : 16 }}>{state.face}</div>
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-card bg-emerald-400 shadow-sm" />
    </div>
  );
}
