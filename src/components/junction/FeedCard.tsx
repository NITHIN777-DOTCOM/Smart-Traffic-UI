import { useEffect, useRef, useState } from 'react'
import type { ClockSnapshot } from '../../data/clock'
import { ARM_LABEL } from '../../data/labels'
import type { ArmSignal } from '../../data/signals'
import type { Arm } from '../../data/types'

const VIDEO_BASE = import.meta.env.VITE_VIDEO_BASE_URL ?? `${import.meta.env.BASE_URL}videos/`
/** Hard-seek a video only when it drifts this far from the shared clock (seeking flashes the frame). */
const MAX_DRIFT_S = 1.5
/** Smaller drift is corrected by nudging playback speed instead… */
const NUDGE_DRIFT_S = 0.25
/** …until it is back within this, so the rate doesn't flip back and forth at the threshold. */
const IN_SYNC_S = 0.1

function signalChip({ signal, leftS }: ArmSignal): string {
  const s = Math.ceil(leftS)
  if (signal === 'red') return `RED · next phase in ${s} s`
  return `${signal.toUpperCase()} · ${s} s left`
}

interface Props {
  arm: Arm
  state: ArmSignal
  clock: ClockSnapshot
  duration: number
  vehicles?: number
}

export function FeedCard({ arm, state, clock, duration, vehicles }: Props) {
  const file = `approach_${arm}.mp4`
  const ref = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  const lastSeek = useRef(-1)

  // Follow the shared clock: play/pause with it and re-seek on scrub or drift.
  useEffect(() => {
    const v = ref.current
    if (!v || status !== 'ready') return
    const target = clock.t % (Number.isFinite(v.duration) && v.duration > 0 ? v.duration : duration)
    const drift = v.currentTime - target
    if (clock.seekId !== lastSeek.current || Math.abs(drift) > MAX_DRIFT_S) {
      if (!v.seeking) v.currentTime = target
      v.playbackRate = 1
      lastSeek.current = clock.seekId
    } else if (Math.abs(drift) > NUDGE_DRIFT_S || (v.playbackRate !== 1 && Math.abs(drift) > IN_SYNC_S)) {
      const rate = drift < 0 ? 1.05 : 0.95
      if (v.playbackRate !== rate) v.playbackRate = rate
    } else if (v.playbackRate !== 1) {
      v.playbackRate = 1
    }
    if (clock.playing && v.paused) v.play().catch(() => {})
    if (!clock.playing && !v.paused) v.pause()
  }, [clock, duration, status])

  return (
    <section className="card feed-card" aria-label={`${ARM_LABEL[arm]} camera feed`}>
      <div className="feed-head">
        <div className="feed-title">
          <h2>{ARM_LABEL[arm]} arm</h2>
          <span className="muted">{file}</span>
        </div>
        <span className={`sig-chip sig-${state.signal}`}>{signalChip(state)}</span>
      </div>
      <div className="feed-frame">
        {status !== 'missing' && (
          <video
            ref={ref}
            src={`${VIDEO_BASE}${file}`}
            muted
            playsInline
            preload="auto"
            onLoadedData={() => setStatus('ready')}
            onError={() => setStatus('missing')}
          />
        )}
        {status !== 'ready' && (
          <div className="feed-placeholder">
            <span>Video feed</span>
            {status === 'missing' && <span className="feed-hint">Add videos/{file}</span>}
          </div>
        )}
        <span className="feed-badge live">
          <span className="dot dot-red" />
          LIVE
        </span>
        {vehicles !== undefined && <span className="feed-badge count num">{Math.round(vehicles)} vehicles</span>}
        <div className="feed-progress" aria-hidden="true">
          <div style={{ width: `${(clock.t / duration) * 100}%` }} />
        </div>
      </div>
    </section>
  )
}
