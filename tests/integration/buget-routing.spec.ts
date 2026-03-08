import { expect } from '@playwright/test'
import { test } from '../utils/integration-base'

test.describe('Buget Routing', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mockGraphQL('GetEntityDetails', 'entity-details')
    await mockApi.mockGraphQL('GetEntityLineItems', 'entity-line-items')
    await mockApi.mockGraphQL('EntityNames', 'entity-names')
    await mockApi.mockGraphQL('EntityAnalytics', 'entity-analytics')
    await mockApi.mockGraphQL('GetReports', 'get-reports')
  })

  test('renders the new campaign landing route', async ({ page }) => {
    await page.goto('/buget')

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Provocarea civică Bugete Locale 2026',
      }),
    ).toBeVisible({ timeout: 10000 })
  })

  test('resolves the canonical primarie analysis route', async ({
    page,
  }) => {
    await page.goto('/primarie/4305857')

    await expect(page).toHaveURL(/\/primarie\/4305857(?:\?.*)?$/)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Municipiul Cluj-Napoca/i,
      }),
    ).toBeVisible({ timeout: 20000 })
    await expect(
      page.getByRole('link', {
        name: /Provocări Bugete Locale 2026|Local budgets challenges 2026/i,
      }),
    ).toHaveAttribute('href', '/primarie/4305857/buget/provocari')
  })

  test('resolves the budget hub route', async ({ page }) => {
    await page.goto('/primarie/4305857/buget')

    await expect(page).toHaveURL(/\/primarie\/4305857\/buget(?:\?.*)?$/)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Pregătit de provocare\?|Ready for the challenge\?/i,
      }),
    ).toBeVisible({ timeout: 20000 })
    await expect(
      page.getByRole('link', { name: /Primăria mea|My city hall/i }),
    ).toBeVisible({ timeout: 20000 })
  })

  test('resolves the challenges hub route at /provocari', async ({ page }) => {
    await page.goto('/primarie/4305857/buget/provocari')

    await expect(page).toHaveURL(/\/primarie\/4305857\/buget\/provocari(?:\?.*)?$/)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Pregătit de provocare\?|Ready for the challenge\?/i,
      }),
    ).toBeVisible({ timeout: 20000 })
    await expect(
      page.getByRole('link', { name: /Primăria mea|My city hall/i }),
    ).toBeVisible({ timeout: 20000 })
  })

  test('resolves the budget calendar route', async ({ page }) => {
    await page.goto('/primarie/4305857/buget/calendar')

    await expect(page).toHaveURL(/\/primarie\/4305857\/buget\/calendar(?:\?.*)?$/)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Calendar Bugete Locale 2026|Local budgets calendar 2026/i,
      }),
    ).toBeVisible({ timeout: 20000 })
  })

  test('shows not found for removed entity route roots under /buget', async ({ page }) => {
    await page.goto('/buget/4305857')

    await expect(page).toHaveURL(/\/buget\/4305857$/)
    await expect(
      page.getByText(/Not Found|Pagina nu a fost găsită|Page not found/i),
    ).toBeVisible({ timeout: 10000 })
  })

  test('shows not found for removed /buget/:cui/primarie routes', async ({ page }) => {
    await page.goto('/buget/4305857/primarie')

    await expect(page).toHaveURL(/\/buget\/4305857\/primarie$/)
    await expect(
      page.getByText(/Not Found|Pagina nu a fost găsită|Page not found/i),
    ).toBeVisible({ timeout: 10000 })
  })

  test('shows not found for removed /buget/:cui/provocari routes', async ({ page }) => {
    await page.goto('/buget/4305857/provocari')

    await expect(page).toHaveURL(/\/buget\/4305857\/provocari$/)
    await expect(
      page.getByText(/Not Found|Pagina nu a fost găsită|Page not found/i),
    ).toBeVisible({ timeout: 10000 })
  })

  test('shows not found for the removed buget-primarie path', async ({ page }) => {
    await page.goto('/buget-primarie')

    await expect(page).toHaveURL(/\/buget-primarie$/)
    await expect(
      page.getByText(/Not Found|Pagina nu a fost găsită|Page not found/i),
    ).toBeVisible({ timeout: 10000 })
  })

  test('shows not found for the removed bugete-locale-2026 path', async ({ page }) => {
    await page.goto('/bugete-locale-2026')

    await expect(page).toHaveURL(/\/bugete-locale-2026$/)
    await expect(
      page.getByText(/Not Found|Pagina nu a fost găsită|Page not found/i),
    ).toBeVisible({ timeout: 10000 })
  })
})
