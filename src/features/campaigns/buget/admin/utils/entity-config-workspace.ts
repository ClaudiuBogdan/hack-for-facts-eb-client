import { t } from "@lingui/core/macro";
import type {
  CampaignAdminEntityConfigListItem,
  CampaignAdminStagedEntityConfigDraft,
} from "@/features/campaigns/buget/admin/types";

function isValidDateInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeInput(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeExpectedUpdatedAt(value: string | null | undefined): string | null {
  return value ?? null;
}

export type CampaignAdminEntityConfigSendValidationIssueData = {
  readonly selectionKey: string;
  readonly primaryValue: string;
  readonly recordKey: string;
  readonly message: string;
};

export function getCampaignAdminEntityConfigPrimaryValue(
  item: CampaignAdminEntityConfigListItem,
): string {
  return item.entityName?.trim() || item.entityCui;
}

export function getCampaignAdminEntityConfigSendValidationMessage(input: {
  readonly item: CampaignAdminEntityConfigListItem;
  readonly stagedDraft: CampaignAdminStagedEntityConfigDraft | null | undefined;
}): string | null {
  const { item, stagedDraft } = input;

  if (stagedDraft === undefined || stagedDraft === null) {
    return t`Missing staged config values. Paste spreadsheet rows with matching visible entity CUIs first.`;
  }

  if (
    stagedDraft.values.budgetPublicationDate === null &&
    stagedDraft.values.officialBudgetUrl === null &&
    stagedDraft.values.public_debate === null
  ) {
    return t`At least one config value is required.`;
  }

  const publicDebate = stagedDraft.values.public_debate;
  if (publicDebate !== null) {
    if (
      !isValidDateInput(publicDebate.date) ||
      !isValidTimeInput(publicDebate.time) ||
      publicDebate.location.trim() === "" ||
      !isValidHttpUrl(publicDebate.announcement_link) ||
      (publicDebate.online_participation_link !== undefined &&
        !isValidHttpUrl(publicDebate.online_participation_link))
    ) {
      return t`Public debate values are incomplete or invalid.`;
    }
  }

  if (
    normalizeExpectedUpdatedAt(stagedDraft.expectedUpdatedAt) !==
    normalizeExpectedUpdatedAt(item.updatedAt)
  ) {
    return t`This row changed before your bulk update was saved. Refresh the table and paste again.`;
  }

  return null;
}

export function getCampaignAdminEntityConfigSelectedSendValidationIssues(input: {
  readonly items: readonly CampaignAdminEntityConfigListItem[];
  readonly stagedDraftsByEntityCui: Readonly<
    Record<string, CampaignAdminStagedEntityConfigDraft>
  >;
}): readonly CampaignAdminEntityConfigSendValidationIssueData[] {
  return input.items.flatMap((item) => {
    const stagedDraft = input.stagedDraftsByEntityCui[item.entityCui];
    const message = getCampaignAdminEntityConfigSendValidationMessage({
      item,
      stagedDraft,
    });

    if (message === null) {
      return [];
    }

    return [
      {
        selectionKey: item.entityCui,
        primaryValue: getCampaignAdminEntityConfigPrimaryValue(item),
        recordKey: item.entityCui,
        message,
      },
    ];
  });
}
