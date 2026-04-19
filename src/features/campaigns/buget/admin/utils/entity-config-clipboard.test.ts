import { describe, expect, it } from "vitest";
import {
  parseCampaignAdminEntityConfigClipboard,
  parseCampaignAdminEntityConfigClipboardText,
  serializeCampaignAdminEntityConfigRowsToClipboardTsv,
} from "./entity-config-clipboard";
import type { CampaignAdminEntityConfigListItem } from "@/features/campaigns/buget/admin/types";

function createItem(
  overrides: Partial<CampaignAdminEntityConfigListItem> = {},
): CampaignAdminEntityConfigListItem {
  return {
    campaignKey: "funky",
    entityCui: "12345678",
    entityName: "Oras Test",
    configured: true,
    isConfigured: true,
    values: {
      budgetPublicationDate: "2026-03-20",
      officialBudgetUrl: "https://oras.test/buget.pdf",
    },
    updatedAt: "2026-04-18T09:00:00.000Z",
    updatedByUserId: "admin-1",
    ...overrides,
  };
}

describe("entity-config-clipboard", () => {
  it("serializes spreadsheet rows with formula-neutralized values", () => {
    const tsv = serializeCampaignAdminEntityConfigRowsToClipboardTsv([
      createItem({
        values: {
          budgetPublicationDate: "2026-03-20",
          officialBudgetUrl: "=HYPERLINK(\"https://bad.test\")",
        },
      }),
    ]);

    expect(tsv).toContain("Entity CUI\tEntity Name\tBudget Publication Date\tOfficial Budget URL\tUpdated At");
    expect(tsv).toContain("\t'=HYPERLINK(\"https://bad.test\")\t");
  });

  it("parses blank config cells as null and keeps optimistic concurrency tokens when present", () => {
    const parsed = parseCampaignAdminEntityConfigClipboard(
      "Entity CUI\tBudget Publication Date\tOfficial Budget URL\tUpdated At\n"
        + "12345678\t2026-04-20\t\thttps://ignored.invalid\n",
    );

    expect(parsed.issues).toEqual([
      {
        rowNumber: 2,
        message: "Invalid updated-at value.",
      },
    ]);
  });

  it("accepts header aliases and preserves updated-at tokens", () => {
    const parsed = parseCampaignAdminEntityConfigClipboard(
      "cui\tpublication date\turl\tupdated_at\n"
        + "12345678\t2026-04-20\thttps://oras.test/final.pdf\t2026-04-18T09:00:00.000Z\n",
    );

    expect(parsed.issues).toEqual([]);
    expect(parsed.rows).toEqual([
      {
        rowNumber: 2,
        entityCui: "12345678",
        entityName: null,
        values: {
          budgetPublicationDate: "2026-04-20",
          officialBudgetUrl: "https://oras.test/final.pdf",
        },
        expectedUpdatedAt: "2026-04-18T09:00:00.000Z",
      },
    ]);
  });

  it("reports duplicates, missing entity CUI, invalid dates, and invalid URLs", () => {
    const parsed = parseCampaignAdminEntityConfigClipboard(
      "Entity CUI\tBudget Publication Date\tOfficial Budget URL\n"
        + "\t2026-04-20\thttps://oras.test/b1.pdf\n"
        + "12345678\t2026/04/20\thttps://oras.test/b2.pdf\n"
        + "12345678\t2026-04-20\tftp://oras.test/b3.pdf\n"
        + "12345678\t2026-04-20\thttps://oras.test/b4.pdf\n",
    );

    expect(parsed.rows).toEqual([
      {
        rowNumber: 5,
        entityCui: "12345678",
        entityName: null,
        values: {
          budgetPublicationDate: "2026-04-20",
          officialBudgetUrl: "https://oras.test/b4.pdf",
        },
        expectedUpdatedAt: undefined,
      },
    ]);
    expect(parsed.issues).toEqual([
      { rowNumber: 2, message: "Missing entity CUI." },
      { rowNumber: 3, message: "Invalid budget publication date." },
      {
        rowNumber: 4,
        message: "Invalid official budget URL. Use an absolute http(s) URL.",
      },
    ]);
  });

  it("parses staged bulk drafts against visible config rows", () => {
    const parsed = parseCampaignAdminEntityConfigClipboardText({
      rawText:
        "Entity CUI\tBudget Publication Date\tOfficial Budget URL\tUpdated At\n"
        + "12345678\t2026-04-20\thttps://oras.test/final.pdf\t2026-04-18T09:00:00.000Z\n",
      items: [createItem()],
    });

    expect(parsed.issues).toEqual([]);
    expect(parsed.drafts).toEqual([
      {
        entityCui: "12345678",
        entityName: "Oras Test",
        values: {
          budgetPublicationDate: "2026-04-20",
          officialBudgetUrl: "https://oras.test/final.pdf",
        },
        expectedUpdatedAt: "2026-04-18T09:00:00.000Z",
      },
    ]);
  });
});
