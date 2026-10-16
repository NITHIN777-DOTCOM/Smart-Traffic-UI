import type { ReactElement } from 'react'
import { ResponsiveContainer } from 'recharts'

export function ChartCard({ title, sub, children }: { title: string; sub: string; children: ReactElement }) {
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
