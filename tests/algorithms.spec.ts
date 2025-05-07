import { test, expect } from "@playwright/test";

test.describe("Algorithms Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/algorithms");
  });
  test("should have working pagination", async ({ page }) => {
    // Check pagination controls
    const firstPageButton = page.getByRole("button", {
      name: "Go to first page",
    });
    const prevPageButton = page.getByRole("button", {
      name: "Go to previous page",
    });
    const nextPageButton = page.getByRole("button", {
      name: "Go to next page",
    });

    // Initially, prev and first page buttons should be disabled
    await expect(firstPageButton).toBeDisabled();
    await expect(prevPageButton).toBeDisabled();

    // Click next page if available
    if (await nextPageButton.isEnabled()) {
      await nextPageButton.click();
      await expect(prevPageButton).toBeEnabled();
      await expect(firstPageButton).toBeEnabled();
    }
  });

  test("should filter algorithms", async ({ page }) => {
    // Get the search input
    const searchInput = page.getByPlaceholder("Filter algorithms...");
    await expect(searchInput).toBeVisible();

    // Type a search term
    await searchInput.fill("sort");

    // Wait for the table to update
    await page.waitForTimeout(500);

    // Check if the table contains filtered results
    const tableRows = page.getByRole("row");
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(1); // Header row + at least one result
  });
});
