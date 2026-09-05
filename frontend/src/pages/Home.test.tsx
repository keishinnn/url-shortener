import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Home from './Home'

const API_URL = 'http://test-api.local'
const BASE_URL = 'http://test-app.local'
const URL_INPUT = 'https://your-very-long-link.com/goes-here'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function submitUrl(user: UserEvent, url: string) {
  await user.type(screen.getByPlaceholderText(URL_INPUT), url)
  await user.click(screen.getByRole('button', { name: /shorten link/i }))
}

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', API_URL)
  vi.stubEnv('VITE_BASE_URL', BASE_URL)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('Home', () => {
  it('renders the form', () => {
    render(<Home />)

    expect(screen.getByPlaceholderText(URL_INPUT)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /shorten link/i }),
    ).toBeInTheDocument()
  })

  it('creates a short link and shows it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ shortenUrl: 'a1b2c3d' }))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<Home />)
    await submitUrl(user, 'https://example.com/very/long/url')

    await waitFor(() => {
      expect(
        screen.getByText(`${BASE_URL}/r/a1b2c3d`),
      ).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${API_URL}/api/shorten-url`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({
      originalUrl: 'https://example.com/very/long/url',
    })

    // submit is locked once a short link exists
    expect(
      screen.getByRole('button', { name: /shorten link/i }),
    ).toBeDisabled()
  })

  it('shows an error when the API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ message: 'boom' }, 500)),
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const user = userEvent.setup()
    render(<Home />)
    await submitUrl(user, 'https://example.com/very/long/url')

    await waitFor(() => {
      expect(screen.getByText('Failed to shorten url.')).toBeInTheDocument()
    })
    expect(screen.queryByText(/your short link/i)).not.toBeInTheDocument()
  })

  it('disables submit while the request is in flight', async () => {
    let resolveFetch!: (response: Response) => void
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending))

    const user = userEvent.setup()
    render(<Home />)
    await submitUrl(user, 'https://example.com/very/long/url')

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /shortening/i }),
      ).toBeDisabled()
    })

    resolveFetch(jsonResponse({ shortenUrl: 'a1b2c3d' }))
    await waitFor(() => {
      expect(
        screen.getByText(`${BASE_URL}/r/a1b2c3d`),
      ).toBeInTheDocument()
    })
  })

  it('copies the short link to the clipboard', async () => {
    const user = userEvent.setup()
    // NB: stub after userEvent.setup() — setup installs its own
    // navigator.clipboard getter that would shadow this stub.
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ shortenUrl: 'a1b2c3d' })),
    )

    render(<Home />)
    await submitUrl(user, 'https://example.com/very/long/url')
    await waitFor(() => {
      expect(
        screen.getByText(`${BASE_URL}/r/a1b2c3d`),
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /copy/i }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(`${BASE_URL}/r/a1b2c3d`)
    })
    expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
  })
})
