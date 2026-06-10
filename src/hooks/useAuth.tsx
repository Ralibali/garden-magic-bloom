import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { markLeadConverted, trackEvent } from '@/lib/analytics';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  is_premium?: boolean;
  subscription_status?: string;
  subscription_end?: string | null;
  [key: string]: any;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<any>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toBasicProfile(supaUser: SupabaseUser): UserProfile {
  return {
    id: supaUser.id,
    email: supaUser.email ?? '',
    name: supaUser.user_metadata?.name ?? '',
    is_premium: false,
    subscription_status: 'free',
  };
}

async function buildProfile(supaUser: SupabaseUser): Promise<UserProfile> {
  let subscriptionEnd: string | null = null;
  try {
    const { data } = await supabase.functions.invoke('check-subscription');
    if (data?.subscription_end) subscriptionEnd = data.subscription_end;
  } catch {}

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, subscription_status, premium_expires_at')
    .eq('user_id', supaUser.id)
    .maybeSingle();

  let subStatus = profile?.subscription_status ?? 'free';
  if (subStatus === 'premium' && profile?.premium_expires_at) {
    const expiresAt = new Date(profile.premium_expires_at);
    if (expiresAt < new Date()) {
      // UI:t räknar trialen som slut – databastriggern protect_subscription_fields
      // hindrar klientskrivning, så servern (Stripe-webhook / cron) ansvarar för sync.
      subStatus = 'free';
    }
  }

  return {
    id: supaUser.id,
    email: supaUser.email ?? '',
    name: profile?.display_name ?? supaUser.user_metadata?.name ?? '',
    is_premium: subStatus === 'premium',
    subscription_status: subStatus,
    subscription_end: subscriptionEnd,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const applySession = (session: Session | null, hydrateProfile: boolean) => {
      const supaUser = session?.user ?? null;

      if (!supaUser) {
        if (isMounted) setUser(null);
        return;
      }

      if (isMounted) setUser(toBasicProfile(supaUser));
      if (supaUser.email) void markLeadConverted(supaUser.email, supaUser.id);

      if (hydrateProfile) {
        void buildProfile(supaUser)
          .then((profile) => {
            if (isMounted) setUser(profile);
          })
          .catch(() => {});
      }
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        applySession(session, true);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setUser(null);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        return;
      }

      const shouldHydrateProfile = event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED';
      applySession(session, shouldHydrateProfile);
      if (event === 'SIGNED_IN' && session?.user) {
        void trackEvent('login_completed', { email: session.user.email });
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    await trackEvent('login_started', { email: email.toLowerCase() });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    if (data.user) {
      setUser(toBasicProfile(data.user));
      if (data.user.email) void markLeadConverted(data.user.email, data.user.id);
      void buildProfile(data.user).then(setUser).catch(() => undefined);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    await trackEvent('register_started', { email: email.toLowerCase() });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    if (data.user?.email) {
      void markLeadConverted(data.user.email, data.user.id);
      void trackEvent('register_completed', { email: data.user.email });
    }
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
