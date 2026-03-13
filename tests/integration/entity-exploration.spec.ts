/**
 * Entity Exploration Flow
 *
 * Tests the user journey of searching for entities,
 * viewing entity details, and exploring budget data.
 */

import { test, expect } from '../utils/integration-base'

test.describe('Entity Exploration Flow', () => {
  test.beforeEach(async ({ mockApi }) => {
    // Mock entity search results
    await mockApi.mockGraphQL('EntitySearch', 'entity-search')

    // Mock entity details (for any entity)
    await mockApi.mockGraphQL('GetEntityDetails', 'entity-details')

    // Mock line items
    await mockApi.mockGraphQL('GetEntityLineItems', 'entity-line-items')

    // Mock entity names lookup
    await mockApi.mockGraphQL('EntityNames', 'entity-names')

    // Mock reports
    await mockApi.mockGraphQL('GetReports', 'get-reports')

    // Mock preferred UAT route data used by /primarie/$cui
    await mockApi.mockGraphQL(
      'EntityAnalytics',
      'challenge-entity-subordinates',
    )
    await mockApi.mockGraphQL(
      'GetEntityRelationships',
      'challenge-entity-relationships',
    )
    await mockApi.mockGraphQL(
      'GetExecutionLineItemsAnalytics',
      'challenge-category-evolution',
    )
  })

  test('user can search for an entity and view its details', async ({ page, mockApi }) => {
    // Skip in live mode for now (fixtures need to be recorded first)
    if (mockApi.mode === 'live') {
      test.skip()
      return
    }

    // Navigate to the main page
    await page.goto('/')

    // Wait for main heading to appear
    await expect(
      page.getByRole('heading', { name: 'Transparenta.eu', level: 1 })
    ).toBeVisible({ timeout: 10000 })

    // Find the entity search combobox
    const searchInput = page.getByRole('combobox', { name: /entit|cui/i })
    await expect(searchInput).toBeVisible({ timeout: 5000 })

    // Search for Cluj
    await searchInput.fill('Cluj')

    // Wait for search results to appear
    await expect(
      page.getByText(/Cluj-Napoca/i).first()
    ).toBeVisible({ timeout: 5000 })

    // Click on the first result
    await page.getByText(/Cluj-Napoca/i).first().click()

    // Preferred navigation for UATs now lands on the campaign analysis route.
    await page.waitForURL(/\/primarie\/\d+/)

    // Verify the budget analysis page loaded.
    await expect(
      page.getByText(/distribuția cheltuielilor/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('entity details page loads with budget distribution', async ({ page, mockApi }) => {
    if (mockApi.mode === 'live') {
      test.skip()
      return
    }

    // Navigate directly to entity page
    await page.goto('/entities/4305857')

    // Wait for budget distribution heading to appear (indicates page loaded)
    await expect(
      page.getByRole('heading', { name: /distribuția.*bugetului/i })
    ).toBeVisible({ timeout: 10000 })

    // Verify main content area is present
    await expect(page.getByRole('main').first()).toBeVisible()

    // Verify navigation is accessible
    await expect(
      page.getByRole('navigation', { name: /produs/i })
    ).toBeVisible()
  })

  test('handles loading states gracefully', async ({ page, mockApi }) => {
    if (mockApi.mode !== 'mock') {
      test.skip()
      return
    }

    // Re-mock with delay to test loading state
    await mockApi.mockGraphQL('GetEntityDetails', 'entity-details', {
      delay: 1500,
    })

    await page.goto('/entities/4305857')

    // Eventually, content should load (budget distribution heading)
    await expect(
      page.getByRole('heading', { name: /distribuția.*bugetului/i })
    ).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Entity Exploration - Error Handling', () => {
  test('handles API errors gracefully', async ({ page, mockApi }) => {
    if (mockApi.mode !== 'mock') {
      test.skip()
      return
    }

    // Mock error response
    await mockApi.mockGraphQL('GetEntityDetails', 'entity-details', {
      status: 500,
    })

    await page.goto('/entities/4305857')

    // Page should still render with navigation (graceful degradation)
    await expect(
      page.getByRole('navigation', { name: /produs/i })
    ).toBeVisible({ timeout: 10000 })

    // Page should not be completely blank - body has content
    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent?.length).toBeGreaterThan(100)
  })

  test('handles non-existent entity gracefully', async ({ page, mockApi }) => {
    if (mockApi.mode !== 'mock') {
      test.skip()
      return
    }

    // Mock empty response
    await mockApi.mockGraphQL('GetEntityDetails', 'entity-not-found', {
      status: 200,
    })

    await page.goto('/entities/9999999999')

    // Page should still be functional (navigation present)
    await expect(
      page.getByRole('navigation', { name: /produs/i })
    ).toBeVisible({ timeout: 10000 })
  })
})
