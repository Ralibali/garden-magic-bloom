/**
 * Guarded service-worker registration.
 *
 * The app-shell service worker must never register in dev or in Lovable
 * preview contexts — a cached app shell there serves stale HTML and makes
 * new releases look like nothing changed.
 */

const SW_URL = '/sw.js';

function isBlockedContext(): boolean {
  if (typeof window === 'undefined') return true;
  if (!import.meta.env.PROD) return true;

  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }

  const host = window.location.hostname;
  if (host.startsWith('id-preview--') || host.startsWith('preview--')) return true;
  if (host === 'lovableproject.com' || host.endsWith('.lovableproject.com')) return true;
  if (host === 'lovableproject-dev.com' || host.endsWith('.lovableproject-dev.com')) return true;
  if (host === 'beta.lovable.dev' || host.endsWith('.beta.lovable.dev')) return true;
  if (host === 'localhost' || host === '127.0.0.1') return true;

  if (new URLSearchParams(window.location.search).has('sw') &&
      new URLSearchParams(window.location.search).get('sw') === 'off') return true;

  return false;
}

async function unregisterAppShell(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs.map(async (reg) => {
        const url = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
        if (/firebase-messaging-sw\.js/i.test(url)) return; // leave messaging worker alone
        if (!url || url.includes('/sw.js') || url.includes('/service-worker.js')) {
          await reg.unregister();
        }
      }),
    );
  } catch {
    // ignore
  }
}

export function setupServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  if (isBlockedContext()) {
    void unregisterAppShell();
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(SW_URL).then((reg) => {
      // Pick up a new deploy as soon as it is available.
      void reg.update();
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        next?.addEventListener('statechange', () => {
          if (next.state === 'activated') window.location.reload();
        });
      });
    }).catch(() => {});
  });
}
