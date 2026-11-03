import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'

const readyResponse = { status: 'ok', checks: { database: 'ok' } }
const statusResponse = {
  service: 'lighthouse',
  version: 'test-version',
  status: 'ok',
  started_at: '2026-11-02T10:00:00Z',
  current_time: '2026-11-02T12:30:00Z',
}

afterEach(() => {
  vi.restoreAllMocks()
})

test('renders backend status from the API', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    return new Response(JSON.stringify(path.includes('/ready') ? readyResponse : statusResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  render(<App />)

  expect(screen.getByRole('heading', { name: 'System overview' })).toBeInTheDocument()
  expect(await screen.findByText('test-version')).toBeInTheDocument()
  expect(screen.getByText('2h 30m')).toBeInTheDocument()
  expect(screen.getByText('API online')).toBeInTheDocument()
  expect(globalThis.fetch).toHaveBeenCalledTimes(2)
})

test('shows a useful error when the backend cannot be reached', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network error'))

  render(<App />)

  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  expect(screen.getByText(/API is not responding/)).toBeInTheDocument()
  expect(screen.getByText('API offline')).toBeInTheDocument()
})
