import { test, expect } from '@playwright/test'

const SHORT_CODE = 'abc1234'
const BASE_URL = 'http://localhost:5173'

test.describe('Home — shorten flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders heading, input and submit button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /free url/i })).toBeVisible()
    await expect(page.getByPlaceholder('https://your-very-long-link.com/goes-here')).toBeVisible()
    await expect(page.getByRole('button', { name: /shorten link/i })).toBeVisible()
  })

  test('creates a short link on valid URL', async ({ page }) => {
    await page.route('**/api/shorten-url', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      const body = route.request().postDataJSON() as { originalUrl?: string }
      expect(body.originalUrl).toBe('https://example.com/very-long')
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ shortenUrl: SHORT_CODE }),
      })
    })

    await page.getByPlaceholder('https://your-very-long-link.com/goes-here').fill('https://example.com/very-long')
    await page.getByRole('button', { name: /shorten link/i }).click()

    await expect(page.getByText(`${BASE_URL}/r/${SHORT_CODE}`)).toBeVisible()
    await expect(page.getByText('Your short link')).toBeVisible()
    // submit is disabled once a short link exists
    await expect(page.getByRole('button', { name: /shorten link/i })).toBeDisabled()
  })

  test('shows loading state while request is pending', async ({ page }) => {
    await page.route('**/api/shorten-url', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await new Promise((r) => setTimeout(r, 400))
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ shortenUrl: SHORT_CODE }),
      })
    })

    await page.getByPlaceholder('https://your-very-long-link.com/goes-here').fill('https://example.com/pending')
    await page.getByRole('button', { name: /shorten link/i }).click()

    await expect(page.getByRole('button', { name: /shortening/i })).toBeVisible()
    await expect(page.getByText(`${BASE_URL}/r/${SHORT_CODE}`)).toBeVisible({ timeout: 5000 })
  })

  test('shows generic error on 500', async ({ page }) => {
    await page.route('**/api/shorten-url', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal' }),
      })
    })

    await page.getByPlaceholder('https://your-very-long-link.com/goes-here').fill('https://example.com/fails')
    await page.getByRole('button', { name: /shorten link/i }).click()

    await expect(page.getByText('Failed to shorten url.')).toBeVisible()
    await expect(page.getByText(`${BASE_URL}/r/`)).not.toBeVisible()
  })

  test('shows generic error on network failure', async ({ page }) => {
    await page.route('**/api/shorten-url', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.abort('failed')
    })

    await page.getByPlaceholder('https://your-very-long-link.com/goes-here').fill('https://example.com/offline')
    await page.getByRole('button', { name: /shorten link/i }).click()

    await expect(page.getByText('Failed to shorten url.')).toBeVisible()
  })

  test('copy button copies short link and shows Copied', async ({ page }) => {
    await page.route('**/api/shorten-url', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ shortenUrl: SHORT_CODE }),
      })
    })

    // Stub clipboard so we can assert the written value without OS permissions.
    await page.addInitScript(() => {
      const g = window as unknown as { __clipboardText: string | null }
      g.__clipboardText = null
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            g.__clipboardText = text
          },
          readText: async () => g.__clipboardText ?? '',
        },
        configurable: true,
      })
    })
    // Re-navigate so initScript takes effect before React mounts
    await page.goto('/')

    // Need to re-mock after reload (route handlers survive, initScript re-runs)
    await page.route('**/api/shorten-url', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ shortenUrl: SHORT_CODE }),
      })
    })

    await page.getByPlaceholder('https://your-very-long-link.com/goes-here').fill('https://example.com/copy-me')
    await page.getByRole('button', { name: /shorten link/i }).click()
    await expect(page.getByText(`${BASE_URL}/r/${SHORT_CODE}`)).toBeVisible()

    await page.getByRole('button', { name: /copy/i }).click()
    await expect(page.getByRole('button', { name: /copied/i })).toBeVisible()
    const clipped = await page.evaluate(() => (window as unknown as { __clipboardText: string }).__clipboardText)
    expect(clipped).toBe(`${BASE_URL}/r/${SHORT_CODE}`)
  })

  test('Shorten another link navigates home and resets form', async ({ page }) => {
    await page.route('**/api/shorten-url', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ shortenUrl: SHORT_CODE }),
      })
    })

    await page.getByPlaceholder('https://your-very-long-link.com/goes-here').fill('https://example.com/reset')
    await page.getByRole('button', { name: /shorten link/i }).click()
    await expect(page.getByText(`${BASE_URL}/r/${SHORT_CODE}`)).toBeVisible()

    await page.getByText('Shorten another link').click()
    // Anchor href="/" causes a full reload: heading still visible, short link gone, input empty
    await expect(page.getByRole('heading', { name: /free url/i })).toBeVisible()
    await expect(page.getByText(`${BASE_URL}/r/${SHORT_CODE}`)).not.toBeVisible()
    await expect(page.getByPlaceholder('https://your-very-long-link.com/goes-here')).toHaveValue('')
  })
})
