import type { ClipClock } from '../clock'
import { decisionAt } from '../signals'
import type {
  DataSource,
  Decision,
  DeviceStatus,
  Evidence,
  Metrics,
  Mode,
  ModeChange,
  ObservedMetrics,
  RunInfo,
  SeriesPoint,
  SimulationMetrics,
} from '../types'

/**
 * Recorded-run backend: replays the bridge's output in public/data/ (written by
 * bridge/convert.py) against the shared clip clock. The Control switch picks the
 * PPO or round-robin timeline; there is no device behind it.
 */
const DATA_BASE = import.meta.env.VITE_STATIC_DATA_URL ?? `${import.meta.env.BASE_URL}data/`
const MODE_KEY = 'stc.staticMode'
/** The series is sampled every 5 s; counts on the feeds follow it. */
const SERIES_STEP_S = 5

interface TimelineFile {
  mode: Mode
  run: string
  processedS: number
  timeline: Decision[]
  series: SeriesPoint[]
}

interface Loaded {
  timelines: Record<Mode, TimelineFile>
  evidence: Evidence
}

async function getJson<T>(name: string): Promise<T> {
  const res = await fetch(`${DATA_BASE}${name}`)
  if (!res.ok) throw new Error(`Could not load ${name}: ${res.status}`)
  return (await res.json()) as T
}

function loadMode(): Mode {
  try {
    const m = localStorage.getItem(MODE_KEY)
    if (m === 'ppo' || m === 'round_robin') return m
  } catch {
    // Storage blocked: fall back to the default.
  }
  return 'ppo'
}

function saveMode(m: Mode): void {
  try {
    localStorage.setItem(MODE_KEY, m)
  } catch {
    // Not persisted; the mode still applies for this page load.
  }
}

/** Latest series point with `t <= time`. */
function seriesAt(series: SeriesPoint[], time: number): { point: SeriesPoint | undefined; index: number } {
  const index = Math.min(series.length - 1, Math.max(0, Math.floor(time / SERIES_STEP_S)))
  return { point: series[index], index }
}

export class StaticDataSource implements DataSource {
  private mode: Mode = loadMode()
  private readonly loaded: Promise<Loaded>
  private readonly clock: ClipClock
  private readonly listeners = new Set<() => void>()
  private history: ModeChange[]

  constructor(clock: ClipClock) {
    this.clock = clock
    this.history = [{ at: new Date().toISOString(), to: this.mode, source: 'recorded runs loaded' }]
    this.loaded = Promise.all([
      getJson<TimelineFile>('ppo_timeline.json'),
      getJson<TimelineFile>('round_robin_timeline.json'),
      getJson<RunInfo>('run_info.json'),
      getJson<ObservedMetrics>('observed_metrics.json'),
      getJson<SimulationMetrics>('simulation_metrics.json'),
    ]).then(([ppo, rr, runInfo, observed, simulation]) => ({
      timelines: { ppo, round_robin: rr },
      evidence: { runInfo, observed, simulation, series: { ppo: ppo.series, round_robin: rr.series } },
    }))
    clock.subscribe(() => this.listeners.forEach((l) => l()))
  }

  async getMode(): Promise<Mode> {
    await this.loaded
    return this.mode
  }

  async setMode(m: Mode): Promise<Mode> {
    await this.loaded
    if (m === this.mode) return m
    this.history.unshift({ at: new Date().toISOString(), from: this.mode, to: m, source: 'timeline switched here' })
    this.mode = m
    saveMode(m)
    this.listeners.forEach((l) => l())
    return m
  }

  /** No device is connected when replaying recorded runs: every value is a placeholder. */
  async getStatus(): Promise<DeviceStatus> {
    const last = this.history.find((h) => h.from)
    return {
      piOnline: false,
      esp32: false,
      cameras: 3,
      placeholder: true,
      lastSwitch: last?.from ? { at: last.at, from: last.from, to: last.to } : undefined,
    }
  }

  async getModeHistory(): Promise<ModeChange[]> {
    return [...this.history]
  }

  subscribeDecisions(cb: (d: Decision) => void): () => void {
    let data: Loaded | null = null
    let lastKey = ''
    let live = true
    const check = () => {
      if (!data) return
      const tl = data.timelines[this.mode]
      const t = this.clock.now()
      const d = decisionAt(tl.timeline, t)
      const { point, index } = seriesAt(tl.series, t)
      const key = `${this.mode}:${d.t}:${index}`
      if (key === lastKey) return
      lastKey = key
      // Counts follow the 5 s series; the segment itself (timing, arms) is unchanged.
      cb(point ? { ...d, queue: point.queue, vehicles: point.vehicles } : d)
    }
    this.loaded.then((l) => {
      if (!live) return
      data = l
      check()
    }, () => {})
    this.listeners.add(check)
    return () => {
      live = false
      this.listeners.delete(check)
    }
  }

  getMetrics(): Promise<Metrics> {
    return Promise.reject(new Error('Recorded runs have no simulated metrics; see the evidence sections.'))
  }

  async getEvidence(): Promise<Evidence | null> {
    return (await this.loaded).evidence
  }
}
