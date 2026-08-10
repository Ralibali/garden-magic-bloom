import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./design-system.css";
import "./design-compat.css";
import { installRecoveryHandlers } from "./lib/recovery";
import { setupServiceWorker } from "./lib/pwa";

// Restore theme preference before render to avoid flash
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}

// Self-healing recovery for stale PWA / chunk load failures after deploy.
installRecoveryHandlers();

createRoot(document.getElementById("root")!).render(<App />);
