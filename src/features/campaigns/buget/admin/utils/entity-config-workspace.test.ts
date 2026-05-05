import { describe, expect, it } from "vitest";
import type {
  CampaignAdminEntityConfigListItem,
  CampaignAdminStagedEntityConfigDraft,
} from "@/features/campaigns/buget/admin/types";
import { getCampaignAdminEntityConfigSendValidationMessage } from "./entity-config-workspace";

function createItem(
  overrides: Partial<CampaignAdminEntityConfigListItem> = {},
): CampaignAdminEntityConfigListItem {
  return {
    campaignKey: "funky",
    entityCui: "12345678",
    entityName: "Oras Test",
    usersCount: 1,
    configured: false,
    isConfigured: false,
    values: {
      budgetPublicationDate: null,
      officialBudgetUrl: null,
      public_debate: null,
    },
    updatedAt: null,
    updatedByUserId: null,
    ...overrides,
  };
}

function createDraft(
  overrides: Partial<CampaignAdminStagedEntityConfigDraft> = {},
): CampaignAdminStagedEntityConfigDraft {
  return {
    entityCui: "12345678",
    entityName: "Oras Test",
    values: {
      budgetPublicationDate: "2026-04-20",
      officialBudgetUrl: null,
      public_debate: null,
    },
    expectedUpdatedAt: null,
    ...overrides,
  };
}

describe("entity-config-workspace", () => {
  it("does not flag missing updated-at values as stale conflicts", () => {
    expect(
      getCampaignAdminEntityConfigSendValidationMessage({
        item: createItem({ updatedAt: undefined } as Partial<
          CampaignAdminEntityConfigListItem
        >),
        stagedDraft: createDraft({
          expectedUpdatedAt: undefined,
        } as Partial<CampaignAdminStagedEntityConfigDraft>),
      }),
    ).toBeNull();
  });

  it("flags real updated-at mismatches as stale conflicts", () => {
    expect(
      getCampaignAdminEntityConfigSendValidationMessage({
        item: createItem({ updatedAt: "2026-04-21T10:00:00.000Z" }),
        stagedDraft: createDraft({
          expectedUpdatedAt: "2026-04-20T10:00:00.000Z",
        }),
      }),
    ).toBe(
      "This row changed before your bulk update was saved. Refresh the table and paste again.",
    );
  });
});
