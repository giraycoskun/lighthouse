export type HealthState = 'healthy' | 'unhealthy' | 'unknown'

export interface HourlySample {
  slot: string
  state: HealthState
}

export interface BoardStatus {
  server: {
    id: string
    name: string
  }
  latest: {
    received_at: string
    measured_at: string
    tunnel: HealthState
    host_uptime_seconds: number | null
  } | null
  availability: {
    received_slots: number
    expected_slots: number
    window_days: number
  }
  hourly_samples: HourlySample[]
}

export async function getBoardStatus(signal?: AbortSignal): Promise<BoardStatus> {
  const response = await fetch('/api/v1/board/status', {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
    signal,
  })
  if (!response.ok) throw new Error(`Board API returned ${response.status}`)
  return (await response.json()) as BoardStatus
}
