import { test, expect } from "@playwright/test";

// Synthetic INS observations for UI acceptance; entity identity is read from dev.
// This is not live INS data, custody or migration acceptance evidence.
// Opt in with CHRONOS_INS_ENTITY_ACCEPTANCE=1 against a redesign-mode build.
test.skip(
  process.env.CHRONOS_INS_ENTITY_ACCEPTANCE !== "1",
  "Requires the Chronos dev identity API and a redesign-mode app build",
);
const dataset = {
  id: "POP107D",
  code: "POP107D",
  name_ro: "Populație — test sintetic",
  name_en: "Population — synthetic test",
  periodicity: ["ANNUAL"],
  data_status: "AVAILABLE",
  dimension_count: 4,
  has_uat_data: true,
  has_county_data: true,
  has_siruta: true,
  metadata: {
    revision_id: "1",
    custody_sha256: "a".repeat(64),
    transform_contract_sha256: "b".repeat(64),
  },
  dimensions: [
    {
      index: 0,
      type: "CLASSIFICATION",
      label_ro: "Categorie",
      label_en: "Category",
      classification_type: { code: "D0" },
    },
    {
      index: 1,
      type: "TERRITORIAL",
      label_ro: "Localitate",
      label_en: "Locality",
      classification_type: { code: "D1" },
    },
    { index: 2, type: "TEMPORAL", classification_type: null },
    { index: 3, type: "UNIT_OF_MEASURE", classification_type: null },
  ],
};
const decimal = "12345678901234567890.012300";
const rows = [2024, 2025].map((year) => ({
  id: `synthetic-${year}`,
  dataset_code: "POP107D",
  value: year === 2024 ? decimal : null,
  value_status: year === 2024 ? null : "p",
  time_period: { iso_period: String(year), year, periodicity: "ANNUAL" },
  unit: { code: "0", name_ro: "Persoane" },
  classifications: [
    { id: "D0:0", type_code: "D0", code: "0", name_ro: "Total" },
    { id: "D1:210", type_code: "D1", code: "210", name_ro: "Cluj-Napoca" },
  ],
  dimensions: {
    geography: {
      pairs: [[1, 210]],
      resolution: "EXACT",
      flags: [],
      qualified: false,
      resolvedTerritory: { code: "54975", level: "LAU" },
      contextTerritory: null,
      applicableRules: [],
    },
  },
}));
for (const language of ["en", "ro"] as const) {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    test.describe(`${language} ${viewport.width} native entity INS`, () => {
      test.use({ viewport });
      test("keeps original cells, deep links and complete CSV on the entity route", async ({
        page,
        context,
        baseURL,
      }, testInfo) => {
        await context.addCookies([
          { name: "user-locale", value: language, url: baseURL! },
        ]);
        await page.addInitScript(
          (locale) => localStorage.setItem("user-locale", locale),
          language,
        );
        const sourceRequests: Record<string, unknown>[] = [];
        await page.route("**/graphql", async (route) => {
          const { query, variables } = route.request().postDataJSON();
          if (
            !/query (InsEntityContext|InsDatasetDetails|InsSourceObservations|InsDatasetsExplorer)\b/.test(
              query,
            )
          )
            return route.fallback();
          expect(route.request().headers()).not.toHaveProperty("authorization");
          let data: unknown;
          if (query.includes("query InsEntityContext"))
            data = {
              entity: {
                cui: "4305857",
                ins: {
                  territoryCode: "54975",
                  territoryLevel: "LAU",
                  territoryName: "Cluj-Napoca",
                  sirutaCode: "54975",
                  datasetCount: 1,
                },
              },
            };
          else if (query.includes("query InsDatasetDetails"))
            data = { insDataset: dataset };
          else if (query.includes("query InsDatasetsExplorer"))
            data = {
              insDatasets: {
                nodes: [dataset],
                pageInfo: {
                  totalCount: 1,
                  hasNextPage: false,
                  hasPreviousPage: false,
                },
              },
            };
          else {
            sourceRequests.push(variables);
            expect(variables.filter).toMatchObject({
              sirutaCodes: ["54975"],
              sourcePins: [
                { dimensionIndex: 0, memberCode: "0" },
                { dimensionIndex: 1, memberCode: "210" },
              ],
              unitCodes: ["0"],
            });
            expect(variables.filter).not.toHaveProperty("hasValue");
            expect(variables.filter).not.toHaveProperty("period");
            data = {
              descriptor: dataset,
              insObservations: {
                nodes: rows,
                pageInfo: {
                  totalCount: 2,
                  hasNextPage: false,
                  hasPreviousPage: false,
                },
              },
            };
          }
          await route.fulfill({ json: { data } });
        });
        const search = new URLSearchParams({
          view: "ins",
          year: "2024",
          lang: language,
          normalization: "per_capita",
          insDataset: "POP107D",
          insSourcePins: JSON.stringify(["D0:0", "D1:210"]),
          insSourceUnit: "0",
          insSourceCadence: "ANNUAL",
        });
        await page.goto("/entities/4305857?" + search);
        const selected = page.getByRole("region", {
          name:
            language === "en"
              ? "Selected INS periods"
              : "Perioade INS selectate",
        });
        await expect(selected).toContainText(decimal, { timeout: 20000 });
        const latest = page.getByRole("region", {
          name:
            language === "en"
              ? "Latest INS observation"
              : "Cea mai recentă observație INS",
        });
        await expect(latest).toContainText("2025");
        await expect(latest).not.toContainText(decimal);
        await expect(page).toHaveURL(/normalization=per_capita/);
        expect(sourceRequests.length).toBeGreaterThan(0);
        await page.reload();
        await expect(selected).toContainText(decimal);
        await expect(page).toHaveURL(/normalization=per_capita/);
        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: /CSV/ }).click();
        const download = await downloadPromise;
        const stream = await download.createReadStream();
        let csv = "";
        for await (const chunk of stream!) csv += chunk.toString();
        expect(csv).toContain(decimal);
        expect(csv).toContain("synthetic-2025");
        expect(csv).toContain("value_status_json");
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath("native-entity-ins.png"),
          fullPage: true,
        });
      });
    });
  }
}
