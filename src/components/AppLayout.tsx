import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { MobileNav } from './MobileNav';
import { Menu, Sprout } from 'lucide-react';

export default function AppLayout() {
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
            <Outlet />
          </main>
        </div>

        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
