import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  CircleSlash2,
  Clock3,
  MessageSquare,
  MoreHorizontal,
  XCircle,
} from "lucide-react";
import { t } from "@lingui/core/macro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  CAMPAIGN_ADMIN_USER_INTERACTIONS_SORTABLE_COLUMNS,
  buildCampaignAdminSelectionKey,
  getCampaignAdminInteractionTypeLabel,
  getCampaignAdminReviewStatusLabel,
  getCampaignAdminRiskFlagLabel,
  getCampaignAdminThreadPhaseLabel,
  getCampaignAdminUserInteractionsSortLabel,
  isCampaignAdminUserInteractionsLocalSortKey,
} from "@/features/campaigns/buget/admin/constants";
import type { CampaignAdminToggleUserInteractionSelectionInput } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-interaction-selection";
import { normalizeCampaignAdminUserPageSearch } from "@/features/campaigns/buget/admin/schemas/search-schema";
import { createCampaignAdminEntityDetailRouteSearch } from "@/features/campaigns/buget/admin/utils/create-campaign-admin-entity-detail-route-search";
import { formatCampaignAdminUserIdPreview } from "@/features/campaigns/buget/admin/utils/format-user-id-preview";
import { getCampaignAdminPrimaryValue } from "@/features/campaigns/buget/admin/utils/payload-summary";
import { resolveSafeCampaignAdminHref } from "@/features/campaigns/buget/admin/utils/resolve-safe-campaign-admin-href";
import { sortCampaignAdminUserInteractionItems } from "@/features/campaigns/buget/admin/utils/sort-campaign-admin-user-interactions";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminSortOrder,
  CampaignAdminStagedReviewDraft,
  CampaignAdminUserInteractionListItem,
  CampaignAdminUserInteractionsSortKey,
} from "@/features/campaigns/buget/admin/types";
import { useTablePreferences } from "@/hooks/useTablePreferences";
import { buildEntityDetailsPath } from "@/lib/entity-navigation";
import { cn, getUserLocale } from "@/lib/utils";

const campaignAdminUserWorkspaceDefaultLinkSearch =
  normalizeCampaignAdminUserPageSearch({});

type CampaignAdminUserInteractionsTableProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  /** When true, omit outer border/rounded panel for use inside a parent Card (e.g. user workspace). */
  readonly flushChrome?: boolean;
  readonly items: readonly CampaignAdminUserInteractionListItem[];
  readonly stagedDraftsByKey: Readonly<
    Record<string, CampaignAdminStagedReviewDraft>
  >;
  readonly selectedKeys: ReadonlySet<string>;
  readonly isLoading: boolean;
  readonly header?: (input: {
    readonly actions: ReactNode;
    readonly trailingActions: ReactNode;
  }) => ReactNode;
  readonly footer?: ReactNode;
  readonly tablePreferencesKey?: string;
  readonly defaultVisibleColumnIds?: readonly OptionalColumnId[];
  readonly renderItemActions?: (
    item: CampaignAdminUserInteractionListItem,
  ) => ReactNode;
  readonly sortBy?: CampaignAdminUserInteractionsSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onCopyRows: () => Promise<void> | void;
  readonly onExportCsv?: () => Promise<void> | void;
  readonly onSortChange: (
    sortBy: CampaignAdminUserInteractionsSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => void;
  readonly onToggleSelectAll: (checked: boolean) => void;
  readonly onToggleSelection: (
    input: CampaignAdminToggleUserInteractionSelectionInput,
  ) => void;
  readonly onToggleSendNotification: (
    item: CampaignAdminUserInteractionListItem,
    sendNotification: boolean,
  ) => void;
  readonly onOpenItem: (item: CampaignAdminUserInteractionListItem) => void;
};

type OptionalColumnId =
  | "userId"
  | "association"
  | "updated"
  | "riskFlags"
  | "message"
  | "interaction"
  | "value"
  | "reviewState"
  | "notify"
  | "reviewNote"
  | "reviewedBy";

const ALL_OPTIONAL_COLUMN_IDS: readonly OptionalColumnId[] = [
  "userId",
  "association",
  "updated",
  "riskFlags",
  "message",
  "interaction",
  "value",
  "reviewState",
  "notify",
  "reviewNote",
  "reviewedBy",
] as const;

const DEFAULT_VISIBLE_COLUMN_IDS: readonly OptionalColumnId[] = [
  "userId",
  "updated",
  "riskFlags",
  "message",
  "interaction",
  "value",
  "reviewState",
  "notify",
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
  readonly sortKey: CampaignAdminUserInteractionsSortKey;
  readonly sortBy?: CampaignAdminUserInteractionsSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onSortChange: (
    sortBy: CampaignAdminUserInteractionsSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => void;
  readonly children: ReactNode;
}) {
  const columnConfig =
    CAMPAIGN_ADMIN_USER_INTERACTIONS_SORTABLE_COLUMNS[sortKey];
  const sortLabel = getCampaignAdminUserInteractionsSortLabel(sortKey);
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

function isSelectable(item: CampaignAdminUserInteractionListItem): boolean {
  return item.reviewStatus === "pending";
}

function ReviewStatusBadge({
  reviewStatus,
}: {
  readonly reviewStatus: CampaignAdminUserInteractionListItem["reviewStatus"];
}) {
  const presentation =
    reviewStatus === "approved"
      ? {
          icon: CheckCircle2,
          className:
            "gap-1.5 border-emerald-300 bg-emerald-100 text-emerald-950",
        }
      : reviewStatus === "rejected"
        ? {
            icon: XCircle,
            className: "gap-1.5 border-rose-300 bg-rose-100 text-rose-950",
          }
        : reviewStatus === "pending"
          ? {
              icon: Clock3,
              className:
                "gap-1.5 border-amber-300 bg-amber-200/80 text-amber-950",
            }
          : {
              icon: CircleSlash2,
              className: "gap-1.5 border-slate-300 bg-slate-100 text-slate-800",
            };
  const Icon = presentation.icon;

  return (
    <Badge variant="outline" className={presentation.className}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {getCampaignAdminReviewStatusLabel(reviewStatus)}
    </Badge>
  );
}

function StagedReviewStateBadge({
  status,
}: {
  readonly status: CampaignAdminStagedReviewDraft["status"];
}) {
  const presentation =
    status === "approved"
      ? {
          icon: CheckCircle2,
          className:
            "gap-1.5 border-emerald-300 bg-emerald-100 text-emerald-950",
        }
      : {
          icon: XCircle,
          className: "gap-1.5 border-rose-300 bg-rose-100 text-rose-950",
        };
  const Icon = presentation.icon;

  return (
    <Badge variant="outline" className={presentation.className}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {getCampaignAdminReviewStatusLabel(status)}
    </Badge>
  );
}

function ThreadPhaseBadge({
  threadPhase,
}: {
  readonly threadPhase: CampaignAdminUserInteractionListItem["threadPhase"];
}) {
  const className =
    threadPhase === "failed"
      ? "border-rose-300 bg-rose-100 text-rose-950"
      : threadPhase === null
        ? "border-slate-300 bg-slate-100 text-slate-800"
        : "border-sky-300 bg-sky-100 text-sky-950";

  return (
    <Badge variant="outline" className={className}>
      {getCampaignAdminThreadPhaseLabel(threadPhase)}
    </Badge>
  );
}

function RiskFlagBadgeList({
  riskFlags,
}: {
  readonly riskFlags: readonly CampaignAdminUserInteractionListItem["riskFlags"][number][];
}) {
  if (riskFlags.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {riskFlags.map((riskFlag) => {
        const label = getCampaignAdminRiskFlagLabel(riskFlag);

        return (
          <Badge
            key={riskFlag}
            variant="warning"
            title={label}
            className="max-w-[11rem] overflow-hidden text-ellipsis whitespace-nowrap border-amber-300 bg-amber-200/80 text-[11px] text-amber-950"
          >
            {label}
          </Badge>
        );
      })}
    </div>
  );
}

function renderReviewNotePreview(
  stagedDraft: CampaignAdminStagedReviewDraft | null,
): ReactNode {
  const trimmedFeedbackText = stagedDraft?.feedbackText.trim() ?? "";

  if (trimmedFeedbackText.length > 0) {
    return (
      <span className="whitespace-normal break-words text-sm leading-5 text-foreground">
        {trimmedFeedbackText}
      </span>
    );
  }

  if (stagedDraft?.status === "rejected") {
    return (
      <span className="text-sm font-medium text-destructive">{t`Review note required`}</span>
    );
  }

  return <span className="text-sm text-muted-foreground">—</span>;
}

function renderNotifyPreview(
  stagedDraft: CampaignAdminStagedReviewDraft | null,
): ReactNode {
  if (stagedDraft === null) {
    return <span className="text-sm text-muted-foreground">{t`Stage review first`}</span>;
  }

  return stagedDraft.sendNotification === true ? (
    <Badge variant="outline" className="border-sky-300 bg-sky-100 text-sky-950">
      {t`Notify`}
    </Badge>
  ) : (
    <span className="text-sm text-muted-foreground">{t`Save only`}</span>
  );
}

function EntityLink({
  campaignKey,
  item,
}: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly item: CampaignAdminUserInteractionListItem;
}) {
  if (item.entityCui === null) {
    return <span>{t`Unavailable`}</span>;
  }

  const entityLabel = item.entityName?.trim() || item.entityCui;
  const entityCui = item.entityCui;

  return (
    <div className="group/ent min-w-0">
      <Link
        to="/admin/campaigns/$campaignKey/entities/$entityCui"
        params={{ campaignKey, entityCui }}
        search={createCampaignAdminEntityDetailRouteSearch()}
        aria-label={t`Open entity admin page for ${entityCui}`}
        className="group/line block max-w-[18rem] rounded-sm text-inherit no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
      >
        <p className="truncate text-sm font-medium text-foreground transition-colors group-hover/line:text-primary group-hover/line:underline group-hover/line:underline-offset-2 group-hover/line:decoration-primary/80">
          {entityLabel}
        </p>
      </Link>
      <p className="font-mono text-xs text-muted-foreground transition-colors group-hover/ent:text-foreground/80">
        {entityCui}
      </p>
      <Link
        to={buildEntityDetailsPath(entityCui) as "/"}
        className="mt-1 inline-block text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        aria-label={t`Open public municipality page for ${entityCui}`}
      >
        {t`Public page`}
      </Link>
    </div>
  );
}

function InteractionElementLink({
  item,
}: {
  readonly item: CampaignAdminUserInteractionListItem;
}) {
  const interactionLabel = getCampaignAdminInteractionTypeLabel(
    item.interactionId,
  );

  if (item.interactionElementLink === null) {
    return <span>{interactionLabel}</span>;
  }

  const href = resolveSafeCampaignAdminHref({
    value: item.interactionElementLink,
  });

  if (href === null) {
    return <span>{interactionLabel}</span>;
  }

  return (
    <a
      href={href}
      className="text-foreground underline-offset-4 hover:underline"
    >
      {interactionLabel}
    </a>
  );
}

function MobileInfoRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-sm text-foreground">
        {value}
      </span>
    </div>
  );
}

function isCheckboxToggleKey(eventKey: string): boolean {
  return eventKey === " " || eventKey === "Spacebar";
}

export function CampaignAdminUserInteractionsTable({
  campaignKey,
  flushChrome = false,
  items,
  stagedDraftsByKey,
  selectedKeys,
  isLoading,
  header,
  footer,
  tablePreferencesKey,
  defaultVisibleColumnIds = DEFAULT_VISIBLE_COLUMN_IDS,
  renderItemActions,
  sortBy,
  sortOrder,
  onCopyRows,
  onExportCsv,
  onSortChange,
  onToggleSelectAll,
  onToggleSelection,
  onToggleSendNotification,
  onOpenItem,
}: CampaignAdminUserInteractionsTableProps) {
  const stickyBg = flushChrome ? "bg-card/80" : "bg-card";
  const pendingSelectionShiftKeyRef = useRef(false);
  const suppressNextSelectionCheckedChangeRef = useRef(false);
  const selectedKeysRef = useRef(selectedKeys);
  const displayedItems = useMemo(
    () =>
      sortBy !== undefined &&
      sortOrder !== undefined &&
      isCampaignAdminUserInteractionsLocalSortKey(sortBy)
        ? sortCampaignAdminUserInteractionItems({
            items,
            sortBy,
            sortOrder,
            stagedDraftsByKey,
          })
        : items,
    [items, sortBy, sortOrder, stagedDraftsByKey],
  );

  useEffect(() => {
    selectedKeysRef.current = selectedKeys;
  }, [selectedKeys]);
  const { columnVisibility, setColumnVisibility } = useTablePreferences(
    tablePreferencesKey ?? `campaign-admin-user-interactions:${campaignKey}`,
    {
      columnVisibility: Object.fromEntries(
        ALL_OPTIONAL_COLUMN_IDS.map((columnId) => [
          columnId,
          defaultVisibleColumnIds.includes(columnId),
        ]),
      ),
    },
  );

  const selectableItems = displayedItems.filter(isSelectable);
  const selectedSelectableCount = selectableItems.filter((item) =>
    selectedKeys.has(
      buildCampaignAdminSelectionKey(item.userId, item.recordKey),
    ),
  ).length;
  const selectedVisibleCount = displayedItems.filter((item) =>
    selectedKeys.has(
      buildCampaignAdminSelectionKey(item.userId, item.recordKey),
    ),
  ).length;
  const allSelectableChecked =
    selectableItems.length > 0 &&
    selectedSelectableCount === selectableItems.length;
  const visibleRowCount = displayedItems.length;
  const copyButtonLabel =
    selectedVisibleCount > 0 ? t`Copy selected rows` : t`Copy all rows`;

  const columnOptions: ReadonlyArray<{
    readonly id: OptionalColumnId;
    readonly label: string;
  }> = [
    { id: "userId", label: t`User ID` },
    { id: "association", label: t`Association` },
    { id: "updated", label: t`Updated` },
    { id: "riskFlags", label: t`Risk flags` },
    { id: "message", label: t`Message` },
    { id: "interaction", label: t`Interaction` },
    { id: "value", label: t`Value` },
    { id: "reviewState", label: t`Review state` },
    { id: "notify", label: t`Notify` },
    { id: "reviewNote", label: t`Review note` },
    { id: "reviewedBy", label: t`Reviewed by` },
  ];

  const isColumnVisible = (columnId: OptionalColumnId): boolean =>
    columnVisibility[columnId] ?? defaultVisibleColumnIds.includes(columnId);

  const toggleColumn = (columnId: OptionalColumnId, checked: boolean) => {
    setColumnVisibility((currentColumnVisibility: Record<string, boolean>) => ({
      ...currentColumnVisibility,
      [columnId]: checked,
    }));
  };

  const getStagedDraft = (item: CampaignAdminUserInteractionListItem) =>
    stagedDraftsByKey[
      buildCampaignAdminSelectionKey(item.userId, item.recordKey)
    ] ?? null;

  const buildSelectionToggleInput = (
    item: CampaignAdminUserInteractionListItem,
    checked: boolean,
  ): CampaignAdminToggleUserInteractionSelectionInput => ({
    item,
    checked,
    shiftKey: pendingSelectionShiftKeyRef.current,
    visibleItems: displayedItems,
  });

  const captureSelectionShiftKey = (shiftKey: boolean) => {
    pendingSelectionShiftKeyRef.current = shiftKey;
  };

  const handleSelectionCheckedChange = (
    item: CampaignAdminUserInteractionListItem,
    checked: boolean | "indeterminate",
  ) => {
    if (suppressNextSelectionCheckedChangeRef.current) {
      suppressNextSelectionCheckedChangeRef.current = false;
      pendingSelectionShiftKeyRef.current = false;
      return;
    }

    if (checked === "indeterminate") {
      return;
    }

    onToggleSelection(buildSelectionToggleInput(item, checked));
    pendingSelectionShiftKeyRef.current = false;
  };

  const handleKeyboardSelectionToggle = (
    item: CampaignAdminUserInteractionListItem,
    shiftKey: boolean,
  ) => {
    suppressNextSelectionCheckedChangeRef.current = true;
    pendingSelectionShiftKeyRef.current = shiftKey;
    onToggleSelection({
      item,
      checked: !selectedKeysRef.current.has(
        buildCampaignAdminSelectionKey(item.userId, item.recordKey),
      ),
      shiftKey,
      visibleItems: displayedItems,
    });
    pendingSelectionShiftKeyRef.current = false;
  };

  if (displayedItems.length === 0) {
    return (
      <EmptyState
        title={t`No data available`}
        description={t`Clear filters`}
        className={
          flushChrome
            ? "rounded-2xl border border-border/50 bg-muted/20 p-10"
            : "rounded-3xl border border-border/70 bg-card/80 p-10"
        }
      />
    );
  }

  return (
    <>
      <div
        className={
          flushChrome
            ? "hidden overflow-hidden lg:block"
            : "hidden overflow-hidden rounded-3xl border border-border/70 bg-card/80 lg:block"
        }
      >
        {header ? (
          <div
            className={
              flushChrome
                ? "border-b border-border/50 px-0 py-4"
                : "border-b border-border/60 px-4 py-4"
            }
          >
            {header({
              actions: (
                <>
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
                </>
              ),
              trailingActions: (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      aria-label={copyButtonLabel}
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          void onCopyRows();
                        }}
                        disabled={items.length === 0 || isLoading}
                      >
                        {copyButtonLabel}
                      </DropdownMenuItem>
                      {onExportCsv ? (
                        <DropdownMenuItem
                          onSelect={() => {
                            void onExportCsv();
                          }}
                          disabled={items.length === 0 || isLoading}
                        >
                          {t`Export CSV`}
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
              ),
            })}
          </div>
        ) : null}
        <div
          className={cn(
            "flex items-center justify-between gap-3 border-b py-3",
            flushChrome ? "border-border/50 px-0" : "border-border/60 px-4",
            header ? "hidden" : "",
          )}
        >
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t`${visibleRowCount} visible`}
          </p>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label={copyButtonLabel}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    void onCopyRows();
                  }}
                  disabled={items.length === 0 || isLoading}
                >
                  {copyButtonLabel}
                </DropdownMenuItem>
                {onExportCsv ? (
                  <DropdownMenuItem
                    onSelect={() => {
                      void onExportCsv();
                    }}
                    disabled={items.length === 0 || isLoading}
                  >
                    {t`Export CSV`}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Table
          containerClassName="max-h-[min(70vh,42rem)]"
          className="min-w-[1080px] [&_td]:px-3 [&_td]:py-3"
        >
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead
                className={cn(
                  "sticky left-0 top-0 z-20 w-12 pl-4 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                  stickyBg,
                )}
              >
                <Checkbox
                  checked={allSelectableChecked}
                  onCheckedChange={(checked) =>
                    onToggleSelectAll(Boolean(checked))
                  }
                  aria-label={t`Select all pending rows`}
                  disabled={selectableItems.length === 0 || isLoading}
                  className="h-5 w-5"
                />
              </TableHead>
              <TableHead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                    stickyBg,
                  )}
                >
                <SortableHeaderButton
                  sortKey="reviewStatus"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={onSortChange}
                >
                  {t`Review status`}
                </SortableHeaderButton>
              </TableHead>
              {isColumnVisible("userId") ? (
                <TableHead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                    stickyBg,
                  )}
                >
                  <SortableHeaderButton
                    sortKey="userId"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`User ID`}
                  </SortableHeaderButton>
                </TableHead>
              ) : null}
              {isColumnVisible("association") ? (
                <TableHead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                    stickyBg,
                  )}
                >
                  <SortableHeaderButton
                    sortKey="organizationName"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Association`}
                  </SortableHeaderButton>
                </TableHead>
              ) : null}
              <TableHead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                    stickyBg,
                  )}
                >
                <SortableHeaderButton
                  sortKey="entity"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={onSortChange}
                >
                  {t`Entity`}
                </SortableHeaderButton>
              </TableHead>
              {isColumnVisible("updated") ? (
                <TableHead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                    stickyBg,
                  )}
                >
                  <SortableHeaderButton
                    sortKey="updatedAt"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Updated`}
                  </SortableHeaderButton>
                </TableHead>
              ) : null}
              {isColumnVisible("riskFlags") ? (
                <TableHead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                    stickyBg,
                  )}
                >
                  <SortableHeaderButton
                    sortKey="riskFlagCount"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Risk flags`}
                  </SortableHeaderButton>
                </TableHead>
              ) : null}
              {isColumnVisible("message") ? (
                <TableHead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                    stickyBg,
                  )}
                >
                  <SortableHeaderButton
                    sortKey="threadPhase"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    {t`Message`}
                  </SortableHeaderButton>
                </TableHead>
              ) : null}
              {isColumnVisible("interaction") ? (
                <TableHead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                    stickyBg,
                  )}
                >
                  <SortableHeaderButton
                    sortKey="interactionType"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Interaction`}
                  </SortableHeaderButton>
                </TableHead>
              ) : null}
              {isColumnVisible("value") ? (
                <TableHead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                    stickyBg,
                  )}
                >
                  <SortableHeaderButton
                    sortKey="value"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Value`}
                  </SortableHeaderButton>
                </TableHead>
              ) : null}
              {isColumnVisible("reviewState") ? (
                <TableHead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                    stickyBg,
                  )}
                >
                  <SortableHeaderButton
                    sortKey="reviewState"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Review state`}
                  </SortableHeaderButton>
                </TableHead>
              ) : null}
              {isColumnVisible("notify") ? (
                <TableHead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                    stickyBg,
                  )}
                >
                  {t`Notify`}
                </TableHead>
              ) : null}
              {isColumnVisible("reviewNote") ? (
                <TableHead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                    stickyBg,
                  )}
                >
                  {t`Review note`}
                </TableHead>
              ) : null}
              {isColumnVisible("reviewedBy") ? (
                <TableHead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-medium text-muted-foreground backdrop-blur-sm",
                    stickyBg,
                  )}
                >
                  <SortableHeaderButton
                    sortKey="reviewedByUserId"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Reviewed by`}
                  </SortableHeaderButton>
                </TableHead>
              ) : null}
              <TableHead
                className={cn(
                  "sticky right-0 top-0 z-20 pr-4 text-right text-xs font-medium text-muted-foreground backdrop-blur-sm",
                  stickyBg,
                )}
              >
                {t`Actions`}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedItems.map((item) => {
              const selectionKey = buildCampaignAdminSelectionKey(
                item.userId,
                item.recordKey,
              );
              const selectable = isSelectable(item);
              const stagedDraft = getStagedDraft(item);
              const reviewPreviewStatus = stagedDraft?.status ?? null;

              return (
                <TableRow
                  key={selectionKey}
                  className="group hover:bg-muted/30"
                >
                  <TableCell
                    className={cn(
                      "sticky left-0 z-10 pl-4 group-hover:bg-muted/30",
                      stickyBg,
                    )}
                  >
                    <Checkbox
                      checked={selectedKeys.has(selectionKey)}
                      onPointerDown={(event) =>
                        captureSelectionShiftKey(event.shiftKey)
                      }
                      onClick={(event) =>
                        captureSelectionShiftKey(event.shiftKey)
                      }
                      onKeyDown={(event) => {
                        if (!isCheckboxToggleKey(event.key)) {
                          return;
                        }

                        event.preventDefault();
                        handleKeyboardSelectionToggle(item, event.shiftKey);
                      }}
                      onCheckedChange={(checked) =>
                        handleSelectionCheckedChange(item, checked)
                      }
                      aria-label={t`Select row`}
                      disabled={!selectable || isLoading}
                      className="h-5 w-5"
                    />
                  </TableCell>
                  <TableCell>
                    <ReviewStatusBadge reviewStatus={item.reviewStatus} />
                  </TableCell>
                  {isColumnVisible("userId") ? (
                    <TableCell className="max-w-[9rem]">
                      <Link
                        to="/admin/campaigns/$campaignKey/users/$userId"
                        params={{
                          campaignKey,
                          userId: item.userId,
                        }}
                        search={campaignAdminUserWorkspaceDefaultLinkSearch as never}
                        title={item.userId}
                        className="block max-w-full truncate font-mono text-xs text-muted-foreground underline-offset-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background hover:text-foreground hover:underline"
                      >
                        {formatCampaignAdminUserIdPreview(item.userId)}
                      </Link>
                    </TableCell>
                  ) : null}
                  {isColumnVisible("association") ? (
                    <TableCell className="max-w-[14rem] break-words">
                      {item.organizationName ?? t`Unavailable`}
                    </TableCell>
                  ) : null}
                  <TableCell className="min-w-[12rem]">
                    <EntityLink campaignKey={campaignKey} item={item} />
                  </TableCell>
                  {isColumnVisible("updated") ? (
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDateTime(item.updatedAt)}
                    </TableCell>
                  ) : null}
                  {isColumnVisible("riskFlags") ? (
                    <TableCell className="max-w-[16rem]">
                      <RiskFlagBadgeList riskFlags={item.riskFlags} />
                    </TableCell>
                  ) : null}
                  {isColumnVisible("message") ? (
                    <TableCell>
                      <ThreadPhaseBadge threadPhase={item.threadPhase} />
                    </TableCell>
                  ) : null}
                  {isColumnVisible("interaction") ? (
                    <TableCell className="max-w-[16rem] font-medium text-foreground">
                      <InteractionElementLink item={item} />
                    </TableCell>
                  ) : null}
                  {isColumnVisible("value") ? (
                    <TableCell
                      className={cn(
                        "max-w-[14rem] break-words font-medium",
                        reviewPreviewStatus === "approved"
                          ? "text-emerald-800"
                          : "text-foreground",
                      )}
                    >
                      {getCampaignAdminPrimaryValue(item) ?? t`Unavailable`}
                    </TableCell>
                  ) : null}
                  {isColumnVisible("reviewState") ? (
                    <TableCell>
                      {reviewPreviewStatus ? (
                        <StagedReviewStateBadge status={reviewPreviewStatus} />
                      ) : (
                        <span className="text-sm text-muted-foreground">{t`Not staged`}</span>
                      )}
                    </TableCell>
                  ) : null}
                  {isColumnVisible("notify") ? (
                    <TableCell>
                      {stagedDraft !== null ? (
                        <label className="inline-flex items-center gap-2 text-sm text-foreground">
                          <Checkbox
                            checked={stagedDraft.sendNotification === true}
                            onCheckedChange={(checked) =>
                              onToggleSendNotification(item, Boolean(checked))
                            }
                            aria-label={t`Send notification`}
                            disabled={isLoading}
                          />
                          <span>
                            {stagedDraft.sendNotification === true
                              ? t`Notify`
                              : t`Save only`}
                          </span>
                        </label>
                      ) : (
                        renderNotifyPreview(stagedDraft)
                      )}
                    </TableCell>
                  ) : null}
                  {isColumnVisible("reviewNote") ? (
                    <TableCell className="max-w-[18rem]">
                      {renderReviewNotePreview(stagedDraft)}
                    </TableCell>
                  ) : null}
                  {isColumnVisible("reviewedBy") ? (
                    <TableCell className="max-w-[12rem] break-words">
                      {item.reviewedByUserId ?? t`Not reviewed`}
                    </TableCell>
                  ) : null}
                  <TableCell
                    className={cn(
                      "sticky right-0 z-10 pr-4 text-right group-hover:bg-muted/30",
                      stickyBg,
                    )}
                  >
                    <div className="flex justify-end gap-2">
                      {renderItemActions ? renderItemActions(item) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenItem(item)}
                        className="rounded-full px-3"
                      >
                        {selectable ? t`Review` : t`Inspect`}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {footer ? (
          <div
            className={cn(
              "border-t",
              flushChrome
                ? "border-border/50 px-0 py-4"
                : "border-border/60 bg-background/40 px-4 py-4",
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 lg:hidden">
        {header ? (
          <div
            className={
              flushChrome
                ? "rounded-2xl border border-border/50 bg-muted/10 p-4"
                : "rounded-3xl border border-border/70 bg-card/80 p-4"
            }
          >
            {header({ actions: null, trailingActions: null })}
          </div>
        ) : null}
        {displayedItems.map((item) => {
          const selectionKey = buildCampaignAdminSelectionKey(
            item.userId,
            item.recordKey,
          );
          const selectable = isSelectable(item);
          const stagedDraft = getStagedDraft(item);

          return (
            <article
              key={selectionKey}
              className={
                flushChrome
                  ? "rounded-2xl border border-border/50 bg-muted/10 p-4"
                  : "rounded-3xl border border-border/70 bg-card/80 p-4"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <ReviewStatusBadge reviewStatus={item.reviewStatus} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        stagedDraft?.status === "approved"
                          ? "text-emerald-800"
                          : "text-foreground",
                      )}
                    >
                      {getCampaignAdminPrimaryValue(item) ?? t`Unavailable`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.organizationName ?? t`Unavailable`}
                    </p>
                  </div>
                </div>
                <Checkbox
                  checked={selectedKeys.has(selectionKey)}
                  onPointerDown={(event) =>
                    captureSelectionShiftKey(event.shiftKey)
                  }
                  onClick={(event) =>
                    captureSelectionShiftKey(event.shiftKey)
                  }
                  onKeyDown={(event) => {
                    if (!isCheckboxToggleKey(event.key)) {
                      return;
                    }

                    event.preventDefault();
                    handleKeyboardSelectionToggle(item, event.shiftKey);
                  }}
                  onCheckedChange={(checked) =>
                    handleSelectionCheckedChange(item, checked)
                  }
                  aria-label={t`Select row`}
                  disabled={!selectable || isLoading}
                  className="h-5 w-5"
                />
              </div>

              <div className="mt-4 space-y-3">
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/60">
                  <MobileInfoRow
                    label={t`User ID`}
                    value={
                      <Link
                        to="/admin/campaigns/$campaignKey/users/$userId"
                        params={{
                          campaignKey,
                          userId: item.userId,
                        }}
                        search={campaignAdminUserWorkspaceDefaultLinkSearch as never}
                        className="font-mono text-xs underline-offset-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background hover:underline"
                        title={item.userId}
                      >
                        {formatCampaignAdminUserIdPreview(item.userId)}
                      </Link>
                    }
                  />
                  <MobileInfoRow
                    label={t`Entity`}
                    value={<EntityLink campaignKey={campaignKey} item={item} />}
                  />
                  <MobileInfoRow
                    label={t`Updated`}
                    value={formatDateTime(item.updatedAt)}
                  />
                  <MobileInfoRow
                    label={t`Interaction`}
                    value={<InteractionElementLink item={item} />}
                  />
                  <MobileInfoRow
                    label={t`Message`}
                    value={<ThreadPhaseBadge threadPhase={item.threadPhase} />}
                  />
                  <MobileInfoRow
                    label={t`Review state`}
                    value={
                      stagedDraft ? (
                        <StagedReviewStateBadge status={stagedDraft.status} />
                      ) : (
                        t`Not staged`
                      )
                    }
                  />
                  <MobileInfoRow
                    label={t`Notify`}
                    value={
                      stagedDraft ? (
                        <label className="inline-flex items-center gap-2 text-sm text-foreground">
                          <Checkbox
                            checked={stagedDraft.sendNotification === true}
                            onCheckedChange={(checked) =>
                              onToggleSendNotification(item, Boolean(checked))
                            }
                            aria-label={t`Send notification`}
                            disabled={isLoading}
                          />
                          <span>
                            {stagedDraft.sendNotification === true
                              ? t`Notify`
                              : t`Save only`}
                          </span>
                        </label>
                      ) : (
                        renderNotifyPreview(stagedDraft)
                      )
                    }
                  />
                  <MobileInfoRow
                    label={t`Review note`}
                    value={renderReviewNotePreview(stagedDraft)}
                  />
                  <MobileInfoRow
                    label={t`Reviewed by`}
                    value={item.reviewedByUserId ?? t`Not reviewed`}
                  />
                </div>

                <RiskFlagBadgeList riskFlags={item.riskFlags} />

                <div className="flex flex-wrap justify-end gap-2">
                  {renderItemActions ? renderItemActions(item) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenItem(item)}
                  >
                    {selectable ? t`Review` : t`Inspect`}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}

        {footer ? (
          <div
            className={
              flushChrome
                ? "rounded-2xl border border-border/50 bg-muted/10 p-4"
                : "rounded-3xl border border-border/70 bg-card/80 p-4"
            }
          >
            {footer}
          </div>
        ) : null}

        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label={copyButtonLabel}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  void onCopyRows();
                }}
                disabled={items.length === 0 || isLoading}
              >
                {copyButtonLabel}
              </DropdownMenuItem>
              {onExportCsv ? (
                <DropdownMenuItem
                  onSelect={() => {
                    void onExportCsv();
                  }}
                  disabled={items.length === 0 || isLoading}
                >
                  {t`Export CSV`}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
