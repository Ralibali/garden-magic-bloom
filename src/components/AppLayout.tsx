import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { MobileNav } from './MobileNav';
import { Menu, Sprout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Prevent all /app/* pages from being indexed
function useNoIndex() {
  useEffect(() => {
    let el = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
    const prevContent = el?.getAttribute('content') || '';
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', 'robots');
      document.head.appendChild(el);
    }
    el.setAttribute('content', 'noindex, nofollow');
    return () => { if (el) el.setAttribute('content', prevContent || 'index, follow'); };
  }, []);
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function AppLayout() {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full noise-bg">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          {/* Desktop header */}
          <header className="h-12 hidden md:flex items-center border-b border-border/60 px-5 bg-background/60 backdrop-blur-xl sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          </header>

          {/* Mobile header */}
          <header className="h-14 flex md:hidden items-center justify-center gap-2 border-b border-border/60 px-4 bg-background/70 backdrop-blur-xl sticky top-0 z-30">
            <Sprout className="h-4 w-4 text-primary" />
            <span className="font-serif text-lg text-foreground">Odlingsdagboken</span>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
