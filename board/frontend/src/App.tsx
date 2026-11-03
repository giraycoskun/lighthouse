import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBoardStatus, type BoardStatus, type HealthState } from './api'
import { BeaconIcon, ClockIcon, CloudIcon, PulseIcon, RefreshIcon, ShieldIcon } from './icons'

const apiEnabled = import.meta.env.VITE_BOARD_API_ENABLED === 'true'

function formatTime(value?: string): string {
  if (!value) return 'No report received'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatUptime(seconds: number | null | undefined): string {
  if (seconds == null) return 'Unknown'
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  return days ? `${days}d ${hours}h` : `${hours}h`
}

function stateLabel(state?: HealthState): string {
  if (state === 'healthy') return 'Healthy'
  if (state === 'unhealthy') return 'Unhealthy'
  return 'Unknown'
}

function buildSlots(status: BoardStatus | null): HealthState[] {
  const samples = new Map(status?.hourly_samples.map((sample) => [sample.slot, sample.state]))
  const slots: HealthState[] = []
  const end = new Date()
  end.setMinutes(0, 0, 0)
  for (let offset = 239; offset >= 0; offset -= 1) {
    const slot = new Date(end.getTime() - offset * 3_600_000).toISOString()
    slots.push(samples.get(slot) ?? 'unknown')
  }
  return slots
}

export default function App() {
  const [status, setStatus] = useState<BoardStatus | null>(null)
  const [loading, setLoading] = useState(apiEnabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!apiEnabled) return
    setLoading(true)
    try {
      setStatus(await getBoardStatus(signal))
      setError(null)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError('The secure board API could not be reached. Existing status cannot be confirmed.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])

  const slots = useMemo(() => buildSlots(status), [status])
  const latestState = status?.latest?.tunnel ?? 'unknown'
  const availability = status?.availability.expected_slots
    ? Math.round((status.availability.received_slots / status.availability.expected_slots) * 100)
    : null

  return (
    <div className="page-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-icon"><BeaconIcon /></span><span>Lighthouse <small>Board</small></span></a>
        <nav aria-label="Board navigation"><a href="#status" className="active">Status</a><a href="#history">History</a><span aria-disabled="true">Recovery</span></nav>
        <div className="protected"><ShieldIcon /> Access protection required</div>
      </header>

      <main>
        <section className="intro" id="status">
          <div>
            <p className="overline">Independent recovery plane</p>
            <h1>{status?.server.name ?? 'Home server'}</h1>
            <p className="lede">Status reported directly from the server over outbound HTTPS—independent of the home tunnel.</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={!apiEnabled || loading}><RefreshIcon className={loading ? 'spin' : ''} /> {loading ? 'Checking…' : 'Check now'}</button>
        </section>

        {!apiEnabled && (
          <section className="notice" role="status">
            <span className="notice-number">01</span>
            <div><strong>Awaiting secure sync</strong><p>The static board is ready. Live telemetry remains disabled until the authenticated Worker API and D1 store are deployed.</p></div>
          </section>
        )}
        {error && <section className="notice error" role="alert"><span className="notice-number">!</span><div><strong>Status unavailable</strong><p>{error}</p></div></section>}

        <section className="summary" aria-label="Latest server status">
          <article className="primary-status">
            <div className={`signal ${latestState}`}><span /><PulseIcon /></div>
            <div><p className="label">Tunnel observation</p><p className="big-value">{stateLabel(latestState)}</p><p className="supporting">{status?.latest ? `Measured ${formatTime(status.latest.measured_at)}` : 'No verified observation yet'}</p></div>
          </article>
          <article><CloudIcon /><p className="label">Last contact</p><p className="value">{status?.latest ? formatTime(status.latest.received_at) : 'Never'}</p><p className="supporting">Worker receipt time</p></article>
          <article><ClockIcon /><p className="label">Host uptime</p><p className="value">{formatUptime(status?.latest?.host_uptime_seconds)}</p><p className="supporting">Reported by host helper</p></article>
          <article><BeaconIcon /><p className="label">Hourly samples</p><p className="value">{availability == null ? 'Unknown' : `${availability}%`}</p><p className="supporting">Rolling 10-day window</p></article>
        </section>

        <section className="history" id="history">
          <div className="section-title"><div><p className="overline">Telemetry history</p><h2>Last 10 days</h2></div><div className="legend"><span><i className="healthy" />Reported healthy</span><span><i className="unhealthy" />Reported unhealthy</span><span><i className="unknown" />Unknown</span></div></div>
          <div className="timeline" role="img" aria-label="Hourly sample history for the last ten days">
            {slots.map((slot, index) => <i key={index} className={slot} title={`Hourly slot: ${stateLabel(slot)}`} />)}
          </div>
          <div className="timeline-labels"><span>10 days ago</span><span>5 days ago</span><span>Now</span></div>
          <p className="history-note">Missing reports are shown as unknown. They do not prove that the server or tunnel was down.</p>
        </section>

        <section className="recovery-preview">
          <div><p className="overline">Recovery action</p><h2>Tunnel restart</h2><p>Restart commands require the authenticated API, a fresh one-use confirmation, and an available host executor.</p></div>
          <button type="button" disabled>Unavailable until API setup</button>
        </section>
      </main>

      <footer><span>Lighthouse independent board</span><span>Static shell · no secrets embedded</span></footer>
    </div>
  )
}
