export const DEFAULT_FETCH_TIMEOUT_MS = 10_000

export class FetchTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = 'FetchTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

// Duck-typed on purpose: DOMException identities differ across realms
// (jsdom's AbortController vs the global DOMException), so instanceof
// is unreliable here and in tests.
function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

// fetch() with a timeout. Timer is always cleared, so no dangling handles.
// An optional caller signal (e.g. React effect cleanup on unmount) takes
// precedence: its abort propagates untouched, never as FetchTimeoutError.
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const { signal: externalSignal, ...rest } = init

  if (externalSignal?.aborted) {
    throw externalSignal.reason ?? new DOMException('Aborted', 'AbortError')
  }

  const controller = new AbortController()
  const onExternalAbort = () => controller.abort(externalSignal?.reason)
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true })

  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...rest, signal: controller.signal })
  } catch (error) {
    if (externalSignal?.aborted) {
      throw error
    }
    if (isAbortError(error)) {
      throw new FetchTimeoutError(timeoutMs)
    }
    throw error
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}
