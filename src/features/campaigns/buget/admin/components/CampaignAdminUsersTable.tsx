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

function getLatestEntityPreview(item: CampaignAdminUserListItem): string {
  const latestEntityName = item.latestEntityName?.trim();
  if (latestEntityName && item.latestEntityCui) {
    return `${latestEntityName} · ${item.latestEntityCui}`;
  }

  if (latestEntityName) {
    return latestEntityName;
  }

  if (item.latestEntityCui) {
    return item.latestEntityCui;
  }

  return t`No entity`;
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

function SortableHeaderButton({
  sortKey,
  sortBy,
  sortOrder,
  onSortChange,
  children,
}: {
  readonly sortKey: CampaignAdminUsersSortKey;
  readonly sortBy?: CampaignAdminUsersSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onSortChange: (
    sortBy: CampaignAdminUsersSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => void;
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

function UserDirectoryRow({
  campaignKey,
  entityCui,
  item,
}: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly entityCui?: string;
  readonly item: CampaignAdminUserListItem;
}) {
  const latestEntityPreview = getLatestEntityPreview(item);

  return (
    <TableRow className="group">
      <TableCell>
        <div className="flex items-center gap-1.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/admin/campaigns/$campaignKey/users/$userId"
                  params={{ campaignKey, userId: item.userId }}
                  search={createCampaignAdminUserPageRouteSearch(entityCui)}
                  className="block max-w-[20rem] break-all font-mono text-xs text-foreground hover:underline"
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
            className="h-6 w-6 p-1 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {formatDateTime(item.latestUpdatedAt)}
      </TableCell>
      <TableCell className="tabular-nums text-sm">
        {item.interactionCount}
      </TableCell>
      <TableCell className="text-sm">
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
      <TableCell className="min-w-0 text-sm">
        <p className="truncate text-foreground">{getLatestInteractionPreview(item)}</p>
        <p
          className="truncate text-xs text-muted-foreground"
          title={latestEntityPreview}
        >
          {latestEntityPreview}
        </p>
      </TableCell>
      <TableCell className="w-10 text-right">
        <Link
          to="/admin/campaigns/$campaignKey/users/$userId"
          params={{ campaignKey, userId: item.userId }}
          search={createCampaignAdminUserPageRouteSearch(entityCui)}
          aria-label={t`Open user ${item.userId}`}
        >
          <ArrowRight
            className="ml-auto h-4 w-4 text-muted-foreground transition-colors hover:text-foreground"
            aria-hidden="true"
          />
        </Link>
      </TableCell>
    </TableRow>
  );
}

type CampaignAdminUsersTableProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly entityCui?: string;
  readonly items: readonly CampaignAdminUserListItem[];
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
  sortBy,
  sortOrder,
  onSortChange,
}: CampaignAdminUsersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
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
          <TableHead>
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
          <TableHead>
            {onSortChange ? (
              <SortableHeaderButton
                sortKey="interactionCount"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              >
                {t`Interactions`}
              </SortableHeaderButton>
            ) : (
              <StaticHeaderLabel>{t`Interactions`}</StaticHeaderLabel>
            )}
          </TableHead>
          <TableHead>
            {onSortChange ? (
              <SortableHeaderButton
                sortKey="pendingReviewCount"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              >
                {t`Pending Reviews`}
              </SortableHeaderButton>
            ) : (
              <StaticHeaderLabel>{t`Pending Reviews`}</StaticHeaderLabel>
            )}
          </TableHead>
          <TableHead>
            <StaticHeaderLabel>{t`Latest Interaction`}</StaticHeaderLabel>
          </TableHead>
          <TableHead className="w-10" />
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
  );
}
