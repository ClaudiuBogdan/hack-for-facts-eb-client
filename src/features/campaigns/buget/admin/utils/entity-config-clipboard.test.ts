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
    usersCount: 4,
    configured: true,
    isConfigured: true,
    values: {
      budgetPublicationDate: "2026-03-20",
      officialBudgetUrl: "https://oras.test/buget.pdf",
      public_debate: null,
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
          public_debate: null,
        },
      }),
    ]);

    expect(tsv).toContain(
      "entityCui\tentityName\tusersCount\tbudgetPublicationDate\tofficialBudgetUrl\tpublic_debate.date\tpublic_debate.time\tpublic_debate.location\tpublic_debate.online_participation_link\tpublic_debate.announcement_link\tpublic_debate.description\tupdatedAt",
    );
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
        entityCui: "12345678",
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
          public_debate: null,
        },
        expectedUpdatedAt: "2026-04-18T09:00:00.000Z",
      },
    ]);
  });

  it("uses headers when config columns are reordered", () => {
    const parsed = parseCampaignAdminEntityConfigClipboard(
      "Official Budget URL\tUpdated At\tEntity Name\tEntity CUI\tBudget Publication Date\n"
        + "https://oras.test/final.pdf\t2026-04-18T09:00:00.000Z\tOras Test\t12345678\t2026-04-20\n",
    );

    expect(parsed.issues).toEqual([]);
    expect(parsed.rows).toEqual([
      {
        rowNumber: 2,
        entityCui: "12345678",
        entityName: "Oras Test",
        values: {
          budgetPublicationDate: "2026-04-20",
          officialBudgetUrl: "https://oras.test/final.pdf",
          public_debate: null,
        },
        expectedUpdatedAt: "2026-04-18T09:00:00.000Z",
      },
    ]);
  });

  it("ignores copied users-count columns when parsing pasted rows", () => {
    const parsed = parseCampaignAdminEntityConfigClipboard(
      "Entity CUI\tEntity Name\tUsers\tBudget Publication Date\tOfficial Budget URL\tUpdated At\n"
        + "12345678\tOras Test\t4\t2026-04-20\thttps://oras.test/final.pdf\t2026-04-18T09:00:00.000Z\n",
    );

    expect(parsed.issues).toEqual([]);
    expect(parsed.rows).toEqual([
      {
        rowNumber: 2,
        entityCui: "12345678",
        entityName: "Oras Test",
        values: {
          budgetPublicationDate: "2026-04-20",
          officialBudgetUrl: "https://oras.test/final.pdf",
          public_debate: null,
        },
        expectedUpdatedAt: "2026-04-18T09:00:00.000Z",
      },
    ]);
  });

  it("parses exported rows with an implicit configured column before config values", () => {
    const parsed = parseCampaignAdminEntityConfigClipboard(
      "Campaign Key\tEntity CUI\tEntity Name\tUsers Configured\tbudgetPublicationDate\tofficialBudgetUrl\tpublic_debate.date\tpublic_debate.time\tpublic_debate.location\tpublic_debate.online_participation_link\tpublic_debate.announcement_link\tpublic_debate.description\tUpdated At\tUpdated By\tUser ID\n"
        + "funky\t14756536\tMUNICIPIUL TIMISOARA\t10\tFALSE\n"
        + "funky\t15226406\tCOMUNA BARAGANU\t2\tFALSE\n"
        + "funky\t2540813\tMUNICIPIUL RAMNICU VALCEA\t4\tTRUE\t2026-04-14\thttps://primariavl.ro/consiliul-local/dezbateri-vl/10856-proiect-de-buget-al-municipiului-ramnicului-valcea-pe-anul-2026\t\t\t\t\t2026-04-23T13:24:50.979Z\tuser_34QaVGwRWxrn8ScB9adgz3FOSTa\n",
    );

    expect(parsed.issues).toEqual([]);
    expect(parsed.skippedCount).toBe(2);
    expect(parsed.rows).toEqual([
      {
        rowNumber: 4,
        entityCui: "2540813",
        entityName: "MUNICIPIUL RAMNICU VALCEA",
        values: {
          budgetPublicationDate: "2026-04-14",
          officialBudgetUrl:
            "https://primariavl.ro/consiliul-local/dezbateri-vl/10856-proiect-de-buget-al-municipiului-ramnicului-valcea-pe-anul-2026",
          public_debate: null,
        },
        expectedUpdatedAt: "2026-04-23T13:24:50.979Z",
      },
    ]);
  });

  it("normalizes single-digit public debate hours from exported rows", () => {
    const parsed = parseCampaignAdminEntityConfigClipboard(
      "Campaign Key\tEntity CUI\tEntity Name\tUsers Configured\tbudgetPublicationDate\tofficialBudgetUrl\tpublic_debate.date\tpublic_debate.time\tpublic_debate.location\tpublic_debate.online_participation_link\tpublic_debate.announcement_link\tpublic_debate.description\tUpdated At\tUpdated By\tUser ID\n"
        + "funky\t2612790\tMUNICIPIUL PIATRA-NEAMT\t2\tTRUE\t\t\t2026-04-24\t8:30\tSala de sedinte a Primariei Piatra-Neamt - str. Stefan cel Mare nr. 6-8\thttps://meet.google.com/ctb-xbcx-fcn\thttps://www.primariapn.ro/dezbateri/-/asset_publisher/d8F7ynMHzZPK/event/id/5926595\t\t2026-04-22T18:48:05.493Z\tuser_34QaVGwRWxrn8ScB9adgz3FOSTa\n",
    );

    expect(parsed.issues).toEqual([]);
    expect(parsed.rows).toEqual([
      {
        rowNumber: 2,
        entityCui: "2612790",
        entityName: "MUNICIPIUL PIATRA-NEAMT",
        values: {
          budgetPublicationDate: null,
          officialBudgetUrl: null,
          public_debate: {
            date: "2026-04-24",
            time: "08:30",
            location:
              "Sala de sedinte a Primariei Piatra-Neamt - str. Stefan cel Mare nr. 6-8",
            announcement_link:
              "https://www.primariapn.ro/dezbateri/-/asset_publisher/d8F7ynMHzZPK/event/id/5926595",
            online_participation_link: "https://meet.google.com/ctb-xbcx-fcn",
          },
        },
        expectedUpdatedAt: "2026-04-22T18:48:05.493Z",
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
          public_debate: null,
        },
        expectedUpdatedAt: undefined,
      },
    ]);
    expect(parsed.issues).toEqual([
      { rowNumber: 2, message: "Missing entity CUI." },
      {
        rowNumber: 3,
        entityCui: "12345678",
        message: "Invalid budget publication date.",
      },
      {
        rowNumber: 4,
        entityCui: "12345678",
        message: "Invalid official budget URL. Use an absolute http(s) URL.",
      },
    ]);
  });

  it("includes the entity CUI on empty config value issues", () => {
    const parsed = parseCampaignAdminEntityConfigClipboard(
      "Entity CUI\tBudget Publication Date\tOfficial Budget URL\n"
        + "12345678\t\t\n",
    );

    expect(parsed.rows).toEqual([]);
    expect(parsed.issues).toEqual([
      {
        rowNumber: 2,
        entityCui: "12345678",
        message: "At least one config value is required.",
      },
    ]);
  });

  it("adds the visible entity name to staged paste issues", () => {
    const parsed = parseCampaignAdminEntityConfigClipboardText({
      rawText:
        "Entity CUI\tBudget Publication Date\tOfficial Budget URL\n"
        + "12345678\t\t\n",
      items: [createItem()],
    });

    expect(parsed.drafts).toEqual([]);
    expect(parsed.issues).toEqual([
      {
        rowNumber: 2,
        entityCui: "12345678",
        entityName: "Oras Test",
        message: "At least one config value is required.",
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
          public_debate: null,
        },
        expectedUpdatedAt: "2026-04-18T09:00:00.000Z",
      },
    ]);
  });

  it("reports pasted rows that are not visible in the current config table", () => {
    const parsed = parseCampaignAdminEntityConfigClipboardText({
      rawText:
        "Entity CUI\tBudget Publication Date\tOfficial Budget URL\tUpdated At\n"
        + "99999999\t2026-04-20\thttps://oras.test/final.pdf\t2026-04-18T09:00:00.000Z\n",
      items: [createItem()],
    });

    expect(parsed.drafts).toEqual([]);
    expect(parsed.issues).toEqual([
      {
        rowNumber: 2,
        entityCui: "99999999",
        message: "Entity CUI is not visible in the current table: 99999999",
      },
    ]);
  });

  it("preserves existing public debate values when legacy headers omit them", () => {
    const parsed = parseCampaignAdminEntityConfigClipboardText({
      rawText:
        "Entity CUI\tBudget Publication Date\tOfficial Budget URL\tUpdated At\n"
        + "12345678\t2026-04-20\thttps://oras.test/final.pdf\t2026-04-18T09:00:00.000Z\n",
      items: [
        createItem({
          values: {
            budgetPublicationDate: "2026-03-20",
            officialBudgetUrl: "https://oras.test/original.pdf",
            public_debate: {
              date: "2026-05-10",
              time: "18:00",
              location: "Council Hall",
              announcement_link: "https://oras.test/public-debate",
              online_participation_link: "https://oras.test/public-debate/live",
              description: "Budget discussion",
            },
          },
        }),
      ],
    });

    expect(parsed.issues).toEqual([]);
    expect(parsed.drafts).toEqual([
      {
        entityCui: "12345678",
        entityName: "Oras Test",
        values: {
          budgetPublicationDate: "2026-04-20",
          officialBudgetUrl: "https://oras.test/final.pdf",
          public_debate: {
            date: "2026-05-10",
            time: "18:00",
            location: "Council Hall",
            announcement_link: "https://oras.test/public-debate",
            online_participation_link: "https://oras.test/public-debate/live",
            description: "Budget discussion",
          },
        },
        expectedUpdatedAt: "2026-04-18T09:00:00.000Z",
      },
    ]);
  });

  it("round-trips dotted public debate fields", () => {
    const parsed = parseCampaignAdminEntityConfigClipboard(
      "entityCui\tpublic_debate.date\tpublic_debate.time\tpublic_debate.location\tpublic_debate.announcement_link\tpublic_debate.online_participation_link\tpublic_debate.description\tupdatedAt\n"
        + "12345678\t2026-05-10\t18:00\tCouncil Hall\thttps://oras.test/public-debate\thttps://oras.test/public-debate/live\tBudget discussion\t2026-04-18T09:00:00.000Z\n",
    );

    expect(parsed.issues).toEqual([]);
    expect(parsed.rows).toEqual([
      {
        rowNumber: 2,
        entityCui: "12345678",
        entityName: null,
        values: {
          budgetPublicationDate: null,
          officialBudgetUrl: null,
          public_debate: {
            date: "2026-05-10",
            time: "18:00",
            location: "Council Hall",
            announcement_link: "https://oras.test/public-debate",
            online_participation_link: "https://oras.test/public-debate/live",
            description: "Budget discussion",
          },
        },
        expectedUpdatedAt: "2026-04-18T09:00:00.000Z",
      },
    ]);
  });
});
