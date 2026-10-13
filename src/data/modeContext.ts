import { createContext, useContext } from 'react'
import type { Mode } from './types'

export interface ModeState {
  mode: Mode | null
  /** The mode we asked for while waiting for the controller to confirm it. */
  pending: Mode | null
  error: string | null
  setMode: (m: Mode) => Promise<void>
  /** Bumps after every confirmed switch so views can refetch status/history. */
  version: number
}

export const ModeContext = createContext<ModeState | null>(null)

export function useMode(): ModeState {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used inside <ModeProvider>')
  return ctx
}
