import { useEffect, useRef, useState } from 'react'
import { DecisionCard } from '../components/junction/DecisionCard'
import { FeedCard } from '../components/junction/FeedCard'
import { RoadArm } from '../components/junction/RoadArm'
import { TrafficEngine, type TrafficInputs } from '../components/junction/traffic'
import { clock } from '../data'
import { useClock, useDecision, useMode } from '../data/hooks'
import { ARM_LABEL, MODE_LABEL } from '../data/labels'
import { ARMS, formatClock, junctionStateAt } from '../data/signals'
import type { Arm, Decision, Signal } from '../data/types'
import './junction.css'

/** Red arms keep collecting cars while they wait: one extra every few seconds. */
const QUEUE_GROWTH_S = 6
/** Keep a few cars visibly waiting at every red light. */
const MIN_RED_QUEUE = 2

function trafficInputs(d: Decision | null, t: number): TrafficInputs {
  const out = {} as TrafficInputs
  const state = d ? junctionStateAt(d, t) : null
  for (const arm of ARMS) {
    const signal: Signal = state?.arms[arm].signal ?? 'red'
    const base = d?.queue[arm] ?? 3
    const grown = d && signal !== 'green' ? Math.floor(Math.max(0, t - d.t) / QUEUE_GROWTH_S) : 0
    out[arm] = { signal, targetQueue: signal === 'green' ? base : Math.max(MIN_RED_QUEUE, base + grown) }
  }
  return out
}

const ARM_SENTENCE: Record<Signal, string> = {
  green: 'cars moving into the junction on a green signal',
  yellow: 'cars slowing for a yellow signal',
  red: 'cars queued at the stop line on a red signal',
}

export function JunctionPage() {
  const snap = useClock()
  const decision = useDecision()
  const { mode } = useMode()

  const decisionRef = useRef(decision)
  useEffect(() => {
    decisionRef.current = decision
  }, [decision])

  const [engine] = useState(() => new TrafficEngine(clock, () => trafficInputs(decisionRef.current, clock.now())))
  useEffect(() => {
    engine.start()
    return () => engine.stop()
  }, [engine])

  const state = decision ? junctionStateAt(decision, snap.t) : null

  const feed = (arm: Arm) =>
    state && (
      <FeedCard
        arm={arm}
        state={state.arms[arm]}
        clock={snap}
        duration={clock.duration}
        vehicles={decision?.vehicles[arm]}
      />
    )
  const road = (arm: Arm) => (
    <RoadArm
      arm={arm}
      engine={engine}
      signal={state?.arms[arm].signal ?? 'red'}
      description={`${ARM_LABEL[arm]} arm: ${ARM_SENTENCE[state?.arms[arm].signal ?? 'red']}`}
    />
  )

  return (
    <main className="page junction-page">
      <div className="page-head">
        <div className="page-title">
          <h1>Live Junction</h1>
          <p>T-junction · each arm shows its camera feed, its signal and its traffic</p>
        </div>
        <div className="junction-controls">
          <span className={`pill ${mode === 'ppo' ? 'pill-accent' : ''} mode-pill`}>
            {mode ? `${MODE_LABEL[mode]} mode` : 'Loading…'}
          </span>
          <button
            type="button"
            className="btn-icon"
            aria-label={snap.playing ? 'Pause all feeds' : 'Play all feeds'}
            onClick={() => clock.toggle()}
          >
            {snap.playing ? (
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <rect x="3" y="2" width="4" height="14" rx="1" fill="var(--text)" />
                <rect x="11" y="2" width="4" height="14" rx="1" fill="var(--text)" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M4 2.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 4 2.5Z" fill="var(--text)" />
              </svg>
            )}
          </button>
          <span className="time-readout num">
            {formatClock(snap.t)} / {formatClock(clock.duration)}
          </span>
        </div>
      </div>

      <label className="scrub">
        <span className="visually-hidden">Seek all feeds</span>
        <input
          type="range"
          min={0}
          max={clock.duration}
          step={1}
          value={Math.floor(snap.t)}
          onChange={(e) => clock.seek(Number(e.target.value))}
        />
      </label>

      <div className="junction-scroll">
        <div className="junction-grid">
          <div className="cell cell-feed align-end">{feed('west')}</div>
          <div className="north-footpath">
            <svg width="44" height="44" viewBox="0 0 44 44" role="img" aria-label="Compass: north is up">
              <circle cx="22" cy="22" r="20" fill="none" stroke="var(--border)" strokeWidth="2" />
              <path d="M22 6 L28 24 L22 20 L16 24 Z" fill="var(--accent)" />
              <text x="22" y="40" textAnchor="middle" fontSize="9" fill="var(--muted)">
                N
              </text>
            </svg>
            <span className="eyebrow">No road on this side</span>
            <span>T-junction · 3 arms</span>
          </div>
          <div className="cell cell-feed align-end">{feed('east')}</div>

          {road('west')}
          <div className="intersection" aria-hidden="true">
            <div className="sidewalk-strip" />
            <div className="intersection-road">
              <span>JUNCTION</span>
            </div>
            <div className="intersection-bottom">
              <div className="sidewalk-strip" />
              <div className="intersection-stem" />
              <div className="sidewalk-strip" />
            </div>
          </div>
          {road('east')}

          <div className="cell">{decision && state && <DecisionCard decision={decision} state={state} mode={mode} />}</div>
          {road('south')}
          <div className="cell">{feed('south')}</div>
        </div>
      </div>
    </main>
  )
}
