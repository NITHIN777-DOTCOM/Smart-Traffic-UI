import type {
  DataSource,
  Decision,
  DeviceStatus,
  Metrics,
  MetricsRange,
  Mode,
  ModeChange,
} from '../types'

/**
 * Real backend on the Raspberry Pi. Not wired up yet: the endpoint shapes
 * below are the agreed plan, but nothing here has run against a real server.
 *
 * Select it with VITE_DATA_SOURCE=api and point VITE_API_BASE_URL at the Pi.
 */
export class ApiDataSource implements DataSource {
  private readonly base: string

  constructor(base = import.meta.env.VITE_API_BASE_URL ?? '') {
    this.base = base.replace(/\/$/, '')
  }

  // TODO: GET /api/mode → { mode: Mode }
  async getMode(): Promise<Mode> {
    const body = await this.json<{ mode: Mode }>('/api/mode')
    return body.mode
  }

  // TODO: POST /api/mode { mode } → { mode } once the Pi has finished yellow + all-red clearance.
  async setMode(m: Mode): Promise<Mode> {
    const body = await this.json<{ mode: Mode }>('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: m }),
    })
    return body.mode
  }

  // TODO: GET /api/status → DeviceStatus
  getStatus(): Promise<DeviceStatus> {
    return this.json<DeviceStatus>('/api/status')
  }

  // TODO: confirm endpoint with the Pi service — GET /api/mode/history → ModeChange[]
  getModeHistory(): Promise<ModeChange[]> {
    return this.json<ModeChange[]>('/api/mode/history')
  }

  // TODO: WebSocket /ws/decisions — one Decision JSON per message. Add reconnect/backoff.
  subscribeDecisions(cb: (d: Decision) => void): () => void {
    const url = new URL(`${this.base}/ws/decisions`, window.location.href)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(url)
    ws.onmessage = (e) => cb(JSON.parse(e.data as string) as Decision)
    return () => ws.close()
  }

  // TODO: metrics endpoint not specified yet — e.g. GET /api/metrics?range=clip|session → Metrics
  getMetrics(range: MetricsRange): Promise<Metrics> {
    return this.json<Metrics>(`/api/metrics?range=${range}`)
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, init)
    if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status}`)
    return (await res.json()) as T
  }
}
