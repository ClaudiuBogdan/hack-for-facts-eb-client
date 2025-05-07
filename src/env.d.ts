/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PYODIDE_CDN_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly PYODIDE_CDN_URL: string;
  }
}
