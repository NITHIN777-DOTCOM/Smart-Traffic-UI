import { defineConfig, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import sirv from 'sirv'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE = '/Smart-Traffic-UI/'

/**
 * Serves the local `videos/` folder at `<base>videos/` in dev and preview.
 * The clips are ~125 MB each, so they are git-ignored and never copied into dist/.
 * sirv handles HTTP Range requests, which <video> seeking needs.
 */
function localVideos(): Plugin {
  const dir = resolve(__dirname, 'videos')
  const serve = sirv(dir, { dev: true, etag: true })
  const mount = (middlewares: Connect.Server) => {
    if (!existsSync(dir)) return
    middlewares.use(`${BASE}videos`, serve)
    middlewares.use('/videos', serve)
  }
  return {
    name: 'local-videos',
    configureServer: (server) => mount(server.middlewares),
    configurePreviewServer: (server) => mount(server.middlewares),
  }
}

/** GitHub Pages has no SPA fallback: copy index.html to 404.html so deep links work. */
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const out = resolve(__dirname, 'dist')
      if (existsSync(resolve(out, 'index.html'))) copyFileSync(resolve(out, 'index.html'), resolve(out, '404.html'))
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localVideos(), spaFallback()],
  base: BASE,
  server: {
    port: 5173,
    host: true,
  },
})
