import { Bar, BarChart, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '../components/charts'
import { AXIS, GRID, LEGEND, TOOLTIP } from '../components/chartStyle'
import { useEvidence, useMode } from '../data/hooks'
import { ARM_LABEL, MODE_LABEL, SIGNAL_LABEL } from '../data/labels'
import { ARMS, formatClock } from '../data/signals'
import type { Arm, Evidence, Mode, ObservedController } from '../data/types'

const ARM_COLOR: Record<Arm, string> = { west: 'var(--arm-west)', east: 'var(--arm-east)', south: 'var(--arm-south)' }
const int = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const minutes = (t: number) => `${Math.round(t / 60)} min`
const pct = (f: number) => Math.round(f * 100)

/**
 * Dashboard for recorded runs (static data source). Two strictly separate sections:
 * what our replay runs actually output on the Chennai footage, and the PPO repo's
 * SUMO results, cited from their source files.
 */
export function EvidenceDashboard() {
  const { data: ev, error } = useEvidence()
  const { mode } = useMode()

  return (
    <main className="page dashboard-page">
      <div className="page-head">
        <div className="page-title">
          <div className="dash-title-row">
            <h1>Performance Dashboard</h1>
            {mode && <span className="pill pill-accent">Currently replaying: {MODE_LABEL[mode]}</span>}
          </div>
          <p>Recorded Chennai T-junction footage, replayed through the PPO repo's perception and policy</p>
        </div>
      </div>
      {error && <p className="error-text">Could not load the recorded runs: {error}</p>}
      {!ev ? !error && <p className="muted">Loading recorded runs…</p> : <Body ev={ev} mode={mode ?? 'ppo'} />}
    </main>
  )
}

function Body({ ev, mode }: { ev: Evidence; mode: Mode }) {
  const { runInfo: info } = ev
  return (
    <>
      <section aria-label="Model used" className="card model-line">
        <span>
          <strong>Model used:</strong> {info.modelFile} · reward {info.rewardLabel} · PPO repo{' '}
          <span className="num">{info.ppoCommit.slice(0, 7)}</span> · governor {info.governor} · legal mask{' '}
          {info.legalMask} · camera calibration {info.calibration}
        </span>
        {info.provisional && <span className="provisional-badge">{info.provisionalLabel}</span>}
      </section>
      <Observed ev={ev} mode={mode} />
      <Simulation ev={ev} />
    </>
  )
}

function Observed({ ev, mode }: { ev: Evidence; mode: Mode }) {
  const o = ev.observed
  const ppo = o.ppo
  const rr = o.roundRobin
  const tracks = ARMS.reduce((n, a) => n + (o.perception[a].uniqueTracks ?? 0), 0)
  const durations = Object.entries(ppo.durationRequestsS ?? {}).map(([s, n]) => ({ s: `${s} s`, n }))
  const topDuration = [...durations].sort((a, b) => b.n - a.n)[0]
  const rules = Object.entries(ppo.governorRules ?? {})
  const shareRows = ARMS.flatMap((arm) =>
    (
      [
        ['PPO', ppo],
        ['RR', rr],
      ] as const
    ).map(([who, c]) => ({
      label: `${ARM_LABEL[arm]} · ${who}`,
      green: pct(c.share[arm].green),
      yellow: pct(c.share[arm].yellow),
      red: 100 - pct(c.share[arm].green) - pct(c.share[arm].yellow),
    })),
  )
  const series = ev.series[mode].map((p) => ({ t: p.t, ...p.vehicles, q_west: p.queue.west, q_east: p.queue.east, q_south: p.queue.south }))

  return (
    <section aria-labelledby="observed-h" className="evidence-section">
      <div className="section-head">
        <h2 id="observed-h">{o.label}</h2>
        <p className="muted">{o.note}</p>
      </div>

      <div className="kpi-grid">
        <Kpi label="PPO decisions" value={int.format(ppo.decisions)} sub={`one every ${ev.runInfo.decisionIntervalS} s over ${formatClock(ppo.durationS)}`} />
        <Kpi
          label="Signal switches"
          value={`${int.format(ppo.switchesPerH)} /h`}
          sub={`PPO: ${ppo.switches} switches, ${ppo.extensions ?? 0} extensions · round robin ${int.format(rr.switchesPerH)} /h (assumed timing)`}
        />
        <Kpi
          label="Governor overrides"
          value={`${ppo.governorOverrides ?? 0} / ${ppo.decisions}`}
          sub={rules.length ? rules.map(([r, n]) => `${r.replace(/_/g, ' ')} ×${n}`).join(', ') : 'no rule fired'}
        />
        <Kpi label="Vehicles tracked" value={int.format(tracks)} sub="unique track IDs, 3 feeds (same footage for both modes)" />
        <Kpi
          label="Model duration requests"
          value={topDuration ? topDuration.s : '—'}
          sub="most frequent request · logged only, timing is the fixed cadence"
        />
      </div>

      <div className="chart-grid">
        <ChartCard title="Vehicles in view per arm" sub="Detections per frame, 5 s means">
          <LineChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            {GRID}
            <XAxis dataKey="t" {...AXIS} tickFormatter={minutes} type="number" domain={[0, o.clipS]} />
            <YAxis {...AXIS} />
            <Tooltip {...TOOLTIP} cursor={{ stroke: 'var(--muted)' }} labelFormatter={(t) => formatClock(Number(t))} />
            <Legend {...LEGEND} />
            {ARMS.map((a) => (
              <Line key={a} isAnimationActive={false} dataKey={a} name={ARM_LABEL[a]} stroke={ARM_COLOR[a]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ChartCard>

        <ChartCard title="Queue estimate per arm" sub="Stopped inbound vehicles, rough (uncalibrated)">
          <LineChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            {GRID}
            <XAxis dataKey="t" {...AXIS} tickFormatter={minutes} type="number" domain={[0, o.clipS]} />
            <YAxis {...AXIS} />
            <Tooltip {...TOOLTIP} cursor={{ stroke: 'var(--muted)' }} labelFormatter={(t) => formatClock(Number(t))} />
            <Legend {...LEGEND} />
            {ARMS.map((a) => (
              <Line key={a} isAnimationActive={false} dataKey={`q_${a}`} name={ARM_LABEL[a]} stroke={ARM_COLOR[a]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ChartCard>

        <ChartCard title="Signal time share per arm" sub="PPO vs round robin (assumed timing), % of the clip">
          <BarChart data={shareRows} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <XAxis type="number" {...AXIS} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="label" {...AXIS} width={92} />
            <Tooltip {...TOOLTIP} formatter={(v) => `${v}%`} />
            <Legend {...LEGEND} />
            {(['green', 'yellow', 'red'] as const).map((s) => (
              <Bar isAnimationActive={false} key={s} dataKey={s} name={SIGNAL_LABEL[s]} stackId="share" fill={`var(--sig-${s})`} stroke="var(--card)" strokeWidth={2} />
            ))}
          </BarChart>
        </ChartCard>

        <ChartCard title="Model duration requests" sub="Green time the policy asked for at each decision (not applied)">
          <BarChart data={durations} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            {GRID}
            <XAxis dataKey="s" {...AXIS} />
            <YAxis {...AXIS} allowDecimals={false} />
            <Tooltip {...TOOLTIP} />
            <Bar isAnimationActive={false} dataKey="n" name="Decisions" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      {mode === 'ppo' ? <PpoLog c={ppo} /> : <RoundRobinNote c={rr} label={ev.runInfo.signalTimingLabel} />}
    </section>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="tile kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value num">{value}</span>
      <span className="kpi-sub muted">{sub}</span>
    </div>
  )
}

function PpoLog({ c }: { c: ObservedController }) {
  const log = c.decisionLog ?? []
  return (
    <section aria-label="PPO decision log" className="card decisions">
      <div className="chart-head">
        <h2>PPO decisions on the footage</h2>
        <span className="muted num">{log.length} decisions</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Clip time</th>
              <th scope="col">Model proposed</th>
              <th scope="col">Applied (after governor)</th>
              <th scope="col">Green arms</th>
              <th scope="col">Result</th>
              <th scope="col">Asked for</th>
            </tr>
          </thead>
          <tbody>
            {log.map((d) => (
              <tr key={d.t}>
                <td className="num">{formatClock(d.t)}</td>
                <td>{d.proposed}</td>
                <td>
                  {d.governed}
                  {d.override && <span className="muted"> · override{d.rule ? ` (${d.rule.replace(/_/g, ' ')})` : ''}</span>}
                </td>
                <td>{d.greenArms.map((a) => ARM_LABEL[a]).join(' + ')}</td>
                <td>{d.switch ? 'Switch (3 s yellow + 2 s all-red)' : 'Extend green'}</td>
                <td className="num">{d.requestedDurationS} s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function RoundRobinNote({ c, label }: { c: ObservedController; label: string }) {
  return (
    <section aria-label="Round-robin cycle" className="card decisions">
      <div className="chart-head">
        <h2>Round-robin cycle</h2>
        <span className="pill assumed-pill">{label}</span>
      </div>
      <p className="muted">
        West → East → South, each 25 s green then 3 s yellow and 2 s all-red (90 s cycle), one arm at a time:{' '}
        {c.decisions} greens and {c.switches} switches over {formatClock(c.durationS)}. Perception ran on the same footage so
        the counts above exist for this mode too.
      </p>
    </section>
  )
}

function Simulation({ ev }: { ev: Evidence }) {
  const s = ev.simulation
  return (
    <section aria-labelledby="sim-h" className="evidence-section">
      <div className="section-head">
        <h2 id="sim-h">{s.label}</h2>
        <p className="muted">{s.note}</p>
      </div>
      <section className="card decisions">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Controller</th>
                <th scope="col">Queue ↓</th>
                <th scope="col">Wait ↓</th>
                <th scope="col">Throughput ↑</th>
                <th scope="col">Emergency wait ↓</th>
                <th scope="col">Reward / checkpoint</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.controller}>
                  <td>{r.controller}</td>
                  <td className="num">{r.queue.toFixed(4)}</td>
                  <td className="num">{r.wait.toFixed(4)}</td>
                  <td className="num">{r.throughput.toFixed(1)}</td>
                  <td className="num">{r.emergencyWait.toFixed(4)}</td>
                  <td className="muted cell-wrap">
                    {r.reward}; {r.checkpoint} (n = {r.n})
                  </td>
                  <td className="muted cell-wrap">{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted note">
          Sources (PPO repo commit <span className="num">{s.ppoRepoCommit.slice(0, 7)}</span>): {s.sources.join(', ')}. These
          SUMO checkpoints are not the model replayed above.
        </p>
      </section>
    </section>
  )
}
