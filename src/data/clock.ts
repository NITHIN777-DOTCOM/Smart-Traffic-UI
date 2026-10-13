/**
 * Shared playback clock for the 10-minute demo clips. The three videos, the
 * decision timeline and the junction animation all read time from here.
 */
export interface ClockSnapshot {
  t: number
  playing: boolean
  /** Increments on every seek so followers can hard-sync. */
  seekId: number
}

export class ClipClock {
  readonly duration: number
  private base = 0
  private startedAt = performance.now()
  private playing = true
  private seekId = 0
  private snap: ClockSnapshot
  private listeners = new Set<() => void>()

  constructor(duration: number, tickMs = 200) {
    this.duration = duration
    this.snap = this.read()
    setInterval(() => this.emit(), tickMs)
  }

  /** Current clip time in seconds, wrapping at the end of the clip. */
  now(): number {
    if (!this.playing) return this.base
    return (this.base + (performance.now() - this.startedAt) / 1000) % this.duration
  }

  isPlaying(): boolean {
    return this.playing
  }

  play(): void {
    if (this.playing) return
    this.startedAt = performance.now()
    this.playing = true
    this.emit()
  }

  pause(): void {
    if (!this.playing) return
    this.base = this.now()
    this.playing = false
    this.emit()
  }

  toggle(): void {
    if (this.playing) this.pause()
    else this.play()
  }

  seek(t: number): void {
    this.base = Math.min(Math.max(t, 0), this.duration - 0.01)
    this.startedAt = performance.now()
    this.seekId++
    this.emit()
  }

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  getSnapshot = (): ClockSnapshot => this.snap

  private read(): ClockSnapshot {
    return { t: this.now(), playing: this.playing, seekId: this.seekId }
  }

  private emit(): void {
    this.snap = this.read()
    this.listeners.forEach((cb) => cb())
  }
}
