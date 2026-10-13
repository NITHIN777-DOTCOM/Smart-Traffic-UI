import { ApiDataSource } from './api/ApiDataSource'
import { ClipClock } from './clock'
import { MockDataSource } from './mock/MockDataSource'
import { CLIP_S } from './mock/sim'
import type { DataSource } from './types'

export * from './types'

/** One clock for the whole app: videos, decisions and the junction animation follow it. */
export const clock = new ClipClock(CLIP_S)

export const dataSourceKind = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'mock'

export const dataSource: DataSource = dataSourceKind === 'api' ? new ApiDataSource() : new MockDataSource(clock)
