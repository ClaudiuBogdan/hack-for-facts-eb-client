import { expect, test } from '@playwright/test'

test.describe('Buget Routing', () => {
  test('renders the new campaign landing route', async ({ page }) => {
    await page.goto('/buget')

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Provocarea civică Bugete Locale 2026',
      }),
    ).toBeVisible({ timeout: 10000 })
  })

  test('resolves a representative primarie route under the new base path', async ({
    page,
  }) => {
    await page.goto('/buget/4305857/primarie')

    await expect(page).toHaveURL(/\/buget\/4305857\/primarie(?:\?.*)?$/)
    await expect(
      page.getByRole('link', { name: 'Schimbă Primăria' }),
    ).toBeVisible({ timeout: 20000 })
    await expect(
      page.getByRole('link', { name: 'Schimbă Primăria' }),
    ).toHaveAttribute('href', '/buget/cauta')
  })

  test('shows not found for the removed buget-primarie path', async ({ page }) => {
    await page.goto('/buget-primarie')

    await expect(page).toHaveURL(/\/buget-primarie$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Pagina nu a fost găsită' }),
    ).toBeVisible({ timeout: 10000 })
  })

  test('shows not found for the removed bugete-locale-2026 path', async ({ page }) => {
    await page.goto('/bugete-locale-2026')

    await expect(page).toHaveURL(/\/bugete-locale-2026$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Pagina nu a fost găsită' }),
    ).toBeVisible({ timeout: 10000 })
  })
})
