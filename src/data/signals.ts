import type { Arm, Decision, Signal } from './types'

export const ARMS: readonly Arm[] = ['west', 'east', 'south']
export const YELLOW_S = 3
export const ALL_RED_S = 2
export const CLEARANCE_S = YELLOW_S + ALL_RED_S

export interface ArmSignal {
  signal: Signal
  /** Seconds until this arm's current state is due to change (or the next decision, for red). */
  leftS: number
}

export type Phase = 'green' | 'yellow' | 'all_red'

export interface JunctionState {
  phase: Phase
  arms: Record<Arm, ArmSignal>
  /** Seconds until the controller makes its next decision. */
  nextDecisionS: number
}

/**
 * Signal rules: only the decided arm is ever green; every change runs
 * green → 3 s yellow → 2 s all-red before the next decision.
 */
export function junctionStateAt(d: Decision, t: number): JunctionState {
  const elapsed = Math.max(0, t - d.t)
  const greenEnd = d.durationS
  const yellowEnd = greenEnd + YELLOW_S
  const cycleEnd = yellowEnd + ALL_RED_S
  const nextDecisionS = Math.max(0, cycleEnd - elapsed)

  const phase: Phase = elapsed < greenEnd ? 'green' : elapsed < yellowEnd ? 'yellow' : 'all_red'
  const active: ArmSignal =
    phase === 'green'
      ? { signal: 'green', leftS: greenEnd - elapsed }
      : phase === 'yellow'
        ? { signal: 'yellow', leftS: yellowEnd - elapsed }
        : { signal: 'red', leftS: nextDecisionS }

  const arms = {} as Record<Arm, ArmSignal>
  for (const arm of ARMS) arms[arm] = arm === d.arm ? active : { signal: 'red', leftS: nextDecisionS }
  return { phase, arms, nextDecisionS }
}

/** Latest decision with `t <= time` (timeline sorted by t). */
export function decisionAt(timeline: Decision[], time: number): Decision {
  let lo = 0
  let hi = timeline.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (timeline[mid].t <= time) lo = mid
    else hi = mid - 1
  }
  return timeline[lo]
}

export function formatClock(s: number): string {
  const total = Math.floor(s)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
