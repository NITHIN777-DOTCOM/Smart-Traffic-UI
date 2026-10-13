import { ARM_LABEL } from '../../data/labels'
import { ARMS, type JunctionState } from '../../data/signals'
import type { Decision, Mode, Signal } from '../../data/types'

const ARM_STATE: Record<Signal, string> = { green: 'Green · moving', yellow: 'Yellow · slowing', red: 'Red · stopped' }

export function DecisionCard({ decision, state, mode }: { decision: Decision; state: JunctionState; mode: Mode | null }) {
  const next = Math.ceil(state.nextDecisionS)
  const sub =
    state.phase === 'green'
      ? `Next decision in ${next} s`
      : state.phase === 'yellow'
        ? `Yellow clearance · next decision in ${next} s`
        : `All-red clearance · next decision in ${next} s`

  return (
    <section className="card decision-card" aria-live="polite">
      <h2>{mode === 'round_robin' ? 'Fixed cycle' : 'Model decision'}</h2>
      <div className="decision-main">
        <span className="decision-text">
          {ARM_LABEL[decision.arm]} → GREEN for {decision.durationS} s
        </span>
        <span className="muted">{sub}</span>
      </div>
      <ul className="decision-arms">
        {ARMS.map((arm) => (
          <li key={arm}>
            <span>{ARM_LABEL[arm]}</span>
            <span className={`txt-${state.arms[arm].signal}`}>{ARM_STATE[state.arms[arm].signal]}</span>
          </li>
        ))}
      </ul>
      <p className="muted keep-left">
        Traffic keeps left: cars enter on the left lane of each arm and stop at the white line.
      </p>
    </section>
  )
}
