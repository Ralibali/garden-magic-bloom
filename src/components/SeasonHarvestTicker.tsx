import { useEffect, useRef, useState } from 'react';
import { Coins, Scale } from 'lucide-react';
import { valueForHarvest } from '@/data/cropPrices';

/**
 * Animerad säsongsräknare för skörd: kg + uppskattat butiksvärde.
 */

function useCountUp(target: number, durationMs = 900) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const firstRef = useRef(true);

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      fromRef.current = target;
      setDisplay(target);
      return;
    }
    if (target === fromRef.current) return;
    const prefersReduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return display;
}

export default function SeasonHarvestTicker({ harvests }: { harvests: any[] }) {
  const year = new Date().getFullYear();
  let kg = 0;
  let value = 0;
  for (const h of harvests) {
    if (!h?.harvest_date || new Date(h.harvest_date).getFullYear() !== year) continue;
    kg += (h.weight_grams || 0) / 1000;
    value += valueForHarvest(h.variety || '', h.weight_grams || 0);
  }

  const displayKg = useCountUp(kg);
  const displayValue = useCountUp(value);

  const [pulse, setPulse] = useState(false);
  const prevKgRef = useRef(kg);
  useEffect(() => {
    if (kg > prevKgRef.current) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 1200);
      prevKgRef.current = kg;
      return () => clearTimeout(timer);
    }
    prevKgRef.current = kg;
  }, [kg]);

  return (
    <div className={`mt-6 grid gap-3 sm:grid-cols-2 max-w-xl transition-transform ${pulse ? 'scale-[1.015]' : ''}`}>
      <div className="metric-card relative p-4">
        <div className="flex items-center justify-between">
          <p className="data-label">Skördat {year}</p>
          <Scale className="h-4 w-4 text-primary" />
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
          {displayKg.toFixed(1)} <span className="text-sm font-medium text-muted-foreground">kg</span>
        </p>
      </div>
      <div className="metric-card relative p-4">
        <div className="flex items-center justify-between">
          <p className="data-label">Butiksvärde</p>
          <Coins className="h-4 w-4 text-warning" />
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
          {Math.round(displayValue).toLocaleString('sv-SE')} <span className="text-sm font-medium text-muted-foreground">kr</span>
        </p>
      </div>
    </div>
  );
}
