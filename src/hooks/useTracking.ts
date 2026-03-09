import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

function getSessionId(): string {
  let id = sessionStorage.getItem('_sid');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('_sid', id);
  }
  return id;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

/** Track page views on route change */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Skip tracking in app routes for privacy, only track public pages
    const path = location.pathname;

    supabase.from('page_views').insert({
      path,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      session_id: getSessionId(),
      device_type: getDeviceType(),
    } as any).then(() => {});
  }, [location.pathname]);
}

const CTA_KEYWORDS = new Set([
  'kom igång', 'skapa konto', 'registrera', 'logga in', 'uppgradera',
  'köp', 'testa gratis', 'prova', 'ladda ner', 'boka', 'prenumerera',
  'läs mer', 'visa mer', 'börja nu', 'starta',
]);

function isCta(text: string): boolean {
  const lower = text.toLowerCase().trim();
  for (const kw of CTA_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }
  return false;
}

/** Auto-track clicks on links, buttons, and interactive elements */
export function useAutoClickTracking() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      let el = e.target as HTMLElement | null;
      let depth = 0;

      // Walk up to find clickable element
      while (el && depth < 6) {
        const tag = el.tagName?.toLowerCase();
        const role = el.getAttribute('role');
        if (tag === 'a' || tag === 'button' || role === 'button' || role === 'link' || role === 'menuitem') break;
        el = el.parentElement;
        depth++;
      }

      if (!el) return;

      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').trim().slice(0, 80);
      const href = el.getAttribute('href') || '';
      const trackId = el.getAttribute('data-track') || el.id || '';
      const ctaMatch = isCta(text);

      let eventName = 'button_click';
      if (ctaMatch) {
        eventName = 'cta_click';
      } else if (tag === 'a' && href.startsWith('/blogg/')) {
        eventName = 'blog_link_click';
      } else if (tag === 'a' && (href.startsWith('http') || href.startsWith('//'))) {
        eventName = 'external_link_click';
      } else if (tag === 'a') {
        eventName = 'nav_click';
      }

      supabase.from('click_events').insert({
        event_name: eventName,
        element_id: trackId || null,
        element_text: text || null,
        path: window.location.pathname,
        session_id: getSessionId(),
        metadata: { tag, href: href.slice(0, 200), isCta: ctaMatch },
      } as any).then(() => {});
    };

    document.addEventListener('click', handler, { capture: true, passive: true });
    return () => document.removeEventListener('click', handler, true);
  }, []);
}
