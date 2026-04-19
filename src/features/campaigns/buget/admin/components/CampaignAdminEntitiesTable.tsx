import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, ChevronDown, ChevronUp, MoreHorizontal, SearchX } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CAMPAIGN_ADMIN_ENTITIES_SORTABLE_COLUMNS,
  DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  getCampaignAdminEntityNotificationTypeLabel,
  getCampaignAdminEntitiesSortLabel,
  getCampaignAdminNotificationStatusLabel,
} from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminEntitiesSortKey,
  CampaignAdminEntityListItem,
  CampaignAdminNotificationStatus,
  CampaignAdminSortOrder,
} from "@/features/campaigns/buget/admin/types";
import { buildCampaignPrimariePath } from "@/features/challenges/constants";
import { useTablePreferences } from "@/hooks/useTablePreferences";
import { getUserLocale } from "@/lib/utils";

type CampaignAdminEntitiesTableProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly items: readonly CampaignAdminEntityListItem[];
  readonly header?: (input: {
    readonly actions: ReactNode;
    readonly trailingActions: ReactNode;
  }) => ReactNode;
  readonly footer?: ReactNode;
  readonly tablePreferencesKey?: string;
  readonly defaultVisibleColumnIds?: readonly OptionalColumnId[];
  readonly sortBy?: CampaignAdminEntitiesSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onCopyRows?: () => Promise<void> | void;
  readonly onExportCsv?: () => Promise<void> | void;
  readonly onSortChange?: (
    sortBy: CampaignAdminEntitiesSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => void;
  readonly onClearFilters: () => void;
};

type OptionalColumnId =
  | "users"
  | "interactions"
  | "notifications"
  | "latestActivity"
  | "latestNotification"
  | "publicPage";

const ALL_OPTIONAL_COLUMN_IDS: readonly OptionalColumnId[] = [
  "users",
  "interactions",
  "notifications",
  "latestActivity",
  "latestNotification",
  "publicPage",
] as const;

const DEFAULT_VISIBLE_COLUMN_IDS: readonly OptionalColumnId[] = [
  "users",
  "interactions",
  "notifications",
  "latestActivity",
  "latestNotification",
] as const;

function formatDateTime(value: string | null): string {
  if (value === null) {
    return t`Unavailable`;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return t`Unavailable`;
  }

  const locale = getUserLocale() === "en" ? "en-US" : "ro-RO";
  return parsedDate.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SortableHeaderButton({
  sortKey,
  sortBy,
  sortOrder,
  onSortChange,
  children,
}: {
  readonly sortKey: CampaignAdminEntitiesSortKey;
  readonly sortBy?: CampaignAdminEntitiesSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onSortChange: (
    sortBy: CampaignAdminEntitiesSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => void;
  readonly children: ReactNode;
}) {
  const columnConfig = CAMPAIGN_ADMIN_ENTITIES_SORTABLE_COLUMNS[sortKey];
  const sortLabel = getCampaignAdminEntitiesSortLabel(sortKey);
  const isActive = sortBy === sortKey && sortOrder !== undefined;

  const handleClick = () => {
    const nextSortOrder =
      isActive && sortOrder === "asc"
        ? "desc"
        : isActive && sortOrder === "desc"
          ? "asc"
          : columnConfig.defaultOrder;

    onSortChange(sortKey, nextSortOrder);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center gap-1 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      aria-label={t`${sortLabel} sort`}
    >
      <span className="flex min-w-0 items-center gap-1">{children}</span>
      {isActive ? (
        sortOrder === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function SortableTableHead({
  sortKey,
  sortBy,
  sortOrder,
  onSortChange,
  children,
}: {
  readonly sortKey: CampaignAdminEntitiesSortKey;
  readonly sortBy?: CampaignAdminEntitiesSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onSortChange?: (
    sortBy: CampaignAdminEntitiesSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => void;
  readonly children: ReactNode;
}) {
  return (
    <TableHead className="sticky top-0 z-10 bg-card text-xs font-medium text-muted-foreground">
      {onSortChange ? (
        <SortableHeaderButton
          sortKey={sortKey}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={onSortChange}
        >
          {children}
        </SortableHeaderButton>
      ) : (
        children
      )}
    </TableHead>
  );
}

function NotificationStatusBadge({
  status,
}: {
  readonly status: CampaignAdminNotificationStatus | null;
}) {
  if (status === null) {
    return (
      <span className="text-sm text-muted-foreground">{t`Unavailable`}</span>
    );
  }

  const className =
    status === "delivered" || status === "sent"
      ? "border-emerald-300 bg-emerald-100 text-emerald-950"
      : status === "failed_transient" ||
          status === "failed_permanent" ||
          status === "webhook_timeout"
        ? "border-rose-300 bg-rose-100 text-rose-950"
        : status === "suppressed" ||
            status === "skipped_unsubscribed" ||
            status === "skipped_no_email"
          ? "border-slate-300 bg-slate-100 text-slate-900"
          : "border-amber-300 bg-amber-100 text-amber-950";

  return (
    <Badge variant="outline" className={className}>
      {getCampaignAdminNotificationStatusLabel(status)}
    </Badge>
  );
}

function EntityCell({
  item,
}: {
  readonly item: CampaignAdminEntityListItem;
}) {
  const displayName = item.entityName?.trim() || item.entityCui;

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{displayName}</p>
      <p className="font-mono text-xs text-muted-foreground">{item.entityCui}</p>
    </div>
  );
}

function createEntityInteractionsRouteSearch(entityCui: string) {
  return {
    phase: undefined,
    reviewStatusMode: undefined,
    reviewStatus: undefined,
    interactionId: undefined,
    lessonId: undefined,
    entityCui,
    scopeType: undefined,
    payloadKind: undefined,
    submissionPath: undefined,
    userId: undefined,
    recordKey: undefined,
    recordKeyPrefix: undefined,
    submittedAtFrom: undefined,
    submittedAtTo: undefined,
    updatedAtFrom: undefined,
    updatedAtTo: undefined,
    hasInstitutionThread: undefined,
    threadPhase: undefined,
    sortBy: undefined,
    sortOrder: undefined,
    reviewSelectionKey: undefined,
    cursor: undefined,
    pageIndex: undefined,
    limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  };
}

function createEntityNotificationsRouteSearch(entityCui: string) {
  return {
    tab: "audit" as const,
    notificationType: undefined,
    templateId: undefined,
    userId: undefined,
    status: undefined,
    eventType: undefined,
    entityCui,
    threadId: undefined,
    source: undefined,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
    runNotificationType: undefined,
    runConditions: undefined,
    previewId: undefined,
    previewCursor: undefined,
    previewPageIndex: undefined,
    previewTrail: undefined,
    previewFilter: undefined,
    cursor: undefined,
    pageIndex: undefined,
    limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  };
}

function createEntityUsersRouteSearch(entityCui: string) {
  return {
    query: undefined,
    entityCui,
    sortBy: "latestUpdatedAt" as const,
    sortOrder: "desc" as const,
    cursor: undefined,
    pageIndex: undefined,
    limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  };
}

function createEntityDetailsRouteSearch() {
  return {
    tab: "overview" as const,
    query: undefined,
    interactionId: undefined,
    hasPendingReviews: undefined,
    hasSubscribers: undefined,
    hasNotificationActivity: undefined,
    hasFailedNotifications: undefined,
    latestNotificationType: undefined,
    latestNotificationStatus: undefined,
    sortBy: undefined,
    sortOrder: undefined,
    cursor: undefined,
    pageIndex: undefined,
    limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
    configEntityCui: undefined,
    configUpdatedAtFrom: undefined,
    configUpdatedAtTo: undefined,
    configSortBy: undefined,
    configSortOrder: undefined,
    configCursor: undefined,
    configPageIndex: undefined,
    configLimit: undefined,
    selectedEntityCui: undefined,
    configCreate: undefined,
    threadsStateGroup: undefined,
    threadsThreadState: undefined,
    threadsResponseStatus: undefined,
    threadsQuery: undefined,
    threadsEntityCui: undefined,
    threadsUpdatedAtFrom: undefined,
    threadsUpdatedAtTo: undefined,
    threadsLatestResponseAtFrom: undefined,
    threadsLatestResponseAtTo: undefined,
    threadsSelectedThreadId: undefined,
    threadsCursor: undefined,
    threadsPageIndex: undefined,
    threadsLimit: undefined,
  };
}

export function CampaignAdminEntitiesTable({
  campaignKey,
  items,
  header,
  footer,
  tablePreferencesKey,
  defaultVisibleColumnIds = DEFAULT_VISIBLE_COLUMN_IDS,
  sortBy,
  sortOrder,
  onCopyRows,
  onExportCsv,
  onSortChange,
  onClearFilters,
}: CampaignAdminEntitiesTableProps) {
  const { columnVisibility, setColumnVisibility } = useTablePreferences(
    tablePreferencesKey ?? `campaign-admin-entities:${campaignKey}`,
    {
      columnVisibility: Object.fromEntries(
        ALL_OPTIONAL_COLUMN_IDS.map((columnId) => [
          columnId,
          defaultVisibleColumnIds.includes(columnId),
        ]),
      ),
    },
  );

  const columnOptions: ReadonlyArray<{
    readonly id: OptionalColumnId;
    readonly label: string;
  }> = [
    { id: "users", label: t`Users` },
    { id: "interactions", label: t`Interactions` },
    { id: "notifications", label: t`Notifications` },
    { id: "latestActivity", label: t`Latest activity` },
    { id: "latestNotification", label: t`Latest notification` },
    { id: "publicPage", label: t`Public page` },
  ];

  const isColumnVisible = (columnId: OptionalColumnId): boolean =>
    columnVisibility[columnId] ?? defaultVisibleColumnIds.includes(columnId);
  const tableMenuLabel = t`Table actions`;

  const toggleColumn = (columnId: OptionalColumnId, checked: boolean) => {
    setColumnVisibility((current: Record<string, boolean>) => ({
      ...current,
      [columnId]: checked,
    }));
  };

  if (items.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-6 shadow-none">
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title={t`No entities matched the current filters`}
          description={t`Try broadening the entity search or clear the current filters.`}
          className="rounded-2xl border-border/70 bg-background/30"
        />
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={onClearFilters}>
            {t`Clear filters`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-none">
        {header ? (
          <div className="px-4 py-4">
            {header({
              actions: (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full px-3"
                    >
                      {t`Columns`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {columnOptions.map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={isColumnVisible(column.id)}
                        onCheckedChange={(checked) =>
                          toggleColumn(column.id, checked === true)
                        }
                      >
                        {column.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
              trailingActions:
                onCopyRows || onExportCsv ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        aria-label={tableMenuLabel}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onCopyRows ? (
                        <DropdownMenuItem onSelect={() => { void onCopyRows(); }}>
                          {t`Copy rows`}
                        </DropdownMenuItem>
                      ) : null}
                      {onExportCsv ? (
                        <DropdownMenuItem onSelect={() => { void onExportCsv(); }}>
                          {t`Export CSV`}
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null,
            })}
          </div>
        ) : null}

        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 ${
            header ? "hidden" : ""
          }`}
        >
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t`${items.length} visible`}
          </p>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full px-3"
                >
                  {t`Columns`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {columnOptions.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={isColumnVisible(column.id)}
                    onCheckedChange={(checked) =>
                      toggleColumn(column.id, checked === true)
                    }
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {onCopyRows || onExportCsv ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label={tableMenuLabel}
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onCopyRows ? (
                    <DropdownMenuItem onSelect={() => { void onCopyRows(); }}>
                      {t`Copy rows`}
                    </DropdownMenuItem>
                  ) : null}
                  {onExportCsv ? (
                    <DropdownMenuItem onSelect={() => { void onExportCsv(); }}>
                      {t`Export CSV`}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table
            containerClassName="max-h-[min(70vh,42rem)]"
            className="min-w-[1120px] [&_td]:px-3 [&_td]:py-3"
          >
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortableTableHead
                  sortKey="entityCui"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={onSortChange}
                >
                  {t`Entity`}
                </SortableTableHead>
                {isColumnVisible("users") ? (
                  <SortableTableHead
                    sortKey="userCount"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Users`}
                  </SortableTableHead>
                ) : null}
                {isColumnVisible("interactions") ? (
                  <SortableTableHead
                    sortKey="interactionCount"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Interactions`}
                  </SortableTableHead>
                ) : null}
                {isColumnVisible("notifications") ? (
                  <SortableTableHead
                    sortKey="notificationOutboxCount"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Notifications`}
                  </SortableTableHead>
                ) : null}
                {isColumnVisible("latestActivity") ? (
                  <SortableTableHead
                    sortKey="latestInteractionAt"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Latest activity`}
                  </SortableTableHead>
                ) : null}
                {isColumnVisible("latestNotification") ? (
                  <SortableTableHead
                    sortKey="latestNotificationAt"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Latest notification`}
                  </SortableTableHead>
                ) : null}
                {isColumnVisible("publicPage") ? (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    {t`Public page`}
                  </TableHead>
                ) : null}
                <TableHead className="sticky right-0 z-10 bg-card text-right text-xs font-medium text-muted-foreground">
                  {t`Actions`}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.entityCui}>
                  <TableCell>
                    <EntityCell item={item} />
                  </TableCell>
                  {isColumnVisible("users") ? (
                    <TableCell className="tabular-nums text-sm">
                      {item.userCount}
                    </TableCell>
                  ) : null}
                  {isColumnVisible("interactions") ? (
                    <TableCell className="space-y-1 text-sm">
                      <p className="tabular-nums text-foreground">
                        {item.interactionCount}
                      </p>
                      {item.pendingReviewCount > 0 ? (
                        <Badge variant="warning" className="tabular-nums">
                          {t`${item.pendingReviewCount} pending`}
                        </Badge>
                      ) : (
                        <p className="tabular-nums text-xs text-muted-foreground">
                          {t`0 pending`}
                        </p>
                      )}
                    </TableCell>
                  ) : null}
                  {isColumnVisible("notifications") ? (
                    <TableCell className="space-y-1 text-sm">
                      <p className="tabular-nums text-foreground">
                        {t`${item.notificationSubscriberCount} subscribers`}
                      </p>
                      <p className="tabular-nums text-muted-foreground">
                        {t`${item.notificationOutboxCount} outbox`}
                      </p>
                      {item.hasFailedNotifications ? (
                        <Badge
                          variant="outline"
                          className="border-rose-300 bg-rose-100 text-rose-950"
                        >
                          {t`Failures present`}
                        </Badge>
                      ) : null}
                    </TableCell>
                  ) : null}
                  {isColumnVisible("latestActivity") ? (
                    <TableCell className="space-y-1 text-sm">
                      <p className="text-foreground">
                        {formatDateTime(item.latestInteractionAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(item.latestNotificationAt)}
                      </p>
                    </TableCell>
                  ) : null}
                  {isColumnVisible("latestNotification") ? (
                    <TableCell className="space-y-1 text-sm">
                      <p className="text-foreground">
                        {getCampaignAdminEntityNotificationTypeLabel(
                          item.latestNotificationType,
                        )}
                      </p>
                      <NotificationStatusBadge
                        status={item.latestNotificationStatus}
                      />
                    </TableCell>
                  ) : null}
                  {isColumnVisible("publicPage") ? (
                    <TableCell className="text-sm">
                      <Button asChild type="button" variant="outline" size="sm">
                        <a
                          href={buildCampaignPrimariePath(item.entityCui)}
                          aria-label={t`Open entity page for ${item.entityCui}`}
                        >
                          {t`Open`}
                        </a>
                      </Button>
                    </TableCell>
                  ) : null}
                  <TableCell className="sticky right-0 z-10 bg-card text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link
                          to="/admin/campaigns/$campaignKey/entities/$entityCui"
                          params={{
                            campaignKey,
                            entityCui: item.entityCui,
                          }}
                          search={createEntityDetailsRouteSearch()}
                        >
                          {t`Details`}
                        </Link>
                      </Button>
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link
                          to="/admin/campaigns/$campaignKey/users"
                          params={{ campaignKey }}
                          search={createEntityUsersRouteSearch(item.entityCui)}
                        >
                          {t`Users`}
                        </Link>
                      </Button>
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link
                          to="/admin/campaigns/$campaignKey/user-interactions"
                          params={{ campaignKey }}
                          search={createEntityInteractionsRouteSearch(
                            item.entityCui,
                          )}
                        >
                          {t`Interactions`}
                        </Link>
                      </Button>
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link
                          to="/admin/campaigns/$campaignKey/notifications"
                          params={{ campaignKey }}
                          search={createEntityNotificationsRouteSearch(
                            item.entityCui,
                          )}
                        >
                          {t`Notifications`}
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {footer ? (
          <div className="border-t border-border/60 bg-muted/30 px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </>
  );
}
