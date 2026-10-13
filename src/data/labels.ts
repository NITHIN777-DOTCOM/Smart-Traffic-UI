import type { Arm, Mode, Signal } from './types'

export const ARM_LABEL: Record<Arm, string> = { west: 'West', east: 'East', south: 'South' }
export const MODE_LABEL: Record<Mode, string> = { ppo: 'PPO model', round_robin: 'Round robin' }
export const SIGNAL_LABEL: Record<Signal, string> = { green: 'Green', yellow: 'Yellow', red: 'Red' }
