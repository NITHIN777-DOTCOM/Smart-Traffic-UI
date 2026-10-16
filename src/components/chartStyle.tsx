import { CartesianGrid } from 'recharts'

/** Shared Recharts styling for the dashboards. */
export const AXIS = { stroke: 'var(--divider)', tick: { fill: 'var(--muted)', fontSize: 12 } }
export const GRID = <CartesianGrid stroke="var(--divider)" vertical={false} />
export const TOOLTIP = {
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
export const LEGEND = {
  wrapperStyle: { fontSize: 13 },
  iconSize: 12,
  formatter: (v: string) => <span style={{ color: 'var(--text)' }}>{v}</span>,
}
