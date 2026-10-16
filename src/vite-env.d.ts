/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `static` (default: recorded runs in public/data/), `mock` or `api`. */
  readonly VITE_DATA_SOURCE?: 'static' | 'mock' | 'api'
  /** Where the static source's JSON lives. Defaults to `<base>data/`. */
  readonly VITE_STATIC_DATA_URL?: string
  /** Base URL of the Pi gateway, e.g. `http://192.168.1.42:8000`. Empty = same origin. */
  readonly VITE_API_BASE_URL?: string
  /** Where approach_{arm}.mp4 live. Defaults to `<base>videos/`. */
  readonly VITE_VIDEO_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
