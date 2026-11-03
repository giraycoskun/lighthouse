import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDashboardSnapshot, type DashboardSnapshot } from './api'
import {
  ArrowIcon,
  CheckIcon,
  ClockIcon,
  CodeIcon,
  DatabaseIcon,
  GridIcon,
  LighthouseIcon,
  RefreshIcon,
  ServerIcon,
} from './icons'

const refreshIntervalMs = 30_000

function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function formatUptime(startedAt: string, now: string): string {
  const seconds = Math.max(0, Math.floor((Date.parse(now) - Date.parse(startedAt)) / 1000))
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <p className="metric-label">{label}</p>
        <p className="metric-value">{value}</p>
        <p className="metric-detail">{detail}</p>
      </div>
    </article>
  )
}

export default function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setRefreshing(true)
    try {
      const next = await getDashboardSnapshot(signal)
      setSnapshot(next)
      setError(null)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError('The Lighthouse API is not responding. Check that the backend is running.')
    } finally {
      if (!signal?.aborted) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    const interval = window.setInterval(() => void refresh(), refreshIntervalMs)
    return () => {
      controller.abort()
      window.clearInterval(interval)
    }
  }, [refresh])

  const uptime = useMemo(() => {
    if (!snapshot) return '—'
    return formatUptime(snapshot.status.started_at, snapshot.status.current_time)
  }, [snapshot])

  const online = snapshot !== null && error === null

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Lighthouse home">
          <span className="brand-mark"><LighthouseIcon /></span>
          <span>Lighthouse</span>
        </a>
        <nav className="primary-nav" aria-label="Primary navigation">
          <a className="nav-link active" href="#overview"><GridIcon /> Overview</a>
          <a className="nav-link" href="/docs/"><CodeIcon /> API docs</a>
        </nav>
        <div className={`connection-state ${online ? 'online' : 'offline'}`}>
          <span className="state-dot" />
          {online ? 'API online' : refreshing ? 'Connecting' : 'API offline'}
        </div>
      </header>

      <main id="overview">
        <section className="hero">
          <div>
            <p className="eyebrow">Home server control plane</p>
            <h1>System overview</h1>
            <p className="hero-copy">A focused view of the services keeping Lighthouse operational.</p>
          </div>
          <button className="refresh-button" type="button" onClick={() => void refresh()} disabled={refreshing}>
            <RefreshIcon className={refreshing ? 'spinning' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh status'}
          </button>
        </section>

        {error && (
          <div className="error-banner" role="alert">
            <span className="error-mark">!</span>
            <div><strong>Connection unavailable</strong><p>{error}</p></div>
          </div>
        )}

        <section className="metrics" aria-label="System metrics" aria-busy={refreshing && !snapshot}>
          <MetricCard
            icon={<ServerIcon />}
            label="Application"
            value={snapshot ? 'Operational' : 'Waiting…'}
            detail={snapshot ? snapshot.status.service : 'Connecting to the API'}
          />
          <MetricCard
            icon={<DatabaseIcon />}
            label="Database"
            value={snapshot ? 'Ready' : 'Waiting…'}
            detail="SQLite persistence"
          />
          <MetricCard
            icon={<CodeIcon />}
            label="API version"
            value={snapshot?.status.version ?? '—'}
            detail="OpenAPI 3.1 contract"
          />
          <MetricCard
            icon={<ClockIcon />}
            label="Process uptime"
            value={uptime}
            detail={snapshot ? `Started ${formatDate(snapshot.status.started_at)}` : 'Awaiting runtime data'}
          />
        </section>

        <section className="content-grid">
          <article className="service-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Runtime detail</p>
                <h2>Backend service</h2>
              </div>
              <span className={`status-label ${online ? 'healthy' : 'unavailable'}`}>
                {online ? <CheckIcon /> : null}{online ? 'Healthy' : 'Unavailable'}
              </span>
            </div>
            <dl className="detail-list">
              <div><dt>Service</dt><dd>{snapshot?.status.service ?? '—'}</dd></div>
              <div><dt>Database check</dt><dd>{snapshot?.readiness.checks.database ?? '—'}</dd></div>
              <div><dt>Server time</dt><dd>{snapshot ? formatDate(snapshot.status.current_time) : '—'}</dd></div>
              <div><dt>Last refreshed</dt><dd>{snapshot ? formatDate(snapshot.receivedAt) : '—'}</dd></div>
            </dl>
          </article>

          <aside className="api-panel">
            <p className="eyebrow">Developer access</p>
            <h2>Explore the API</h2>
            <p>Inspect the live contract and exercise available endpoints through the embedded documentation.</p>
            <div className="api-actions">
              <a className="primary-action" href="/docs/">Open Swagger UI <ArrowIcon /></a>
              <a className="text-action" href="/openapi.yaml">View OpenAPI YAML</a>
            </div>
          </aside>
        </section>

        <section className="roadmap-strip" aria-labelledby="roadmap-title">
          <div><p className="eyebrow">Next capabilities</p><h2 id="roadmap-title">Built deliberately, one boundary at a time.</h2></div>
          <ul>
            <li><span>01</span> Host metrics</li>
            <li><span>02</span> Local authentication</li>
            <li><span>03</span> Board synchronization</li>
          </ul>
        </section>
      </main>

      <footer>
        <span>Lighthouse operations</span>
        <span>Automatic refresh every 30 seconds</span>
      </footer>
    </div>
  )
}
