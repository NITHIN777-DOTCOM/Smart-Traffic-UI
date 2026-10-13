import type { ControllerSummary, Metrics } from '../data/types'

/**
 * KPI tiles on the dashboard, in display order. Add, remove or reorder
 * entries here; the dashboard renders whatever this list contains.
 */
export interface MetricDef {
  id: string
  label: string
  /** Value for one controller's summary. */
  pick: (s: ControllerSummary) => number
  format: (v: number) => string
  /**
   * How to compare against round robin:
   *  - 'lower' / 'higher': percentage change, coloured by whether it is better
   *  - 'raw': show round robin's own value
   *  - 'none': show `note` instead
   */
  compare: 'lower' | 'higher' | 'raw' | 'none'
  note?: (m: Metrics) => string
}

const int = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export const METRICS: MetricDef[] = [
  {
    id: 'avg_wait',
    label: 'Avg wait time',
    pick: (s) => s.avgWaitS,
    format: (v) => `${v.toFixed(1)} s`,
    compare: 'lower',
  },
  {
    id: 'avg_queue',
    label: 'Avg queue length',
    pick: (s) => s.avgQueue,
    format: (v) => `${v.toFixed(1)} veh`,
    compare: 'lower',
  },
  {
    id: 'throughput',
    label: 'Throughput',
    pick: (s) => s.throughputPerH,
    format: (v) => `${int.format(v)} veh/h`,
    compare: 'higher',
  },
  {
    id: 'switches',
    label: 'Signal switches',
    pick: (s) => s.switchesPerH,
    format: (v) => `${int.format(v)} /h`,
    compare: 'raw',
  },
  {
    id: 'detected',
    label: 'Vehicles detected',
    pick: (s) => s.vehiclesDetected,
    format: (v) => int.format(v),
    compare: 'none',
    note: () => 'across 3 feeds',
  },
]
