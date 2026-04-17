import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SearchX } from "lucide-react";
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
import {
  getCampaignAdminInstitutionThreadResponseStatusLabel,
  getCampaignAdminInstitutionThreadStateLabel,
} from "@/features/campaigns/buget/admin/constants";
import { CampaignAdminInstitutionThreadAudienceSummary } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadAudienceSummary";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminInstitutionThreadListItem,
  CampaignAdminInstitutionThreadsSearch,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminInstitutionThreadsTableProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly items: readonly CampaignAdminInstitutionThreadListItem[];
  readonly search: CampaignAdminInstitutionThreadsSearch;
  readonly selectedThreadId?: string | null;
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
  readonly onOpenThread: (threadId: string) => void;
  readonly onClearFilters: () => void;
};

function formatDateTime(value: string | null): string {
  if (value === null) {
    return t`Unavailable`;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return t`Unavailable`;
  }

  return parsedDate.toLocaleString();
}

function getThreadStateBadgeClassName(
  threadState: CampaignAdminInstitutionThreadListItem["threadState"],
): string {
  switch (threadState) {
    case "started":
      return "border-sky-300 bg-sky-100 text-sky-950";
    case "pending":
      return "border-amber-300 bg-amber-100 text-amber-950";
    case "resolved":
      return "border-emerald-300 bg-emerald-100 text-emerald-950";
    default:
      return "";
  }
}

function getResponseStatusBadgeClassName(
  responseStatus: CampaignAdminInstitutionThreadListItem["currentResponseStatus"],
): string {
  switch (responseStatus) {
    case "registration_number_received":
      return "border-sky-300 bg-sky-100 text-sky-950";
    case "request_confirmed":
      return "border-emerald-300 bg-emerald-100 text-emerald-950";
    case "request_denied":
      return "border-rose-300 bg-rose-100 text-rose-950";
    case null:
      return "border-slate-300 bg-slate-100 text-slate-900";
    default:
      return "";
  }
}

function toDetailSearch(
  search: CampaignAdminInstitutionThreadsSearch,
) {
  return {
    ...search,
    selectedThreadId: undefined,
  };
}

export function CampaignAdminInstitutionThreadsTable({
  campaignKey,
  items,
  search,
  selectedThreadId = null,
  header,
  footer,
  onOpenThread,
  onClearFilters,
}: CampaignAdminInstitutionThreadsTableProps) {
  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          icon={<SearchX className="h-5 w-5" aria-hidden="true" />}
          title={t`No institution threads matched these filters`}
          description={t`Adjust the current filters or clear them to load more thread rows.`}
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
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-none">
      {header ? <div className="border-b border-border/60 p-4">{header}</div> : null}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t`Entity`}</TableHead>
              <TableHead>{t`Institution email`}</TableHead>
              <TableHead>{t`Subject`}</TableHead>
              <TableHead>{t`Thread state`}</TableHead>
              <TableHead>{t`Response status`}</TableHead>
              <TableHead>{t`Latest response`}</TableHead>
              <TableHead>{t`Updated`}</TableHead>
              <TableHead>{t`Responses`}</TableHead>
              <TableHead>{t`Audience`}</TableHead>
              <TableHead className="text-right">{t`Actions`}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                data-state={selectedThreadId === item.id ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => onOpenThread(item.id)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") {
                    return;
                  }

                  event.preventDefault();
                  onOpenThread(item.id);
                }}
                tabIndex={0}
              >
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {item.entityName?.trim() || item.entityCui}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.entityCui}</p>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {item.institutionEmail}
                </TableCell>
                <TableCell className="max-w-sm">
                  <p className="line-clamp-2 break-words">{item.subject}</p>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={getThreadStateBadgeClassName(item.threadState)}
                  >
                    {getCampaignAdminInstitutionThreadStateLabel(item.threadState)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={getResponseStatusBadgeClassName(
                      item.currentResponseStatus,
                    )}
                  >
                    {getCampaignAdminInstitutionThreadResponseStatusLabel(
                      item.currentResponseStatus,
                    )}
                  </Badge>
                </TableCell>
                <TableCell>{formatDateTime(item.latestResponseAt)}</TableCell>
                <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                <TableCell>{item.responseEventCount}</TableCell>
                <TableCell className="min-w-56">
                  <CampaignAdminInstitutionThreadAudienceSummary
                    audience={item.notificationAudience}
                    variant="compact"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm" className="rounded-full">
                      <Link
                        to="/admin/campaigns/$campaignKey/institution-threads/$threadId"
                        params={{ campaignKey, threadId: item.id }}
                        search={toDetailSearch(search) as never}
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        {t`Open details`}
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenThread(item.id);
                      }}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      {t`Open panel`}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {footer ? <div className="border-t border-border/60 px-4 py-3">{footer}</div> : null}
    </div>
  );
}
