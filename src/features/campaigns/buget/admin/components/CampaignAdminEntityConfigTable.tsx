import type { ReactNode } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  SearchX,
} from "lucide-react";
import { t } from "@lingui/core/macro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CAMPAIGN_ADMIN_ENTITY_CONFIG_SORTABLE_COLUMNS,
  getCampaignAdminEntityConfigSortLabel,
} from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminEntityConfigListItem,
  CampaignAdminEntityConfigSortKey,
  CampaignAdminSortOrder,
} from "@/features/campaigns/buget/admin/types";
import { buildCampaignPrimariePath } from "@/features/challenges/constants";
import { getUserLocale } from "@/lib/utils";

type CampaignAdminEntityConfigTableProps = {
  readonly items: readonly CampaignAdminEntityConfigListItem[];
  readonly header?: (input: {
    readonly actions: ReactNode;
    readonly trailingActions: ReactNode;
  }) => ReactNode;
  readonly sortBy?: CampaignAdminEntityConfigSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onSortChange?: (
    sortBy: CampaignAdminEntityConfigSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => void;
  readonly selectedEntityCuis?: ReadonlySet<string>;
  readonly onToggleSelectAll?: (checked: boolean) => void;
  readonly onToggleSelection?: (
    item: CampaignAdminEntityConfigListItem,
    checked: boolean,
  ) => void;
  readonly onOpenItem: (item: CampaignAdminEntityConfigListItem) => void;
  readonly onClearFilters: () => void;
  readonly footer?: ReactNode;
  readonly onCopyRows?: () => Promise<void> | void;
  readonly onOpenPasteDialog?: () => Promise<void> | void;
  readonly onExportCsv?: () => Promise<void> | void;
};

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
  readonly sortKey: CampaignAdminEntityConfigSortKey;
  readonly sortBy?: CampaignAdminEntityConfigSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onSortChange: (
    sortBy: CampaignAdminEntityConfigSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => void;
  readonly children: ReactNode;
}) {
  const columnConfig = CAMPAIGN_ADMIN_ENTITY_CONFIG_SORTABLE_COLUMNS[sortKey];
  const sortLabel = getCampaignAdminEntityConfigSortLabel(sortKey);
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
  readonly sortKey: CampaignAdminEntityConfigSortKey;
  readonly sortBy?: CampaignAdminEntityConfigSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onSortChange?: (
    sortBy: CampaignAdminEntityConfigSortKey,
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

function ConfiguredBadge({
  configured,
}: {
  readonly configured: boolean;
}) {
  return configured ? (
    <Badge
      variant="outline"
      className="border-emerald-300 bg-emerald-100 text-emerald-950"
    >
      {t`Configured`}
    </Badge>
  ) : (
    <Badge variant="secondary">{t`Not configured`}</Badge>
  );
}

export function CampaignAdminEntityConfigTable({
  items,
  header,
  sortBy,
  sortOrder,
  onSortChange,
  selectedEntityCuis = new Set(),
  onToggleSelectAll,
  onToggleSelection,
  onOpenItem,
  onClearFilters,
  footer,
  onCopyRows,
  onOpenPasteDialog,
  onExportCsv,
}: CampaignAdminEntityConfigTableProps) {
  const tableMenuLabel = t`Table actions`;
  const allVisibleSelected =
    items.length > 0 &&
    items.every((item) => selectedEntityCuis.has(item.entityCui));
  const copyRowsLabel =
    selectedEntityCuis.size > 0 ? t`Copy selected rows` : t`Copy all rows`;

  const trailingActions =
    onCopyRows || onOpenPasteDialog || onExportCsv ? (
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
              {copyRowsLabel}
            </DropdownMenuItem>
          ) : null}
          {onOpenPasteDialog ? (
            <DropdownMenuItem onSelect={() => { void onOpenPasteDialog(); }}>
              {t`Paste spreadsheet`}
            </DropdownMenuItem>
          ) : null}
          {onExportCsv ? (
            <DropdownMenuItem onSelect={() => { void onExportCsv(); }}>
              {t`Export CSV`}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  if (items.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-none">
        {header ? (
          <div className="border-b border-border/60 px-4 py-4">
            {header({
              actions: null,
              trailingActions,
            })}
          </div>
        ) : null}
        <div className="space-y-4 p-6">
          <EmptyState
            icon={<SearchX className="h-6 w-6" />}
            title={t`No entity config rows matched the current filters`}
            description={t`Subscribed entities and saved config rows are listed here. Clear the current filters or open a specific entity to create new config.`}
            className="rounded-2xl border-border/70 bg-background/30"
          />
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={onClearFilters}>
              {t`Clear filters`}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-none">
      {header ? (
        <div className="border-b border-border/60 px-4 py-4">
          {header({
            actions: null,
            trailingActions,
          })}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <Table
          containerClassName="max-h-[min(70vh,42rem)]"
          className="min-w-[1040px] [&_td]:px-3 [&_td]:py-3"
        >
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={allVisibleSelected}
                  aria-label={t`Select all visible rows`}
                  onCheckedChange={(checked) => {
                    onToggleSelectAll?.(Boolean(checked));
                  }}
                  disabled={items.length === 0}
                />
              </TableHead>
              <SortableTableHead
                sortKey="entityCui"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              >
                {t`Entity`}
              </SortableTableHead>
              <SortableTableHead
                sortKey="usersCount"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              >
                {t`Users`}
              </SortableTableHead>
              <SortableTableHead
                sortKey="budgetPublicationDate"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              >
                {t`Budget publication date`}
              </SortableTableHead>
              <SortableTableHead
                sortKey="officialBudgetUrl"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              >
                {t`Official budget URL`}
              </SortableTableHead>
              <TableHead>{t`Public debate`}</TableHead>
              <SortableTableHead
                sortKey="updatedAt"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              >
                {t`Updated`}
              </SortableTableHead>
              <TableHead className="text-right">{t`Actions`}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.entityCui}>
                <TableCell className="align-top">
                  <Checkbox
                    checked={selectedEntityCuis.has(item.entityCui)}
                    aria-label={t`Select row`}
                    onCheckedChange={(checked) => {
                      onToggleSelection?.(item, Boolean(checked));
                    }}
                  />
                </TableCell>
                <TableCell className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {item.entityName?.trim() || item.entityCui}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {item.entityCui}
                  </p>
                  <ConfiguredBadge configured={item.configured} />
                </TableCell>
                <TableCell className="tabular-nums text-sm text-foreground">
                  {item.usersCount}
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {item.values.budgetPublicationDate ?? t`Unavailable`}
                </TableCell>
                <TableCell className="max-w-xs text-sm">
                  {item.values.officialBudgetUrl ? (
                    <a
                      href={item.values.officialBudgetUrl}
                      className="text-primary underline underline-offset-4"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.values.officialBudgetUrl}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">{t`Unavailable`}</span>
                  )}
                </TableCell>
                <TableCell className="max-w-xs space-y-1 text-sm">
                  {item.values.public_debate ? (
                    <>
                      <p className="text-foreground">
                        {item.values.public_debate.date} · {item.values.public_debate.time}
                      </p>
                      <p className="text-muted-foreground">
                        {item.values.public_debate.location}
                      </p>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{t`Unavailable`}</span>
                  )}
                </TableCell>
                <TableCell className="space-y-1 text-sm">
                  <p className="text-foreground">
                    {formatDateTime(item.updatedAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.updatedByUserId ?? t`Unknown editor`}
                  </p>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenItem(item)}
                    >
                      {t`Open`}
                    </Button>
                    <Button asChild type="button" variant="outline" size="sm">
                      <a href={buildCampaignPrimariePath(item.entityCui)}>
                        {t`Public page`}
                      </a>
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
  );
}
