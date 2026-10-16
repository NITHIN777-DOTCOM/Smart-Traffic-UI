import { ARM_LABEL } from '../../data/labels'
import { ARMS, type JunctionState } from '../../data/signals'
import type { Decision, Mode, Signal } from '../../data/types'

const ARM_STATE: Record<Signal, string> = { green: 'Green · moving', yellow: 'Yellow · slowing', red: 'Red · stopped' }

interface Props {
  decision: Decision
  state: JunctionState
  mode: Mode | null
  /** Shown under the heading, e.g. the assumed-timing label for round robin. */
  note?: string
}

export function DecisionCard({ decision, state, mode, note }: Props) {
  const next = Math.ceil(state.nextDecisionS)
  const greenLeft = Math.ceil(decision.arms.length ? state.arms[decision.arms[0]].leftS : 0)
  const runsToEnd = (decision.yellowS ?? 3) === 0 && (decision.allRedS ?? 2) === 0
  const sub =
    state.phase === 'green'
      ? runsToEnd
        ? 'Green until the end of the clip'
        : `Yellow in ${greenLeft} s`
      : state.phase === 'yellow'
        ? `Yellow clearance · next green in ${next} s`
        : `All-red clearance · next green in ${next} s`
  const armsText = decision.arms.map((a) => ARM_LABEL[a]).join(' + ')

  return (
    <section className="card decision-card" aria-live="polite">
      <h2>{mode === 'round_robin' ? 'Fixed cycle' : 'Model decision'}</h2>
      {note && <span className="pill assumed-pill">{note}</span>}
      <div className="decision-main">
        <span className="decision-text">
          {decision.durationS > 0
            ? `${armsText} → GREEN for ${Math.round(decision.durationS)} s`
            : `${armsText} → clearing (the model switched away at once)`}
        </span>
        <span className="muted">{sub}</span>
        {decision.phase && (
          <span className="muted decision-meta">
            Phase {decision.phase}
            {decision.override
              ? ` · governor override (${decision.overrideRule ?? 'rule'}; model proposed ${decision.proposedPhase})`
              : ''}
            {decision.requestedDurationS !== undefined
              ? ` · model asked for ${decision.requestedDurationS} s (logged only)`
              : ''}
            {decision.extendedAt && decision.extendedAt.length > 0
              ? ` · kept by ${decision.extendedAt.length} later decision${decision.extendedAt.length > 1 ? 's' : ''}`
              : ''}
          </span>
        )}
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
