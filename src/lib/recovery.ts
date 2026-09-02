/**
 * Self-healing recovery for stale PWA / chunk load failures.
 *
 * Handles the "vit sida efter deploy" case: a returning user has an old
 * index.html (via cached SW) pointing at hashed chunks that no longer exist,
 * or vite:preloadError firing for a stale modulepreload.
 *
 * Design constraints:
 *  - One-shot per browser session (sessionStorage flag) → no reload loops.
 *  - Only unregisters/cleans the app-shell SW ("/sw.js"). Leaves messaging
 *    workers (push-sw / firebase-messaging-sw) alone.
 *  - Preserves localStorage (theme, cookie consent, Supabase auth session).
 *  - Skipped entirely in dev / Lovable preview / iframe.
 */

const RECOVERY_FLAG = 'odling_recovery_attempted_v1';

function isPreviewOrDev(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (!import.meta.env.PROD) return true;
  } catch {
    // ignore
  }
  const host = window.location.hostname;
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('id-preview--') ||
    host.startsWith('preview--') ||
    host === 'lovableproject.com' ||
    host.endsWith('.lovableproject.com') ||
    host === 'lovableproject-dev.com' ||
    host.endsWith('.lovableproject-dev.com') ||
    host === 'beta.lovable.dev' ||
    host.endsWith('.beta.lovable.dev')
  ) {
    return true;
  }
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  return false;
}

function looksLikeChunkLoadError(reason: unknown): boolean {
  if (!reason) return false;
  const msg =
    (reason as { message?: string })?.message ??
    (typeof reason === 'string' ? reason : '') ??
    '';
  const name = (reason as { name?: string })?.name ?? '';
  if (name === 'ChunkLoadError') return true;
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Loading CSS chunk [\w-]+ failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /modulepreload/i.test(msg) ||
    /publish-unit-mismatch/i.test(msg)
  );
}

async function purgeAppShellCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const keys = await caches.keys();
    // Only touch Workbox app-shell caches, not push/messaging caches.
    const targets = keys.filter((k) =>
      /(^|-)workbox-|(^|-)precache-v\d+-|(^|-)runtime-/i.test(k),
    );
    await Promise.allSettled(targets.map((k) => caches.delete(k)));
  } catch {
    // ignore
  }
}

async function unregisterAppShellSW(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs.map(async (reg) => {
        const url =
          reg.active?.scriptURL ||
          reg.installing?.scriptURL ||
          reg.waiting?.scriptURL ||
          '';
        // Leave dedicated messaging workers alone.
        if (/firebase-messaging-sw\.js/i.test(url)) return;
        await reg.unregister();
      }),
    );
  } catch {
    // ignore
  }
}

let recovering = false;

export async function attemptRecovery(reason: unknown): Promise<boolean> {
  if (isPreviewOrDev()) return false;
  if (recovering) return true;
  if (!looksLikeChunkLoadError(reason)) return false;

  try {
    if (sessionStorage.getItem(RECOVERY_FLAG)) {
      // Already tried this session — don't loop.
      return false;
    }
    sessionStorage.setItem(RECOVERY_FLAG, String(Date.now()));
  } catch {
    // sessionStorage unavailable — bail rather than risk a loop.
    return false;
  }

  recovering = true;
  
  console.warn('[recovery] chunk/preload failure detected, self-healing…', reason);

  await purgeAppShellCaches();
  await unregisterAppShellSW();

  const url = new URL(window.location.href);
  url.searchParams.set('v', String(Date.now()));
  window.location.replace(url.toString());
  return true;
}

export function installRecoveryHandlers(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('vite:preloadError', (event) => {
    const anyEvent = event as Event & { payload?: unknown };
    void attemptRecovery(anyEvent.payload ?? new Error('vite:preloadError'));
  });

  window.addEventListener('unhandledrejection', (event) => {
    void attemptRecovery(event.reason);
  });

  window.addEventListener('error', (event) => {
    void attemptRecovery(event.error ?? event.message);
  });
}

export function isChunkLoadError(err: unknown): boolean {
  return looksLikeChunkLoadError(err);
}
