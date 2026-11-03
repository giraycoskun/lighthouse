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

export async function getDashboardSnapshot(signal?: AbortSignal): Promise<DashboardSnapshot> {
  const [readiness, status] = await Promise.all([
    getJSON<ReadinessResponse>('/api/v1/health/ready', signal),
    getJSON<StatusResponse>('/api/v1/status', signal),
  ])

  return { readiness, status, receivedAt: new Date() }
}
