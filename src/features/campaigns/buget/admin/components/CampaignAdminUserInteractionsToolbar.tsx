import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { t } from "@lingui/core/macro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CAMPAIGN_ADMIN_INTERACTION_TYPE_OPTIONS,
  CAMPAIGN_ADMIN_PAGE_LIMIT_VALUES,
  getCampaignAdminPhaseLabel,
  getCampaignAdminInteractionTypeLabel,
  getCampaignAdminPayloadKindLabel,
  getCampaignAdminReviewStatusLabel,
  getCampaignAdminThreadPhaseLabel,
} from "@/features/campaigns/buget/admin/constants";
import {
  buildCampaignAdminQueueSearchFromDraft,
  createCampaignAdminFilterDraft,
  createEmptyCampaignAdminQueueSearch,
  isCampaignAdminFilterDraftEqual,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import {
  campaignAdminPhaseValues,
  campaignAdminPayloadKindValues,
  campaignAdminReviewStatusValues,
  campaignAdminScopeTypeValues,
  campaignAdminSubmissionPathValues,
  campaignAdminThreadPhaseValues,
  type CampaignAdminSubmissionPath,
  type CampaignAdminAvailableInteractionType,
  type CampaignAdminFilterDraft,
  type CampaignAdminQueueSearch,
} from "@/features/campaigns/buget/admin/types";
import { cn } from "@/lib/utils";

const ALL_VALUE = "__all__";
const ANY_MESSAGE_VALUE = "__any_message__";

type CampaignAdminUserInteractionsToolbarProps = {
  readonly availableInteractionTypes: readonly CampaignAdminAvailableInteractionType[];
  readonly search: CampaignAdminQueueSearch;
  readonly isLoading: boolean;
  readonly embedded?: boolean;
  readonly actions?: ReactNode;
  readonly trailingActions?: ReactNode;
  readonly onApply: (search: CampaignAdminQueueSearch) => void;
  readonly onReset: (search: CampaignAdminQueueSearch) => void;
  readonly onRefresh: () => void;
};

type ActiveFilter = {
  readonly label: string;
  readonly value: string;
  readonly section: "core" | "advanced";
};

type ToolbarFieldProps = {
  readonly label: string;
  readonly htmlFor?: string;
  readonly children: ReactNode;
  readonly className?: string;
};

type ToolbarInfoRowProps = {
  readonly label: string;
  readonly value: string;
};

function ToolbarField({
  label,
  htmlFor,
  children,
  className,
}: ToolbarFieldProps) {
  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function ToolbarInfoRow({ label, value }: ToolbarInfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-b-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-sm text-foreground">
        {value}
      </span>
    </div>
  );
}

function formatDateFilterValue(value: string): string {
  return value.slice(0, 10);
}

function summarizeDateRange(from?: string, to?: string): string | null {
  if (from && to) {
    return `${formatDateFilterValue(from)} - ${formatDateFilterValue(to)}`;
  }

  if (from) {
    return `>= ${formatDateFilterValue(from)}`;
  }

  if (to) {
    return `<= ${formatDateFilterValue(to)}`;
  }

  return null;
}

function getScopeTypeLabel(
  scopeType: CampaignAdminFilterDraft["scopeType"],
): string {
  switch (scopeType) {
    case "global":
      return t`Global`;
    case "entity":
      return t`Single entity`;
    default:
      return scopeType;
  }
}

function getSubmissionPathLabel(
  submissionPath: CampaignAdminSubmissionPath,
): string {
  switch (submissionPath) {
    case "request_platform":
      return t`Platform submission`;
    case "send_yourself":
      return t`Open email client`;
    case "send_email":
      return t`Send email`;
    case "download_text":
      return t`Download text`;
    default:
      return submissionPath;
  }
}

export function CampaignAdminUserInteractionsToolbar({
  availableInteractionTypes,
  search,
  isLoading,
  embedded = false,
  actions,
  trailingActions,
  onApply,
  onReset,
  onRefresh,
}: CampaignAdminUserInteractionsToolbarProps) {
  const [draft, setDraft] = useState<CampaignAdminFilterDraft>(
    createCampaignAdminFilterDraft(search),
  );
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  useEffect(() => {
    setDraft(createCampaignAdminFilterDraft(search));
  }, [search]);

  const updateDraft = (updates: Partial<CampaignAdminFilterDraft>) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...updates,
    }));
  };

  const nextSearchFromDraft = useMemo(
    () => buildCampaignAdminQueueSearchFromDraft(draft, search),
    [draft, search],
  );
  const isDirty = !isCampaignAdminFilterDraftEqual(search, nextSearchFromDraft);
  const interactionTypeOptions = useMemo(
    () =>
      availableInteractionTypes.length > 0
        ? availableInteractionTypes
        : CAMPAIGN_ADMIN_INTERACTION_TYPE_OPTIONS.map((interactionId) => ({
            interactionId,
            label: getCampaignAdminInteractionTypeLabel(interactionId),
          })),
    [availableInteractionTypes],
  );
  const getInteractionTypeOptionLabel = useCallback(
    (interactionId: string): string => {
      const matchedInteractionType = interactionTypeOptions.find(
        (interactionType) => interactionType.interactionId === interactionId,
      );

      return matchedInteractionType?.label?.trim()
        ? matchedInteractionType.label
        : getCampaignAdminInteractionTypeLabel(interactionId);
    },
    [interactionTypeOptions],
  );

  const activeFilters = useMemo<Array<ActiveFilter>>(() => {
    const filters: ActiveFilter[] = [];

    if (search.reviewStatus) {
      filters.push({
        label: t`Status`,
        value: getCampaignAdminReviewStatusLabel(search.reviewStatus),
        section: "core",
      });
    }

    if (search.entityCui) {
      filters.push({
        label: t`Entity`,
        value: search.entityCui,
        section: "core",
      });
    }

    if (search.interactionId) {
      filters.push({
        label: t`Interaction`,
        value: getInteractionTypeOptionLabel(search.interactionId),
        section: "core",
      });
    }

    if (search.hasInstitutionThread !== undefined) {
      filters.push({
        label: t`Message`,
        value: search.hasInstitutionThread ? t`Yes` : t`No`,
        section: "core",
      });
    }

    const updatedRange = summarizeDateRange(
      search.updatedAtFrom,
      search.updatedAtTo,
    );
    if (updatedRange) {
      filters.push({
        label: t`Updated`,
        value: updatedRange,
        section: "advanced",
      });
    }

    if (search.payloadKind) {
      filters.push({
        label: t`Payload`,
        value: getCampaignAdminPayloadKindLabel(search.payloadKind),
        section: "advanced",
      });
    }

    if (search.submissionPath) {
      filters.push({
        label: t`Submission path`,
        value: getSubmissionPathLabel(search.submissionPath),
        section: "advanced",
      });
    }

    if (search.scopeType) {
      filters.push({
        label: t`Scope`,
        value: getScopeTypeLabel(search.scopeType),
        section: "advanced",
      });
    }

    if (search.phase) {
      filters.push({
        label: t`Progress`,
        value: getCampaignAdminPhaseLabel(search.phase),
        section: "advanced",
      });
    }

    if (search.threadPhase) {
      filters.push({
        label: t`Thread`,
        value: getCampaignAdminThreadPhaseLabel(search.threadPhase),
        section: "advanced",
      });
    }

    if (search.lessonId) {
      filters.push({
        label: t`Lesson ID`,
        value: search.lessonId,
        section: "advanced",
      });
    }

    if (search.userId) {
      filters.push({
        label: t`User ID`,
        value: search.userId,
        section: "advanced",
      });
    }

    if (search.recordKey) {
      filters.push({
        label: t`Record key`,
        value: search.recordKey,
        section: "advanced",
      });
    }

    if (search.recordKeyPrefix) {
      filters.push({
        label: t`Record key prefix`,
        value: search.recordKeyPrefix,
        section: "advanced",
      });
    }

    const submittedRange = summarizeDateRange(
      search.submittedAtFrom,
      search.submittedAtTo,
    );
    if (submittedRange) {
      filters.push({
        label: t`Submitted`,
        value: submittedRange,
        section: "advanced",
      });
    }

    return filters;
  }, [getInteractionTypeOptionLabel, search]);

  const appliedAdvancedFiltersCount = activeFilters.filter(
    (filter) => filter.section === "advanced",
  ).length;

  const handleReset = () => {
    onReset(createEmptyCampaignAdminQueueSearch(draft.limit, search));
    setAdvancedFiltersOpen(false);
  };

  const handleApply = () => {
    onApply(nextSearchFromDraft);
    setAdvancedFiltersOpen(false);
  };

  const advancedFiltersContent = (
    <div className="space-y-5 px-6 py-6">
      <section className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-foreground">{t`Queue filters`}</h4>
          <p className="text-xs text-muted-foreground">
            {t`Start with the core review filters, then open advanced filters for exact identifiers and thread details.`}
          </p>
        </div>

        <div className="space-y-3">
          <ToolbarField
            label={t`Review status`}
            htmlFor="campaign-admin-review-status-sheet"
          >
            <Select
              value={draft.reviewStatus || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  reviewStatus:
                    value === ALL_VALUE
                      ? ""
                      : (value as CampaignAdminFilterDraft["reviewStatus"]),
                })
              }
            >
              <SelectTrigger id="campaign-admin-review-status-sheet">
                <SelectValue placeholder={t`Any status`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`Any status`}</SelectItem>
                {campaignAdminReviewStatusValues.map((reviewStatus) => (
                  <SelectItem key={reviewStatus} value={reviewStatus}>
                    {getCampaignAdminReviewStatusLabel(reviewStatus)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Message`}
            htmlFor="campaign-admin-has-thread-sheet"
          >
            <Select
              value={draft.hasInstitutionThread || ANY_MESSAGE_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  hasInstitutionThread:
                    value === ANY_MESSAGE_VALUE
                      ? ""
                      : (value as CampaignAdminFilterDraft["hasInstitutionThread"]),
                })
              }
            >
              <SelectTrigger id="campaign-admin-has-thread-sheet">
                <SelectValue placeholder={t`All`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_MESSAGE_VALUE}>{t`All`}</SelectItem>
                <SelectItem value="true">{t`Yes`}</SelectItem>
                <SelectItem value="false">{t`No`}</SelectItem>
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Entity CUI`}
            htmlFor="campaign-admin-entity-cui-sheet"
          >
            <Input
              id="campaign-admin-entity-cui-sheet"
              name="entityCui"
              value={draft.entityCui}
              onChange={(event) =>
                updateDraft({ entityCui: event.target.value })
              }
              placeholder={t`Filter one entity…`}
              autoComplete="off"
              spellCheck={false}
            />
          </ToolbarField>

          <ToolbarField
            label={t`Interaction type`}
            htmlFor="campaign-admin-interaction-type-sheet"
          >
            <Select
              value={draft.interactionId || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  interactionId: value === ALL_VALUE ? "" : value,
                })
              }
            >
              <SelectTrigger id="campaign-admin-interaction-type-sheet">
                <SelectValue placeholder={t`All interaction types`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value={ALL_VALUE}
                >{t`All interaction types`}</SelectItem>
                {interactionTypeOptions.map((interactionType) => (
                  <SelectItem
                    key={interactionType.interactionId}
                    value={interactionType.interactionId}
                  >
                    {getInteractionTypeOptionLabel(
                      interactionType.interactionId,
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Phase`}
            htmlFor="campaign-admin-phase"
          >
            <Select
              value={draft.phase || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  phase:
                    value === ALL_VALUE
                      ? ""
                      : (value as CampaignAdminFilterDraft["phase"]),
                })
              }
            >
              <SelectTrigger id="campaign-admin-phase">
                <SelectValue placeholder={t`Any phase`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`Any phase`}</SelectItem>
                {campaignAdminPhaseValues.map((phase) => (
                  <SelectItem key={phase} value={phase}>
                    {getCampaignAdminPhaseLabel(phase)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>
        </div>
      </section>

      <div className="h-px bg-border/60" />

      <section className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-foreground">{t`Timeline`}</h4>
          <p className="text-xs text-muted-foreground">
            {t`Combine updated date, submitted date, and thread phase when the queue needs a narrower review slice.`}
          </p>
        </div>

        <div className="space-y-3">
          <ToolbarField
            label={t`Updated from`}
            htmlFor="campaign-admin-updated-from"
          >
            <Input
              id="campaign-admin-updated-from"
              name="updatedAtFrom"
              type="date"
              value={draft.updatedAtFrom}
              onChange={(event) =>
                updateDraft({ updatedAtFrom: event.target.value })
              }
              autoComplete="off"
            />
          </ToolbarField>

          <ToolbarField
            label={t`Updated to`}
            htmlFor="campaign-admin-updated-to"
          >
            <Input
              id="campaign-admin-updated-to"
              name="updatedAtTo"
              type="date"
              value={draft.updatedAtTo}
              onChange={(event) =>
                updateDraft({ updatedAtTo: event.target.value })
              }
              autoComplete="off"
            />
          </ToolbarField>

          <ToolbarField label={t`Status`} htmlFor="campaign-admin-thread-phase">
            <Select
              value={draft.threadPhase || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  threadPhase:
                    value === ALL_VALUE
                      ? ""
                      : (value as CampaignAdminFilterDraft["threadPhase"]),
                })
              }
            >
              <SelectTrigger id="campaign-admin-thread-phase">
                <SelectValue placeholder={t`Any status`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`Any status`}</SelectItem>
                {campaignAdminThreadPhaseValues.map((threadPhase) => (
                  <SelectItem key={threadPhase} value={threadPhase}>
                    {getCampaignAdminThreadPhaseLabel(threadPhase)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Submitted from`}
            htmlFor="campaign-admin-submitted-from"
          >
            <Input
              id="campaign-admin-submitted-from"
              name="submittedAtFrom"
              type="date"
              value={draft.submittedAtFrom}
              onChange={(event) =>
                updateDraft({ submittedAtFrom: event.target.value })
              }
              autoComplete="off"
            />
          </ToolbarField>

          <ToolbarField
            label={t`Submitted to`}
            htmlFor="campaign-admin-submitted-to"
          >
            <Input
              id="campaign-admin-submitted-to"
              name="submittedAtTo"
              type="date"
              value={draft.submittedAtTo}
              onChange={(event) =>
                updateDraft({ submittedAtTo: event.target.value })
              }
              autoComplete="off"
            />
          </ToolbarField>
        </div>
      </section>

      <div className="h-px bg-border/60" />

      <section className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-foreground">{t`Interaction details`}</h4>
          <p className="text-xs text-muted-foreground">
            {t`Useful when you already know the lesson, payload, or scope you need to inspect.`}
          </p>
        </div>

        <div className="space-y-3">
          <ToolbarField label={t`Lesson ID`} htmlFor="campaign-admin-lesson-id">
            <Input
              id="campaign-admin-lesson-id"
              name="lessonId"
              value={draft.lessonId}
              onChange={(event) =>
                updateDraft({ lessonId: event.target.value })
              }
              autoComplete="off"
              spellCheck={false}
            />
          </ToolbarField>

          <ToolbarField
            label={t`Payload kind`}
            htmlFor="campaign-admin-payload-kind"
          >
            <Select
              value={draft.payloadKind || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  payloadKind:
                    value === ALL_VALUE
                      ? ""
                      : (value as CampaignAdminFilterDraft["payloadKind"]),
                })
              }
            >
              <SelectTrigger id="campaign-admin-payload-kind">
                <SelectValue placeholder={t`Any payload`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`Any payload`}</SelectItem>
                {campaignAdminPayloadKindValues.map((payloadKind) => (
                  <SelectItem key={payloadKind} value={payloadKind}>
                    {getCampaignAdminPayloadKindLabel(payloadKind)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Submission path`}
            htmlFor="campaign-admin-submission-path"
          >
            <Select
              value={draft.submissionPath || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  submissionPath:
                    value === ALL_VALUE
                      ? ""
                      : (value as CampaignAdminFilterDraft["submissionPath"]),
                })
              }
            >
              <SelectTrigger id="campaign-admin-submission-path">
                <SelectValue placeholder={t`Any submission path`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`Any submission path`}</SelectItem>
                {campaignAdminSubmissionPathValues.map((submissionPath) => (
                  <SelectItem key={submissionPath} value={submissionPath}>
                    {getSubmissionPathLabel(submissionPath)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Scope type`}
            htmlFor="campaign-admin-scope-type"
          >
            <Select
              value={draft.scopeType || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  scopeType:
                    value === ALL_VALUE
                      ? ""
                      : (value as CampaignAdminFilterDraft["scopeType"]),
                })
              }
            >
              <SelectTrigger id="campaign-admin-scope-type">
                <SelectValue placeholder={t`Any scope`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`Any scope`}</SelectItem>
                {campaignAdminScopeTypeValues.map((scopeType) => (
                  <SelectItem key={scopeType} value={scopeType}>
                    {getScopeTypeLabel(scopeType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>
        </div>
      </section>

      <div className="h-px bg-border/60" />

      <section className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-foreground">{t`Identifiers`}</h4>
          <p className="text-xs text-muted-foreground">
            {t`Use these only when an operator needs to find a specific user or review record.`}
          </p>
        </div>

        <div className="space-y-3">
          <ToolbarField label={t`User ID`} htmlFor="campaign-admin-user-id">
            <Input
              id="campaign-admin-user-id"
              name="userId"
              value={draft.userId}
              onChange={(event) => updateDraft({ userId: event.target.value })}
              autoComplete="off"
              spellCheck={false}
            />
          </ToolbarField>

          <ToolbarField
            label={t`Record key`}
            htmlFor="campaign-admin-record-key"
          >
            <Input
              id="campaign-admin-record-key"
              name="recordKey"
              value={draft.recordKey}
              onChange={(event) =>
                updateDraft({ recordKey: event.target.value })
              }
              autoComplete="off"
              spellCheck={false}
            />
          </ToolbarField>

          <ToolbarField
            label={t`Record key prefix`}
            htmlFor="campaign-admin-record-key-prefix"
          >
            <Input
              id="campaign-admin-record-key-prefix"
              name="recordKeyPrefix"
              value={draft.recordKeyPrefix}
              onChange={(event) =>
                updateDraft({ recordKeyPrefix: event.target.value })
              }
              placeholder={t`Minimum 16 characters…`}
              autoComplete="off"
              spellCheck={false}
            />
          </ToolbarField>
        </div>
      </section>

      <div className="h-px bg-border/60" />

      <section className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-foreground">{t`Current queue view`}</h4>
          <p className="text-xs text-muted-foreground">
            {activeFilters.length === 0
              ? t`Showing the latest review queue by last update.`
              : activeFilters.length === 1
                ? t`1 filter applied`
                : t`${activeFilters.length} filters applied`}
          </p>
        </div>

        {activeFilters.length > 0 ? (
          <div className="rounded-2xl border border-border/60 bg-background/60 px-3">
            {activeFilters.map((activeFilter) => (
              <ToolbarInfoRow
                key={`${activeFilter.label}:${activeFilter.value}`}
                label={activeFilter.label}
                value={activeFilter.value}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );

  return (
    <div
      className={cn(
        "space-y-3",
        embedded ? "" : "rounded-3xl border border-border/70 bg-card/80 p-4 sm:p-5",
      )}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ToolbarField
            label={t`Review status`}
            htmlFor="campaign-admin-review-status"
          >
            <Select
              value={draft.reviewStatus || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  reviewStatus:
                    value === ALL_VALUE
                      ? ""
                      : (value as CampaignAdminFilterDraft["reviewStatus"]),
                })
              }
            >
              <SelectTrigger id="campaign-admin-review-status">
                <SelectValue placeholder={t`Any status`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`Any status`}</SelectItem>
                {campaignAdminReviewStatusValues.map((reviewStatus) => (
                  <SelectItem key={reviewStatus} value={reviewStatus}>
                    {getCampaignAdminReviewStatusLabel(reviewStatus)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Interaction type`}
            htmlFor="campaign-admin-interaction-type"
          >
            <Select
              value={draft.interactionId || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  interactionId: value === ALL_VALUE ? "" : value,
                })
              }
            >
              <SelectTrigger id="campaign-admin-interaction-type">
                <SelectValue placeholder={t`All interaction types`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`All interaction types`}</SelectItem>
                {interactionTypeOptions.map((interactionType) => (
                  <SelectItem
                    key={interactionType.interactionId}
                    value={interactionType.interactionId}
                  >
                    {getInteractionTypeOptionLabel(interactionType.interactionId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Entity CUI`}
            htmlFor="campaign-admin-entity-cui"
          >
            <Input
              id="campaign-admin-entity-cui"
              name="entityCui"
              value={draft.entityCui}
              onChange={(event) =>
                updateDraft({ entityCui: event.target.value })
              }
              placeholder={t`Filter one entity...`}
              autoComplete="off"
              spellCheck={false}
            />
          </ToolbarField>

          <ToolbarField
            label={t`Message`}
            htmlFor="campaign-admin-has-thread"
          >
            <Select
              value={draft.hasInstitutionThread || ANY_MESSAGE_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  hasInstitutionThread:
                    value === ANY_MESSAGE_VALUE
                      ? ""
                      : (value as CampaignAdminFilterDraft["hasInstitutionThread"]),
                })
              }
            >
              <SelectTrigger id="campaign-admin-has-thread">
                <SelectValue placeholder={t`All`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_MESSAGE_VALUE}>{t`All`}</SelectItem>
                <SelectItem value="true">{t`Yes`}</SelectItem>
                <SelectItem value="false">{t`No`}</SelectItem>
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Rows per page`}
            htmlFor="campaign-admin-limit"
          >
            <Select
              value={String(draft.limit)}
              onValueChange={(value) =>
                updateDraft({
                  limit: Number(value),
                })
              }
            >
              <SelectTrigger id="campaign-admin-limit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_ADMIN_PAGE_LIMIT_VALUES.map((limit) => (
                  <SelectItem key={limit} value={String(limit)}>
                    {limit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={() => setAdvancedFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {appliedAdvancedFiltersCount > 0
              ? t`Advanced (${appliedAdvancedFiltersCount})`
              : t`Advanced`}
          </Button>
          {actions}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={handleReset}
            disabled={activeFilters.length === 0 && !isDirty}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t`Reset`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t`Refresh`}
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-2 rounded-full"
            onClick={handleApply}
            disabled={!isDirty || isLoading}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {t`Apply filters`}
          </Button>
          {trailingActions}
        </div>
      </div>

      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge
              key={`${filter.label}:${filter.value}`}
              variant="secondary"
              className="rounded-full"
            >
              {filter.label}: {filter.value}
            </Badge>
          ))}
        </div>
      ) : null}

      <Sheet
        open={advancedFiltersOpen}
        onOpenChange={setAdvancedFiltersOpen}
      >
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col overflow-hidden border-l border-border/70 bg-background px-0 sm:max-w-3xl"
        >
          <SheetHeader className="shrink-0 space-y-2 border-b border-border/60 px-6 pb-5">
            <SheetTitle className="text-lg font-medium tracking-tight">
              {t`Advanced filters`}
            </SheetTitle>
            <SheetDescription>
              {t`Use exact identifiers and secondary queue fields when the quick filters are not enough.`}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {advancedFiltersContent}
          </div>

          <SheetFooter className="shrink-0 gap-2 border-t border-border/60 bg-background px-6 py-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdvancedFiltersOpen(false)}
              size="sm"
              className="rounded-lg"
            >
              {t`Close`}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={isLoading}
              size="sm"
              className="rounded-lg"
            >
              {t`Reset all`}
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={!isDirty || isLoading}
              size="sm"
              className="gap-1.5 rounded-lg"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              {t`Apply filters`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
