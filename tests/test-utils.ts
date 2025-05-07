import { Page, expect } from "@playwright/test";

export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState("networkidle");
}

export async function waitForResponse(page: Page, urlPattern: RegExp | string) {
  return page.waitForResponse(urlPattern);
}

export async function checkToastMessage(page: Page, message: string) {
  const toast = page.getByText(message);
  await expect(toast).toBeVisible();
}

interface AlgorithmFormData {
  title?: string;
  difficulty?: string;
  summary?: string;
  category?: string;
  description?: string;
  language?: string;
  code?: string;
}


export async function fillAlgorithmForm(
  page: Page,
  {
    title = "Test Algorithm",
    difficulty = "Easy",
    summary = "Test algorithm summary",
    category = "Sorting",
    description = "Test algorithm description",
    language = "JavaScript",
    code = "function solution() { return true; }",
  }: AlgorithmFormData = {}
) {
  try {
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Difficulty").selectOption(difficulty);
    await page.getByLabel("Summary").fill(summary);
    await page.getByLabel("Category").selectOption(category);
    await page.getByLabel("Description").fill(description);

    // Add language and code
    await page.getByRole("button", { name: "Add Language" }).click();
    await page.getByLabel("Language").selectOption(language);

    // Wait for CodeMirror to initialize
    await page.waitForSelector(".cm-editor");
    await page.keyboard.type(code);
  } catch (error) {
    console.error("Error filling algorithm form:", error);
    throw error; // Re-throw to fail the test
  }
}

export async function navigateToFirstAlgorithm(page: Page) {
  await page.goto("/algorithms");
  // Assuming there's an element on the page with a role of list and a listitem with a link. Modify as needed.
  const firstAlgorithmLink = page
    .getByRole("list")
    .getByRole("listitem")
    .first()
    .getByRole("link");
  await firstAlgorithmLink.click();
}

export async function runCode(page: Page) {
  await page.getByRole("button", { name: "Run" }).click();
  await waitForNetworkIdle(page);
}

export async function checkExecutionResult(page: Page) {
  const resultPanel = page.getByText("Execution Result");
  await expect(resultPanel).toBeVisible();
}

export async function switchLanguage(page: Page, targetLanguage: string) {
  const languageSelect = page.getByRole("combobox", { name: "Language" });

  // Get the current selected option
  const selectedOption = await languageSelect.inputValue();

  // Only select if the language is different from the selected one
  if (selectedOption !== targetLanguage) {
    await languageSelect.selectOption(targetLanguage);
  }

  await waitForNetworkIdle(page);
}
