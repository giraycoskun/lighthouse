export interface ReadinessResponse {
  status: 'ok'
  checks: {
    database: 'ok'
  }
}

export interface StatusResponse {
  service: 'lighthouse'
  version: string
  status: 'ok'
  started_at: string
  current_time: string
}

export interface DashboardSnapshot {
  readiness: ReadinessResponse
  status: StatusResponse
  receivedAt: Date
}

export type ApplicationRuntime = 'docker' | 'systemd'
export type ApplicationState = 'online' | 'offline'

export interface Application {
  id: number
  name: string
  runtime: ApplicationRuntime
  internal_address: string | null
  external_address: string | null
  created_at: string
  status: {
    state: ApplicationState
    checked_at: string
    reachable_address: string | null
  }
}

export interface CreateApplicationInput {
  name: string
  runtime: ApplicationRuntime
  internal_address: string | null
  external_address: string | null
}

async function getJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message ?? `Request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export async function getDashboardSnapshot(signal?: AbortSignal): Promise<DashboardSnapshot> {
  const [readiness, status] = await Promise.all([
    getJSON<ReadinessResponse>('/api/v1/health/ready', signal),
    getJSON<StatusResponse>('/api/v1/status', signal),
  ])

  return { readiness, status, receivedAt: new Date() }
}

export async function listApplications(signal?: AbortSignal): Promise<Application[]> {
  const response = await getJSON<{ applications: Application[] }>('/api/v1/applications', signal)
  return response.applications
}

export async function createApplication(input: CreateApplicationInput): Promise<Application> {
  const response = await fetch('/api/v1/applications', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  return parseResponse<Application>(response)
}
