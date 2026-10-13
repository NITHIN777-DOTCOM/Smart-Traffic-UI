import { useEffect, useRef, useSyncExternalStore } from 'react'
import { ARM_LABEL } from '../../data/labels'
import type { Arm, Signal } from '../../data/types'
import { Car } from './Car'
import { SignalHead } from './SignalHead'
import { CAR_LEN, type TrafficEngine } from './traffic'

/** Lane centres sit 50 px from either road edge; cars are 34 px wide. */
const NEAR = 33
const FAR = 133

interface Props {
  arm: Arm
  signal: Signal
  engine: TrafficEngine
  description: string
}

/**
 * One road arm: sidewalk, two lanes, dashed centre line, stop line and signal
 * head. India keeps left, so the incoming lane is:
 *   west → top lane (cars face right), east → bottom lane (face left),
 *   south → left lane (face up).
 */
export function RoadArm({ arm, signal, engine, description }: Props) {
  const roadRef = useRef<HTMLDivElement>(null)
  const vertical = arm === 'south'

  useEffect(() => {
    const el = roadRef.current
    if (!el) return
    const ro = new ResizeObserver(() => engine.setLength(arm, vertical ? el.clientHeight : el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [arm, engine, vertical])

  const head = (
    <SignalHead signal={signal} vertical={vertical} reversed={arm === 'east'} label={ARM_LABEL[arm]} />
  )

  const road = (
    <div ref={roadRef} className={`road road-${arm}`}>
      <svg className="centre-line" aria-hidden="true">
        {vertical ? (
          <line x1="101" y1="0" x2="101" y2="100%" />
        ) : (
          <line x1="0" y1="101" x2="100%" y2="101" />
        )}
      </svg>
      <div className={`stop-line stop-${arm}`} />
      <ArmCars arm={arm} engine={engine} />
      {vertical && <span className="arm-label arm-label-south">SOUTH ARM</span>}
    </div>
  )

  if (vertical) {
    return (
      <div className="arm arm-south" role="img" aria-label={description}>
        <div className="sidewalk-v">
          <div className="head-south">{head}</div>
        </div>
        {road}
        <div className="sidewalk-v" />
      </div>
    )
  }

  return (
    <div className={`arm arm-${arm}`} role="img" aria-label={description}>
      <div className="sidewalk-h">
        {arm === 'west' && (
          <>
            <span className="arm-label">WEST ARM</span>
            <div className="head-west">{head}</div>
          </>
        )}
      </div>
      {road}
      <div className="sidewalk-h">
        {arm === 'east' && (
          <>
            <div className="head-east">{head}</div>
            <span className="arm-label arm-label-east">EAST ARM</span>
          </>
        )}
      </div>
    </div>
  )
}

/** The only part that re-renders every animation frame. */
function ArmCars({ arm, engine }: { arm: Arm; engine: TrafficEngine }) {
  useSyncExternalStore(engine.subscribe, engine.getFrame)
  const { incoming, outgoing, length: len } = engine.view(arm)

  return (
    <>
      {incoming.map((c) => {
        const p =
          arm === 'west'
            ? { facing: 'right' as const, x: c.s - CAR_LEN, y: NEAR }
            : arm === 'east'
              ? { facing: 'left' as const, x: len - c.s, y: FAR }
              : { facing: 'up' as const, x: NEAR, y: len - c.s }
        return <Car key={c.id} {...p} color={c.color} braking={c.braking} opacity={c.opacity} />
      })}
      {outgoing.map((c) => {
        const p =
          arm === 'west'
            ? { facing: 'left' as const, x: len - c.s, y: FAR }
            : arm === 'east'
              ? { facing: 'right' as const, x: c.s - CAR_LEN, y: NEAR }
              : { facing: 'down' as const, x: FAR, y: c.s - CAR_LEN }
        return <Car key={c.id} {...p} color={c.color} braking={c.braking} opacity={c.opacity} />
      })}
    </>
  )
}
