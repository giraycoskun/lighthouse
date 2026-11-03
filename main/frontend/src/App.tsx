import { useCallback, useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import {
  createApplication,
  getDashboardSnapshot,
  listApplications,
  type Application,
  type ApplicationRuntime,
  type CreateApplicationInput,
  type DashboardSnapshot,
} from './api'
import {
  CheckIcon,
  ClockIcon,
  CodeIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  LighthouseIcon,
  PlusIcon,
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

function ApplicationCard({ application }: { application: Application }) {
  const addresses = [
    ['Internal', application.internal_address],
    ['External', application.external_address],
  ] as const

  return (
    <article className="application-card">
      <div className="application-card-heading">
        <div>
          <p className="runtime-label">{application.runtime}</p>
          <h3>{application.name}</h3>
        </div>
        <span className={`status-label ${application.status.state === 'online' ? 'healthy' : 'unavailable'}`}>
          <span className="application-state-dot" />
          {application.status.state}
        </span>
      </div>
      <div className="application-addresses">
        {addresses.map(([label, address]) => address && (
          <a key={label} href={address} target="_blank" rel="noreferrer">
            <span>{label}</span>
            <strong>{address}</strong>
            <ExternalLinkIcon />
          </a>
        ))}
      </div>
      <p className="checked-at">Checked {formatDate(application.status.checked_at)}</p>
    </article>
  )
}

function ApplicationsSection({
  applications,
  loading,
  error,
  onAdd,
  onRetry,
}: {
  applications: Application[]
  loading: boolean
  error: string | null
  onAdd: (event: MouseEvent<HTMLAnchorElement>) => void
  onRetry: () => void
}) {
  return (
    <section className="applications-section" aria-labelledby="applications-title">
      <div className="section-heading applications-heading">
        <div>
          <p className="eyebrow">Service monitoring</p>
          <h2 id="applications-title">Applications</h2>
          <p className="section-copy">Services running through Docker or systemd, checked from their configured addresses.</p>
        </div>
        <a className="add-button" href="/applications/new" onClick={onAdd}><PlusIcon /> Add application</a>
      </div>

      {error ? (
        <div className="inline-state" role="status">
          <div><strong>Applications unavailable</strong><p>{error}</p></div>
          <button type="button" onClick={onRetry}>Try again</button>
        </div>
      ) : loading && applications.length === 0 ? (
        <div className="empty-applications"><p>Checking configured applications…</p></div>
      ) : applications.length === 0 ? (
        <div className="empty-applications">
          <ServerIcon />
          <h3>No applications yet</h3>
          <p>Add an internal address, an external address, or both to begin monitoring.</p>
          <a href="/applications/new" onClick={onAdd}>Add your first application</a>
        </div>
      ) : (
        <div className="application-grid">
          {applications.map((application) => <ApplicationCard key={application.id} application={application} />)}
        </div>
      )}
    </section>
  )
}

function OverviewPage({
  snapshot,
  error,
  refreshing,
  applications,
  applicationsLoading,
  applicationsError,
  onRefresh,
  onApplicationsRetry,
  onNavigate,
}: {
  snapshot: DashboardSnapshot | null
  error: string | null
  refreshing: boolean
  applications: Application[]
  applicationsLoading: boolean
  applicationsError: string | null
  onRefresh: () => void
  onApplicationsRetry: () => void
  onNavigate: (path: string) => void
}) {
  const uptime = useMemo(() => {
    if (!snapshot) return '—'
    return formatUptime(snapshot.status.started_at, snapshot.status.current_time)
  }, [snapshot])
  const online = snapshot !== null && error === null
  const navigateToAdd = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    onNavigate('/applications/new')
  }

  return (
    <main id="overview">
      <section className="hero">
        <div>
          <p className="eyebrow">Home server control plane</p>
          <h1>System overview</h1>
          <p className="hero-copy">A focused view of the services keeping Lighthouse operational.</p>
        </div>
        <button className="refresh-button" type="button" onClick={onRefresh} disabled={refreshing}>
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
        <MetricCard icon={<ServerIcon />} label="Application" value={snapshot ? 'Operational' : 'Waiting…'} detail={snapshot ? snapshot.status.service : 'Connecting to the API'} />
        <MetricCard icon={<DatabaseIcon />} label="Database" value={snapshot ? 'Ready' : 'Waiting…'} detail="SQLite persistence" />
        <MetricCard icon={<CodeIcon />} label="API version" value={snapshot?.status.version ?? '—'} detail="OpenAPI 3.1 contract" />
        <MetricCard icon={<ClockIcon />} label="Process uptime" value={uptime} detail={snapshot ? `Started ${formatDate(snapshot.status.started_at)}` : 'Awaiting runtime data'} />
      </section>

      <section className="content-grid">
        <article className="service-panel">
          <div className="section-heading">
            <div><p className="eyebrow">Runtime detail</p><h2>Backend service</h2></div>
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
      </section>

      <ApplicationsSection
        applications={applications}
        loading={applicationsLoading}
        error={applicationsError}
        onAdd={navigateToAdd}
        onRetry={onApplicationsRetry}
      />
    </main>
  )
}

function AddApplicationPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [name, setName] = useState('')
  const [runtime, setRuntime] = useState<ApplicationRuntime>('docker')
  const [internalAddress, setInternalAddress] = useState('')
  const [externalAddress, setExternalAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!internalAddress.trim() && !externalAddress.trim()) {
      setError('Provide an internal address, an external address, or both.')
      return
    }
    setSubmitting(true)
    setError(null)
    const input: CreateApplicationInput = {
      name: name.trim(),
      runtime,
      internal_address: internalAddress.trim() || null,
      external_address: externalAddress.trim() || null,
    }
    try {
      await createApplication(input)
      onNavigate('/')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Application could not be added.')
    } finally {
      setSubmitting(false)
    }
  }

  const navigateHome = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    onNavigate('/')
  }

  return (
    <main className="form-page">
      <a className="back-link" href="/" onClick={navigateHome}>← Back to overview</a>
      <section className="form-intro">
        <p className="eyebrow">Service monitoring</p>
        <h1>Add application</h1>
        <p className="hero-copy">Register a Docker container or systemd service. Lighthouse will check the addresses you provide and show whether the application is reachable.</p>
      </section>

      <form className="application-form" onSubmit={(event) => void submit(event)}>
        <div className="form-section">
          <div className="form-section-copy"><span>01</span><div><h2>Application details</h2><p>Give the service a recognizable name and select how it runs.</p></div></div>
          <div className="form-fields">
            <label><span>Name</span><input name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Home Assistant" maxLength={120} required /></label>
            <fieldset>
              <legend>Runtime</legend>
              <div className="runtime-options">
                {(['docker', 'systemd'] as const).map((option) => (
                  <label key={option} className={runtime === option ? 'selected' : ''}>
                    <input type="radio" name="runtime" value={option} checked={runtime === option} onChange={() => setRuntime(option)} />
                    <span><strong>{option === 'docker' ? 'Docker' : 'systemd'}</strong><small>{option === 'docker' ? 'Containerized service' : 'Host-managed service'}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-copy"><span>02</span><div><h2>Addresses</h2><p>Provide at least one complete HTTP or HTTPS URL.</p></div></div>
          <div className="form-fields">
            <label><span>Internal address <small>Optional</small></span><input type="url" name="internal_address" value={internalAddress} onChange={(event) => setInternalAddress(event.target.value)} placeholder="http://192.168.1.20:8123" /></label>
            <label><span>External address <small>Optional</small></span><input type="url" name="external_address" value={externalAddress} onChange={(event) => setExternalAddress(event.target.value)} placeholder="https://home.example.com" /></label>
            <p className="field-hint">Lighthouse tries the internal address first, then the external address. Any HTTP response below 500 is considered online.</p>
          </div>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-actions">
          <a href="/" onClick={navigateHome}>Cancel</a>
          <button type="submit" disabled={submitting}>{submitting ? 'Adding application…' : 'Add application'}</button>
        </div>
      </form>
    </main>
  )
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [applicationsError, setApplicationsError] = useState<string | null>(null)
  const [applicationsLoading, setApplicationsLoading] = useState(false)

  const loadApplications = useCallback(async (signal?: AbortSignal) => {
    setApplicationsLoading(true)
    try {
      setApplications(await listApplications(signal))
      setApplicationsError(null)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setApplicationsError('The application list could not be loaded.')
    } finally {
      if (!signal?.aborted) setApplicationsLoading(false)
    }
  }, [])

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setRefreshing(true)
    try {
      setSnapshot(await getDashboardSnapshot(signal))
      setError(null)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError('The Lighthouse API is not responding. Check that the backend is running.')
    } finally {
      if (!signal?.aborted) setRefreshing(false)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), loadApplications()])
  }, [loadApplications, refresh])

  const navigate = useCallback((nextPath: string) => {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
    window.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    void loadApplications(controller.signal)
    const interval = window.setInterval(() => void refreshAll(), refreshIntervalMs)
    return () => {
      controller.abort()
      window.clearInterval(interval)
    }
  }, [loadApplications, refresh, refreshAll])

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const online = snapshot !== null && error === null
  const isAddPage = path === '/applications/new'

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate('/') }} aria-label="Lighthouse home">
          <span className="brand-mark"><LighthouseIcon /></span><span>Lighthouse</span>
        </a>
        <nav className="primary-nav" aria-label="Primary navigation">
          <a className={!isAddPage ? 'active' : ''} href="/" onClick={(event) => { event.preventDefault(); navigate('/') }}>Overview</a>
          <a className={isAddPage ? 'active' : ''} href="/applications/new" onClick={(event) => { event.preventDefault(); navigate('/applications/new') }}>Add application</a>
        </nav>
        <div className={`connection-state ${online ? 'online' : 'offline'}`}><span className="state-dot" />{online ? 'API online' : refreshing ? 'Connecting' : 'API offline'}</div>
      </header>

      {isAddPage ? (
        <AddApplicationPage onNavigate={(nextPath) => { navigate(nextPath); if (nextPath === '/') void loadApplications() }} />
      ) : (
        <OverviewPage
          snapshot={snapshot}
          error={error}
          refreshing={refreshing}
          applications={applications}
          applicationsLoading={applicationsLoading}
          applicationsError={applicationsError}
          onRefresh={() => void refreshAll()}
          onApplicationsRetry={() => void loadApplications()}
          onNavigate={navigate}
        />
      )}

      <footer><span>Lighthouse operations</span><div className="footer-meta"><span>Automatic refresh every 30 seconds</span><a className="footer-docs" href="/docs/" aria-label="Open API documentation in Swagger UI"><CodeIcon /> Open Swagger UI</a></div></footer>
    </div>
  )
}
