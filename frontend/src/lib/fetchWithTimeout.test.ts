import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchWithTimeout,
  FetchTimeoutError,
  DEFAULT_FETCH_TIMEOUT_MS,
} from './fetchWithTimeout'

// Mimics real fetch: settles only via the passed signal.
function abortableFetch() {
  return vi.fn(
    (_input: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(
            init.signal?.reason instanceof Error
              ? init.signal.reason
              : new DOMException('aborted', 'AbortError'),
          )
        })
      }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchWithTimeout', () => {
  it(`defaults to a ${DEFAULT_FETCH_TIMEOUT_MS}ms timeout`, () => {
    expect(DEFAULT_FETCH_TIMEOUT_MS).toBe(10_000)
  })

  it('returns the response when fetch settles in time', async () => {
    const response = new Response('{}', { status: 200 })
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchWithTimeout('http://x/api', { method: 'GET' }, 50)

    expect(result).toBe(response)
    expect(fetchMock).toHaveBeenCalledOnce()
    // an abort signal is always attached
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      signal: expect.any(AbortSignal),
    })
  })

  it('throws FetchTimeoutError when fetch hangs past the timeout', async () => {
    vi.stubGlobal('fetch', abortableFetch())

    const error = await fetchWithTimeout('http://x/api', {}, 20).catch(
      (err: unknown) => err,
    )

    expect(error).toBeInstanceOf(FetchTimeoutError)
    expect((error as FetchTimeoutError).timeoutMs).toBe(20)
  })

  it('rethows non-abort fetch errors untouched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('db down')))

    await expect(fetchWithTimeout('http://x/api', {}, 20)).rejects.toThrow(
      'db down',
    )
  })

  it('does not call fetch when the caller signal is already aborted', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    controller.abort()

    await expect(
      fetchWithTimeout('http://x/api', { signal: controller.signal }, 20),
    ).rejects.toSatisfy(
      // duck-typed: jsdom's abort reason fails cross-realm instanceof
      (err: unknown) =>
        typeof err === 'object' &&
        err !== null &&
        (err as { name?: unknown }).name === 'AbortError',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('propagates a mid-flight caller abort instead of FetchTimeoutError', async () => {
    vi.stubGlobal('fetch', abortableFetch())
    const controller = new AbortController()
    const reason = new Error('unmount')
    setTimeout(() => controller.abort(reason), 5)

    const error = await fetchWithTimeout(
      'http://x/api',
      { signal: controller.signal },
      1000,
    ).catch((err: unknown) => err)

    expect(error).toBe(reason)
  })
})
