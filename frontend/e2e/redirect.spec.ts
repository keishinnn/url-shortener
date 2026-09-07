import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'

test.describe('RedirectPage — /r/:shortCode', () => {
  test('redirects to originalUrl via window.location.assign when code exists', async ({ page }) => {
    const shortCode = 'abc1234'
    const targetUrl = `${BASE_URL}/__e2e-redirect-target`

    await page.route(`**/api/shorten-url/${shortCode}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ originalUrl: targetUrl }),
      })
    })

    await page.goto(`/r/${shortCode}`)

    // RedirectPage calls window.location.assign(targetUrl) — assert the navigation happened.
    await expect(page).toHaveURL(targetUrl)
  })

  test('navigates home when short code is unknown (404 without originalUrl)', async ({ page }) => {
    const shortCode = 'notfound'

    await page.route(`**/api/shorten-url/${shortCode}`, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Short URL not found' }),
      })
    })

    await page.goto(`/r/${shortCode}`)

    // RedirectPage does navigate("/") on missing originalUrl
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: /free url/i })).toBeVisible()
  })

  test('navigates home on network failure', async ({ page }) => {
    const shortCode = 'offline1'

    await page.route(`**/api/shorten-url/${shortCode}`, async (route) => {
      await route.abort('failed')
    })

    await page.goto(`/r/${shortCode}`)

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: /free url/i })).toBeVisible()
  })

  test('navigates home when API returns originalUrl: null', async ({ page }) => {
    const shortCode = 'nulllink'

    await page.route(`**/api/shorten-url/${shortCode}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ originalUrl: null }),
      })
    })

    await page.goto(`/r/${shortCode}`)

    await expect(page).toHaveURL('/')
  })
})
