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
  CAMPAIGN_ADMIN_NOTIFICATION_SORTABLE_COLUMNS,
  CAMPAIGN_ADMIN_PAGE_LIMIT_VALUES,
  getCampaignAdminNotificationEventTypeLabel,
  getCampaignAdminNotificationSortLabel,
  getCampaignAdminNotificationSourceLabel,
  getCampaignAdminNotificationStatusLabel,
} from "@/features/campaigns/buget/admin/constants";
import {
  createEmptyCampaignAdminNotificationsSearch,
  normalizeCampaignAdminNotificationsSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import type {
  CampaignAdminNotificationsSearch,
  CampaignAdminNotificationEventType,
  CampaignAdminNotificationSortKey,
  CampaignAdminNotificationSource,
  CampaignAdminNotificationStatus,
  CampaignAdminSortOrder,
} from "@/features/campaigns/buget/admin/types";
import { cn } from "@/lib/utils";

const ALL_VALUE = "__all__";
const SORT_SEPARATOR = "::";
const TEMPLATE_ID_SUGGESTIONS_LIST_ID = "notifications-template-id-suggestions";

type CampaignAdminNotificationsToolbarProps = {
  readonly search: CampaignAdminNotificationsSearch;
  readonly isLoading: boolean;
  readonly notificationTypeOptions: readonly string[];
  readonly templateIdOptions: readonly string[];
  readonly embedded?: boolean;
  /** When true, omit the Refresh control (e.g. layout header already refreshes). */
  readonly hideRefresh?: boolean;
  readonly actions?: ReactNode;
  readonly trailingActions?: ReactNode;
  readonly onApply: (search: CampaignAdminNotificationsSearch) => void;
  readonly onReset: (search: CampaignAdminNotificationsSearch) => void;
  readonly onRefresh: () => void;
};

type ActiveFilter = {
  readonly label: string;
  readonly value: string;
  readonly section: "core" | "advanced";
};

type NotificationFilterDraft = {
  readonly notificationType: string;
  readonly templateId: string;
  readonly userId: string;
  readonly status: CampaignAdminNotificationStatus | "";
  readonly eventType: CampaignAdminNotificationEventType | "";
  readonly entityCui: string;
  readonly threadId: string;
  readonly source: CampaignAdminNotificationSource | "";
  readonly sortBy: CampaignAdminNotificationSortKey;
  readonly sortOrder: CampaignAdminSortOrder;
  readonly limit: number;
};

type ToolbarFieldProps = {
  readonly label: string;
  readonly htmlFor?: string;
  readonly children: ReactNode;
  readonly className?: string;
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
  search: CampaignAdminNotificationsSearch,
): NotificationFilterDraft {
  return {
    notificationType: search.notificationType ?? "",
    templateId: search.templateId ?? "",
    userId: search.userId ?? "",
    status: search.status ?? "",
    eventType: search.eventType ?? "",
    entityCui: search.entityCui ?? "",
    threadId: search.threadId ?? "",
    source: search.source ?? "",
    sortBy: search.sortBy ?? "createdAt",
    sortOrder: search.sortOrder ?? "desc",
    limit: search.limit,
  };
}

function buildSearchFromDraft(
  draft: NotificationFilterDraft,
  search: CampaignAdminNotificationsSearch,
): CampaignAdminNotificationsSearch {
  return normalizeCampaignAdminNotificationsSearch({
    tab: search.tab,
    notificationType: draft.notificationType.trim() || undefined,
    templateId: draft.templateId.trim() || undefined,
    userId: draft.userId.trim() || undefined,
    status: draft.status || undefined,
    eventType: draft.eventType || undefined,
    entityCui: draft.entityCui.trim() || undefined,
    threadId: draft.threadId.trim() || undefined,
    source: draft.source || undefined,
    sortBy: draft.sortBy,
    sortOrder: draft.sortOrder,
    limit: draft.limit,
  });
}

function createSearchSignature(
  search: CampaignAdminNotificationsSearch,
): string {
  const { cursor, pageIndex, ...searchWithoutPagination } = search;
  void cursor;
  void pageIndex;

  return JSON.stringify(searchWithoutPagination);
}

function getSortValue(
  sortBy: CampaignAdminNotificationSortKey,
  sortOrder: CampaignAdminSortOrder,
): string {
  return `${sortBy}${SORT_SEPARATOR}${sortOrder}`;
}

function getSortLabel(
  sortBy: CampaignAdminNotificationSortKey,
  sortOrder: CampaignAdminSortOrder,
): string {
  return sortOrder === "asc"
    ? t`${getCampaignAdminNotificationSortLabel(sortBy)} (ascending)`
    : t`${getCampaignAdminNotificationSortLabel(sortBy)} (descending)`;
}

export function CampaignAdminNotificationsToolbar({
  search,
  isLoading,
  notificationTypeOptions,
  templateIdOptions,
  embedded = false,
  hideRefresh = false,
  actions,
  trailingActions,
  onApply,
  onReset,
  onRefresh,
}: CampaignAdminNotificationsToolbarProps) {
  const [draft, setDraft] = useState<NotificationFilterDraft>(
    createDraftFromSearch(search),
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setDraft(createDraftFromSearch(search));
  }, [search]);

  const nextSearch = useMemo(
    () => buildSearchFromDraft(draft, search),
    [draft, search],
  );
  const isDirty =
    createSearchSignature(search) !== createSearchSignature(nextSearch);

  const activeFilters = useMemo<Array<ActiveFilter>>(
    () =>
      [
        search.notificationType
          ? {
              label: t`Notification`,
              value: search.notificationType,
              section: "core" as const,
            }
          : null,
        search.status
          ? {
              label: t`Status`,
              value: getCampaignAdminNotificationStatusLabel(search.status),
              section: "core" as const,
            }
          : null,
        search.eventType
          ? {
              label: t`Event`,
              value: getCampaignAdminNotificationEventTypeLabel(
                search.eventType,
              ),
              section: "core" as const,
            }
          : null,
        search.source
          ? {
              label: t`Source`,
              value: getCampaignAdminNotificationSourceLabel(search.source),
              section: "core" as const,
            }
          : null,
        search.templateId
          ? {
              label: t`Template`,
              value: search.templateId,
              section: "advanced" as const,
            }
          : null,
        search.userId
          ? {
              label: t`User`,
              value: search.userId,
              section: "advanced" as const,
            }
          : null,
        search.entityCui
          ? {
              label: t`Entity`,
              value: search.entityCui,
              section: "advanced" as const,
            }
          : null,
        search.threadId
          ? {
              label: t`Thread`,
              value: search.threadId,
              section: "advanced" as const,
            }
          : null,
      ].filter((value): value is ActiveFilter => value !== null),
    [search],
  );

  const appliedAdvancedFiltersCount = activeFilters.filter(
    (filter) => filter.section === "advanced",
  ).length;

  const handleReset = () => {
    const nextSearch = createEmptyCampaignAdminNotificationsSearch({
      tab: search.tab,
      limit: search.limit,
      currentSearch: search,
    });
    setDraft(createDraftFromSearch(nextSearch));
    onReset(nextSearch);
    setAdvancedOpen(false);
  };

  const handleApply = () => {
    onApply(nextSearch);
    setAdvancedOpen(false);
  };

  const advancedFiltersContent = (
    <div className="space-y-5 px-6 py-6">
      <section className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-foreground">
            {t`Notification filters`}
          </h4>
          <p className="text-xs text-muted-foreground">
            {t`Start with the core filters above, then use these fields for exact identifiers and template details.`}
          </p>
        </div>

        <div className="space-y-3">
          <ToolbarField
            label={t`Template ID`}
            htmlFor="notifications-template-id-sheet"
          >
            <Input
              id="notifications-template-id-sheet"
              value={draft.templateId}
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  templateId: event.currentTarget.value,
                }));
              }}
              placeholder={t`public_debate_campaign_welcome`}
              autoComplete="off"
              spellCheck={false}
              list={
                templateIdOptions.length > 0
                  ? TEMPLATE_ID_SUGGESTIONS_LIST_ID
                  : undefined
              }
            />
            {templateIdOptions.length > 0 ? (
              <datalist id={TEMPLATE_ID_SUGGESTIONS_LIST_ID}>
                {templateIdOptions.map((templateId) => (
                  <option key={templateId} value={templateId} />
                ))}
              </datalist>
            ) : null}
          </ToolbarField>

          <ToolbarField
            label={t`Entity CUI`}
            htmlFor="notifications-entity-cui-sheet"
          >
            <Input
              id="notifications-entity-cui-sheet"
              value={draft.entityCui}
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  entityCui: event.currentTarget.value,
                }));
              }}
              placeholder={t`12345678`}
              autoComplete="off"
              spellCheck={false}
            />
          </ToolbarField>

          <ToolbarField
            label={t`Thread ID`}
            htmlFor="notifications-thread-id-sheet"
          >
            <Input
              id="notifications-thread-id-sheet"
              value={draft.threadId}
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  threadId: event.currentTarget.value,
                }));
              }}
              placeholder={t`thread-123`}
              autoComplete="off"
              spellCheck={false}
            />
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
            {t`Control how the audit table is sorted and paginated.`}
          </p>
        </div>

        <div className="space-y-3">
          <ToolbarField label={t`Sort`} htmlFor="notifications-sort-sheet">
            <Select
              value={getSortValue(draft.sortBy, draft.sortOrder)}
              onValueChange={(value) => {
                const [sortBy, sortOrder] = value.split(SORT_SEPARATOR) as [
                  CampaignAdminNotificationSortKey,
                  CampaignAdminSortOrder,
                ];
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  sortBy,
                  sortOrder,
                }));
              }}
            >
              <SelectTrigger id="notifications-sort-sheet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(
                    CAMPAIGN_ADMIN_NOTIFICATION_SORTABLE_COLUMNS,
                  ) as CampaignAdminNotificationSortKey[]
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

          <ToolbarField
            label={t`Rows per page`}
            htmlFor="notifications-limit-sheet"
          >
            <Select
              value={String(draft.limit)}
              onValueChange={(value) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  limit: Number(value),
                }));
              }}
            >
              <SelectTrigger id="notifications-limit-sheet">
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
      </section>

      <div className="h-px bg-border/60" />

      <section className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-foreground">
            {t`Current audit view`}
          </h4>
          <p className="text-xs text-muted-foreground">
            {activeFilters.length === 0
              ? t`Showing the latest audit entries by creation date.`
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
  );

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
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ToolbarField
            label={t`Notification type`}
            htmlFor="notifications-notification-type"
          >
            <Select
              value={draft.notificationType || ALL_VALUE}
              onValueChange={(value) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  notificationType: value === ALL_VALUE ? "" : value,
                }));
              }}
            >
              <SelectTrigger id="notifications-notification-type">
                <SelectValue placeholder={t`All notification types`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>
                  {t`All notification types`}
                </SelectItem>
                {notificationTypeOptions.map((notificationType) => (
                  <SelectItem key={notificationType} value={notificationType}>
                    {notificationType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField label={t`Status`} htmlFor="notifications-status">
            <Select
              value={draft.status || ALL_VALUE}
              onValueChange={(value) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  status:
                    value === ALL_VALUE
                      ? ""
                      : (value as CampaignAdminNotificationStatus),
                }));
              }}
            >
              <SelectTrigger id="notifications-status">
                <SelectValue placeholder={t`All statuses`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`All statuses`}</SelectItem>
                {[
                  "pending",
                  "composing",
                  "sending",
                  "sent",
                  "delivered",
                  "webhook_timeout",
                  "failed_transient",
                  "failed_permanent",
                  "suppressed",
                  "skipped_unsubscribed",
                  "skipped_no_email",
                ].map((status) => (
                  <SelectItem key={status} value={status}>
                    {getCampaignAdminNotificationStatusLabel(
                      status as CampaignAdminNotificationStatus,
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Event type`}
            htmlFor="notifications-event-type"
          >
            <Select
              value={draft.eventType || ALL_VALUE}
              onValueChange={(value) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  eventType:
                    value === ALL_VALUE
                      ? ""
                      : (value as CampaignAdminNotificationEventType),
                }));
              }}
            >
              <SelectTrigger id="notifications-event-type">
                <SelectValue placeholder={t`All event types`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`All event types`}</SelectItem>
                {[
                  "thread_started",
                  "thread_failed",
                  "reply_received",
                  "reply_reviewed",
                ].map((eventType) => (
                  <SelectItem key={eventType} value={eventType}>
                    {getCampaignAdminNotificationEventTypeLabel(
                      eventType as CampaignAdminNotificationEventType,
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField label={t`Source`} htmlFor="notifications-source">
            <Select
              value={draft.source || ALL_VALUE}
              onValueChange={(value) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  source:
                    value === ALL_VALUE
                      ? ""
                      : (value as CampaignAdminNotificationSource),
                }));
              }}
            >
              <SelectTrigger id="notifications-source">
                <SelectValue placeholder={t`All sources`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`All sources`}</SelectItem>
                {[
                  "campaign_admin",
                  "user_event_worker",
                  "system",
                  "clerk_webhook",
                ].map((source) => (
                  <SelectItem key={source} value={source}>
                    {getCampaignAdminNotificationSourceLabel(
                      source as CampaignAdminNotificationSource,
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField label={t`User ID`} htmlFor="notifications-user-id">
            <Input
              id="notifications-user-id"
              value={draft.userId}
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  userId: event.currentTarget.value,
                }));
              }}
              placeholder={t`user-123`}
              autoComplete="off"
              spellCheck={false}
            />
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
          {hideRefresh ? null : (
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
          )}
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
              {t`Use exact identifiers and display options when the quick filters are not enough.`}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {advancedFiltersContent}
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
