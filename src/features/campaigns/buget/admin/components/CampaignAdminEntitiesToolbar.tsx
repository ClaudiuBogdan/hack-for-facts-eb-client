import { type ReactNode, useEffect, useMemo, useState } from "react";
import { RefreshCw, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
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
  CAMPAIGN_ADMIN_ENTITIES_SORTABLE_COLUMNS,
  CAMPAIGN_ADMIN_INTERACTION_TYPE_OPTIONS,
  CAMPAIGN_ADMIN_PAGE_LIMIT_VALUES,
  getCampaignAdminEntityNotificationTypeLabel,
  getCampaignAdminEntitiesSortLabel,
  getCampaignAdminInteractionTypeLabel,
  getCampaignAdminNotificationStatusLabel,
} from "@/features/campaigns/buget/admin/constants";
import {
  createEmptyCampaignAdminEntitiesSearch,
  normalizeCampaignAdminEntitiesSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import {
  campaignAdminEntityNotificationTypeValues,
  campaignAdminNotificationStatusValues,
  type CampaignAdminAvailableInteractionType,
  type CampaignAdminEntityNotificationType,
  type CampaignAdminEntitiesSearch,
  type CampaignAdminEntitiesSortKey,
  type CampaignAdminNotificationStatus,
  type CampaignAdminSortOrder,
} from "@/features/campaigns/buget/admin/types";
import { cn } from "@/lib/utils";

const ALL_VALUE = "__all__";
const SORT_SEPARATOR = "::";

type CampaignAdminEntitiesToolbarProps = {
  readonly search: CampaignAdminEntitiesSearch;
  readonly isLoading: boolean;
  readonly interactionTypeOptions: readonly CampaignAdminAvailableInteractionType[];
  readonly latestNotificationTypeOptions: readonly CampaignAdminEntityNotificationType[];
  readonly latestNotificationStatusOptions: readonly CampaignAdminNotificationStatus[];
  readonly embedded?: boolean;
  readonly actions?: ReactNode;
  readonly trailingActions?: ReactNode;
  readonly onApply: (search: CampaignAdminEntitiesSearch) => void;
  readonly onReset: (search: CampaignAdminEntitiesSearch) => void;
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

type EntityFilterDraft = {
  readonly query: string;
  readonly interactionId: string;
  readonly hasPendingReviews: "" | "true" | "false";
  readonly hasSubscribers: "" | "true" | "false";
  readonly hasNotificationActivity: "" | "true" | "false";
  readonly hasFailedNotifications: "" | "true" | "false";
  readonly latestNotificationType: CampaignAdminEntityNotificationType | "";
  readonly latestNotificationStatus: CampaignAdminNotificationStatus | "";
  readonly sortBy: CampaignAdminEntitiesSortKey;
  readonly sortOrder: CampaignAdminSortOrder;
  readonly limit: number;
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

function ToolbarInfoRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-b-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-sm text-foreground">
        {value}
      </span>
    </div>
  );
}

function createDraftFromSearch(
  search: CampaignAdminEntitiesSearch,
): EntityFilterDraft {
  const sortBy = search.sortBy ?? "latestInteractionAt";

  return {
    query: search.query ?? "",
    interactionId: search.interactionId ?? "",
    hasPendingReviews:
      search.hasPendingReviews === true
        ? "true"
        : search.hasPendingReviews === false
          ? "false"
          : "",
    hasSubscribers:
      search.hasSubscribers === true
        ? "true"
        : search.hasSubscribers === false
          ? "false"
          : "",
    hasNotificationActivity:
      search.hasNotificationActivity === true
        ? "true"
        : search.hasNotificationActivity === false
          ? "false"
          : "",
    hasFailedNotifications:
      search.hasFailedNotifications === true
        ? "true"
        : search.hasFailedNotifications === false
          ? "false"
          : "",
    latestNotificationType: search.latestNotificationType ?? "",
    latestNotificationStatus: search.latestNotificationStatus ?? "",
    sortBy,
    sortOrder:
      search.sortOrder ??
      CAMPAIGN_ADMIN_ENTITIES_SORTABLE_COLUMNS[sortBy].defaultOrder,
    limit: search.limit,
  };
}

function buildSearchFromDraft(
  draft: EntityFilterDraft,
): CampaignAdminEntitiesSearch {
  return normalizeCampaignAdminEntitiesSearch({
    query: draft.query.trim() || undefined,
    interactionId: draft.interactionId || undefined,
    hasPendingReviews:
      draft.hasPendingReviews === ""
        ? undefined
        : draft.hasPendingReviews === "true",
    hasSubscribers:
      draft.hasSubscribers === ""
        ? undefined
        : draft.hasSubscribers === "true",
    hasNotificationActivity:
      draft.hasNotificationActivity === ""
        ? undefined
        : draft.hasNotificationActivity === "true",
    hasFailedNotifications:
      draft.hasFailedNotifications === ""
        ? undefined
        : draft.hasFailedNotifications === "true",
    latestNotificationType: draft.latestNotificationType || undefined,
    latestNotificationStatus: draft.latestNotificationStatus || undefined,
    sortBy: draft.sortBy,
    sortOrder: draft.sortOrder,
    limit: draft.limit,
  });
}

function createSearchSignature(
  search: CampaignAdminEntitiesSearch,
): string {
  const { cursor, pageIndex, ...searchWithoutPagination } = search;
  void cursor;
  void pageIndex;

  return JSON.stringify(searchWithoutPagination);
}

function getBooleanFilterLabel(value: boolean): string {
  return value ? t`Yes` : t`No`;
}

function getSortValue(
  sortBy: CampaignAdminEntitiesSortKey,
  sortOrder: CampaignAdminSortOrder,
): string {
  return `${sortBy}${SORT_SEPARATOR}${sortOrder}`;
}

function getSortLabel(
  sortBy: CampaignAdminEntitiesSortKey,
  sortOrder: CampaignAdminSortOrder,
): string {
  return sortOrder === "asc"
    ? t`${getCampaignAdminEntitiesSortLabel(sortBy)} (ascending)`
    : t`${getCampaignAdminEntitiesSortLabel(sortBy)} (descending)`;
}

export function CampaignAdminEntitiesToolbar({
  search,
  isLoading,
  interactionTypeOptions,
  latestNotificationTypeOptions,
  latestNotificationStatusOptions,
  embedded = false,
  actions,
  trailingActions,
  onApply,
  onReset,
  onRefresh,
}: CampaignAdminEntitiesToolbarProps) {
  const [draft, setDraft] = useState<EntityFilterDraft>(
    createDraftFromSearch(search),
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setDraft(createDraftFromSearch(search));
  }, [search]);

  const nextSearch = useMemo(() => buildSearchFromDraft(draft), [draft]);
  const isDirty =
    createSearchSignature(search) !== createSearchSignature(nextSearch);

  const resolvedInteractionTypeOptions = useMemo(
    () =>
      interactionTypeOptions.length > 0
        ? interactionTypeOptions
        : CAMPAIGN_ADMIN_INTERACTION_TYPE_OPTIONS.map((interactionId) => ({
            interactionId,
            label: getCampaignAdminInteractionTypeLabel(interactionId),
          })),
    [interactionTypeOptions],
  );

  const resolvedNotificationTypeOptions = useMemo(
    () =>
      latestNotificationTypeOptions.length > 0
        ? latestNotificationTypeOptions
        : [...campaignAdminEntityNotificationTypeValues],
    [latestNotificationTypeOptions],
  );

  const resolvedStatusOptions = useMemo(
    () =>
      latestNotificationStatusOptions.length > 0
        ? latestNotificationStatusOptions
        : [...campaignAdminNotificationStatusValues],
    [latestNotificationStatusOptions],
  );

  const activeFilters = useMemo<Array<ActiveFilter>>(
    () =>
      [
        search.query
          ? {
              label: t`Search`,
              value: search.query,
              section: "core" as const,
            }
          : null,
        search.hasPendingReviews !== undefined
          ? {
              label: t`Pending reviews`,
              value: getBooleanFilterLabel(search.hasPendingReviews),
              section: "core" as const,
            }
          : null,
        search.hasSubscribers !== undefined
          ? {
              label: t`Subscribers`,
              value: getBooleanFilterLabel(search.hasSubscribers),
              section: "core" as const,
            }
          : null,
        search.hasNotificationActivity !== undefined
          ? {
              label: t`Notification activity`,
              value: getBooleanFilterLabel(search.hasNotificationActivity),
              section: "core" as const,
            }
          : null,
        search.hasFailedNotifications !== undefined
          ? {
              label: t`Failed notifications`,
              value: getBooleanFilterLabel(search.hasFailedNotifications),
              section: "core" as const,
            }
          : null,
        search.interactionId
          ? {
              label: t`Interaction`,
              value:
                resolvedInteractionTypeOptions.find(
                  (option) => option.interactionId === search.interactionId,
                )?.label ??
                getCampaignAdminInteractionTypeLabel(search.interactionId),
              section: "advanced" as const,
            }
          : null,
        search.latestNotificationType
          ? {
              label: t`Latest type`,
              value: getCampaignAdminEntityNotificationTypeLabel(
                search.latestNotificationType,
              ),
              section: "advanced" as const,
            }
          : null,
        search.latestNotificationStatus
          ? {
              label: t`Latest status`,
              value: getCampaignAdminNotificationStatusLabel(
                search.latestNotificationStatus,
              ),
              section: "advanced" as const,
            }
          : null,
      ].filter((value): value is ActiveFilter => value !== null),
    [search, resolvedInteractionTypeOptions],
  );

  const appliedAdvancedFiltersCount = activeFilters.filter(
    (filter) => filter.section === "advanced",
  ).length;

  const handleReset = () => {
    const resetSearch = createEmptyCampaignAdminEntitiesSearch({
      currentSearch: search,
      limit: search.limit,
    });
    setDraft(createDraftFromSearch(resetSearch));
    onReset(resetSearch);
    setAdvancedOpen(false);
  };

  const handleApply = () => {
    onApply(nextSearch);
    setAdvancedOpen(false);
  };

  return (
    <div
      className={cn(
        "space-y-3",
        embedded
          ? ""
          : "rounded-2xl border border-border/70 bg-card/80 p-4 sm:p-5",
      )}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <ToolbarField label={t`Search`} htmlFor="entities-query">
            <Input
              id="entities-query"
              value={draft.query}
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  query: event.currentTarget.value,
                }));
              }}
              placeholder={t`Entity CUI or entity name`}
              autoComplete="off"
              spellCheck={false}
            />
          </ToolbarField>

          <ToolbarField
            label={t`Pending reviews`}
            htmlFor="entities-pending-reviews"
          >
            <Select
              value={draft.hasPendingReviews || ALL_VALUE}
              onValueChange={(value) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  hasPendingReviews:
                    value === ALL_VALUE
                      ? ""
                      : (value as EntityFilterDraft["hasPendingReviews"]),
                }));
              }}
            >
              <SelectTrigger id="entities-pending-reviews">
                <SelectValue placeholder={t`All entities`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`All entities`}</SelectItem>
                <SelectItem value="true">{t`Has pending reviews`}</SelectItem>
                <SelectItem value="false">{t`No pending reviews`}</SelectItem>
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField label={t`Subscribers`} htmlFor="entities-subscribers">
            <Select
              value={draft.hasSubscribers || ALL_VALUE}
              onValueChange={(value) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  hasSubscribers:
                    value === ALL_VALUE
                      ? ""
                      : (value as EntityFilterDraft["hasSubscribers"]),
                }));
              }}
            >
              <SelectTrigger id="entities-subscribers">
                <SelectValue placeholder={t`All entities`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`All entities`}</SelectItem>
                <SelectItem value="true">{t`Has subscribers`}</SelectItem>
                <SelectItem value="false">{t`No subscribers`}</SelectItem>
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Notification activity`}
            htmlFor="entities-notification-activity"
          >
            <Select
              value={draft.hasNotificationActivity || ALL_VALUE}
              onValueChange={(value) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  hasNotificationActivity:
                    value === ALL_VALUE
                      ? ""
                      : (value as EntityFilterDraft["hasNotificationActivity"]),
                }));
              }}
            >
              <SelectTrigger id="entities-notification-activity">
                <SelectValue placeholder={t`All entities`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`All entities`}</SelectItem>
                <SelectItem value="true">
                  {t`Has notification activity`}
                </SelectItem>
                <SelectItem value="false">
                  {t`No notification activity`}
                </SelectItem>
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Failed notifications`}
            htmlFor="entities-failed-notifications"
          >
            <Select
              value={draft.hasFailedNotifications || ALL_VALUE}
              onValueChange={(value) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  hasFailedNotifications:
                    value === ALL_VALUE
                      ? ""
                      : (value as EntityFilterDraft["hasFailedNotifications"]),
                }));
              }}
            >
              <SelectTrigger id="entities-failed-notifications">
                <SelectValue placeholder={t`All entities`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`All entities`}</SelectItem>
                <SelectItem value="true">
                  {t`Has failed notifications`}
                </SelectItem>
                <SelectItem value="false">
                  {t`No failed notifications`}
                </SelectItem>
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField label={t`Rows per page`} htmlFor="entities-limit">
            <Select
              value={String(draft.limit)}
              onValueChange={(value) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  limit: Number(value),
                }));
              }}
            >
              <SelectTrigger id="entities-limit">
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
          {actions}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={() => setAdvancedOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {appliedAdvancedFiltersCount > 0
              ? t`Advanced (${appliedAdvancedFiltersCount})`
              : t`Advanced`}
          </Button>
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

      <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col overflow-hidden border-l border-border/70 bg-background px-0 sm:max-w-3xl"
        >
          <SheetHeader className="shrink-0 space-y-2 border-b border-border/60 px-6 pb-5">
            <SheetTitle className="text-lg font-medium tracking-tight">
              {t`Advanced filters`}
            </SheetTitle>
            <SheetDescription>
              {t`Refine the entity overview with exact interaction and notification criteria.`}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-5">
              <section className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-foreground">
                    {t`Entity filters`}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t`Use these filters when the main overview controls are not specific enough.`}
                  </p>
                </div>

                <div className="space-y-3">
                  <ToolbarField
                    label={t`Interaction`}
                    htmlFor="entities-interaction-id-sheet"
                  >
                    <Select
                      value={draft.interactionId || ALL_VALUE}
                      onValueChange={(value) => {
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          interactionId: value === ALL_VALUE ? "" : value,
                        }));
                      }}
                    >
                      <SelectTrigger id="entities-interaction-id-sheet">
                        <SelectValue placeholder={t`All interactions`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>
                          {t`All interactions`}
                        </SelectItem>
                        {resolvedInteractionTypeOptions.map((option) => (
                          <SelectItem
                            key={option.interactionId}
                            value={option.interactionId}
                          >
                            {option.label?.trim()
                              ? option.label
                              : getCampaignAdminInteractionTypeLabel(
                                  option.interactionId,
                                )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ToolbarField>

                  <ToolbarField
                    label={t`Latest notification type`}
                    htmlFor="entities-latest-notification-type-sheet"
                  >
                    <Select
                      value={draft.latestNotificationType || ALL_VALUE}
                      onValueChange={(value) => {
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          latestNotificationType:
                            value === ALL_VALUE
                              ? ""
                              : (value as CampaignAdminEntityNotificationType),
                        }));
                      }}
                    >
                      <SelectTrigger id="entities-latest-notification-type-sheet">
                        <SelectValue placeholder={t`All types`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>{t`All types`}</SelectItem>
                        {resolvedNotificationTypeOptions.map((notificationType) => (
                          <SelectItem
                            key={notificationType}
                            value={notificationType}
                          >
                            {getCampaignAdminEntityNotificationTypeLabel(
                              notificationType,
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ToolbarField>

                  <ToolbarField
                    label={t`Latest notification status`}
                    htmlFor="entities-latest-notification-status-sheet"
                  >
                    <Select
                      value={draft.latestNotificationStatus || ALL_VALUE}
                      onValueChange={(value) => {
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          latestNotificationStatus:
                            value === ALL_VALUE
                              ? ""
                              : (value as CampaignAdminNotificationStatus),
                        }));
                      }}
                    >
                      <SelectTrigger id="entities-latest-notification-status-sheet">
                        <SelectValue placeholder={t`All statuses`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>
                          {t`All statuses`}
                        </SelectItem>
                        {resolvedStatusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {getCampaignAdminNotificationStatusLabel(status)}
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
                  <h4 className="text-sm font-medium text-foreground">
                    {t`Display options`}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t`Control how the entity table is sorted and paginated.`}
                  </p>
                </div>

                <div className="space-y-3">
                  <ToolbarField label={t`Sort`} htmlFor="entities-sort-sheet">
                    <Select
                      value={getSortValue(draft.sortBy, draft.sortOrder)}
                      onValueChange={(value) => {
                        const [sortBy, sortOrder] = value.split(
                          SORT_SEPARATOR,
                        ) as [CampaignAdminEntitiesSortKey, CampaignAdminSortOrder];
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          sortBy,
                          sortOrder,
                        }));
                      }}
                    >
                      <SelectTrigger id="entities-sort-sheet">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.keys(
                            CAMPAIGN_ADMIN_ENTITIES_SORTABLE_COLUMNS,
                          ) as CampaignAdminEntitiesSortKey[]
                        )
                          .flatMap((sortBy) =>
                            ["asc", "desc"].map((sortOrder) => ({
                              sortBy,
                              sortOrder: sortOrder as CampaignAdminSortOrder,
                            })),
                          )
                          .map(({ sortBy, sortOrder }) => (
                            <SelectItem
                              key={getSortValue(sortBy, sortOrder)}
                              value={getSortValue(sortBy, sortOrder)}
                            >
                              {getSortLabel(sortBy, sortOrder)}
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
                  <h4 className="text-sm font-medium text-foreground">
                    {t`Current entity view`}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {activeFilters.length === 0
                      ? t`Showing the latest entity activity.`
                      : activeFilters.length === 1
                        ? t`1 filter applied`
                        : t`${activeFilters.length} filters applied`}
                  </p>
                </div>

                {activeFilters.length > 0 ? (
                  <div className="rounded-2xl border border-border/60 bg-background/60 px-3">
                    {activeFilters.map((filter) => (
                      <ToolbarInfoRow
                        key={`${filter.label}:${filter.value}`}
                        label={filter.label}
                        value={filter.value}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            </div>
          </div>

          <SheetFooter className="shrink-0 gap-2 border-t border-border/60 bg-background px-6 py-5">
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
              >
                {t`Close`}
              </Button>
            </SheetClose>
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
