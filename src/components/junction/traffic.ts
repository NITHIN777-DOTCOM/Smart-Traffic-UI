import type { ClipClock } from '../../data/clock'
import { ARMS } from '../../data/signals'
import type { Arm, Signal } from '../../data/types'

/**
 * Car animation for the junction diagram. Each arm has an incoming lane and an
 * outgoing lane, both measured in px along the direction of travel:
 *   incoming: s = 0 at the far end, s = length at the junction edge
 *   outgoing: s = 0 at the junction edge, s = length at the far end
 * `s` is the position of the car's front bumper.
 */

export const CAR_LEN = 60
const GAP = 10
const V_MAX = 110 // px/s
const ACCEL = 70
const BRAKE = 160 // comfortable deceleration used to plan stops
const BRAKE_HARD = 420
/** Distance from the junction edge to where a stopped car's front bumper rests. */
export const STOP_OFFSET = 18
/** On yellow, cars this close to the stop line keep going. */
const YELLOW_COMMIT = 28
/** How far into the junction square incoming cars travel while fading out. */
const FADE_OUT = 260

const COLORS = ['var(--text)', 'var(--accent)', 'var(--muted)', 'var(--accent-light)', 'var(--lane-mark)']

export interface CarView {
  id: number
  s: number
  color: string
  braking: boolean
  opacity: number
}

interface SimCar extends CarView {
  v: number
}

interface Lane {
  cars: SimCar[] // front-most first
  spawnIn: number
}

export interface ArmInput {
  signal: Signal
  /** Roughly how many cars should be waiting on this arm. */
  targetQueue: number
}

export type TrafficInputs = Record<Arm, ArmInput>

export class TrafficEngine {
  private lengths: Record<Arm, number> = { west: 0, east: 0, south: 0 }
  private incoming = {} as Record<Arm, Lane>
  private outgoing = {} as Record<Arm, Lane>
  private nextId = 1
  private frame = 0
  private listeners = new Set<() => void>()
  private raf = 0
  private lastNow = 0
  private lastClipT = 0
  private lastSeekId = -1
  private needsReset = true
  private readonly clock: ClipClock
  private readonly getInputs: () => TrafficInputs

  constructor(clock: ClipClock, getInputs: () => TrafficInputs) {
    this.clock = clock
    this.getInputs = getInputs
    for (const arm of ARMS) {
      this.incoming[arm] = { cars: [], spawnIn: 0 }
      this.outgoing[arm] = { cars: [], spawnIn: 2 + Math.random() * 4 }
    }
  }

  start(): void {
    this.lastNow = performance.now()
    const loop = (now: number) => {
      this.step(Math.min(0.1, (now - this.lastNow) / 1000))
      this.lastNow = now
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop(): void {
    cancelAnimationFrame(this.raf)
  }

  setLength(arm: Arm, px: number): void {
    if (Math.abs(this.lengths[arm] - px) < 1) return
    this.lengths[arm] = px
    this.needsReset = true
  }

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  getFrame = (): number => this.frame

  view(arm: Arm): { incoming: CarView[]; outgoing: CarView[]; length: number } {
    return { incoming: this.incoming[arm].cars, outgoing: this.outgoing[arm].cars, length: this.lengths[arm] }
  }

  private step(dt: number): void {
    const snap = this.clock.getSnapshot()
    const t = this.clock.now()
    // Seeking (or a large jump) rebuilds the scene from the current signal state.
    if (snap.seekId !== this.lastSeekId || Math.abs(t - this.lastClipT) > 3) this.needsReset = true
    this.lastSeekId = snap.seekId
    this.lastClipT = t

    const inputs = this.getInputs()
    if (this.needsReset) {
      this.reset(inputs)
      this.needsReset = false
    }
    if (snap.playing && dt > 0) {
      for (const arm of ARMS) {
        if (this.lengths[arm] <= 0) continue
        this.stepIncoming(arm, inputs[arm], dt)
        this.stepOutgoing(arm, inputs, dt)
      }
    }
    this.frame++
    this.listeners.forEach((l) => l())
  }

  private newCar(s: number, v: number): SimCar {
    const id = this.nextId++
    return { id, s, v, color: COLORS[id % COLORS.length], braking: v === 0, opacity: 1 }
  }

  private capacity(arm: Arm): number {
    return Math.max(0, Math.floor((this.lengths[arm] - STOP_OFFSET) / (CAR_LEN + GAP)))
  }

  private reset(inputs: TrafficInputs): void {
    for (const arm of ARMS) {
      const len = this.lengths[arm]
      const lane = this.incoming[arm]
      lane.cars = []
      lane.spawnIn = 0.5
      this.outgoing[arm].cars = []
      if (len <= 0) continue
      const { signal, targetQueue } = inputs[arm]
      if (signal === 'green') {
        for (let s = len - 80; s > CAR_LEN; s -= 150 + Math.random() * 80) lane.cars.push(this.newCar(s, V_MAX))
      } else {
        const n = Math.min(this.capacity(arm), Math.round(targetQueue))
        for (let i = 0; i < n; i++) lane.cars.push(this.newCar(len - STOP_OFFSET - i * (CAR_LEN + GAP), 0))
      }
    }
  }

  private stepIncoming(arm: Arm, input: ArmInput, dt: number): void {
    const len = this.lengths[arm]
    const stopAt = len - STOP_OFFSET
    const lane = this.incoming[arm]

    lane.cars.forEach((car, i) => {
      let limit = Infinity
      if (i > 0) limit = lane.cars[i - 1].s - CAR_LEN - GAP
      const beforeLine = car.s <= stopAt + 0.5
      const mustStop =
        beforeLine && (input.signal === 'red' || (input.signal === 'yellow' && car.s < stopAt - YELLOW_COMMIT))
      if (mustStop) limit = Math.min(limit, stopAt)

      const dist = limit - car.s
      const vTarget = Math.min(V_MAX, Math.sqrt(2 * BRAKE * Math.max(0, dist - 0.5)))
      const prev = car.v
      car.v = car.v < vTarget ? Math.min(vTarget, car.v + ACCEL * dt) : Math.max(vTarget, car.v - BRAKE_HARD * dt)
      car.s = Math.min(car.s + car.v * dt, limit)
      car.braking = beforeLine && (car.v < prev - 0.01 || car.v < 3)
      car.opacity = car.s > len ? Math.max(0, 1 - (car.s - len) / FADE_OUT) : 1
    })
    lane.cars = lane.cars.filter((c) => c.s < len + FADE_OUT)

    // Spawn at the far end: steady flow on green, fill up towards the target queue otherwise.
    lane.spawnIn -= dt
    const waiting = lane.cars.filter((c) => c.s <= stopAt + 0.5).length
    const last = lane.cars[lane.cars.length - 1]
    const roomAtEntry = !last || last.s - CAR_LEN - GAP > CAR_LEN
    const wanted =
      input.signal === 'green' ? waiting < this.capacity(arm) : waiting < Math.min(this.capacity(arm), input.targetQueue)
    if (lane.spawnIn <= 0 && roomAtEntry && wanted) {
      lane.cars.push(this.newCar(0, V_MAX * 0.8))
      lane.spawnIn = input.signal === 'green' ? 1.8 + Math.random() * 1.8 : 0.9 + Math.random() * 0.9
    }
  }

  private stepOutgoing(arm: Arm, inputs: TrafficInputs, dt: number): void {
    const len = this.lengths[arm]
    const lane = this.outgoing[arm]
    for (const car of lane.cars) {
      car.v = Math.min(V_MAX, car.v + ACCEL * dt)
      car.s += car.v * dt
      car.opacity = Math.min(1, car.s / 80)
      car.braking = false
    }
    lane.cars = lane.cars.filter((c) => c.s < len + CAR_LEN)

    // Occasional cars leave the junction, more often while another arm is discharging.
    lane.spawnIn -= dt
    const othersFlowing = ARMS.some((a) => a !== arm && inputs[a].signal === 'green')
    const last = lane.cars[lane.cars.length - 1]
    if (lane.spawnIn <= 0 && (!last || last.s > CAR_LEN * 2)) {
      if (othersFlowing) lane.cars.push(this.newCar(0, V_MAX * 0.7))
      lane.spawnIn = othersFlowing ? 3 + Math.random() * 5 : 2
    }
  }
}
