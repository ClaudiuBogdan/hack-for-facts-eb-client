import type { ReactNode } from "react";
import { ArrowUpDown, ChevronDown, ChevronUp, SearchX } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
  CAMPAIGN_ADMIN_NOTIFICATION_SORTABLE_COLUMNS,
  getCampaignAdminInstitutionThreadResponseStatusLabel,
  getCampaignAdminNotificationEventTypeLabel,
  getCampaignAdminNotificationProjectionLabel,
  getCampaignAdminNotificationSafeErrorCategoryLabel,
  getCampaignAdminNotificationSortLabel,
  getCampaignAdminNotificationSourceLabel,
  getCampaignAdminNotificationStatusLabel,
} from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminNotificationListItem,
  CampaignAdminNotificationSortKey,
  CampaignAdminSortOrder,
} from "@/features/campaigns/buget/admin/types";
import { formatCampaignAdminUserIdPreview } from "@/features/campaigns/buget/admin/utils/format-user-id-preview";
import { useTablePreferences } from "@/hooks/useTablePreferences";
import { getUserLocale } from "@/lib/utils";

type CampaignAdminNotificationsTableProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly items: readonly CampaignAdminNotificationListItem[];
  readonly header?: (input: {
    readonly actions: ReactNode;
    readonly trailingActions: ReactNode;
  }) => ReactNode;
  readonly footer?: ReactNode;
  readonly tablePreferencesKey?: string;
  readonly defaultVisibleColumnIds?: readonly OptionalColumnId[];
  readonly sortBy?: CampaignAdminNotificationSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onSortChange?: (
    sortBy: CampaignAdminNotificationSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => void;
  readonly onClearFilters: () => void;
  readonly onPreviewTemplate: (templateId: string) => void;
};

type OptionalColumnId =
  | "notificationKind"
  | "template"
  | "entity"
  | "user"
  | "threadEvent"
  | "attempts"
  | "safeError"
  | "details";

const ALL_OPTIONAL_COLUMN_IDS: readonly OptionalColumnId[] = [
  "notificationKind",
  "template",
  "entity",
  "user",
  "threadEvent",
  "attempts",
  "safeError",
  "details",
] as const;

const DEFAULT_VISIBLE_COLUMN_IDS: readonly OptionalColumnId[] = [
  "notificationKind",
  "template",
  "entity",
  "user",
  "threadEvent",
  "attempts",
  "safeError",
  "details",
] as const;

function SortableHeaderButton({
  sortKey,
  sortBy,
  sortOrder,
  onSortChange,
  children,
}: {
  readonly sortKey: CampaignAdminNotificationSortKey;
  readonly sortBy?: CampaignAdminNotificationSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onSortChange: (
    sortBy: CampaignAdminNotificationSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => void;
  readonly children: ReactNode;
}) {
  const columnConfig = CAMPAIGN_ADMIN_NOTIFICATION_SORTABLE_COLUMNS[sortKey];
  const sortLabel = getCampaignAdminNotificationSortLabel(sortKey);
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
  readonly sortKey: CampaignAdminNotificationSortKey;
  readonly sortBy?: CampaignAdminNotificationSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onSortChange?: (
    sortBy: CampaignAdminNotificationSortKey,
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

function NotificationStatusBadge({
  status,
}: {
  readonly status: CampaignAdminNotificationListItem["status"];
}) {
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

function SafeErrorCell({
  item,
}: {
  readonly item: CampaignAdminNotificationListItem;
}) {
  if (item.safeError.category === null && item.safeError.code === null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div className="space-y-1">
      {item.safeError.category !== null ? (
        <Badge variant="outline" className="max-w-full truncate rounded-full">
          {getCampaignAdminNotificationSafeErrorCategoryLabel(
            item.safeError.category,
          )}
        </Badge>
      ) : null}
      {item.safeError.code !== null ? (
        <p className="font-mono text-xs text-muted-foreground">
          {item.safeError.code}
        </p>
      ) : null}
    </div>
  );
}

function EntityCell({
  item,
}: {
  readonly item: CampaignAdminNotificationListItem;
}) {
  const entityName =
    "entityName" in item.projection ? item.projection.entityName?.trim() : null;
  const entityCui = item.projection.entityCui;

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">
        {entityName || entityCui}
      </p>
      <p className="font-mono text-xs text-muted-foreground">{entityCui}</p>
    </div>
  );
}

function ThreadEventCell({
  item,
}: {
  readonly item: CampaignAdminNotificationListItem;
}) {
  switch (item.projection.kind) {
    case "public_debate_entity_update":
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {getCampaignAdminNotificationEventTypeLabel(
              item.projection.eventType,
            )}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {item.projection.threadId}
          </p>
          {item.projection.phase ? (
            <p className="text-xs text-muted-foreground">
              {item.projection.phase}
            </p>
          ) : null}
          {item.projection.triggerSource ? (
            <p className="text-xs text-muted-foreground">
              {getCampaignAdminNotificationSourceLabel(
                item.projection.triggerSource,
              )}
            </p>
          ) : null}
        </div>
      );
    case "public_debate_admin_response":
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {getCampaignAdminInstitutionThreadResponseStatusLabel(
              item.projection.responseStatus,
            )}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {item.projection.threadId}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.projection.recipientRole === "requester"
              ? t`Requester audience`
              : t`Subscriber audience`}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(item.projection.responseDate)}
          </p>
          {item.projection.triggerSource ? (
            <p className="text-xs text-muted-foreground">
              {getCampaignAdminNotificationSourceLabel(
                item.projection.triggerSource,
              )}
            </p>
          ) : null}
        </div>
      );
    case "public_debate_admin_failure":
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{t`Admin failure`}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {item.projection.threadId}
          </p>
          {item.projection.phase ? (
            <p className="text-xs text-muted-foreground">
              {item.projection.phase}
            </p>
          ) : null}
        </div>
      );
    case "public_debate_campaign_welcome":
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {t`Terms accepted`}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.projection.acceptedTermsAt
              ? formatDateTime(item.projection.acceptedTermsAt)
              : t`Unavailable`}
          </p>
          <p className="text-xs text-muted-foreground">
            {getCampaignAdminNotificationSourceLabel(
              item.projection.triggerSource,
            )}
          </p>
        </div>
      );
    case "public_debate_entity_subscription":
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {t`Entity subscription`}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.projection.selectedEntitiesCount === null
              ? t`Selected entities unavailable`
              : t`${item.projection.selectedEntitiesCount} selected entities`}
          </p>
          <p className="text-xs text-muted-foreground">
            {getCampaignAdminNotificationSourceLabel(
              item.projection.triggerSource,
            )}
          </p>
        </div>
      );
    case "admin_reviewed_interaction":
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {item.projection.reviewStatus === "approved"
              ? t`Review approved`
              : t`Review rejected`}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {item.projection.interactionLabel?.trim() ||
              item.projection.interactionId}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(item.projection.reviewedAt)}
          </p>
          {item.projection.triggerSource ? (
            <p className="text-xs text-muted-foreground">
              {getCampaignAdminNotificationSourceLabel(
                item.projection.triggerSource,
              )}
            </p>
          ) : null}
        </div>
      );
    default:
      return <span className="text-sm text-muted-foreground">—</span>;
  }
}

function UserCell({
  campaignKey,
  item,
}: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly item: CampaignAdminNotificationListItem;
}) {
  const userId = "userId" in item.projection ? item.projection.userId : null;

  if (userId === null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div className="space-y-1">
      <a
        href={`/admin/campaigns/${campaignKey}/users/${encodeURIComponent(userId)}`}
        title={userId}
        className="font-mono text-xs text-foreground hover:underline"
      >
        {formatCampaignAdminUserIdPreview(userId)}
      </a>
      <p className="font-mono text-[11px] text-muted-foreground">{userId}</p>
    </div>
  );
}

function NotificationKindCell({
  item,
}: {
  readonly item: CampaignAdminNotificationListItem;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">
        {getCampaignAdminNotificationProjectionLabel(item.projection.kind)}
      </p>
      <p className="font-mono text-xs text-muted-foreground">
        {item.notificationType}
      </p>
    </div>
  );
}

function TemplateCell({
  item,
}: {
  readonly item: CampaignAdminNotificationListItem;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">
        {item.templateName?.trim() || item.templateId || t`Unavailable`}
      </p>
      <p className="font-mono text-xs text-muted-foreground">
        {item.templateId ?? t`No template ID`}
      </p>
      {item.templateVersion ? (
        <p className="text-xs text-muted-foreground">
          {t`Version ${item.templateVersion}`}
        </p>
      ) : null}
    </div>
  );
}

function DetailsCell({
  item,
  onPreviewTemplate,
}: {
  readonly item: CampaignAdminNotificationListItem;
  readonly onPreviewTemplate: (templateId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-xs text-muted-foreground">{item.outboxId}</p>
      {item.projection.kind === "admin_reviewed_interaction" ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="font-mono">{item.projection.recordKey}</p>
          <p>
            {item.projection.hasFeedbackText
              ? t`Includes review feedback`
              : t`No review feedback`}
          </p>
          <p>
            {item.projection.nextStepCount === 1
              ? t`1 next step link`
              : t`${item.projection.nextStepCount} next step links`}
          </p>
        </div>
      ) : null}
      {item.sentAt ? (
        <p className="text-xs text-muted-foreground">
          {t`Sent ${formatDateTime(item.sentAt)}`}
        </p>
      ) : null}
      {item.templateId ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onPreviewTemplate(item.templateId!);
          }}
        >
          {t`Preview template`}
        </Button>
      ) : null}
    </div>
  );
}

export function CampaignAdminNotificationsTable({
  campaignKey,
  items,
  header,
  footer,
  tablePreferencesKey,
  defaultVisibleColumnIds = DEFAULT_VISIBLE_COLUMN_IDS,
  sortBy,
  sortOrder,
  onSortChange,
  onClearFilters,
  onPreviewTemplate,
}: CampaignAdminNotificationsTableProps) {
  const { columnVisibility, setColumnVisibility } = useTablePreferences(
    tablePreferencesKey ?? `campaign-admin-notifications:${campaignKey}`,
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
    { id: "notificationKind", label: t`Notification kind` },
    { id: "template", label: t`Template` },
    { id: "entity", label: t`Entity` },
    { id: "user", label: t`User` },
    { id: "threadEvent", label: t`Thread / event` },
    { id: "attempts", label: t`Attempts` },
    { id: "safeError", label: t`Safe error` },
    { id: "details", label: t`Details` },
  ];

  const isColumnVisible = (columnId: OptionalColumnId): boolean =>
    columnVisibility[columnId] ?? defaultVisibleColumnIds.includes(columnId);

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
          title={t`No data available`}
          description={t`No campaign notification events matched the current filters.`}
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
              trailingActions: null,
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table
            containerClassName="max-h-[min(70vh,42rem)]"
            className="min-w-[1080px] [&_td]:px-3 [&_td]:py-3"
          >
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortableTableHead
                  sortKey="createdAt"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={onSortChange}
                >
                  {t`Created`}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="status"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={onSortChange}
                >
                  {t`Status`}
                </SortableTableHead>
                {isColumnVisible("notificationKind") ? (
                  <TableHead className="sticky top-0 z-10 bg-card text-xs font-medium text-muted-foreground">
                    {t`Notification kind`}
                  </TableHead>
                ) : null}
                {isColumnVisible("template") ? (
                  <TableHead className="sticky top-0 z-10 bg-card text-xs font-medium text-muted-foreground">
                    {t`Template`}
                  </TableHead>
                ) : null}
                {isColumnVisible("entity") ? (
                  <TableHead className="sticky top-0 z-10 bg-card text-xs font-medium text-muted-foreground">
                    {t`Entity`}
                  </TableHead>
                ) : null}
                {isColumnVisible("user") ? (
                  <TableHead className="sticky top-0 z-10 bg-card text-xs font-medium text-muted-foreground">
                    {t`User`}
                  </TableHead>
                ) : null}
                {isColumnVisible("threadEvent") ? (
                  <TableHead className="sticky top-0 z-10 bg-card text-xs font-medium text-muted-foreground">
                    {t`Thread / event`}
                  </TableHead>
                ) : null}
                {isColumnVisible("attempts") ? (
                  <SortableTableHead
                    sortKey="attemptCount"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Attempts`}
                  </SortableTableHead>
                ) : null}
                {isColumnVisible("safeError") ? (
                  <TableHead className="sticky top-0 z-10 bg-card text-xs font-medium text-muted-foreground">
                    {t`Safe error`}
                  </TableHead>
                ) : null}
                {isColumnVisible("details") ? (
                  <SortableTableHead
                    sortKey="sentAt"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Details`}
                  </SortableTableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.outboxId}
                  className="group hover:bg-muted/30"
                >
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </TableCell>
                  <TableCell>
                    <NotificationStatusBadge status={item.status} />
                  </TableCell>
                  {isColumnVisible("notificationKind") ? (
                    <TableCell>
                      <NotificationKindCell item={item} />
                    </TableCell>
                  ) : null}
                  {isColumnVisible("template") ? (
                    <TableCell>
                      <TemplateCell item={item} />
                    </TableCell>
                  ) : null}
                  {isColumnVisible("entity") ? (
                    <TableCell>
                      <EntityCell item={item} />
                    </TableCell>
                  ) : null}
                  {isColumnVisible("user") ? (
                    <TableCell>
                      <UserCell campaignKey={campaignKey} item={item} />
                    </TableCell>
                  ) : null}
                  {isColumnVisible("threadEvent") ? (
                    <TableCell>
                      <ThreadEventCell item={item} />
                    </TableCell>
                  ) : null}
                  {isColumnVisible("attempts") ? (
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground tabular-nums">
                          {item.attemptCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t`Attempts`}
                        </p>
                      </div>
                    </TableCell>
                  ) : null}
                  {isColumnVisible("safeError") ? (
                    <TableCell>
                      <SafeErrorCell item={item} />
                    </TableCell>
                  ) : null}
                  {isColumnVisible("details") ? (
                    <TableCell>
                      <DetailsCell
                        item={item}
                        onPreviewTemplate={onPreviewTemplate}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {footer ? (
          <div className="border-t border-border/60 bg-background/40 px-4 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </>
  );
}
