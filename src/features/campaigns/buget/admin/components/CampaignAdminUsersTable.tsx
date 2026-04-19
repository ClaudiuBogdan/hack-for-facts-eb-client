import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { t } from "@lingui/core/macro";
import {
  ArrowRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CAMPAIGN_ADMIN_USERS_SORTABLE_COLUMNS,
  DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  getCampaignAdminInteractionTypeLabel,
  getCampaignAdminUsersSortLabel,
} from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminSortOrder,
  CampaignAdminUserListItem,
  CampaignAdminUsersSortKey,
} from "@/features/campaigns/buget/admin/types";
import { createCampaignAdminEntityDetailRouteSearch } from "@/features/campaigns/buget/admin/utils/create-campaign-admin-entity-detail-route-search";

function createCampaignAdminUserPageRouteSearch(entityCui?: string) {
  return {
    query: undefined,
    reviewStatus: undefined,
    interactionId: undefined,
    lessonId: undefined,
    entityCui,
    scopeType: undefined,
    payloadKind: undefined,
    submissionPath: undefined,
    recordKey: undefined,
    recordKeyPrefix: undefined,
    submittedAtFrom: undefined,
    submittedAtTo: undefined,
    updatedAtFrom: undefined,
    updatedAtTo: undefined,
    hasInstitutionThread: undefined,
    threadPhase: undefined,
    sortBy: "updatedAt" as const,
    sortOrder: "desc" as const,
    reviewSelectionKey: undefined,
    workspaceTab: undefined,
    cursor: undefined,
    pageIndex: undefined,
    limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  };
}

function formatDateTime(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return t`Unavailable`;
  }

  return parsedDate.toLocaleString();
}

function getLatestInteractionPreview(item: CampaignAdminUserListItem): string {
  if (item.latestInteractionId === null) {
    return t`No interactions yet`;
  }

  return getCampaignAdminInteractionTypeLabel(item.latestInteractionId);
}

function StaticHeaderLabel({ children }: { readonly children: ReactNode }) {
  return (
    <span className="text-xs font-medium text-muted-foreground">{children}</span>
  );
}

function LatestInteractionCell({
  campaignKey,
  item,
}: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly item: CampaignAdminUserListItem;
}) {
  const interactionLabel = getLatestInteractionPreview(item);
  const entityCui = item.latestEntityCui;
  const entityName = item.latestEntityName?.trim();
  const entityLine =
    entityName && entityCui
      ? `${entityName} · ${entityCui}`
      : entityName ?? entityCui ?? null;

  return (
    <div className="min-w-0 max-w-[22rem] space-y-1">
      <p className="text-sm font-medium leading-snug text-foreground">
        {interactionLabel}
      </p>
      {entityCui && entityLine ? (
        <p className="min-w-0 text-xs leading-snug text-muted-foreground">
          <Link
            to="/admin/campaigns/$campaignKey/entities/$entityCui"
            params={{ campaignKey, entityCui }}
            search={createCampaignAdminEntityDetailRouteSearch()}
            aria-label={t`Open entity admin page for ${entityCui}`}
            className="group/ent inline-flex max-w-full rounded-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          >
            <span className="min-w-0 truncate transition-colors group-hover/ent:text-primary group-hover/ent:underline group-hover/ent:underline-offset-2 group-hover/ent:decoration-primary/80">
              {entityLine}
            </span>
          </Link>
        </p>
      ) : entityLine ? (
        <p className="min-w-0 truncate text-xs leading-snug text-muted-foreground">
          {entityLine}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{t`No entity`}</p>
      )}
    </div>
  );
}

function SortableHeaderButton({
  sortKey,
  sortBy,
  sortOrder,
  onSortChange,
  align = "start",
  children,
}: {
  readonly sortKey: CampaignAdminUsersSortKey;
  readonly sortBy?: CampaignAdminUsersSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onSortChange: (
    sortBy: CampaignAdminUsersSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => void;
  readonly align?: "start" | "end";
  readonly children: ReactNode;
}) {
  const columnConfig = CAMPAIGN_ADMIN_USERS_SORTABLE_COLUMNS[sortKey];
  const sortLabel = getCampaignAdminUsersSortLabel(sortKey);
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
      className={
        align === "end"
          ? "flex w-full items-center justify-end gap-1 text-right text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          : "flex w-full items-center gap-1 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      }
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

function UserDirectoryRow({
  campaignKey,
  entityCui,
  item,
}: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly entityCui?: string;
  readonly item: CampaignAdminUserListItem;
}) {
  return (
    <TableRow className="group border-border/50">
      <TableCell className="align-top">
        <div className="flex max-w-[18rem] items-start gap-1.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/admin/campaigns/$campaignKey/users/$userId"
                  params={{ campaignKey, userId: item.userId }}
                  search={createCampaignAdminUserPageRouteSearch(entityCui)}
                  className="block break-all font-mono text-xs leading-relaxed text-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
                >
                  {item.userId}
                </Link>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs break-all">
                {item.userId}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <CopyButton
            onCopy={() => {
              void navigator.clipboard.writeText(item.userId);
            }}
            className="mt-0.5 h-6 w-6 shrink-0 p-1 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap align-top text-sm text-muted-foreground">
        {formatDateTime(item.latestUpdatedAt)}
      </TableCell>
      <TableCell className="align-top text-right tabular-nums text-sm text-foreground">
        {item.interactionCount}
      </TableCell>
      <TableCell className="align-top text-right text-sm">
        {item.pendingReviewCount > 0 ? (
          <Badge variant="warning" className="tabular-nums">
            {item.pendingReviewCount}
          </Badge>
        ) : (
          <span className="tabular-nums text-muted-foreground">
            {item.pendingReviewCount}
          </span>
        )}
      </TableCell>
      <TableCell className="min-w-0 align-top">
        <LatestInteractionCell campaignKey={campaignKey} item={item} />
      </TableCell>
      <TableCell className="w-12 align-top text-right">
        <Link
          to="/admin/campaigns/$campaignKey/users/$userId"
          params={{ campaignKey, userId: item.userId }}
          search={createCampaignAdminUserPageRouteSearch(entityCui)}
          aria-label={t`Open user ${item.userId}`}
          className="inline-flex rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </TableCell>
    </TableRow>
  );
}

type CampaignAdminUsersTableProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly entityCui?: string;
  readonly items: readonly CampaignAdminUserListItem[];
  /** When true, omit outer border/background so the table can sit inside another card without double chrome. */
  readonly flushChrome?: boolean;
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
  readonly sortBy?: CampaignAdminUsersSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onSortChange?: (
    sortBy: CampaignAdminUsersSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => void;
};

export function CampaignAdminUsersTable({
  campaignKey,
  entityCui,
  items,
  flushChrome = false,
  header,
  footer,
  sortBy,
  sortOrder,
  onSortChange,
}: CampaignAdminUsersTableProps) {
  const stickyHeaderBg = flushChrome
    ? "bg-card/80"
    : "bg-card/95";

  return (
    <div
      className={
        flushChrome
          ? "overflow-hidden"
          : "overflow-hidden rounded-xl border border-border/60 bg-card/90 shadow-none"
      }
    >
      {header ? (
        <div
          className={
            flushChrome
              ? "flex items-center justify-between gap-3 border-b border-border/50 px-0 py-3"
              : "flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3"
          }
        >
          {header}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <Table
          containerClassName="max-h-[min(55vh,28rem)]"
          className="min-w-[56rem] [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3"
        >
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead
                className={`sticky top-0 z-10 h-auto ${stickyHeaderBg} py-3 backdrop-blur-sm`}
              >
                {onSortChange ? (
                  <SortableHeaderButton
                    sortKey="userId"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`User ID`}
                  </SortableHeaderButton>
                ) : (
                  <StaticHeaderLabel>{t`User ID`}</StaticHeaderLabel>
                )}
              </TableHead>
              <TableHead
                className={`sticky top-0 z-10 h-auto ${stickyHeaderBg} py-3 backdrop-blur-sm`}
              >
                {onSortChange ? (
                  <SortableHeaderButton
                    sortKey="latestUpdatedAt"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                  >
                    {t`Last Updated`}
                  </SortableHeaderButton>
                ) : (
                  <StaticHeaderLabel>{t`Last Updated`}</StaticHeaderLabel>
                )}
              </TableHead>
              <TableHead
                className={`sticky top-0 z-10 h-auto ${stickyHeaderBg} py-3 text-right backdrop-blur-sm`}
              >
                {onSortChange ? (
                  <SortableHeaderButton
                    sortKey="interactionCount"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                    align="end"
                  >
                    {t`Interactions`}
                  </SortableHeaderButton>
                ) : (
                  <div className="flex justify-end">
                    <StaticHeaderLabel>{t`Interactions`}</StaticHeaderLabel>
                  </div>
                )}
              </TableHead>
              <TableHead
                className={`sticky top-0 z-10 h-auto ${stickyHeaderBg} py-3 text-right backdrop-blur-sm`}
              >
                {onSortChange ? (
                  <SortableHeaderButton
                    sortKey="pendingReviewCount"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                    align="end"
                  >
                    {t`Pending Reviews`}
                  </SortableHeaderButton>
                ) : (
                  <div className="flex justify-end">
                    <StaticHeaderLabel>{t`Pending Reviews`}</StaticHeaderLabel>
                  </div>
                )}
              </TableHead>
              <TableHead
                className={`sticky top-0 z-10 h-auto min-w-[12rem] ${stickyHeaderBg} py-3 backdrop-blur-sm`}
              >
                <StaticHeaderLabel>{t`Latest Interaction`}</StaticHeaderLabel>
              </TableHead>
              <TableHead
                className={`sticky top-0 z-10 h-auto w-12 ${stickyHeaderBg} py-3 backdrop-blur-sm`}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <UserDirectoryRow
                key={item.userId}
                campaignKey={campaignKey}
                entityCui={entityCui}
                item={item}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {footer ? (
        <div
          className={
            flushChrome
              ? "border-t border-border/50 px-0 py-3"
              : "border-t border-border/50 bg-muted/20 px-4 py-3"
          }
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
