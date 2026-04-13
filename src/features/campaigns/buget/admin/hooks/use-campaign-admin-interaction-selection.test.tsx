import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildCampaignAdminSelectionKey } from "@/features/campaigns/buget/admin/constants";
import { useCampaignAdminInteractionSelection } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-interaction-selection";
import type { CampaignAdminUserInteractionListItem } from "@/features/campaigns/buget/admin/types";

function createItem(
  overrides: Partial<CampaignAdminUserInteractionListItem> = {},
): CampaignAdminUserInteractionListItem {
  return {
    userId: "user-1",
    recordKey: "record-1",
    campaignKey: "funky",
    interactionId: "funky:interaction:public_debate_request",
    lessonId: "lesson-1",
    entityCui: "12345678",
    entityName: "Oras Test",
    scopeType: "entity",
    phase: "pending",
    reviewStatus: "pending",
    reviewable: true,
    pendingReason: "awaiting_manual_review",
    submittedAt: "2026-04-10T10:00:00.000Z",
    createdAt: "2026-04-10T10:00:00.000Z",
    updatedAt: "2026-04-10T10:00:00.000Z",
    reviewedAt: null,
    reviewedByUserId: null,
    reviewSource: null,
    feedbackText: null,
    payloadKind: "json",
    payloadSummary: {
      kind: "public_debate_request",
      institutionEmail: "contact@primarie.ro",
      organizationName: "Asociatia Test",
      submissionPath: "request_platform",
      isNgo: true,
    },
    institutionEmail: "contact@primarie.ro",
    websiteUrl: null,
    organizationName: "Asociatia Test",
    interactionElementLink: null,
    submissionPath: "request_platform",
    isNgo: true,
    riskFlags: [],
    threadId: "thread-1",
    threadPhase: "awaiting_reply",
    lastEmailAt: "2026-04-10T10:05:00.000Z",
    lastReplyAt: null,
    nextActionAt: null,
    submittedEventCount: 1,
    evaluatedEventCount: 0,
    lastAuditAt: "2026-04-10T10:00:00.000Z",
    ...overrides,
  };
}

function buildSelectionKey(item: CampaignAdminUserInteractionListItem): string {
  return buildCampaignAdminSelectionKey(item.userId, item.recordKey);
}

describe("useCampaignAdminInteractionSelection", () => {
  it("selects a visible pending range from the anchor row on shift-click", () => {
    const items = [
      createItem({ recordKey: "record-1" }),
      createItem({ userId: "user-2", recordKey: "record-2" }),
      createItem({ userId: "user-3", recordKey: "record-3" }),
    ];
    const { result } = renderHook(() =>
      useCampaignAdminInteractionSelection(),
    );

    act(() => {
      result.current.toggleSelection({
        item: items[0],
        checked: true,
        shiftKey: false,
        visibleItems: items,
      });
    });

    act(() => {
      result.current.toggleSelection({
        item: items[2],
        checked: true,
        shiftKey: true,
        visibleItems: items,
      });
    });

    expect(Array.from(result.current.selectedKeys)).toEqual([
      buildSelectionKey(items[0]),
      buildSelectionKey(items[1]),
      buildSelectionKey(items[2]),
    ]);
  });

  it("skips non-pending rows inside the shift-click range", () => {
    const items = [
      createItem({ recordKey: "record-1" }),
      createItem({
        userId: "user-2",
        recordKey: "record-2",
        reviewStatus: "approved",
        reviewable: false,
      }),
      createItem({ userId: "user-3", recordKey: "record-3" }),
    ];
    const { result } = renderHook(() =>
      useCampaignAdminInteractionSelection(),
    );

    act(() => {
      result.current.toggleSelection({
        item: items[0],
        checked: true,
        shiftKey: false,
        visibleItems: items,
      });
    });

    act(() => {
      result.current.toggleSelection({
        item: items[2],
        checked: true,
        shiftKey: true,
        visibleItems: items,
      });
    });

    expect(Array.from(result.current.selectedKeys)).toEqual([
      buildSelectionKey(items[0]),
      buildSelectionKey(items[2]),
    ]);
  });

  it("clears a visible range when shift-clicking an already selected target", () => {
    const items = [
      createItem({ recordKey: "record-1" }),
      createItem({ userId: "user-2", recordKey: "record-2" }),
      createItem({ userId: "user-3", recordKey: "record-3" }),
    ];
    const { result } = renderHook(() =>
      useCampaignAdminInteractionSelection(),
    );

    act(() => {
      result.current.replaceSelection(items.map(buildSelectionKey));
    });

    act(() => {
      result.current.toggleSelection({
        item: items[0],
        checked: false,
        shiftKey: false,
        visibleItems: items,
      });
    });

    act(() => {
      result.current.toggleSelection({
        item: items[2],
        checked: false,
        shiftKey: true,
        visibleItems: items,
      });
    });

    expect(Array.from(result.current.selectedKeys)).toEqual([]);
  });
});
