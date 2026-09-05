import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Home from './Home'
import RedirectPage from './RedirectPage'

const API_URL = 'http://test-api.local'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location')
const assignMock = vi.fn()

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route index element={<Home />} />
        <Route path="/r/:shortCode" element={<RedirectPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', API_URL)
  Object.defineProperty(window, 'location', {
    value: { assign: assignMock },
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  if (locationDescriptor) {
    Object.defineProperty(window, 'location', locationDescriptor)
  }
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  assignMock.mockReset()
})

describe('RedirectPage', () => {
  it('redirects to the original URL for a known code', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ originalUrl: 'https://example.com/target' }),
      )
    vi.stubGlobal('fetch', fetchMock)

    renderAt('/r/a1b2c3d')

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith('https://example.com/target')
    })
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/api/shorten-url/a1b2c3d`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('navigates home for an unknown code', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ message: 'Short URL not found' }, 404),
        ),
    )

    renderAt('/r/unknown1')

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /shorten link/i }),
      ).toBeInTheDocument()
    })
    expect(assignMock).not.toHaveBeenCalled()
  })
})
