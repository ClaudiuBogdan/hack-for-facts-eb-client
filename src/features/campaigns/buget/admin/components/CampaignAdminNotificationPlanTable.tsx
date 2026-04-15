import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CampaignAdminNotificationPlanRow } from "@/features/campaigns/buget/admin/types";
import {
  formatCampaignAdminNotificationTechnicalValue,
  formatCampaignAdminNotificationUserLabel,
  getCampaignAdminNotificationPreviewRowFilterLabel,
  getCampaignAdminNotificationResultClassName,
  getCampaignAdminNotificationResultLabel,
  getCampaignAdminNotificationWhyLabel,
  matchesCampaignAdminNotificationPreviewRowFilter,
  type CampaignAdminNotificationPreviewRowFilter,
} from "@/features/campaigns/buget/admin/utils/campaign-admin-notification-run-utils";
import { getUserLocale } from "@/lib/utils";

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

type CampaignAdminNotificationPlanTableProps = {
  readonly rows: readonly CampaignAdminNotificationPlanRow[];
  readonly activeFilter: CampaignAdminNotificationPreviewRowFilter;
  readonly onFilterChange: (
    filter: CampaignAdminNotificationPreviewRowFilter,
  ) => void;
};

const ROW_FILTERS: readonly CampaignAdminNotificationPreviewRowFilter[] = [
  "all",
  "ready",
  "already_sent",
  "not_ready",
];

export function CampaignAdminNotificationPlanTable({
  rows,
  activeFilter,
  onFilterChange,
}: CampaignAdminNotificationPlanTableProps) {
  const [expandedRowKeys, setExpandedRowKeys] = useState<readonly string[]>([]);

  useEffect(() => {
    setExpandedRowKeys([]);
  }, [rows]);

  const filterCounts = useMemo(
    () => ({
      all: rows.length,
      ready: rows.filter((row) => row.status === "will_send").length,
      already_sent: rows.filter((row) => row.status === "already_sent").length,
      not_ready: rows.filter(
        (row) => row.status !== "will_send" && row.status !== "already_sent",
      ).length,
    }),
    [rows],
  );

  const visibleRows = useMemo(
    () =>
      rows.filter((row) =>
        matchesCampaignAdminNotificationPreviewRowFilter(row, activeFilter),
      ),
    [activeFilter, rows],
  );

  const toggleTechnicalDetails = (rowKey: string) => {
    setExpandedRowKeys((currentKeys) =>
      currentKeys.includes(rowKey)
        ? currentKeys.filter((key) => key !== rowKey)
        : [...currentKeys, rowKey],
    );
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        title={t`No matches on this page`}
        description={t`This preview page did not include any matching rows.`}
        className="rounded-3xl border border-border/70 bg-card/80"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" aria-label={t`Preview result filters`}>
        {ROW_FILTERS.map((filter) => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={activeFilter === filter ? "default" : "outline"}
            onClick={() => {
              onFilterChange(filter);
            }}
          >
            {getCampaignAdminNotificationPreviewRowFilterLabel(filter)}
            <span className="ml-2 tabular-nums">{filterCounts[filter]}</span>
          </Button>
        ))}
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState
          title={t`No matches for this filter`}
          description={t`Try a different result filter or move to another preview page.`}
          className="rounded-3xl border border-border/70 bg-card/80"
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t`User`}</TableHead>
                <TableHead>{t`Entity`}</TableHead>
                <TableHead>{t`Interaction`}</TableHead>
                <TableHead>{t`Reviewed at`}</TableHead>
                <TableHead>{t`Result`}</TableHead>
                <TableHead>{t`Why`}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => {
                const isExpanded = expandedRowKeys.includes(row.rowKey);

                return (
                  <Fragment key={row.rowKey}>
                    <TableRow>
                      <TableCell>
                        <div className="space-y-1">
                          <p
                            className="font-medium text-foreground"
                            title={row.userId}
                          >
                            {formatCampaignAdminNotificationUserLabel(row.userId)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t`Full ID in technical details`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {row.entityName?.trim() || t`Unavailable`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.entityCui?.trim() || t`No entity CUI`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {row.interactionLabel?.trim() ||
                              row.interactionId?.trim() ||
                              t`Unavailable`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.reviewStatus
                              ? t`Review result: ${row.reviewStatus}`
                              : t`No review result`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDateTime(row.reviewedAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getCampaignAdminNotificationResultClassName(
                            row.status,
                          )}
                        >
                          {getCampaignAdminNotificationResultLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[18rem]">
                        <div className="space-y-2">
                          <p className="text-sm text-foreground">
                            {getCampaignAdminNotificationWhyLabel(row)}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto px-0 text-xs text-muted-foreground"
                            onClick={() => {
                              toggleTechnicalDetails(row.rowKey);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {isExpanded
                              ? t`Hide technical details`
                              : t`Show technical details`}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded ? (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-background/40">
                          <div className="grid gap-3 py-2 md:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-1">
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {t`Full user ID`}
                              </p>
                              <p className="font-mono text-xs text-foreground">{row.userId}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {t`Record key`}
                              </p>
                              <p className="font-mono text-xs text-foreground">
                                {formatCampaignAdminNotificationTechnicalValue(
                                  row.recordKey,
                                )}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {t`Interaction ID`}
                              </p>
                              <p className="font-mono text-xs text-foreground">
                                {formatCampaignAdminNotificationTechnicalValue(
                                  row.interactionId,
                                )}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {t`Reason code`}
                              </p>
                              <p className="font-mono text-xs text-foreground">
                                {row.reasonCode}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {t`Existing delivery`}
                              </p>
                              <p className="text-xs text-foreground">
                                {row.existingDeliveryStatus ?? t`None`}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {t`Send mode`}
                              </p>
                              <p className="text-xs text-foreground">
                                {row.sendMode ?? t`Unavailable`}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
