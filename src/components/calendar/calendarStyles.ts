import { Bell, Carrot, Leaf, Repeat, Shovel, Snowflake, Sprout, Wheat, type LucideIcon } from 'lucide-react';
import type { CalendarEventKind, GuideActivity } from '@/lib/gardenCalendar';

export type CalendarLayer = 'mine' | 'tasks' | 'guide';

export const EVENT_STYLE: Record<CalendarEventKind, { icon: LucideIcon; dot: string; chip: string; layer: CalendarLayer | 'climate' }> = {
  sown: { icon: Sprout, dot: 'bg-emerald-500', chip: 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-200', layer: 'mine' },
  transplanted: { icon: Shovel, dot: 'bg-teal-500', chip: 'bg-teal-500/12 text-teal-800 dark:text-teal-200', layer: 'mine' },
  'plant-out-due': { icon: Shovel, dot: 'bg-amber-500', chip: 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-dashed border-amber-500/50', layer: 'tasks' },
  'harvest-expected': { icon: Carrot, dot: 'bg-orange-400', chip: 'bg-orange-400/12 text-orange-900 dark:text-orange-200 border border-dashed border-orange-400/50', layer: 'mine' },
  harvested: { icon: Wheat, dot: 'bg-lime-600', chip: 'bg-lime-600/15 text-lime-900 dark:text-lime-200', layer: 'mine' },
  succession: { icon: Repeat, dot: 'bg-green-500', chip: 'bg-green-500/12 text-green-900 dark:text-green-200 border border-dashed border-green-500/50', layer: 'tasks' },
  reminder: { icon: Bell, dot: 'bg-sky-500', chip: 'bg-sky-500/12 text-sky-900 dark:text-sky-200', layer: 'tasks' },
  frost: { icon: Snowflake, dot: 'bg-blue-400', chip: 'bg-blue-400/12 text-blue-900 dark:text-blue-200', layer: 'climate' },
  guide: { icon: Leaf, dot: 'bg-primary', chip: 'bg-primary/10 text-primary', layer: 'climate' },
};

export const GUIDE_STYLE: Record<GuideActivity, { bar: string; soft: string; label: string }> = {
  forodla: { bar: 'bg-amber-400/80 dark:bg-amber-500/60', soft: 'bg-amber-400/15 text-amber-900 dark:text-amber-200', label: 'Förodla' },
  direktsa: { bar: 'bg-primary/70', soft: 'bg-primary/12 text-primary', label: 'Direktså' },
  planteraUt: { bar: 'bg-teal-500/70', soft: 'bg-teal-500/12 text-teal-900 dark:text-teal-200', label: 'Plantera ut' },
  skorda: { bar: 'bg-lime-600/70', soft: 'bg-lime-600/15 text-lime-900 dark:text-lime-200', label: 'Skörda' },
};
