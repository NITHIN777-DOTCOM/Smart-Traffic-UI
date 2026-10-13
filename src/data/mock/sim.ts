/**
 * Tiny deterministic queue simulator behind the mock data. It produces the
 * PPO decision timeline (via scripts/gen-ppo-timeline.ts), the round-robin
 * cycle, and every dashboard number, so all mock figures agree with each other.
 *
 * Imports carry `.ts` extensions so Node can run the generator script directly.
 */
import { ARMS, CLEARANCE_S, YELLOW_S } from '../signals.ts'
import type { Arm, ControllerSummary, Decision, Signal } from '../types.ts'

export const CLIP_S = 600
export const SESSION_S = 3600
export const CLIP_SEED = 7
export const SESSION_SEED = 11
export const RR_GREEN_S = 30
/** Vehicles discharged per second of green. */
const SAT_FLOW = 0.55
/** Mean arrivals per second before surges. */
const BASE_DEMAND: Record<Arm, number> = { west: 0.12, east: 0.095, south: 0.055 }

type Rand = () => number

function mulberry32(seed: number): Rand {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const perArm = <T,>(f: (arm: Arm) => T): Record<Arm, T> => ({
  west: f('west'),
  east: f('east'),
  south: f('south'),
})

/** Per-second arrivals; demand surges on each arm in turn so adapting pays off. */
export function makeArrivals(horizonS: number, seed: number): Record<Arm, Uint8Array> {
  const rand = mulberry32(seed)
  const out = perArm(() => new Uint8Array(horizonS))
  for (let t = 0; t < horizonS; t++) {
    ARMS.forEach((arm, i) => {
      const surge = 1 + 0.8 * Math.max(0, Math.sin((t / 200) * Math.PI + i * 2.1))
      const p = BASE_DEMAND[arm] * surge
      const r = rand()
      out[arm][t] = r < p * p * 0.25 ? 2 : r < p ? 1 : 0
    })
  }
  return out
}

export interface Controller {
  next(t: number, queue: Record<Arm, number>, last: Arm | null): { arm: Arm; durationS: number }
}

export const roundRobin = (): Controller => ({
  next: (_t, _q, last) => ({
    arm: last ? ARMS[(ARMS.indexOf(last) + 1) % ARMS.length] : ARMS[0],
    durationS: RR_GREEN_S,
  }),
})

/**
 * Stand-in for the PPO policy when generating mock data: serve the longest
 * queue (with a starvation bonus), green time sized to clear it.
 */
export const adaptivePolicy = (): Controller => {
  const lastGreen = perArm(() => 0)
  return {
    next(t, q, last) {
      let best: Arm = ARMS[0]
      let bestScore = -Infinity
      for (const arm of ARMS) {
        const score = q[arm] + (t - lastGreen[arm]) / 25 - (arm === last ? 4 : 0)
        if (score > bestScore) {
          bestScore = score
          best = arm
        }
      }
      lastGreen[best] = t
      const needed = q[best] / 0.45 + 5
      return { arm: best, durationS: Math.min(45, Math.max(15, Math.round(needed / 5) * 5)) }
    },
  }
}

export const replay = (timeline: Decision[]): Controller => {
  let i = 0
  return { next: () => timeline[Math.min(i++, timeline.length - 1)] }
}

export interface SimResult {
  horizonS: number
  decisions: Decision[]
  /** Total queued vehicles at each second. */
  queueTotal: number[]
  queueSeconds: Record<Arm, number>
  arrived: Record<Arm, number>
  departed: Record<Arm, number>
  signalSeconds: Record<Arm, Record<Signal, number>>
}

export function simulate(
  controller: Controller,
  arrivals: Record<Arm, Uint8Array>,
  horizonS: number,
  opts: { seed?: number } = {},
): SimResult {
  const rand = mulberry32(opts.seed ?? 1)
  const queue = perArm(() => 0)
  const credit = perArm(() => 0)
  const res: SimResult = {
    horizonS,
    decisions: [],
    queueTotal: [],
    queueSeconds: perArm(() => 0),
    arrived: perArm(() => 0),
    departed: perArm(() => 0),
    signalSeconds: perArm(() => ({ green: 0, yellow: 0, red: 0 })),
  }

  let t = 0
  let last: Arm | null = null
  while (t < horizonS) {
    const { arm, durationS } = controller.next(t, { ...queue }, last)
    const vehicles = perArm((a) => queue[a] + Math.floor(rand() * 4))
    res.decisions.push({
      t,
      arm,
      signal: 'green',
      durationS,
      queue: { ...queue },
      vehicles,
    })
    last = arm

    for (let s = 0; s < durationS + CLEARANCE_S && t < horizonS; s++, t++) {
      for (const a of ARMS) {
        queue[a] += arrivals[a][t]
        res.arrived[a] += arrivals[a][t]
        const signal: Signal =
          a !== arm || s >= durationS + YELLOW_S ? 'red' : s < durationS ? 'green' : 'yellow'
        res.signalSeconds[a][signal]++
        if (signal === 'green' && queue[a] > 0) {
          credit[a] += SAT_FLOW
          if (credit[a] >= 1) {
            credit[a] -= 1
            queue[a]--
            res.departed[a]++
          }
        } else {
          credit[a] = 0
        }
        res.queueSeconds[a] += queue[a]
      }
      res.queueTotal.push(queue.west + queue.east + queue.south)
    }
  }
  return res
}

const sum = (r: Record<Arm, number>) => r.west + r.east + r.south
const round1 = (n: number) => Math.round(n * 10) / 10

export function summarise(r: SimResult): ControllerSummary {
  const perH = 3600 / r.horizonS
  return {
    avgWaitS: round1(sum(r.queueSeconds) / Math.max(1, sum(r.arrived))),
    avgQueue: round1(r.queueTotal.reduce((a, b) => a + b, 0) / r.queueTotal.length),
    throughputPerH: Math.round(sum(r.departed) * perH),
    switchesPerH: Math.round(r.decisions.length * perH),
    vehiclesDetected: sum(r.arrived),
    perArm: perArm((a) => ({
      throughputPerH: Math.round(r.departed[a] * perH),
      avgWaitS: round1(r.queueSeconds[a] / Math.max(1, r.arrived[a])),
      share: {
        green: r.signalSeconds[a].green / r.horizonS,
        yellow: r.signalSeconds[a].yellow / r.horizonS,
        red: r.signalSeconds[a].red / r.horizonS,
      },
    })),
  }
}

/** Mean of `values` over consecutive windows of `step` seconds. */
export function downsample(values: number[], step: number): { t: number; v: number }[] {
  const out: { t: number; v: number }[] = []
  for (let i = 0; i < values.length; i += step) {
    const win = values.slice(i, i + step)
    out.push({ t: i + step, v: round1(win.reduce((a, b) => a + b, 0) / win.length) })
  }
  return out
}
