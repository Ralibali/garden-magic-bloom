import { useQuery } from '@tanstack/react-query';
import { Coins } from 'lucide-react';
import { api } from '@/lib/api';
import { valueForHarvest } from '@/data/cropPrices';

export default function HarvestValueLine() {
  const year = new Date().getFullYear();
  const { data: harvests } = useQuery({ queryKey: ['harvests'], queryFn: api.getHarvests });
  if (!harvests) return null;
  let total = 0;
  for (const h of harvests as any[]) {
    if (new Date(h.harvest_date).getFullYear() === year) total += valueForHarvest(h.variety, h.weight_grams || 0);
  }
  if (total <= 0) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-foreground bg-warning/10 border border-warning/30 rounded-xl px-4 py-2.5">
      <Coins className="h-4 w-4 text-warning shrink-0" />
      <span>💰 Värde hittills i år: <strong>{Math.round(total).toLocaleString('sv-SE')} kr</strong></span>
    </div>
  );
}
