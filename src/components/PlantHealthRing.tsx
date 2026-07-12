import React from 'react';

interface PlantHealthRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showHeart?: boolean;
}

const sizes = {
  sm: { box: 64, radius: 25, stroke: 6, value: 'text-base', label: 'text-[8px]' },
  md: { box: 88, radius: 35, stroke: 7, value: 'text-xl', label: 'text-[9px]' },
  lg: { box: 132, radius: 54, stroke: 9, value: 'text-3xl', label: 'text-[10px]' },
};

function tone(score: number) {
  if (score >= 85) return { from: '#34d399', to: '#84cc16', glow: 'rgba(52,211,153,.2)' };
  if (score >= 65) return { from: '#22c55e', to: '#eab308', glow: 'rgba(234,179,8,.18)' };
  if (score >= 45) return { from: '#f59e0b', to: '#f97316', glow: 'rgba(249,115,22,.18)' };
  return { from: '#fb7185', to: '#ef4444', glow: 'rgba(239,68,68,.2)' };
}

export default function PlantHealthRing({ score, size = 'md', label = 'hälsa', showHeart = true }: PlantHealthRingProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score || 0)));
  const config = sizes[size];
  const circumference = 2 * Math.PI * config.radius;
  const offset = circumference - (safeScore / 100) * circumference;
  const colors = tone(safeScore);
  const gradientId = React.useId().replace(/:/g, '');

  return (
    <div className="relative shrink-0" style={{ width: config.box, height: config.box, filter: `drop-shadow(0 10px 22px ${colors.glow})` }} aria-label={`${safeScore} procent ${label}`}>
      <svg className="absolute inset-0 -rotate-90" width={config.box} height={config.box} viewBox={`0 0 ${config.box} ${config.box}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>
        </defs>
        <circle cx={config.box / 2} cy={config.box / 2} r={config.radius} fill="none" stroke="currentColor" className="text-foreground/7" strokeWidth={config.stroke} />
        <circle
          cx={config.box / 2}
          cy={config.box / 2}
          r={config.radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-card/55 backdrop-blur-sm">
        <div className="flex items-center gap-0.5">
          {showHeart && <span className="text-[10px] leading-none">♥</span>}
          <span className={`${config.value} font-bold tabular-nums leading-none`}>{safeScore}</span>
        </div>
        <span className={`${config.label} mt-1 font-semibold uppercase tracking-[0.13em] text-muted-foreground`}>{label}</span>
      </div>
    </div>
  );
}
