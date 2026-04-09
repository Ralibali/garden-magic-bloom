import { useState, useEffect } from 'react';
import { Home, Sprout, LayoutGrid, Carrot, BarChart3, Settings, LogOut, Crown, Shield, CalendarDays, RefreshCw, Package, Clock, Heart, Bug, Camera, Flower2, BookOpen, Sparkles } from 'lucide-react';
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
      { title: 'Hem', url: '/app', icon: Home },
      { title: 'Mina bäddar', url: '/app/beds', icon: LayoutGrid },
      { title: 'Sålogg', url: '/app/sowings', icon: Sprout },
      { title: 'Skördlogg', url: '/app/harvests', icon: Carrot },
      { title: 'Fotodagbok', url: '/app/photos', icon: Camera },
      { title: 'Tidslinje', url: '/app/timeline', icon: Clock },
    ],
  },
  {
    label: 'Planering',
    items: [
      { title: 'Mina växter', url: '/app/my-plants', icon: Flower2 },
      { title: 'Växtbibliotek', url: '/app/plants', icon: BookOpen },
      { title: 'Såkalender', url: '/app/calendar', icon: CalendarDays },
      { title: 'Växtföljd', url: '/app/rotation', icon: RefreshCw },
      { title: 'Samplantering', url: '/app/companion', icon: Heart },
      { title: 'Fröförråd', url: '/app/seeds', icon: Package },
    ],
  },
  {
    label: 'Verktyg',
    items: [
      { title: 'Gro', url: '/app/gro', icon: Sparkles },
      { title: 'Skadedjur', url: '/app/pests', icon: Bug },
      { title: 'Statistik', url: '/app/statistics', icon: BarChart3 },
      { title: 'Premium', url: '/app/premium', icon: Crown },
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

  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => setIsAdmin(!!data));
  }, [user?.id]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <Sidebar collapsible="icon" className="hidden md:flex border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="pt-5">
        <div className="px-5 pb-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sprout className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-serif text-lg text-foreground leading-none">Odlingsdagboken</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">Din digitala odlingsassistent</p>
            </div>
          )}
        </div>

        {navGroups.map((group) => {
          const items = group.items
            .filter(item => !(item as any).adminOnly || isAdmin)
            .filter(item => isVisible(item.url));
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              {!collapsed && <SidebarGroupLabel className="text-[10px] text-muted-foreground/70 uppercase tracking-[0.14em] px-5 mb-1 font-medium">{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} end={item.url === '/app'} className="flex items-center gap-3 px-5 py-2 mx-2 rounded-xl text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/70 transition-all duration-200" activeClassName="bg-primary/12 text-primary font-medium shadow-sm">
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          {!collapsed && <span className="text-[13px]">{item.title}</span>}
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

      <SidebarFooter className="p-4 space-y-2 border-t border-sidebar-border">
        {!collapsed && (
          <>
            <div className="px-1">
              <p className="text-sm font-medium text-foreground truncate">{(user as any)?.name || 'Användare'}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/70 rounded-xl h-9" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Logga ut
            </Button>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
