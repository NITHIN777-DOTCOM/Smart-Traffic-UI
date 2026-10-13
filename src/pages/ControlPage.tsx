import { useModeHistory, useMode, useStatus } from '../data/hooks'
import './control.css'

import { MODE_LABEL } from '../data/labels'

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const fmtTime = (iso: string) => timeFmt.format(new Date(iso))

export function ControlPage() {
  const { mode, pending, error, setMode } = useMode()
  const { data: status } = useStatus()
  const { data: history } = useModeHistory()

  const on = (pending ?? mode) === 'ppo'
  const heading = mode === null ? 'Loading…' : mode === 'ppo' ? 'AI Adaptive (PPO model)' : 'Round-robin mode'

  return (
    <main className="page control-page">
      <div className="page-title">
        <h1>System Control</h1>
        <p>Choose how the Raspberry Pi drives the junction signals.</p>
      </div>

      <section aria-label="AI mode switch" className="card mode-card">
        <div className="mode-text">
          <span className="eyebrow">Current mode</span>
          <span className="mode-heading">{heading}</span>
          <span className="mode-desc">
            {pending
              ? `Switching to ${MODE_LABEL[pending]}… waiting for the current yellow and all-red clearance to finish.`
              : mode === 'ppo'
                ? 'The model picks the next green phase and how long it lasts from the live camera feeds. Switch off to fall back to the fixed round-robin cycle.'
                : 'Signals rotate through each arm on a fixed cycle. Switch on to let the PPO model choose phases from the camera feeds.'}
          </span>
          {error && <span className="error-text">Switch failed: {error}</span>}
        </div>
        <div className="switch-wrap">
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-busy={pending !== null}
            aria-label="AI adaptive mode"
            className={`big-switch${on ? ' on' : ''}${pending ? ' pending' : ''}`}
            disabled={mode === null || pending !== null}
            onClick={() => setMode(on ? 'round_robin' : 'ppo')}
          >
            <span className="knob" />
          </button>
          <span className={`switch-label${on ? ' on' : ''}`}>{pending ? 'Pending…' : on ? 'ON' : 'OFF'}</span>
        </div>
      </section>

      <div className="explainers">
        <ModeCard
          active={mode === 'round_robin'}
          title="Switch OFF → Round robin"
          subtitle="Fixed cycle"
          body="Signals rotate West → East → South with a fixed green time. No camera input is used."
        />
        <ModeCard
          active={mode === 'ppo'}
          title="Switch ON → PPO model"
          subtitle="Adaptive"
          body="YOLO detects vehicles on each arm, the PPO policy chooses the phase and its duration, and the safety governor checks every decision."
        />
      </div>

      <section aria-label="Device status" className="status-grid">
        <div className="tile">
          <span className="eyebrow">Raspberry Pi</span>
          <span className="tile-value">
            <span className={`dot dot-lg ${status?.piOnline ? 'dot-green' : 'dot-red'}`} />
            {status ? (status.piOnline ? 'Online' : 'Offline') : '—'}
          </span>
          <span className="muted tile-sub">{status?.ip ?? 'IP unknown'}</span>
        </div>
        <div className="tile">
          <span className="eyebrow">Signal controller</span>
          <span className="tile-value">
            <span className={`dot dot-lg ${status?.esp32 ? 'dot-green' : 'dot-red'}`} />
            {status ? (status.esp32 ? 'ESP32 linked' : 'ESP32 not linked') : '—'}
          </span>
          <span className="muted tile-sub">Serial / Wi-Fi</span>
        </div>
        <div className="tile">
          <span className="eyebrow">Cameras</span>
          <span className="tile-value num">{status ? `${status.cameras} / 3 feeds` : '—'}</span>
          <span className="muted tile-sub">Recorded 10-min clips</span>
        </div>
        <div className="tile">
          <span className="eyebrow">Last switched</span>
          <span className="tile-value num">{status?.lastSwitch ? fmtTime(status.lastSwitch.at) : '—'}</span>
          <span className="muted tile-sub">
            {status?.lastSwitch
              ? `${MODE_LABEL[status.lastSwitch.from]} → ${MODE_LABEL[status.lastSwitch.to]}`
              : 'No switches yet'}
          </span>
        </div>
      </section>

      <section aria-label="Mode history" className="card history">
        <h2>Recent mode changes</h2>
        <ul className="history-list">
          {(history ?? []).map((h) => (
            <li key={h.at + h.to}>
              <span className="muted num">{fmtTime(h.at)}</span>
              <span>{h.from ? `${MODE_LABEL[h.from]} → ${MODE_LABEL[h.to]}` : `System started in ${MODE_LABEL[h.to]}`}</span>
              <span className="muted">{h.source}</span>
            </li>
          ))}
        </ul>
        <p className="muted note">A switch takes effect once the current yellow and all-red clearance finishes.</p>
      </section>
    </main>
  )
}

function ModeCard(props: { active: boolean; title: string; subtitle: string; body: string }) {
  return (
    <article className={`card mode-explainer${props.active ? ' active' : ''}`}>
      <div className="explainer-head">
        <h2>{props.title}</h2>
        {props.active ? <span className="pill pill-accent">Active</span> : <span className="pill muted">Standby</span>}
      </div>
      <span className="explainer-sub">{props.subtitle}</span>
      <p className="muted">{props.body}</p>
    </article>
  )
}
