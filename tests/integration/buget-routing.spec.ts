import { expect } from '@playwright/test'
import { test } from '../utils/integration-base'

test.describe('Buget Routing', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mockGraphQL('GetEntityDetails', 'entity-details')
    await mockApi.mockGraphQL('GetEntityLineItems', 'entity-line-items')
    await mockApi.mockGraphQL('EntityNames', 'entity-names')
    await mockApi.mockGraphQL('EntityAnalytics', 'entity-analytics')
    await mockApi.mockGraphQL('GetReports', 'get-reports')
  })

  test('redirects the legacy landing route to /provocare', async ({ page }) => {
    await page.goto('/bugete-locale-2026')

    await expect(page).toHaveURL(/\/provocare(?:\?.*)?$/)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Cu ochii pe bugetele locale',
      }),
    ).toBeVisible({ timeout: 10000 })
  })

  test('renders the canonical selector route at /primarie', async ({ page }) => {
    await page.goto('/primarie')

    await expect(page).toHaveURL(/\/primarie(?:\?.*)?$/)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Alege mai întâi primăria ta|Find your city hall first/i,
      }),
    ).toBeVisible({ timeout: 10000 })
  })

  test('renders the canonical map selector route at /primarie/harta', async ({ page }) => {
    await page.goto('/primarie/harta')

    await expect(page).toHaveURL(/\/primarie\/harta(?:\?.*)?$/)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Alege primăria direct de pe hartă|Pick your city hall directly from the map/i,
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
        name: /Provocări Cu ochii pe bugetele locale|Eyes on Local Budgets challenges/i,
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
        name: /Calendar bugetar|Budget calendar/i,
      }),
    ).toBeVisible({ timeout: 20000 })
  })

  test('shows not found for the removed /buget root', async ({ page }) => {
    await page.goto('/buget')

    await expect(page).toHaveURL(/\/buget$/)
    await expect(
      page.getByText(/Not Found|Pagina nu a fost găsită|Page not found/i),
    ).toBeVisible({ timeout: 10000 })
  })

  test('shows not found for removed /buget/cauta routes', async ({ page }) => {
    await page.goto('/buget/cauta')

    await expect(page).toHaveURL(/\/buget\/cauta$/)
    await expect(
      page.getByText(/Not Found|Pagina nu a fost găsită|Page not found/i),
    ).toBeVisible({ timeout: 10000 })
  })

  test('shows not found for removed /buget/cauta/harta routes', async ({ page }) => {
    await page.goto('/buget/cauta/harta')

    await expect(page).toHaveURL(/\/buget\/cauta\/harta$/)
    await expect(
      page.getByText(/Not Found|Pagina nu a fost găsită|Page not found/i),
    ).toBeVisible({ timeout: 10000 })
  })

  test('shows not found for removed /buget/forum routes', async ({ page }) => {
    await page.goto('/buget/forum')

    await expect(page).toHaveURL(/\/buget\/forum$/)
    await expect(
      page.getByText(/Not Found|Pagina nu a fost găsită|Page not found/i),
    ).toBeVisible({ timeout: 10000 })
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
})
