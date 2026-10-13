import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { dataSource } from './index'
import { ModeContext } from './modeContext'
import type { Mode } from './types'

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode | null>(null)
  const [pending, setPending] = useState<Mode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    dataSource.getMode().then(setModeState, (e: Error) => setError(e.message))
  }, [])

  const setMode = useCallback(async (m: Mode) => {
    setPending(m)
    setError(null)
    try {
      setModeState(await dataSource.setMode(m))
      setVersion((v) => v + 1)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(null)
    }
  }, [])

  return (
    <ModeContext.Provider value={{ mode, pending, error, setMode, version }}>{children}</ModeContext.Provider>
  )
}
