/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `mock` (default) or `api`. */
  readonly VITE_DATA_SOURCE?: 'mock' | 'api'
  /** Base URL of the Pi gateway, e.g. `http://192.168.1.42:8000`. Empty = same origin. */
  readonly VITE_API_BASE_URL?: string
  /** Where approach_{arm}.mp4 live. Defaults to `<base>videos/`. */
  readonly VITE_VIDEO_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
