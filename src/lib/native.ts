import { Capacitor } from '@capacitor/core';

export const isNativeApp = () => Capacitor.isNativePlatform();
export const authWebOrigin = () => isNativeApp() ? 'https://odlingsdagboken.com' : window.location.origin;
export function assertWebPurchase() {
  if (isNativeApp()) throw new Error('Köp kan inte göras i mobilappen.');
}
export function nativePathAllowed(path: string) {
  try { path = decodeURIComponent(path).toLowerCase().replace(/\/+$/, '') || '/'; } catch { return false; }
  if (path.includes('%') || path.includes('\\') || path.includes('//')) return false;
  if (['/', '/faltdagbok', '/login', '/reset-password', '/terms', '/radera-konto'].includes(path)) return true;
  return (path === '/app' || path.startsWith('/app/')) &&
    !/^\/app\/(premium|admin)(\/|$)/.test(path);
}
