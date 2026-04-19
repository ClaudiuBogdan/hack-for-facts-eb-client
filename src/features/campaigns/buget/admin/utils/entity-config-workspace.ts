import { t } from "@lingui/core/macro";
import type {
  CampaignAdminEntityConfigListItem,
  CampaignAdminStagedEntityConfigDraft,
} from "@/features/campaigns/buget/admin/types";

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
    return t`Missing staged config values. Paste spreadsheet rows with matching entity CUIs first.`;
  }

  if (
    stagedDraft.values.budgetPublicationDate === null &&
    stagedDraft.values.officialBudgetUrl === null
  ) {
    return t`At least one config value is required.`;
  }

  if (stagedDraft.expectedUpdatedAt !== item.updatedAt) {
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
