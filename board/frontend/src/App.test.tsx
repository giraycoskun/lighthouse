import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

test('renders a truthful static state without invoking an API', () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Home server' })).toBeInTheDocument()
  expect(screen.getByText('Awaiting secure sync')).toBeInTheDocument()
  expect(screen.getByText('Unknown', { selector: '.big-value' })).toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
})

test('does not enable an unsafe recovery action in the static build', () => {
  render(<App />)
  expect(screen.getByRole('button', { name: 'Unavailable until API setup' })).toBeDisabled()
  expect(screen.getByText(/no secrets embedded/i)).toBeInTheDocument()
})
