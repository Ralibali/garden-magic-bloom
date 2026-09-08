import { isNativeApp } from './lib/native';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./design-system.css";
import "./design-compat.css";
import { attemptRecovery, installRecoveryHandlers } from "./lib/recovery";
import { setupServiceWorker } from "./lib/pwa";

// Restore theme preference before render to avoid flash
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}

// Self-healing recovery for stale PWA / chunk load failures after deploy.
if (!isNativeApp()) { installRecoveryHandlers(); setupServiceWorker(); }
else { document.documentElement.classList.add('native-app'); void import('./native-fonts.css'); }

const htmlPublishId = document.querySelector('meta[name="od-publish-id"]')?.getAttribute('content');
const jsPublishId = import.meta.env.VITE_PUBLISH_ID as string | undefined;
if (htmlPublishId && jsPublishId && htmlPublishId !== jsPublishId) {
  void attemptRecovery(new Error(`publish-unit-mismatch html=${htmlPublishId} js=${jsPublishId}`));
}

createRoot(document.getElementById("root")!).render(<App />);
