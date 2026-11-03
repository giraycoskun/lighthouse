import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const applicationResponse = {
  applications: [{
    id: 1,
    name: 'Home Assistant',
    runtime: 'docker',
    internal_address: 'http://homeassistant.local:8123',
    external_address: null,
    created_at: '2026-11-02T12:00:00Z',
    status: {
      state: 'online',
      checked_at: '2026-11-02T12:30:00Z',
      reachable_address: 'http://homeassistant.local:8123',
    },
  }],
}

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
})

test('renders backend status from the API', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    const body = path.includes('/applications')
      ? applicationResponse
      : path.includes('/ready') ? readyResponse : statusResponse
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  render(<App />)

  expect(screen.getByRole('heading', { name: 'System overview' })).toBeInTheDocument()
  expect(await screen.findByText('test-version')).toBeInTheDocument()
  expect(screen.getByText('2h 30m')).toBeInTheDocument()
  expect(screen.getByText('API online')).toBeInTheDocument()
  expect(await screen.findByText('Home Assistant')).toBeInTheDocument()
  expect(screen.getByText('online')).toBeInTheDocument()
  expect(screen.queryByText('Next capabilities')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Open API documentation in Swagger UI' })).toHaveAttribute('href', '/docs/')
  expect(globalThis.fetch).toHaveBeenCalledTimes(3)
})

test('adds an application with an internal or external address', async () => {
  window.history.replaceState({}, '', '/applications/new')
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = String(input)
    if (init?.method === 'POST') {
      return new Response(JSON.stringify(applicationResponse.applications[0]), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const body = path.includes('/applications')
      ? { applications: [] }
      : path.includes('/ready') ? readyResponse : statusResponse
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  render(<App />)
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Grafana' } })
  fireEvent.click(screen.getByLabelText(/systemd/i))
  fireEvent.change(screen.getByLabelText(/External address/), { target: { value: 'https://grafana.example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add application' }))

  await waitFor(() => expect(screen.getByRole('heading', { name: 'System overview' })).toBeInTheDocument())
  const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
  expect(post).toBeDefined()
  expect(JSON.parse(String(post?.[1]?.body))).toEqual({
    name: 'Grafana',
    runtime: 'systemd',
    internal_address: null,
    external_address: 'https://grafana.example.com',
  })
})

test('requires at least one application address', async () => {
  window.history.replaceState({}, '', '/applications/new')
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    const body = path.includes('/applications')
      ? { applications: [] }
      : path.includes('/ready') ? readyResponse : statusResponse
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })

  render(<App />)
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Grafana' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add application' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Provide an internal address')
})

test('shows a useful error when the backend cannot be reached', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network error'))

  render(<App />)

  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  expect(screen.getByText(/API is not responding/)).toBeInTheDocument()
  expect(screen.getByText('API offline')).toBeInTheDocument()
})
