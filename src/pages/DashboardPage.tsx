import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { METRICS, type MetricDef } from '../config/metrics'
import { useMetrics } from '../data/hooks'
import { ARM_LABEL, SIGNAL_LABEL } from '../data/labels'
import { ARMS, formatClock } from '../data/signals'
import type { Metrics, MetricsRange } from '../data/types'
import './dashboard.css'

const RANGES: { id: MetricsRange; label: string }[] = [
  { id: 'clip', label: '10-min clip' },
  { id: 'session', label: 'Whole session' },
]

const AXIS = { stroke: 'var(--divider)', tick: { fill: 'var(--muted)', fontSize: 12 } }
const GRID = <CartesianGrid stroke="var(--divider)" vertical={false} />
const TOOLTIP = {
  contentStyle: {
    background: 'var(--header)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text)',
    fontSize: 13,
  },
  labelStyle: { color: 'var(--muted)' },
  itemStyle: { color: 'var(--text)' },
  cursor: { fill: 'var(--divider)', opacity: 0.5 },
}
const LEGEND = {
  wrapperStyle: { fontSize: 13 },
  iconSize: 12,
  formatter: (v: string) => <span style={{ color: 'var(--text)' }}>{v}</span>,
}

export function DashboardPage() {
  const [range, setRange] = useState<MetricsRange>('clip')
  const { data: m, error } = useMetrics(range)

  return (
    <main className="page dashboard-page">
      <div className="page-head">
        <div className="page-title">
          <h1>Performance Dashboard</h1>
          <p>PPO model vs round robin on the same three feeds</p>
        </div>
        <div className="dash-controls">
          <span className="pill sample-pill">Sample data — metrics to be finalised</span>
          <div role="group" aria-label="Time range" className="segmented">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={range === r.id}
                className={range === r.id ? 'on' : ''}
                onClick={() => setRange(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="error-text">Could not load metrics: {error}</p>}
      {!m ? (
        <p className="muted">Loading metrics…</p>
      ) : (
        <>
          <section aria-label="Key metrics" className="kpi-grid">
            {METRICS.map((def) => (
              <KpiTile key={def.id} def={def} m={m} />
            ))}
          </section>
          <Charts m={m} />
          <DecisionTable m={m} />
        </>
      )}
    </main>
  )
}

function KpiTile({ def, m }: { def: MetricDef; m: Metrics }) {
  const ppo = def.pick(m.ppo)
  const rr = def.pick(m.roundRobin)
  let sub: string
  let good = false
  if (def.compare === 'lower' || def.compare === 'higher') {
    const pct = rr === 0 ? 0 : Math.round(((ppo - rr) / rr) * 100)
    good = def.compare === 'lower' ? pct < 0 : pct > 0
    sub = `${pct < 0 ? '↓' : '↑'} ${Math.abs(pct)}% vs round robin`
  } else if (def.compare === 'raw') {
    sub = `round robin: ${def.format(rr)}`
  } else {
    sub = def.note?.(m) ?? ''
  }
  return (
    <div className="tile kpi">
      <span className="kpi-label">{def.label}</span>
      <span className="kpi-value num">{def.format(ppo)}</span>
      <span className={`kpi-sub ${good ? 'good' : 'muted'}`}>{sub}</span>
    </div>
  )
}

function Charts({ m }: { m: Metrics }) {
  const minutes = (t: number) => `${Math.round(t / 60)} min`
  const perArm = ARMS.map((arm) => ({
    arm: ARM_LABEL[arm],
    ppoThroughput: m.ppo.perArm[arm].throughputPerH,
    rrThroughput: m.roundRobin.perArm[arm].throughputPerH,
    ppoWait: m.ppo.perArm[arm].avgWaitS,
    rrWait: m.roundRobin.perArm[arm].avgWaitS,
    green: Math.round(m.ppo.perArm[arm].share.green * 100),
    yellow: Math.round(m.ppo.perArm[arm].share.yellow * 100),
    // Derived so the three segments always total exactly 100%.
    red:
      100 - Math.round(m.ppo.perArm[arm].share.green * 100) - Math.round(m.ppo.perArm[arm].share.yellow * 100),
  }))

  return (
    <div className="chart-grid">
      <ChartCard title="Queue length over time" sub="Vehicles waiting across all arms">
        <LineChart data={m.queueSeries} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          {GRID}
          <XAxis dataKey="t" {...AXIS} tickFormatter={minutes} type="number" domain={[0, m.horizonS]} />
          <YAxis {...AXIS} allowDecimals={false} />
          <Tooltip {...TOOLTIP} cursor={{ stroke: 'var(--muted)' }} labelFormatter={(t) => formatClock(Number(t))} />
          <Legend {...LEGEND} />
          <Line
            isAnimationActive={false}
            dataKey="ppo"
            name="PPO model"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            isAnimationActive={false}
            dataKey="roundRobin"
            name="Round robin"
            stroke="var(--rr-line)"
            strokeWidth={2}
            strokeDasharray="6 5"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ChartCard>

      <ChartCard title="Throughput per arm" sub="Vehicles per hour">
        <BarChart data={perArm} margin={{ top: 8, right: 16, bottom: 0, left: -8 }} barGap={2}>
          {GRID}
          <XAxis dataKey="arm" {...AXIS} />
          <YAxis {...AXIS} />
          <Tooltip {...TOOLTIP} />
          <Legend {...LEGEND} />
          <Bar isAnimationActive={false} dataKey="ppoThroughput" name="PPO model" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          <Bar isAnimationActive={false} dataKey="rrThroughput" name="Round robin" fill="var(--rr-bar)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Average wait per arm" sub="Seconds">
        <BarChart data={perArm} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid stroke="var(--divider)" horizontal={false} />
          <XAxis type="number" {...AXIS} />
          <YAxis type="category" dataKey="arm" {...AXIS} width={56} />
          <Tooltip {...TOOLTIP} formatter={(v) => `${v} s`} />
          <Legend {...LEGEND} />
          <Bar isAnimationActive={false} dataKey="ppoWait" name="PPO model" fill="var(--accent)" radius={[0, 4, 4, 0]} />
          <Bar isAnimationActive={false} dataKey="rrWait" name="Round robin" fill="var(--rr-bar)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Signal time share" sub="PPO model, % of the range">
        <BarChart data={perArm} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <XAxis type="number" {...AXIS} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="arm" {...AXIS} width={56} />
          <Tooltip {...TOOLTIP} formatter={(v) => `${v}%`} />
          <Legend {...LEGEND} />
          {(['green', 'yellow', 'red'] as const).map((s) => (
            <Bar
              isAnimationActive={false}
              key={s}
              dataKey={s}
              name={SIGNAL_LABEL[s]}
              stackId="share"
              fill={`var(--sig-${s})`}
              stroke="var(--card)"
              strokeWidth={2}
            />
          ))}
        </BarChart>
      </ChartCard>
    </div>
  )
}

function ChartCard({ title, sub, children }: { title: string; sub: string; children: React.ReactElement }) {
  return (
    <section className="card chart-card">
      <div className="chart-head">
        <h2>{title}</h2>
        <span className="muted">{sub}</span>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function DecisionTable({ m }: { m: Metrics }) {
  return (
    <section aria-label="Decision log" className="card decisions">
      <div className="chart-head">
        <h2>Model decisions</h2>
        <span className="muted num">{m.decisions.length} decisions</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Clip time</th>
              <th scope="col">Arm</th>
              <th scope="col">Signal</th>
              <th scope="col">Green time</th>
              <th scope="col">Queue at decision</th>
            </tr>
          </thead>
          <tbody>
            {m.decisions.map((d) => (
              <tr key={d.t}>
                <td className="num">{formatClock(d.t)}</td>
                <td>{ARM_LABEL[d.arm]}</td>
                <td>
                  <span className="sig-cell">
                    <span className={`dot dot-lg dot-${d.signal}`} />
                    {SIGNAL_LABEL[d.signal]}
                  </span>
                </td>
                <td className="num">{d.durationS} s</td>
                <td className="num">{d.queue[d.arm]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
