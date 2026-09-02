import { spawn } from "node:child_process";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

const PUBLISH_ID = `od-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Production (Lovable Cloud) serves dist files, then SPA-falls back to index.html.
 * `vite preview` is not that host. Run prerender inside closeBundle so a bare
 * `vite build` (what Lovable may invoke) still writes dist/funktioner/index.html.
 *
 * HTML + JS must be one publish unit: the same hashed index-*.js that the
 * router lives in is stamped into every prerendered file.
 */
function prerenderOnBuild(): Plugin {
  return {
    name: "prerender-on-build",
    apply: "build",
    enforce: "post",
    closeBundle() {
      return new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, ["scripts/prerender.mjs"], {
          cwd: path.resolve(__dirname),
          stdio: "inherit",
          env: { ...process.env, OD_PUBLISH_ID: PUBLISH_ID },
        });
        child.on("exit", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`prerender exited ${code}`));
        });
        child.on("error", reject);
      });
    },
  };
}

function stampPublishId(): Plugin {
  return {
    name: "stamp-publish-id",
    transformIndexHtml(html) {
      const tag = `<meta name="od-publish-id" content="${PUBLISH_ID}" />`;
      if (html.includes('name="od-publish-id"')) {
        return html.replace(/<meta\s+name="od-publish-id"[^>]*>/i, tag);
      }
      return html.replace("</head>", `    ${tag}\n  </head>`);
    },
  };
}

export default defineConfig(({ mode }) => ({
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://ysonnvbkrwajacvdkqut.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlzb25udmJrcndhamFjdmRrcXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4Mzg5MjEsImV4cCI6MjA4ODQxNDkyMX0.noi4GzE33SVpbFvdwOmGiNpaq6KfY3IcRSJYwJwQ0Ww'),
    'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify('ysonnvbkrwajacvdkqut'),
    'import.meta.env.VITE_PUBLISH_ID': JSON.stringify(PUBLISH_ID),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      devOptions: { enabled: false },
      includeAssets: ["favicon.ico", "favicon.svg"],
      workbox: {
        globPatterns: ["**/*.{js,css,ico,png,svg,jpg,webp,woff2}"],
        navigateFallback: undefined,
        navigateFallbackDenylist: [/^\/~oauth/],
        importScripts: ["push-sw.js"],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // HTML navigations must never be served cache-first, otherwise a
            // new release keeps showing the previously cached app shell.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-navigations-v3",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 20 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com/,
            handler: "CacheFirst",
            options: {
              cacheName: "unsplash-images",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: "Odlingsdagboken",
        short_name: "Odling",
        description: "Din digitala odlingsdagbok – logga sådder, skördar och växtföljd.",
        theme_color: "#4A7C59",
        background_color: "#FAF9F6",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/app",
        categories: ["lifestyle", "productivity"],
        lang: "sv",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
    visualizer({ filename: "bundle-stats.html", gzipSize: true, brotliSize: true, open: false }),
    stampPublishId(),
    prerenderOnBuild(),
  ].filter(Boolean),
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) return 'vendor';
          if (id.includes('node_modules/@radix-ui')) return 'radix';
          if (id.includes('node_modules/framer-motion')) return 'framer';
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
