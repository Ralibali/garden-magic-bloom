import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { MobileNav } from './MobileNav';
import PublicPlanHandoff from './PublicPlanHandoff';
import { Bell, CalendarDays, Menu, Plus, Sparkles, Sprout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

function useNoIndex() {
  useEffect(() => {
    let element = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
    const previous = element?.getAttribute('content') || '';
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('name', 'robots');
      document.head.appendChild(element);
    }
    element.setAttribute('content', 'noindex, nofollow');
    return () => { if (element) element.setAttribute('content', previous || 'index, follow'); };
  }, []);
}

function useSavedPublicPlan() {
  const [plan, setPlan] = useState<any | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('odlingsdagboken_latest_public_plan');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed?.dismissed) setPlan(parsed);
    } catch { setPlan(null); }
  }, []);
  const dismiss = () => {
    try { localStorage.removeItem('odlingsdagboken_latest_public_plan'); } catch {}
    setPlan(null);
  };
  return { plan, dismiss };
}

const routeMeta = [
  { path: '/app/beds', title: 'Mina bäddar', subtitle: 'Platser, anteckningar och lärdomar' },
  { path: '/app/sowings', title: 'Sålogg', subtitle: 'Följ varje frö från start' },
  { path: '/app/harvests', title: 'Skördelogg', subtitle: 'Se vad odlingen faktiskt ger' },
  { path: '/app/reminders', title: 'Påminnelser', subtitle: 'Rätt uppgift vid rätt tid' },
  { path: '/app/calendar', title: 'Såkalender', subtitle: 'Planera efter säsong och zon' },
  { path: '/app/gro', title: 'Gro', subtitle: 'Din personliga odlingscoach' },
  { path: '/app/statistics', title: 'Statistik', subtitle: 'Mönster från din egen odling' },
  { path: '/app/my-plants', title: 'Mina växter', subtitle: 'Skötsel och status på ett ställe' },
  { path: '/app/photos', title: 'Fotodagbok', subtitle: 'Se hur odlingen förändras' },
  { path: '/app/premium', title: 'Odlingsdagboken Plus', subtitle: 'Mer historik, mer Gro, mer insikt' },
  { path: '/app/settings', title: 'Inställningar', subtitle: 'Anpassa din upplevelse' },
];

function getRouteMeta(pathname: string) {
  if (pathname === '/app') return { title: 'Översikt', subtitle: 'Din odling just nu' };
  return routeMeta.find((item) => pathname.startsWith(item.path)) || { title: 'Odlingsdagboken', subtitle: 'Planera, följ upp och lär' };
}

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

function ContentLoader() {
  return <div className="flex items-center justify-center py-28"><div className="premium-panel flex flex-col items-center gap-3 px-8 py-7"><div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Sprout className="h-6 w-6 text-primary animate-pulse" /></div><p className="text-sm text-muted-foreground">Förbereder din odling…</p></div></div>;
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { plan, dismiss } = useSavedPublicPlan();
  const meta = useMemo(() => getRouteMeta(location.pathname), [location.pathname]);
  const dateLabel = useMemo(() => new Intl.DateTimeFormat('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()), []);
  useNoIndex();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full app-canvas">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
          <header className="h-[72px] hidden md:flex items-center justify-between border-b border-border/55 px-6 lg:px-8 bg-background/72 backdrop-blur-2xl sticky top-0 z-30">
            <div className="flex items-center gap-4 min-w-0">
              <SidebarTrigger className="w-10 h-10 rounded-xl border border-border/70 bg-card/80 text-muted-foreground hover:text-primary hover:bg-card shadow-sm"><Menu className="h-4.5 w-4.5" /></SidebarTrigger>
              <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-0.5">{dateLabel}</p><div className="flex items-baseline gap-2 min-w-0"><h1 className="font-serif text-xl leading-none truncate">{meta.title}</h1><span className="hidden lg:inline text-xs text-muted-foreground truncate">{meta.subtitle}</span></div></div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" aria-label="Påminnelser" onClick={() => navigate('/app/reminders')}><Bell className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" className="hidden lg:inline-flex gap-2" onClick={() => navigate('/app/gro')}><Sparkles className="h-4 w-4 text-primary" /> Fråga Gro</Button>
              <Button size="sm" className="gap-2" onClick={() => navigate('/app/sowings')}><Plus className="h-4 w-4" /> Ny sådd</Button>
            </div>
          </header>

          <header className="h-16 flex md:hidden items-center justify-between border-b border-border/50 px-4 bg-background/80 backdrop-blur-2xl sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0"><div className="w-9 h-9 rounded-xl botanical-panel flex items-center justify-center shrink-0"><Sprout className="h-4.5 w-4.5 text-white" /></div><div className="min-w-0"><p className="font-serif text-[17px] leading-none truncate">{meta.title}</p><p className="text-[10px] text-muted-foreground mt-1 truncate">{meta.subtitle}</p></div></div>
            <Button variant="ghost" size="icon" onClick={() => navigate('/app/calendar')} aria-label="Öppna såkalender"><CalendarDays className="h-4.5 w-4.5" /></Button>
          </header>

          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-28 md:pb-10 relative z-10">
            <div className="w-full max-w-[1520px] mx-auto">
              <Suspense fallback={<ContentLoader />}>
                <AnimatePresence mode="wait">
                  <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="space-y-6">
                    {plan && <PublicPlanHandoff plan={plan} onNavigate={navigate} onDismiss={dismiss} />}
                    <Outlet />
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
