/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLISH_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
