import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAchievementCelebration } from '@/hooks/useAchievementCelebration';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { MobileNav } from './MobileNav';
import PublicPlanHandoff from './PublicPlanHandoff';
import { consumeIntentNavigation } from '@/lib/productIntent';
import { Bell, Menu, Sprout } from 'lucide-react';
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
  { path: '/app/odlingar', title: 'Mina odlingar', subtitle: 'En plats för allt som växer.' },
  { path: '/app/timeline', title: 'Min dagbok', subtitle: 'Små ögonblick. Växande erfarenhet.' },
  { path: '/app/beds', title: 'Mina platser', subtitle: 'Bäddar, växthus, balkong och krukor' },
  { path: '/app/sowings', title: 'Sålogg', subtitle: 'Följ varje frö från start' },
  { path: '/app/harvests', title: 'Skördelogg', subtitle: 'Se vad odlingen faktiskt ger' },
  { path: '/app/reminders', title: 'Påminnelser', subtitle: 'Rätt uppgift vid rätt tid' },
  { path: '/app/calendar', title: 'Såkalender', subtitle: 'Planera efter säsong och zon' },
  { path: '/app/gro', title: 'Gro', subtitle: 'Din personliga odlingscoach' },
  { path: '/app/statistics', title: 'Statistik', subtitle: 'Mönster från din egen odling' },
  { path: '/app/my-plants', title: 'Mina växter', subtitle: 'Hälsa, rytm och omsorgshistorik' },
  { path: '/app/photos', title: 'Fotodagbok', subtitle: 'Se hur odlingen förändras' },
  { path: '/app/premium', title: 'Odlingsdagboken Plus', subtitle: 'Mer historik, mer Gro, mer insikt' },
  { path: '/app/settings', title: 'Inställningar', subtitle: 'Anpassa din upplevelse' },
];

function getRouteMeta(pathname: string) {
  if (pathname === '/app') return { title: 'Översikt', subtitle: 'Ditt viktigaste nästa steg' };
  return routeMeta.find(item => pathname.startsWith(item.path)) || { title: 'Odlingsdagboken', subtitle: 'Planera, följ upp och lär' };
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
  useAchievementCelebration();
  const meta = useMemo(() => getRouteMeta(location.pathname), [location.pathname]);
  useNoIndex();

  useEffect(() => {
    if (location.pathname !== '/app') return;
    const dest = consumeIntentNavigation();
    if (!dest || dest.path === '/app') return;
    navigate(dest.path, { state: dest.state, replace: true });
  }, [location.pathname, navigate]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full app-canvas garden-workspace">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-4 backdrop-blur-lg sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3"><SidebarTrigger className="hidden h-9 w-9 md:inline-flex" aria-label="Visa eller dölj sidomenyn"><Menu className="h-4 w-4" /></SidebarTrigger><Sprout className="h-5 w-5 shrink-0 text-primary md:hidden" /><p className="truncate text-sm font-medium">{location.pathname === '/app' ? 'Odlingsdagboken' : meta.title}</p></div>
            <Button variant="ghost" size="icon" aria-label="Påminnelser" className="h-10 w-10 rounded-full" onClick={() => navigate('/app/reminders')}><Bell className="h-5 w-5" /></Button>
          </header>

          <main className="flex-1 px-4 py-6 sm:p-6 lg:p-8 pb-28 md:pb-10 relative z-10">
            <div className="w-full max-w-[1520px] mx-auto">
              <Suspense fallback={<ContentLoader />}>
                <AnimatePresence mode="wait">
                  <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="space-y-6">
                    {plan && <PublicPlanHandoff plan={plan} onNavigate={(path, state) => navigate(path, state ? { state } : undefined)} onDismiss={dismiss} />}
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
