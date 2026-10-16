import { ApiDataSource } from './api/ApiDataSource'
import { ClipClock } from './clock'
import { MockDataSource } from './mock/MockDataSource'
import { CLIP_S } from './mock/sim'
import { StaticDataSource } from './static/StaticDataSource'
import type { DataSource } from './types'

export * from './types'

/** One clock for the whole app: videos, decisions and the junction animation follow it. */
export const clock = new ClipClock(CLIP_S)

export type DataSourceKind = 'static' | 'mock' | 'api'

const requested = import.meta.env.VITE_DATA_SOURCE
/** `static` (recorded runs in public/data/) unless VITE_DATA_SOURCE says `mock` or `api`. */
export const dataSourceKind: DataSourceKind = requested === 'api' || requested === 'mock' ? requested : 'static'

function create(kind: DataSourceKind): DataSource {
  if (kind === 'api') return new ApiDataSource()
  if (kind === 'mock') return new MockDataSource(clock)
  return new StaticDataSource(clock)
}

export const dataSource: DataSource = create(dataSourceKind)
