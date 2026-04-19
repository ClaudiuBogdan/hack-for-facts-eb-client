import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { t } from "@lingui/core/macro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CAMPAIGN_ADMIN_PAGE_LIMIT_VALUES,
  getCampaignAdminInstitutionThreadResponseStatusLabel,
  getCampaignAdminInstitutionThreadStateGroupLabel,
  getCampaignAdminInstitutionThreadStateLabel,
} from "@/features/campaigns/buget/admin/constants";
import {
  buildCampaignAdminInstitutionThreadsSearchFromDraft,
  createCampaignAdminInstitutionThreadFilterDraft,
  createCampaignAdminInstitutionThreadsPaginationSignature,
  createEmptyCampaignAdminInstitutionThreadsSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import {
  campaignAdminInstitutionThreadResponseStatusValues,
  campaignAdminInstitutionThreadStateGroupValues,
  campaignAdminInstitutionThreadStateValues,
  type CampaignAdminInstitutionThreadFilterDraft,
  type CampaignAdminInstitutionThreadState,
  type CampaignAdminInstitutionThreadStateGroup,
  type CampaignAdminInstitutionThreadsSearch,
} from "@/features/campaigns/buget/admin/types";
import { cn } from "@/lib/utils";

const ALL_VALUE = "__all__";

type CampaignAdminInstitutionThreadsToolbarProps = {
  readonly search: CampaignAdminInstitutionThreadsSearch;
  readonly isLoading: boolean;
  readonly embedded?: boolean;
  readonly showEntityFilter?: boolean;
  readonly actions?: ReactNode;
  readonly trailingActions?: ReactNode;
  readonly onApply: (search: CampaignAdminInstitutionThreadsSearch) => void;
  readonly onReset: (search: CampaignAdminInstitutionThreadsSearch) => void;
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

type ToolbarInfoRowProps = {
  readonly label: string;
  readonly value: string;
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

function ToolbarInfoRow({ label, value }: ToolbarInfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-b-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-sm text-foreground">
        {value}
      </span>
    </div>
  );
}

function formatDateFilterValue(value: string): string {
  return value.slice(0, 10);
}

function summarizeDateRange(from?: string, to?: string): string | null {
  if (from && to) {
    return `${formatDateFilterValue(from)} - ${formatDateFilterValue(to)}`;
  }

  if (from) {
    return `>= ${formatDateFilterValue(from)}`;
  }

  if (to) {
    return `<= ${formatDateFilterValue(to)}`;
  }

  return null;
}

export function CampaignAdminInstitutionThreadsToolbar({
  search,
  isLoading,
  embedded = false,
  showEntityFilter = true,
  actions,
  trailingActions,
  onApply,
  onReset,
  onRefresh,
}: CampaignAdminInstitutionThreadsToolbarProps) {
  const [draft, setDraft] = useState(
    createCampaignAdminInstitutionThreadFilterDraft(search),
  );
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  useEffect(() => {
    setDraft(createCampaignAdminInstitutionThreadFilterDraft(search));
  }, [search]);

  const updateDraft = (updates: Partial<CampaignAdminInstitutionThreadFilterDraft>) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...updates,
    }));
  };

  const nextSearch = useMemo(
    () => buildCampaignAdminInstitutionThreadsSearchFromDraft(draft, search),
    [draft, search],
  );
  const isDirty =
    createCampaignAdminInstitutionThreadsPaginationSignature(search) !==
    createCampaignAdminInstitutionThreadsPaginationSignature(nextSearch);

  const allowedThreadStates = useMemo(() => {
    const baseValues: CampaignAdminInstitutionThreadState[] =
      draft.stateGroup === "closed"
        ? ["resolved"]
        : ["started", "pending"];

    if (draft.threadState !== "" && !baseValues.includes(draft.threadState)) {
      return [draft.threadState, ...baseValues];
    }

    return baseValues;
  }, [draft.stateGroup, draft.threadState]);

  const activeFilters = useMemo<Array<ActiveFilter>>(() => {
    const filters: ActiveFilter[] = [];

    if (search.stateGroup) {
      filters.push({
        label: t`State group`,
        value: getCampaignAdminInstitutionThreadStateGroupLabel(search.stateGroup),
        section: "core",
      });
    }

    if (search.threadState) {
      filters.push({
        label: t`Thread state`,
        value: getCampaignAdminInstitutionThreadStateLabel(search.threadState),
        section: "core",
      });
    }

    if (search.responseStatus) {
      filters.push({
        label: t`Response`,
        value: getCampaignAdminInstitutionThreadResponseStatusLabel(search.responseStatus),
        section: "core",
      });
    }

    if (search.query) {
      filters.push({
        label: t`Search`,
        value: search.query,
        section: "core",
      });
    }

    if (showEntityFilter && search.entityCui) {
      filters.push({
        label: t`Entity`,
        value: search.entityCui,
        section: "core",
      });
    }

    const updatedRange = summarizeDateRange(
      search.updatedAtFrom,
      search.updatedAtTo,
    );
    if (updatedRange) {
      filters.push({
        label: t`Updated`,
        value: updatedRange,
        section: "advanced",
      });
    }

    const responseRange = summarizeDateRange(
      search.latestResponseAtFrom,
      search.latestResponseAtTo,
    );
    if (responseRange) {
      filters.push({
        label: t`Latest response`,
        value: responseRange,
        section: "advanced",
      });
    }

    return filters;
  }, [search, showEntityFilter]);

  const appliedAdvancedFiltersCount = activeFilters.filter(
    (filter) => filter.section === "advanced",
  ).length;

  const handleReset = () => {
    onReset(createEmptyCampaignAdminInstitutionThreadsSearch({ currentSearch: search }));
    setAdvancedFiltersOpen(false);
  };

  const handleApply = () => {
    onApply(nextSearch);
    setAdvancedFiltersOpen(false);
  };

  const advancedFiltersContent = (
    <div className="space-y-5 px-6 py-6">
      <section className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-foreground">{t`Thread filters`}</h4>
          <p className="text-xs text-muted-foreground">
            {t`Refine the thread state and response status to narrow the operational queue.`}
          </p>
        </div>

        <div className="space-y-3">
          <ToolbarField
            label={t`State group`}
            htmlFor="institution-threads-state-group-sheet"
          >
            <Select
              value={draft.stateGroup}
              onValueChange={(value) =>
                updateDraft({
                  stateGroup: value as CampaignAdminInstitutionThreadStateGroup,
                  threadState:
                    value === "closed"
                      ? draft.threadState === "resolved"
                        ? draft.threadState
                        : ""
                      : draft.threadState === "resolved"
                        ? ""
                        : draft.threadState,
                })
              }
            >
              <SelectTrigger id="institution-threads-state-group-sheet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {campaignAdminInstitutionThreadStateGroupValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {getCampaignAdminInstitutionThreadStateGroupLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Thread state`}
            htmlFor="institution-threads-thread-state-sheet"
          >
            <Select
              value={draft.threadState || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  threadState: value === ALL_VALUE ? "" : (value as typeof draft.threadState),
                })
              }
            >
              <SelectTrigger id="institution-threads-thread-state-sheet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`All states`}</SelectItem>
                {allowedThreadStates.map((value) => (
                  <SelectItem key={value} value={value}>
                    {getCampaignAdminInstitutionThreadStateLabel(
                      value as (typeof campaignAdminInstitutionThreadStateValues)[number],
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Response status`}
            htmlFor="institution-threads-response-status-sheet"
          >
            <Select
              value={draft.responseStatus || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  responseStatus:
                    value === ALL_VALUE
                      ? ""
                      : (value as typeof draft.responseStatus),
                })
              }
            >
              <SelectTrigger id="institution-threads-response-status-sheet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`All response statuses`}</SelectItem>
                {campaignAdminInstitutionThreadResponseStatusValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {getCampaignAdminInstitutionThreadResponseStatusLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          {showEntityFilter ? (
            <ToolbarField
              label={t`Entity CUI`}
              htmlFor="institution-threads-entity-cui-sheet"
            >
              <Input
                id="institution-threads-entity-cui-sheet"
                value={draft.entityCui}
                onChange={(event) =>
                  updateDraft({ entityCui: event.target.value })
                }
                placeholder={t`12345678`}
                autoComplete="off"
                spellCheck={false}
              />
            </ToolbarField>
          ) : null}
        </div>
      </section>

      <div className="h-px bg-border/60" />

      <section className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-foreground">{t`Timeline`}</h4>
          <p className="text-xs text-muted-foreground">
            {t`Narrow the queue by updated date or latest institution response date.`}
          </p>
        </div>

        <div className="space-y-3">
          <ToolbarField
            label={t`Updated from`}
            htmlFor="institution-threads-updated-from-sheet"
          >
            <Input
              id="institution-threads-updated-from-sheet"
              type="date"
              value={draft.updatedAtFrom}
              onChange={(event) =>
                updateDraft({ updatedAtFrom: event.target.value })
              }
              autoComplete="off"
            />
          </ToolbarField>

          <ToolbarField
            label={t`Updated to`}
            htmlFor="institution-threads-updated-to-sheet"
          >
            <Input
              id="institution-threads-updated-to-sheet"
              type="date"
              value={draft.updatedAtTo}
              onChange={(event) =>
                updateDraft({ updatedAtTo: event.target.value })
              }
              autoComplete="off"
            />
          </ToolbarField>

          <ToolbarField
            label={t`Latest response from`}
            htmlFor="institution-threads-latest-response-from-sheet"
          >
            <Input
              id="institution-threads-latest-response-from-sheet"
              type="date"
              value={draft.latestResponseAtFrom}
              onChange={(event) =>
                updateDraft({ latestResponseAtFrom: event.target.value })
              }
              autoComplete="off"
            />
          </ToolbarField>

          <ToolbarField
            label={t`Latest response to`}
            htmlFor="institution-threads-latest-response-to-sheet"
          >
            <Input
              id="institution-threads-latest-response-to-sheet"
              type="date"
              value={draft.latestResponseAtTo}
              onChange={(event) =>
                updateDraft({ latestResponseAtTo: event.target.value })
              }
              autoComplete="off"
            />
          </ToolbarField>
        </div>
      </section>

      <div className="h-px bg-border/60" />

      <section className="space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-foreground">{t`Current view`}</h4>
          <p className="text-xs text-muted-foreground">
            {activeFilters.length === 0
              ? t`Showing the full thread queue by last update.`
              : activeFilters.length === 1
                ? t`1 filter applied`
                : t`${activeFilters.length} filters applied`}
          </p>
        </div>

        {activeFilters.length > 0 ? (
          <div className="rounded-2xl border border-border/60 bg-background/60 px-3">
            {activeFilters.map((activeFilter) => (
              <ToolbarInfoRow
                key={`${activeFilter.label}:${activeFilter.value}`}
                label={activeFilter.label}
                value={activeFilter.value}
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
        embedded ? "" : "rounded-3xl border border-border/70 bg-card/80 p-4 sm:p-5",
      )}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ToolbarField
            label={t`Search`}
            htmlFor="institution-threads-query"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="institution-threads-query"
                value={draft.query}
                onChange={(event) =>
                  updateDraft({ query: event.target.value })
                }
                className="pl-9"
                placeholder={t`Email, subject, or thread text`}
              />
            </div>
          </ToolbarField>

          <ToolbarField
            label={t`State group`}
            htmlFor="institution-threads-state-group"
          >
            <Select
              value={draft.stateGroup}
              onValueChange={(value) =>
                updateDraft({
                  stateGroup: value as CampaignAdminInstitutionThreadStateGroup,
                  threadState:
                    value === "closed"
                      ? draft.threadState === "resolved"
                        ? draft.threadState
                        : ""
                      : draft.threadState === "resolved"
                        ? ""
                        : draft.threadState,
                })
              }
            >
              <SelectTrigger id="institution-threads-state-group">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {campaignAdminInstitutionThreadStateGroupValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {getCampaignAdminInstitutionThreadStateGroupLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField
            label={t`Thread state`}
            htmlFor="institution-threads-thread-state"
          >
            <Select
              value={draft.threadState || ALL_VALUE}
              onValueChange={(value) =>
                updateDraft({
                  threadState: value === ALL_VALUE ? "" : (value as typeof draft.threadState),
                })
              }
            >
              <SelectTrigger id="institution-threads-thread-state">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t`All states`}</SelectItem>
                {allowedThreadStates.map((value) => (
                  <SelectItem key={value} value={value}>
                    {getCampaignAdminInstitutionThreadStateLabel(
                      value as (typeof campaignAdminInstitutionThreadStateValues)[number],
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>

          {showEntityFilter ? (
            <ToolbarField
              label={t`Entity CUI`}
              htmlFor="institution-threads-entity-cui"
            >
              <Input
                id="institution-threads-entity-cui"
                value={draft.entityCui}
                onChange={(event) =>
                  updateDraft({ entityCui: event.target.value })
                }
                placeholder={t`12345678`}
                autoComplete="off"
                spellCheck={false}
              />
            </ToolbarField>
          ) : null}

          <ToolbarField
            label={t`Rows per page`}
            htmlFor="institution-threads-limit"
          >
            <Select
              value={String(draft.limit)}
              onValueChange={(value) =>
                updateDraft({ limit: Number(value) })
              }
            >
              <SelectTrigger id="institution-threads-limit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_ADMIN_PAGE_LIMIT_VALUES.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={() => setAdvancedFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {appliedAdvancedFiltersCount > 0
              ? t`Advanced (${appliedAdvancedFiltersCount})`
              : t`Advanced`}
          </Button>
          {actions}
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

      <Sheet
        open={advancedFiltersOpen}
        onOpenChange={setAdvancedFiltersOpen}
      >
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col overflow-hidden border-l border-border/70 bg-background px-0 sm:max-w-3xl"
        >
          <SheetHeader className="shrink-0 space-y-2 border-b border-border/60 px-6 pb-5">
            <SheetTitle className="text-lg font-medium tracking-tight">
              {t`Advanced filters`}
            </SheetTitle>
            <SheetDescription>
              {t`Use date ranges and secondary fields when the quick filters are not enough.`}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {advancedFiltersContent}
          </div>

          <SheetFooter className="shrink-0 gap-2 border-t border-border/60 bg-background px-6 py-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdvancedFiltersOpen(false)}
              size="sm"
              className="rounded-lg"
            >
              {t`Close`}
            </Button>
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
