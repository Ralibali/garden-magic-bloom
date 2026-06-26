import { useState, useEffect } from 'react';
import { Home, Sprout, LayoutGrid, Carrot, BarChart3, Settings, LogOut, Crown, Shield, CalendarDays, RefreshCw, Package, Clock, Heart, Bug, Camera, Flower2, BookOpen, Sparkles, Bell, ArrowUpRight } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useGardenProfile } from '@/hooks/useGardenProfile';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const navGroups = [
  {
    label: 'Dagbok',
    items: [
      { title: 'Översikt', url: '/app', icon: Home },
      { title: 'Mina bäddar', url: '/app/beds', icon: LayoutGrid },
      { title: 'Sålogg', url: '/app/sowings', icon: Sprout },
      { title: 'Skördelogg', url: '/app/harvests', icon: Carrot },
      { title: 'Fotodagbok', url: '/app/photos', icon: Camera },
      { title: 'Tidslinje', url: '/app/timeline', icon: Clock },
    ],
  },
  {
    label: 'Planera',
    items: [
      { title: 'Såkalender', url: '/app/calendar', icon: CalendarDays },
      { title: 'Påminnelser', url: '/app/reminders', icon: Bell },
      { title: 'Växtföljd', url: '/app/rotation', icon: RefreshCw },
      { title: 'Samplantering', url: '/app/companion', icon: Heart },
      { title: 'Fröförråd', url: '/app/seeds', icon: Package },
      { title: 'Mina växter', url: '/app/my-plants', icon: Flower2 },
      { title: 'Växtbibliotek', url: '/app/plants', icon: BookOpen },
    ],
  },
  {
    label: 'Insikter',
    items: [
      { title: 'Gro', url: '/app/gro', icon: Sparkles },
      { title: 'Skadedjur', url: '/app/pests', icon: Bug },
      { title: 'Statistik', url: '/app/statistics', icon: BarChart3 },
      { title: 'Inställningar', url: '/app/settings', icon: Settings },
      { title: 'Admin', url: '/app/admin', icon: Shield, adminOnly: true },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const { isVisible } = useGardenProfile();
  const isPremium = user?.subscription_status === 'premium';
  const displayName = (user as any)?.name || user?.email?.split('@')[0] || 'Odlare';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => setIsAdmin(!!data));
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    navigate('/login?mode=login');
  };

  return (
    <Sidebar collapsible="icon" className="hidden md:flex border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[18px_0_50px_-36px_rgba(10,35,23,0.8)]">
      <SidebarContent className="pt-4 overflow-x-hidden">
        <div className={`mx-3 mb-4 rounded-[1.35rem] border border-white/8 bg-white/[0.045] ${collapsed ? 'p-2' : 'p-3.5'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sidebar-primary to-emerald-300 text-sidebar-primary-foreground flex items-center justify-center shrink-0 shadow-lg shadow-black/15"><Sprout className="h-5 w-5" /></div>
            {!collapsed && <div className="min-w-0"><h1 className="font-serif text-[17px] text-white leading-none truncate">Odlingsdagboken</h1><p className="text-[9px] uppercase tracking-[0.16em] text-sidebar-foreground/65 mt-1.5">Odla · logga · lär</p></div>}
          </div>
        </div>

        {navGroups.map((group) => {
          const items = group.items.filter((item) => !(item as any).adminOnly || isAdmin).filter((item) => isVisible(item.url));
          if (!items.length) return null;
          return (
            <SidebarGroup key={group.label} className="py-1">
              {!collapsed && <SidebarGroupLabel className="text-[9px] text-sidebar-foreground/45 uppercase tracking-[0.18em] px-5 mb-1 font-semibold">{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5 px-2">
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined}>
                        <NavLink
                          to={item.url}
                          end={item.url === '/app'}
                          className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/78 hover:text-white hover:bg-white/[0.07] transition-all duration-200"
                          activeClassName="bg-white/[0.11] text-white font-semibold shadow-[inset_0_1px_rgba(255,255,255,0.07)] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-sidebar-primary"
                        >
                          <item.icon className="h-[17px] w-[17px] shrink-0 transition-transform duration-200 group-hover:scale-105" />
                          {!collapsed && <span className="text-[13px] truncate">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-white/8 space-y-3">
        {!collapsed && !isPremium && (
          <button onClick={() => navigate('/app/premium')} className="w-full text-left rounded-2xl border border-sidebar-primary/20 bg-gradient-to-br from-sidebar-primary/16 to-white/[0.04] p-3.5 hover:border-sidebar-primary/40 transition-colors group">
            <div className="flex items-center justify-between gap-2 mb-2"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white"><Crown className="h-3.5 w-3.5 text-sidebar-primary" /> Plus</span><ArrowUpRight className="h-3.5 w-3.5 text-sidebar-foreground/55 group-hover:text-sidebar-primary" /></div>
            <p className="text-[11px] leading-relaxed text-sidebar-foreground/70">Obegränsade bäddar, mer Gro och full statistik.</p>
          </button>
        )}

        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 rounded-2xl bg-white/[0.045] p-2.5'}`}>
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">{initial}</div>
          {!collapsed && <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white truncate">{displayName}</p><p className="text-[10px] text-sidebar-foreground/55 truncate">{isPremium ? 'Plus-medlem' : 'Gratis konto'}</p></div>}
          {!collapsed && <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/60 hover:text-white hover:bg-white/10" onClick={handleLogout} aria-label="Logga ut"><LogOut className="h-3.5 w-3.5" /></Button>}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
