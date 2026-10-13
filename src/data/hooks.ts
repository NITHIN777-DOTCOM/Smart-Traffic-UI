import { useEffect, useState, useSyncExternalStore } from 'react'
import { clock, dataSource } from './index'
import { useMode } from './modeContext'
import type { Decision, DeviceStatus, Metrics, MetricsRange, ModeChange } from './types'

export { useMode }

export function useClock() {
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot)
}

/** Fetches `load()` on mount, whenever `key` changes, and every `pollMs` if given. */
function useResource<T>(load: () => Promise<T>, key: unknown, pollMs?: number) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    const run = () =>
      load().then(
        (d) => live && (setData(d), setError(null)),
        (e: Error) => live && setError(e.message),
      )
    run()
    const id = pollMs ? setInterval(run, pollMs) : undefined
    return () => {
      live = false
      clearInterval(id)
    }
    // `load` is a fresh closure each render; `key` is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pollMs])
  return { data, error }
}

export function useStatus() {
  const { version } = useMode()
  return useResource<DeviceStatus>(() => dataSource.getStatus(), version, 5000)
}

export function useModeHistory() {
  const { version } = useMode()
  return useResource<ModeChange[]>(() => dataSource.getModeHistory(), version)
}

export function useMetrics(range: MetricsRange) {
  return useResource<Metrics>(() => dataSource.getMetrics(range), range)
}

export function useDecision(): Decision | null {
  const [decision, setDecision] = useState<Decision | null>(null)
  useEffect(() => dataSource.subscribeDecisions(setDecision), [])
  return decision
}
