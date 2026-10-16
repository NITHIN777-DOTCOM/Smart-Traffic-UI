export type Mode = 'ppo' | 'round_robin'
export type Arm = 'west' | 'east' | 'south'
export type Signal = 'green' | 'yellow' | 'red'

/**
 * A green segment: `arms` are green for `durationS` from clip time `t`, then show
 * yellow for `yellowS` and all-red for `allRedS` before the next segment.
 * Several arms can be green together (e.g. the EW-through phase greens West and East).
 */
export interface Decision {
  /** Clip seconds at which the green starts. */
  t: number
  arms: Arm[]
  signal: Signal
  durationS: number
  /** Defaults to 3 s. 0 when the segment runs to the end of the clip. */
  yellowS?: number
  /** Defaults to 2 s. */
  allRedS?: number
  queue: Record<Arm, number>
  vehicles: Record<Arm, number>
  /** Clip seconds of the decision that started this green (earlier than `t` by the clearance). */
  decisionT?: number | null
  /** Later decisions that kept this green running (same phase chosen again). */
  extendedAt?: number[]
  /** Policy phase name, e.g. `EW-through`. */
  phase?: string
  proposedPhase?: string
  override?: boolean
  overrideRule?: string | null
  /** Green time the model asked for. Logged only: timing follows the fixed decision cadence. */
  requestedDurationS?: number
  source?: string
}

export interface DeviceStatus {
  piOnline: boolean
  ip?: string
  esp32: boolean
  cameras: number
  lastSwitch?: { at: string; from: Mode; to: Mode }
  /** True when no device is connected and these values are stand-ins. */
  placeholder?: boolean
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
  /** Each controller's decisions in the range, oldest first. */
  decisions: { ppo: Decision[]; roundRobin: Decision[] }
}

/** public/data/run_info.json, written by bridge/convert.py. */
export interface RunInfo {
  generatedAt: string
  modelFile: string
  modelSha256: string
  rewardLabel: 'ALIGNED' | 'OLD'
  provisional: boolean
  provisionalLabel: string | null
  ppoCommit: string
  calibration: string
  signalTimingLabel: string
  decisionIntervalS: number
  runs: { ppo: string; roundRobin: string }
  processedS: { ppo: number; roundRobin: number }
  governor: string
  legalMask: string
  untrainedInputs: string
  deviceStatus: string
}

export interface ObservedController {
  run: string
  durationS: number
  decisions: number
  switches: number
  switchesPerH: number
  share: Record<Arm, Record<Signal, number>>
  latencyMs: { mean: number; p50: number; p95: number; max: number } | null
  // PPO only
  provisional?: boolean
  rewardLabel?: string
  extensions?: number
  governorOverrides?: number
  governorActionChanged?: number
  governorRules?: Record<string, number>
  durationRequestsS?: Record<string, number>
  proposedPhases?: Record<string, number>
  governedPhases?: Record<string, number>
  decisionLog?: {
    t: number
    proposed: string
    governed: string
    greenArms: Arm[]
    switch: boolean
    override: boolean
    rule: string | null
    requestedDurationS: number
  }[]
  // Round robin only
  signalTiming?: string
}

/** public/data/observed_metrics.json: real outputs of the replay runs. */
export interface ObservedMetrics {
  label: string
  note: string
  generatedAt: string
  clipS: number
  calibration: string
  openLoop: boolean
  perception: Record<Arm, { meanInView: number; maxInView: number; uniqueTracks: number | null; meanQueueApprox: number }>
  ppo: ObservedController
  roundRobin: ObservedController
}

/** public/data/simulation_metrics.json: SUMO results copied from the PPO repo. */
export interface SimulationMetrics {
  label: string
  note: string
  ppoRepoCommit: string
  rows: {
    controller: string
    queue: number
    wait: number
    throughput: number
    emergencyWait: number
    reward: string
    checkpoint: string
    n: number
    source: string
  }[]
  sources: string[]
}

export interface SeriesPoint {
  t: number
  queue: Record<Arm, number>
  queueNormalised: Record<Arm, number>
  vehicles: Record<Arm, number>
}

/** Everything the static (recorded-run) data source can show beyond the mock's metrics. */
export interface Evidence {
  runInfo: RunInfo
  observed: ObservedMetrics
  simulation: SimulationMetrics
  series: Record<Mode, SeriesPoint[]>
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
  /** Recorded-run provenance and results; null for sources without them (mock, api). */
  getEvidence(): Promise<Evidence | null>
}
