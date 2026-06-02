/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_BASE_PATH?: string;
  readonly VITE_CONTROL_PLANE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
