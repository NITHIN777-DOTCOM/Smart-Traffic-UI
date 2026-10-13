import type { Signal } from '../../data/types'

const ORDER: Signal[] = ['red', 'yellow', 'green']

interface Props {
  signal: Signal
  vertical?: boolean
  /** Mirror the light order (green first), for heads facing the other way. */
  reversed?: boolean
  label: string
}

export function SignalHead({ signal, vertical, reversed, label }: Props) {
  const order = reversed ? [...ORDER].reverse() : ORDER
  return (
    <div className={`signal-head${vertical ? ' vertical' : ''}`} role="img" aria-label={`${label} signal: ${signal}`}>
      {order.map((s) => (
        <span key={s} className={`lamp lamp-${s}${s === signal ? ' lit' : ''}`} />
      ))}
    </div>
  )
}
