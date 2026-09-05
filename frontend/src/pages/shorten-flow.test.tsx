import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import Home from './Home'
import RedirectPage from './RedirectPage'

const API_URL = 'http://test-api.local'
const BASE_URL = 'http://test-app.local'

// In-memory fake backend mirroring the real API contract:
// POST /api/shorten-url -> 201 { shortenUrl }
// GET  /api/shorten-url/:shortCode -> 200 { originalUrl } | 404 { message }
const store = new Map<string, string>()
let counter = 0

const server = setupServer(
  http.post(`${API_URL}/api/shorten-url`, async ({ request }) => {
    const body = (await request.json()) as { originalUrl?: string }
    if (!body.originalUrl || !/^https?:\/\//.test(body.originalUrl)) {
      return HttpResponse.json({ message: 'Invalid URL' }, { status: 400 })
    }
    counter += 1
    const code = `c${counter}`.padEnd(7, '0')
    store.set(code, body.originalUrl)
    return HttpResponse.json({ shortenUrl: code }, { status: 201 })
  }),
  http.get(`${API_URL}/api/shorten-url/:shortCode`, ({ params }) => {
    const originalUrl = store.get(params.shortCode as string)
    if (!originalUrl) {
      return HttpResponse.json(
        { message: 'Short URL not found' },
        { status: 404 },
      )
    }
    return HttpResponse.json({ originalUrl })
  }),
)

const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location')
const assignMock = vi.fn()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', API_URL)
  vi.stubEnv('VITE_BASE_URL', BASE_URL)
  Object.defineProperty(window, 'location', {
    value: { assign: assignMock },
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  server.resetHandlers()
  store.clear()
  counter = 0
  if (locationDescriptor) {
    Object.defineProperty(window, 'location', locationDescriptor)
  }
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  assignMock.mockReset()
})

afterAll(() => {
  server.close()
})

describe('shorten flow (Home + API)', () => {
  it('creates a link and displays it', async () => {
    const user = userEvent.setup()
    render(<Home />)

    await user.type(
      screen.getByPlaceholderText('https://your-very-long-link.com/goes-here'),
      'https://example.com/some/long/path',
    )
    await user.click(screen.getByRole('button', { name: /shorten link/i }))

    await waitFor(() => {
      expect(screen.getByText(`${BASE_URL}/r/c100000`)).toBeInTheDocument()
    })
  })

  it('shows the error state when the API rejects the URL', async () => {
    const user = userEvent.setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Home />)

    await user.type(
      screen.getByPlaceholderText('https://your-very-long-link.com/goes-here'),
      'https://example.com/some/long/path',
    )
    server.use(
      http.post(`${API_URL}/api/shorten-url`, () =>
        HttpResponse.json({ message: 'Too many requests' }, { status: 429 }),
      ),
    )
    await user.click(screen.getByRole('button', { name: /shorten link/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to shorten url.')).toBeInTheDocument()
    })
  })
})

describe('redirect flow (RedirectPage + API)', () => {
  it('resolves a code created through the API and redirects', async () => {
    // seed through the same fake API the app talks to
    const created = await fetch(`${API_URL}/api/shorten-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalUrl: 'https://example.com/target' }),
    })
    const { shortenUrl } = (await created.json()) as { shortenUrl: string }

    render(
      <MemoryRouter initialEntries={[`/r/${shortenUrl}`]}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="/r/:shortCode" element={<RedirectPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith('https://example.com/target')
    })
  })

  it('falls back home for a code the API does not know', async () => {
    render(
      <MemoryRouter initialEntries={['/r/c999999']}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="/r/:shortCode" element={<RedirectPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /shorten link/i }),
      ).toBeInTheDocument()
    })
    expect(assignMock).not.toHaveBeenCalled()
  })
})
