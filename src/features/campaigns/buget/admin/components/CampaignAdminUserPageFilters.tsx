import { useEffect, useMemo, useState, type ReactNode } from "react";
import { RefreshCw, RotateCcw, SlidersHorizontal } from "lucide-react";
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
  getCampaignAdminInteractionTypeLabel,
  getCampaignAdminPayloadKindLabel,
  getCampaignAdminReviewStatusLabel,
  getCampaignAdminThreadPhaseLabel,
} from "@/features/campaigns/buget/admin/constants";
import { normalizeCampaignAdminUserPageSearch } from "@/features/campaigns/buget/admin/schemas/search-schema";
import {
  toDateInputValue,
  toUtcRangeBoundary,
} from "@/features/campaigns/buget/admin/utils/date-inputs";
import {
  campaignAdminPayloadKindValues,
  campaignAdminReviewStatusValues,
  campaignAdminScopeTypeValues,
  campaignAdminSubmissionPathValues,
  campaignAdminThreadPhaseValues,
  type CampaignAdminAvailableInteractionType,
  type CampaignAdminPayloadKind,
  type CampaignAdminReviewStatus,
  type CampaignAdminScopeType,
  type CampaignAdminSubmissionPath,
  type CampaignAdminThreadPhase,
  type CampaignAdminUserPageSearch,
} from "@/features/campaigns/buget/admin/types";
import { cn } from "@/lib/utils";

const ALL_VALUE = "__all__";

type CampaignAdminUserPageFilterDraft = {
  readonly reviewStatus: CampaignAdminReviewStatus | "";
  readonly interactionId: string;
  readonly entityCui: string;
  readonly hasInstitutionThread: "" | "true" | "false";
  readonly updatedAtFrom: string;
  readonly updatedAtTo: string;
  readonly submittedAtFrom: string;
  readonly submittedAtTo: string;
  readonly threadPhase: CampaignAdminThreadPhase | "";
  readonly payloadKind: CampaignAdminPayloadKind | "";
  readonly scopeType: CampaignAdminScopeType | "";
  readonly submissionPath: CampaignAdminSubmissionPath | "";
  readonly lessonId: string;
  readonly recordKey: string;
  readonly recordKeyPrefix: string;
};

type ActiveFilter = {
  readonly label: string;
  readonly value: string;
};

type ToolbarFieldProps = {
  readonly label: string;
  readonly htmlFor?: string;
  readonly children: ReactNode;
  readonly className?: string;
};

type CampaignAdminUserPageFiltersProps = {
  readonly availableInteractionTypes: readonly CampaignAdminAvailableInteractionType[];
  readonly search: CampaignAdminUserPageSearch;
  readonly isLoading: boolean;
  readonly embedded?: boolean;
  readonly actions?: ReactNode;
  readonly trailingActions?: ReactNode;
  readonly onApply: (search: CampaignAdminUserPageSearch) => void;
  readonly onReset: (search: CampaignAdminUserPageSearch) => void;
  readonly onRefresh: () => void;
};

function summarizeDateRange(from?: string, to?: string): string | null {
  if (from && to) {
    return `${from.slice(0, 10)} - ${to.slice(0, 10)}`;
  }

  if (from) {
    return `>= ${from.slice(0, 10)}`;
  }

  if (to) {
    return `<= ${to.slice(0, 10)}`;
  }

  return null;
}

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

function createDraft(
  search: CampaignAdminUserPageSearch,
): CampaignAdminUserPageFilterDraft {
  return {
    reviewStatus: search.reviewStatus ?? "",
    interactionId: search.interactionId ?? "",
    entityCui: search.entityCui ?? "",
    hasInstitutionThread:
      search.hasInstitutionThread === true
        ? "true"
        : search.hasInstitutionThread === false
          ? "false"
          : "",
    updatedAtFrom: toDateInputValue(search.updatedAtFrom),
    updatedAtTo: toDateInputValue(search.updatedAtTo),
    submittedAtFrom: toDateInputValue(search.submittedAtFrom),
    submittedAtTo: toDateInputValue(search.submittedAtTo),
    threadPhase: search.threadPhase ?? "",
    payloadKind: search.payloadKind ?? "",
    scopeType: search.scopeType ?? "",
    submissionPath: search.submissionPath ?? "",
    lessonId: search.lessonId ?? "",
    recordKey: search.recordKey ?? "",
    recordKeyPrefix: search.recordKeyPrefix ?? "",
  };
}

function buildSearchFromDraft(
  draft: CampaignAdminUserPageFilterDraft,
  currentSearch: CampaignAdminUserPageSearch,
): CampaignAdminUserPageSearch {
  return normalizeCampaignAdminUserPageSearch({
    reviewStatus: draft.reviewStatus || undefined,
    interactionId: draft.interactionId || undefined,
    entityCui: draft.entityCui || undefined,
    hasInstitutionThread:
      draft.hasInstitutionThread === ""
        ? undefined
        : draft.hasInstitutionThread === "true",
    updatedAtFrom: toUtcRangeBoundary(draft.updatedAtFrom, "start"),
    updatedAtTo: toUtcRangeBoundary(draft.updatedAtTo, "end"),
    submittedAtFrom: toUtcRangeBoundary(draft.submittedAtFrom, "start"),
    submittedAtTo: toUtcRangeBoundary(draft.submittedAtTo, "end"),
    threadPhase: draft.threadPhase || undefined,
    payloadKind: draft.payloadKind || undefined,
    scopeType: draft.scopeType || undefined,
    submissionPath: draft.submissionPath || undefined,
    lessonId: draft.lessonId || undefined,
    recordKey: draft.recordKey || undefined,
    recordKeyPrefix:
      draft.recordKeyPrefix.trim().length >= 16
        ? draft.recordKeyPrefix.trim()
        : undefined,
    sortBy: currentSearch.sortBy,
    sortOrder: currentSearch.sortOrder,
    reviewSelectionKey: undefined,
  });
}

function buildResetSearch(
  currentSearch: CampaignAdminUserPageSearch,
): CampaignAdminUserPageSearch {
  return normalizeCampaignAdminUserPageSearch({
    sortBy: currentSearch.sortBy,
    sortOrder: currentSearch.sortOrder,
  });
}

function createSearchSignature(search: CampaignAdminUserPageSearch): string {
  const { reviewSelectionKey: _reviewSelectionKey, ...stableSearch } = search;
  return JSON.stringify(stableSearch);
}

function getScopeTypeLabel(value: CampaignAdminScopeType | ""): string {
  switch (value) {
    case "global":
      return t`Global`;
    case "entity":
      return t`Single entity`;
    default:
      return value;
  }
}

function getSubmissionPathLabel(
  value: CampaignAdminSubmissionPath | "",
): string {
  switch (value) {
    case "request_platform":
      return t`Platform send`;
    case "send_yourself":
      return t`Send yourself`;
    case "send_email":
      return t`Send email`;
    case "download_text":
      return t`Download text`;
    default:
      return value;
  }
}

export function CampaignAdminUserPageFilters({
  availableInteractionTypes,
  search,
  isLoading,
  embedded = false,
  actions,
  trailingActions,
  onApply,
  onReset,
  onRefresh,
}: CampaignAdminUserPageFiltersProps) {
  const [draft, setDraft] = useState(createDraft(search));
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setDraft(createDraft(search));
  }, [search]);

  const updateDraft = (updates: Partial<CampaignAdminUserPageFilterDraft>) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...updates,
    }));
  };

  const nextSearch = useMemo(
    () => buildSearchFromDraft(draft, search),
    [draft, search],
  );
  const isDirty =
    createSearchSignature(search) !== createSearchSignature(nextSearch);
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

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];

    if (search.reviewStatus) {
      filters.push({
        label: t`Review`,
        value: getCampaignAdminReviewStatusLabel(search.reviewStatus),
      });
    }

    if (search.interactionId) {
      filters.push({
        label: t`Interaction`,
        value: getCampaignAdminInteractionTypeLabel(search.interactionId),
      });
    }

    if (search.entityCui) {
      filters.push({
        label: t`Entity`,
        value: search.entityCui,
      });
    }

    if (search.hasInstitutionThread !== undefined) {
      filters.push({
        label: t`Message`,
        value: search.hasInstitutionThread ? t`Yes` : t`No`,
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
      });
    }

    if (search.threadPhase) {
      filters.push({
        label: t`Thread`,
        value: getCampaignAdminThreadPhaseLabel(search.threadPhase),
      });
    }

    if (search.payloadKind) {
      filters.push({
        label: t`Payload`,
        value: getCampaignAdminPayloadKindLabel(search.payloadKind),
      });
    }

    if (search.scopeType) {
      filters.push({
        label: t`Scope`,
        value: getScopeTypeLabel(search.scopeType),
      });
    }

    if (search.submissionPath) {
      filters.push({
        label: t`Submission`,
        value: getSubmissionPathLabel(search.submissionPath),
      });
    }

    if (search.lessonId) {
      filters.push({
        label: t`Lesson`,
        value: search.lessonId,
      });
    }

    if (search.recordKey) {
      filters.push({
        label: t`Record`,
        value: search.recordKey,
      });
    }

    if (search.recordKeyPrefix) {
      filters.push({
        label: t`Record prefix`,
        value: search.recordKeyPrefix,
      });
    }

    return filters;
  }, [search]);

  return (
    <div className={embedded ? "space-y-3" : "space-y-3 rounded-3xl border border-border/70 bg-card/80 p-4"}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label
              htmlFor="campaign-admin-user-page-review-status"
              className="text-xs font-medium text-muted-foreground"
            >
              {t`Review status`}
            </Label>
            <Select
              value={draft.reviewStatus || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  reviewStatus:
                    value === ALL_VALUE
                      ? ""
                      : (value as CampaignAdminReviewStatus),
                })
              }
            >
              <SelectTrigger id="campaign-admin-user-page-review-status">
                <SelectValue placeholder={t`All statuses`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`All statuses`}</SelectItem>
                {campaignAdminReviewStatusValues.map((reviewStatus) => (
                  <SelectItem key={reviewStatus} value={reviewStatus}>
                    {getCampaignAdminReviewStatusLabel(reviewStatus)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="campaign-admin-user-page-interaction-type"
              className="text-xs font-medium text-muted-foreground"
            >
              {t`Interaction type`}
            </Label>
            <Select
              value={draft.interactionId || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  interactionId: value === ALL_VALUE ? "" : value,
                })
              }
            >
              <SelectTrigger id="campaign-admin-user-page-interaction-type">
                <SelectValue placeholder={t`All interaction types`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>
                  {t`All interaction types`}
                </SelectItem>
                {interactionTypeOptions.map((interactionType) => (
                  <SelectItem
                    key={interactionType.interactionId}
                    value={interactionType.interactionId}
                  >
                    {interactionType.label?.trim() ||
                      getCampaignAdminInteractionTypeLabel(
                        interactionType.interactionId,
                      )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="campaign-admin-user-page-entity-cui"
              className="text-xs font-medium text-muted-foreground"
            >
              {t`Entity CUI`}
            </Label>
            <Input
              id="campaign-admin-user-page-entity-cui"
              value={draft.entityCui}
              onChange={(event) =>
                updateDraft({
                  entityCui: event.target.value,
                })
              }
              placeholder={t`Filter one entity…`}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={() => setAdvancedOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {t`Advanced`}
          </Button>
          {actions}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={() => onReset(buildResetSearch(search))}
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
            className="rounded-full"
            onClick={() => onApply(nextSearch)}
            disabled={!isDirty}
          >
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

      <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <SheetContent className="flex h-full w-full flex-col sm:max-w-xl">
          <SheetHeader className="shrink-0">
            <SheetTitle>{t`Advanced filters`}</SheetTitle>
            <SheetDescription>
              {t`Refine the user workspace by timeline, payload, and record identifiers.`}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-5 px-6 py-6">
            <section className="space-y-3">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-foreground">{t`Timeline`}</h4>
                <p className="text-xs text-muted-foreground">
                  {t`Combine updated date, submitted date, and thread phase when the user workspace needs a narrower review slice.`}
                </p>
              </div>

              <div className="space-y-3">
                <ToolbarField
                  label={t`Updated from`}
                  htmlFor="campaign-admin-user-page-updated-from"
                >
                  <Input
                    id="campaign-admin-user-page-updated-from"
                    type="date"
                    value={draft.updatedAtFrom}
                    onChange={(event) =>
                      updateDraft({
                        updatedAtFrom: event.target.value,
                      })
                    }
                  />
                </ToolbarField>

                <ToolbarField
                  label={t`Updated to`}
                  htmlFor="campaign-admin-user-page-updated-to"
                >
                  <Input
                    id="campaign-admin-user-page-updated-to"
                    type="date"
                    value={draft.updatedAtTo}
                    onChange={(event) =>
                      updateDraft({
                        updatedAtTo: event.target.value,
                      })
                    }
                  />
                </ToolbarField>

                <ToolbarField
                  label={t`Thread phase`}
                  htmlFor="campaign-admin-user-page-thread-phase"
                >
                  <Select
                    value={draft.threadPhase || ALL_VALUE}
                    onValueChange={(value) =>
                      updateDraft({
                        threadPhase:
                          value === ALL_VALUE
                            ? ""
                            : (value as CampaignAdminThreadPhase),
                      })
                    }
                  >
                    <SelectTrigger id="campaign-admin-user-page-thread-phase">
                      <SelectValue placeholder={t`Any thread phase`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>
                        {t`Any thread phase`}
                      </SelectItem>
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
                  htmlFor="campaign-admin-user-page-submitted-from"
                >
                  <Input
                    id="campaign-admin-user-page-submitted-from"
                    type="date"
                    value={draft.submittedAtFrom}
                    onChange={(event) =>
                      updateDraft({
                        submittedAtFrom: event.target.value,
                      })
                    }
                  />
                </ToolbarField>

                <ToolbarField
                  label={t`Submitted to`}
                  htmlFor="campaign-admin-user-page-submitted-to"
                >
                  <Input
                    id="campaign-admin-user-page-submitted-to"
                    type="date"
                    value={draft.submittedAtTo}
                    onChange={(event) =>
                      updateDraft({
                        submittedAtTo: event.target.value,
                      })
                    }
                  />
                </ToolbarField>
              </div>
            </section>

            <div className="h-px bg-border/60" />

            <section className="space-y-3">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-foreground">{t`Interaction details`}</h4>
                <p className="text-xs text-muted-foreground">
                  {t`Useful when you already know the lesson, payload, scope, or submission path you need to inspect.`}
                </p>
              </div>

              <div className="space-y-3">
                <ToolbarField
                  label={t`Payload kind`}
                  htmlFor="campaign-admin-user-page-payload-kind"
                >
                  <Select
                    value={draft.payloadKind || ALL_VALUE}
                    onValueChange={(value) =>
                      updateDraft({
                        payloadKind:
                          value === ALL_VALUE
                            ? ""
                            : (value as CampaignAdminPayloadKind),
                      })
                    }
                  >
                    <SelectTrigger id="campaign-admin-user-page-payload-kind">
                      <SelectValue placeholder={t`Any payload kind`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>
                        {t`Any payload kind`}
                      </SelectItem>
                      {campaignAdminPayloadKindValues.map((payloadKind) => (
                        <SelectItem key={payloadKind} value={payloadKind}>
                          {getCampaignAdminPayloadKindLabel(payloadKind)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ToolbarField>

                <ToolbarField
                  label={t`Scope type`}
                  htmlFor="campaign-admin-user-page-scope-type"
                >
                  <Select
                    value={draft.scopeType || ALL_VALUE}
                    onValueChange={(value) =>
                      updateDraft({
                        scopeType:
                          value === ALL_VALUE
                            ? ""
                            : (value as CampaignAdminScopeType),
                      })
                    }
                  >
                    <SelectTrigger id="campaign-admin-user-page-scope-type">
                      <SelectValue placeholder={t`Any scope type`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>
                        {t`Any scope type`}
                      </SelectItem>
                      {campaignAdminScopeTypeValues.map((scopeType) => (
                        <SelectItem key={scopeType} value={scopeType}>
                          {getScopeTypeLabel(scopeType)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ToolbarField>

                <ToolbarField
                  label={t`Submission path`}
                  htmlFor="campaign-admin-user-page-submission-path"
                >
                  <Select
                    value={draft.submissionPath || ALL_VALUE}
                    onValueChange={(value) =>
                      updateDraft({
                        submissionPath:
                          value === ALL_VALUE
                            ? ""
                            : (value as CampaignAdminSubmissionPath),
                      })
                    }
                  >
                    <SelectTrigger id="campaign-admin-user-page-submission-path">
                      <SelectValue placeholder={t`Any submission path`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>
                        {t`Any submission path`}
                      </SelectItem>
                      {campaignAdminSubmissionPathValues.map((submissionPath) => (
                        <SelectItem key={submissionPath} value={submissionPath}>
                          {getSubmissionPathLabel(submissionPath)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ToolbarField>

                <ToolbarField
                  label={t`Lesson ID`}
                  htmlFor="campaign-admin-user-page-lesson-id"
                >
                  <Input
                    id="campaign-admin-user-page-lesson-id"
                    value={draft.lessonId}
                    onChange={(event) =>
                      updateDraft({
                        lessonId: event.target.value,
                      })
                    }
                    autoComplete="off"
                    spellCheck={false}
                  />
                </ToolbarField>
              </div>
            </section>

            <div className="h-px bg-border/60" />

            <section className="space-y-3">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-foreground">{t`Identifiers`}</h4>
                <p className="text-xs text-muted-foreground">
                  {t`Use these only when an operator already knows the exact record they need to inspect.`}
                </p>
              </div>

              <div className="space-y-3">
                <ToolbarField
                  label={t`Record key`}
                  htmlFor="campaign-admin-user-page-record-key"
                >
                  <Input
                    id="campaign-admin-user-page-record-key"
                    value={draft.recordKey}
                    onChange={(event) =>
                      updateDraft({
                        recordKey: event.target.value,
                      })
                    }
                    autoComplete="off"
                    spellCheck={false}
                  />
                </ToolbarField>

                <ToolbarField
                  label={t`Record key prefix`}
                  htmlFor="campaign-admin-user-page-record-key-prefix"
                >
                  <Input
                    id="campaign-admin-user-page-record-key-prefix"
                    value={draft.recordKeyPrefix}
                    onChange={(event) =>
                      updateDraft({
                        recordKeyPrefix: event.target.value,
                      })
                    }
                    autoComplete="off"
                    spellCheck={false}
                  />
                </ToolbarField>
              </div>
            </section>
            </div>
          </div>

          <SheetFooter className="shrink-0 border-t border-border/60 bg-background px-6 py-4 gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(createDraft(buildResetSearch(search)));
              }}
            >
              {t`Clear advanced`}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdvancedOpen(false)}
              >
                {t`Close`}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onApply(nextSearch);
                  setAdvancedOpen(false);
                }}
              >
                {t`Apply filters`}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
