import type { ClipClock } from '../clock'
import { decisionAt } from '../signals'
import type {
  DataSource,
  Decision,
  DeviceStatus,
  Metrics,
  MetricsRange,
  Mode,
  ModeChange,
} from '../types'
import ppoTimeline from './ppo_timeline.json'
import {
  adaptivePolicy,
  CLIP_S,
  CLIP_SEED,
  downsample,
  makeArrivals,
  replay,
  roundRobin,
  SESSION_S,
  SESSION_SEED,
  simulate,
  summarise,
} from './sim'

/** Simulated Pi round-trip plus clearance before a mode switch is confirmed. */
const SWITCH_LATENCY_MS = 1800

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
const delay = <T,>(value: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(value), ms))

/**
 * Mock backend. PPO mode replays ppo_timeline.json against the shared clip
 * clock; round-robin mode runs the fixed West → East → South cycle.
 */
export class MockDataSource implements DataSource {
  private mode: Mode = 'ppo'
  private history: ModeChange[] = [
    { at: minutesAgo(4), from: 'round_robin', to: 'ppo', source: 'from this dashboard' },
    { at: minutesAgo(19), from: 'ppo', to: 'round_robin', source: 'from this dashboard' },
    { at: minutesAgo(42), to: 'round_robin', source: 'on boot' },
  ]
  private readonly timelines: Record<Mode, Decision[]>
  private readonly clock: ClipClock
  private readonly listeners = new Set<() => void>()
  private metricsCache = new Map<MetricsRange, Metrics>()

  constructor(clock: ClipClock) {
    this.clock = clock
    this.timelines = { ppo: ppoTimeline as Decision[], round_robin: buildRoundRobinTimeline() }
    clock.subscribe(() => this.listeners.forEach((l) => l()))
  }

  getMode(): Promise<Mode> {
    return delay(this.mode)
  }

  async setMode(m: Mode): Promise<Mode> {
    if (m === this.mode) return m
    await delay(null, SWITCH_LATENCY_MS)
    this.history.unshift({ at: new Date().toISOString(), from: this.mode, to: m, source: 'from this dashboard' })
    this.mode = m
    this.listeners.forEach((l) => l())
    return m
  }

  getStatus(): Promise<DeviceStatus> {
    const last = this.history.find((h) => h.from)
    return delay({
      piOnline: true,
      ip: '192.168.1.42',
      esp32: true,
      cameras: 3,
      lastSwitch: last?.from ? { at: last.at, from: last.from, to: last.to } : undefined,
    })
  }

  getModeHistory(): Promise<ModeChange[]> {
    return delay([...this.history])
  }

  subscribeDecisions(cb: (d: Decision) => void): () => void {
    let current: Decision | undefined
    const check = () => {
      const d = decisionAt(this.timelines[this.mode], this.clock.now())
      if (d !== current) {
        current = d
        cb(d)
      }
    }
    this.listeners.add(check)
    check()
    return () => this.listeners.delete(check)
  }

  getMetrics(range: MetricsRange): Promise<Metrics> {
    let m = this.metricsCache.get(range)
    if (!m) {
      m = buildMetrics(range, this.timelines.ppo)
      this.metricsCache.set(range, m)
    }
    return delay(m, 250)
  }
}

function buildRoundRobinTimeline(): Decision[] {
  return simulate(roundRobin(), makeArrivals(CLIP_S, CLIP_SEED), CLIP_S, { seed: CLIP_SEED }).decisions
}

function buildMetrics(range: MetricsRange, clipTimeline: Decision[]): Metrics {
  const horizonS = range === 'clip' ? CLIP_S : SESSION_S
  const arrivals = range === 'clip' ? makeArrivals(CLIP_S, CLIP_SEED) : makeArrivals(SESSION_S, SESSION_SEED)
  const ppo = simulate(range === 'clip' ? replay(clipTimeline) : adaptivePolicy(), arrivals, horizonS, {
    seed: CLIP_SEED,
  })
  const rr = simulate(roundRobin(), arrivals, horizonS)
  const step = range === 'clip' ? 15 : 60
  const ppoSeries = downsample(ppo.queueTotal, step)
  const rrSeries = downsample(rr.queueTotal, step)
  return {
    range,
    horizonS,
    ppo: summarise(ppo),
    roundRobin: summarise(rr),
    queueSeries: ppoSeries.map((p, i) => ({ t: p.t, ppo: p.v, roundRobin: rrSeries[i].v })),
    decisions: range === 'clip' ? clipTimeline : ppo.decisions,
  }
}
