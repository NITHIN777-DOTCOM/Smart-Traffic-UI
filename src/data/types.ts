export type Mode = 'ppo' | 'round_robin'
export type Arm = 'west' | 'east' | 'south'
export type Signal = 'green' | 'yellow' | 'red'

/** One detection box; x/y/w/h are fractions (0–1) of the video frame. */
export interface Detection {
  label: string
  conf: number
  x: number
  y: number
  w: number
  h: number
}

/** A controller decision: `arm` gets `signal` (green) for `durationS`, starting at clip time `t`. */
export interface Decision {
  /** Clip seconds. */
  t: number
  arm: Arm
  signal: Signal
  durationS: number
  queue: Record<Arm, number>
  vehicles: Record<Arm, number>
  detections?: Record<Arm, Detection[]>
}

export interface DeviceStatus {
  piOnline: boolean
  ip?: string
  esp32: boolean
  cameras: number
  lastSwitch?: { at: string; from: Mode; to: Mode }
}

export interface ModeChange {
  at: string
  /** Absent for the boot entry. */
  from?: Mode
  to: Mode
  source: string
}

export type MetricsRange = 'clip' | 'session'

export interface ArmSummary {
  throughputPerH: number
  avgWaitS: number
  /** Fractions of the range spent in each signal state; sum to 1. */
  share: Record<Signal, number>
}

export interface ControllerSummary {
  avgWaitS: number
  avgQueue: number
  throughputPerH: number
  switchesPerH: number
  vehiclesDetected: number
  perArm: Record<Arm, ArmSummary>
}

export interface Metrics {
  range: MetricsRange
  horizonS: number
  ppo: ControllerSummary
  roundRobin: ControllerSummary
  /** Total vehicles queued across all arms, sampled over the range. */
  queueSeries: { t: number; ppo: number; roundRobin: number }[]
  /** PPO decisions in the range, oldest first. */
  decisions: Decision[]
}

export interface DataSource {
  getMode(): Promise<Mode>
  /** Resolves with the confirmed mode once the controller has applied it. */
  setMode(m: Mode): Promise<Mode>
  getStatus(): Promise<DeviceStatus>
  getModeHistory(): Promise<ModeChange[]>
  /** Calls `cb` with the decision in force now, then again on every new decision. */
  subscribeDecisions(cb: (d: Decision) => void): () => void
  getMetrics(range: MetricsRange): Promise<Metrics>
}
