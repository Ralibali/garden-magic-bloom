import React from 'react';
import { ArrowRight, LucideIcon, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppEmptyStateProps {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function AppEmptyState({
  icon: Icon = Sprout,
  eyebrow = 'Första steget',
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: AppEmptyStateProps) {
  return (
    <div className="empty-state relative overflow-hidden px-5 py-10 text-center sm:px-8 sm:py-14">
      <div className="absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <span className="section-kicker mb-5">{eyebrow}</span>
        <div className="botanical-panel mb-5 flex h-16 w-16 items-center justify-center rounded-[1.4rem] rotate-2"><Icon className="h-7 w-7 text-white" /></div>
        <h2 className="font-serif text-2xl sm:text-3xl">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
        {(actionLabel || secondaryLabel) && (
          <div className="mt-6 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
            {actionLabel && onAction && <Button onClick={onAction} className="gap-2">{actionLabel} <ArrowRight className="h-4 w-4" /></Button>}
            {secondaryLabel && onSecondary && <Button variant="outline" onClick={onSecondary}>{secondaryLabel}</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
