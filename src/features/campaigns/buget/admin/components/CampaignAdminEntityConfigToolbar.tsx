import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { t } from "@lingui/core/macro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  CAMPAIGN_ADMIN_ENTITY_CONFIG_PAGE_LIMIT_VALUES,
  CAMPAIGN_ADMIN_ENTITY_CONFIG_SORTABLE_COLUMNS,
  getCampaignAdminEntityConfigSortLabel,
} from "@/features/campaigns/buget/admin/constants";
import {
  createCampaignAdminEntityConfigPaginationSignature,
  createEmptyCampaignAdminEntityConfigSearch,
  normalizeCampaignAdminEntityConfigSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import type {
  CampaignAdminEntityConfigSearch,
  CampaignAdminEntityConfigSortKey,
  CampaignAdminSortOrder,
} from "@/features/campaigns/buget/admin/types";
import {
  toDateInputValue,
  toUtcRangeBoundary,
} from "@/features/campaigns/buget/admin/utils/date-inputs";
import { cn } from "@/lib/utils";

const SORT_SEPARATOR = "::";
const ANY_FILTER_VALUE = "__any__";

type CampaignAdminEntityConfigToolbarProps = {
  readonly search: CampaignAdminEntityConfigSearch;
  readonly isLoading: boolean;
  readonly embedded?: boolean;
  readonly actions?: ReactNode;
  readonly onApply: (search: CampaignAdminEntityConfigSearch) => void;
  readonly onReset: (search: CampaignAdminEntityConfigSearch) => void;
  readonly onRefresh: () => void;
  readonly onOpenEntity?: (
    entityCui: string,
    search: CampaignAdminEntityConfigSearch,
  ) => void;
  readonly onCreateEntity?: (
    entityCui: string,
    search: CampaignAdminEntityConfigSearch,
  ) => void;
  readonly onOpenPasteDialog?: () => Promise<void> | void;
  readonly onExportCsv?: () => Promise<void> | void;
};

type ToolbarFieldProps = {
  readonly label: string;
  readonly htmlFor?: string;
  readonly children: ReactNode;
  readonly className?: string;
};

type EntityConfigDraft = {
  readonly entityCui: string;
  readonly budgetPublicationDate: string;
  readonly hasBudgetPublicationDate: "" | "true" | "false";
  readonly officialBudgetUrl: string;
  readonly hasOfficialBudgetUrl: "" | "true" | "false";
  readonly hasPublicDebate: "" | "true" | "false";
  readonly updatedAtFrom: string;
  readonly updatedAtTo: string;
  readonly sortBy: CampaignAdminEntityConfigSortKey;
  readonly sortOrder: CampaignAdminSortOrder;
  readonly limit: number;
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

function createDraftFromSearch(
  search: CampaignAdminEntityConfigSearch,
): EntityConfigDraft {
  const sortBy = search.sortBy ?? "updatedAt";

  return {
    entityCui: search.entityCui ?? "",
    budgetPublicationDate: search.budgetPublicationDate ?? "",
    hasBudgetPublicationDate:
      search.hasBudgetPublicationDate === undefined
        ? ""
        : String(search.hasBudgetPublicationDate) as "true" | "false",
    officialBudgetUrl: search.officialBudgetUrl ?? "",
    hasOfficialBudgetUrl:
      search.hasOfficialBudgetUrl === undefined
        ? ""
        : String(search.hasOfficialBudgetUrl) as "true" | "false",
    hasPublicDebate:
      search.hasPublicDebate === undefined
        ? ""
        : String(search.hasPublicDebate) as "true" | "false",
    updatedAtFrom: toDateInputValue(search.updatedAtFrom),
    updatedAtTo: toDateInputValue(search.updatedAtTo),
    sortBy,
    sortOrder:
      search.sortOrder ??
      CAMPAIGN_ADMIN_ENTITY_CONFIG_SORTABLE_COLUMNS[sortBy].defaultOrder,
    limit: search.limit,
  };
}

function buildSearchFromDraft(
  draft: EntityConfigDraft,
): CampaignAdminEntityConfigSearch {
  return normalizeCampaignAdminEntityConfigSearch({
    entityCui: draft.entityCui.trim() || undefined,
    budgetPublicationDate: draft.budgetPublicationDate.trim() || undefined,
    hasBudgetPublicationDate:
      draft.hasBudgetPublicationDate === ""
        ? undefined
        : draft.hasBudgetPublicationDate === "true",
    officialBudgetUrl: draft.officialBudgetUrl.trim() || undefined,
    hasOfficialBudgetUrl:
      draft.hasOfficialBudgetUrl === ""
        ? undefined
        : draft.hasOfficialBudgetUrl === "true",
    hasPublicDebate:
      draft.hasPublicDebate === ""
        ? undefined
        : draft.hasPublicDebate === "true",
    updatedAtFrom: toUtcRangeBoundary(draft.updatedAtFrom, "start"),
    updatedAtTo: toUtcRangeBoundary(draft.updatedAtTo, "end"),
    sortBy: draft.sortBy,
    sortOrder: draft.sortOrder,
    limit: draft.limit,
  });
}

function summarizeDateRange(from?: string, to?: string): string | null {
  const normalizedFrom = toDateInputValue(from);
  const normalizedTo = toDateInputValue(to);

  if (normalizedFrom && normalizedTo) {
    return `${normalizedFrom} - ${normalizedTo}`;
  }

  if (normalizedFrom) {
    return `>= ${normalizedFrom}`;
  }

  if (normalizedTo) {
    return `<= ${normalizedTo}`;
  }

  return null;
}

function getSortValue(
  sortBy: CampaignAdminEntityConfigSortKey,
  sortOrder: CampaignAdminSortOrder,
): string {
  return `${sortBy}${SORT_SEPARATOR}${sortOrder}`;
}

function getSortLabel(
  sortBy: CampaignAdminEntityConfigSortKey,
  sortOrder: CampaignAdminSortOrder,
): string {
  return sortOrder === "asc"
    ? t`${getCampaignAdminEntityConfigSortLabel(sortBy)} (ascending)`
    : t`${getCampaignAdminEntityConfigSortLabel(sortBy)} (descending)`;
}

export function CampaignAdminEntityConfigToolbar({
  search,
  isLoading,
  embedded = false,
  actions,
  onApply,
  onReset,
  onRefresh,
  onOpenEntity,
  onCreateEntity,
  onOpenPasteDialog,
  onExportCsv,
}: CampaignAdminEntityConfigToolbarProps) {
  const tableActionsMenuLabel = t`Table actions`;
  const [draft, setDraft] = useState<EntityConfigDraft>(
    createDraftFromSearch(search),
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setDraft(createDraftFromSearch(search));
  }, [search]);

  const nextSearch = useMemo(() => buildSearchFromDraft(draft), [draft]);
  const isDirty =
    createCampaignAdminEntityConfigPaginationSignature(search) !==
    createCampaignAdminEntityConfigPaginationSignature(nextSearch);
  const hasPayloadFilters =
    search.budgetPublicationDate !== undefined ||
    search.hasBudgetPublicationDate !== undefined ||
    search.officialBudgetUrl !== undefined ||
    search.hasOfficialBudgetUrl !== undefined ||
    search.hasPublicDebate !== undefined;
  const hasUpdatedRangeFilter =
    summarizeDateRange(search.updatedAtFrom, search.updatedAtTo) !== null;
  const advancedCount =
    Number(hasUpdatedRangeFilter) +
    Number(search.budgetPublicationDate !== undefined) +
    Number(search.hasBudgetPublicationDate !== undefined) +
    Number(search.officialBudgetUrl !== undefined) +
    Number(search.hasOfficialBudgetUrl !== undefined) +
    Number(search.hasPublicDebate !== undefined);

  const handleReset = () => {
    const resetSearch = createEmptyCampaignAdminEntityConfigSearch({
      currentSearch: search,
      limit: search.limit,
    });
    setDraft(createDraftFromSearch(resetSearch));
    onReset(resetSearch);
    setAdvancedOpen(false);
  };

  const handleApply = () => {
    onApply(nextSearch);
    setAdvancedOpen(false);
  };

  const handleOpenEntity = (mode: "open" | "create") => {
    const entityCui = draft.entityCui.trim();
    if (mode === "open" && entityCui.length === 0) {
      return;
    }

    if (mode === "open") {
      onOpenEntity?.(entityCui, nextSearch);
      return;
    }

    onCreateEntity?.(entityCui, nextSearch);
  };

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
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px]">
          <ToolbarField
            label={t`Entity CUI`}
            htmlFor="entity-config-entity-cui"
          >
          <Input
            id="entity-config-entity-cui"
            value={draft.entityCui}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setDraft((currentDraft) => ({
                ...currentDraft,
                entityCui: nextValue,
              }));
            }}
            placeholder={t`Exact entity CUI`}
            autoComplete="off"
            spellCheck={false}
          />
          </ToolbarField>

          <ToolbarField label={t`Rows per page`} htmlFor="entity-config-limit">
            <Select
              value={String(draft.limit)}
              onValueChange={(value) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  limit: Number(value),
                }))
              }
            >
              <SelectTrigger id="entity-config-limit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_ADMIN_ENTITY_CONFIG_PAGE_LIMIT_VALUES.map((limit) => (
                  <SelectItem key={limit} value={String(limit)}>
                    {limit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {actions}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            disabled={draft.entityCui.trim().length === 0 || isLoading}
            onClick={() => handleOpenEntity("open")}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {t`Open entity`}
          </Button>
          {onCreateEntity || onOpenPasteDialog || onExportCsv ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full"
                  aria-label={tableActionsMenuLabel}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  {t`More`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onCreateEntity ? (
                  <DropdownMenuItem onSelect={() => handleOpenEntity("create")}>
                    {t`Create config`}
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
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={() => setAdvancedOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {advancedCount > 0
              ? t`Advanced (${advancedCount})`
              : t`Advanced`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={handleReset}
            disabled={!isDirty && !hasUpdatedRangeFilter && !hasPayloadFilters && !search.entityCui}
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
        </div>
      </div>

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
              {t`Refine the campaign entity config list with exact entity and update-date criteria.`}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-5">
              <section className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-foreground">
                    {t`Entity filters`}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t`Use these controls when the main header controls are not specific enough.`}
                  </p>
                </div>

                <div className="space-y-3">
                  <ToolbarField
                    label={t`Entity CUI`}
                    htmlFor="entity-config-advanced-cui"
                  >
                    <Input
                      id="entity-config-advanced-cui"
                      value={draft.entityCui}
                      onChange={(event) => {
                        const nextValue = event.currentTarget.value;
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          entityCui: nextValue,
                        }));
                      }}
                      placeholder={t`Exact entity CUI`}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </ToolbarField>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ToolbarField
                      label={t`Budget publication date`}
                      htmlFor="entity-config-budget-publication-date"
                    >
                      <Input
                        id="entity-config-budget-publication-date"
                        type="date"
                        value={draft.budgetPublicationDate}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            budgetPublicationDate: nextValue,
                          }));
                        }}
                      />
                    </ToolbarField>

                    <ToolbarField
                      label={t`Budget URL contains`}
                      htmlFor="entity-config-budget-url"
                    >
                      <Input
                        id="entity-config-budget-url"
                        value={draft.officialBudgetUrl}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            officialBudgetUrl: nextValue,
                          }));
                        }}
                        placeholder={t`Budget URL`}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </ToolbarField>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ToolbarField
                      label={t`Has publication date`}
                      htmlFor="entity-config-has-publication-date"
                    >
                      <Select
                        value={draft.hasBudgetPublicationDate || ANY_FILTER_VALUE}
                        onValueChange={(value) =>
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            hasBudgetPublicationDate:
                              value === ANY_FILTER_VALUE
                                ? ""
                                : (value as "true" | "false"),
                          }))
                        }
                      >
                        <SelectTrigger id="entity-config-has-publication-date">
                          <SelectValue placeholder={t`Any`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ANY_FILTER_VALUE}>{t`Any`}</SelectItem>
                          <SelectItem value="true">{t`Yes`}</SelectItem>
                          <SelectItem value="false">{t`No`}</SelectItem>
                        </SelectContent>
                      </Select>
                    </ToolbarField>

                    <ToolbarField
                      label={t`Has budget URL`}
                      htmlFor="entity-config-has-budget-url"
                    >
                      <Select
                        value={draft.hasOfficialBudgetUrl || ANY_FILTER_VALUE}
                        onValueChange={(value) =>
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            hasOfficialBudgetUrl:
                              value === ANY_FILTER_VALUE
                                ? ""
                                : (value as "true" | "false"),
                          }))
                        }
                      >
                        <SelectTrigger id="entity-config-has-budget-url">
                          <SelectValue placeholder={t`Any`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ANY_FILTER_VALUE}>{t`Any`}</SelectItem>
                          <SelectItem value="true">{t`Yes`}</SelectItem>
                          <SelectItem value="false">{t`No`}</SelectItem>
                        </SelectContent>
                      </Select>
                    </ToolbarField>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ToolbarField
                      label={t`Has public debate`}
                      htmlFor="entity-config-has-public-debate"
                    >
                      <Select
                        value={draft.hasPublicDebate || ANY_FILTER_VALUE}
                        onValueChange={(value) =>
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            hasPublicDebate:
                              value === ANY_FILTER_VALUE
                                ? ""
                                : (value as "true" | "false"),
                          }))
                        }
                      >
                        <SelectTrigger id="entity-config-has-public-debate">
                          <SelectValue placeholder={t`Any`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ANY_FILTER_VALUE}>{t`Any`}</SelectItem>
                          <SelectItem value="true">{t`Yes`}</SelectItem>
                          <SelectItem value="false">{t`No`}</SelectItem>
                        </SelectContent>
                      </Select>
                    </ToolbarField>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ToolbarField
                      label={t`Updated from`}
                      htmlFor="entity-config-updated-at-from"
                    >
                      <Input
                        id="entity-config-updated-at-from"
                        type="date"
                        value={draft.updatedAtFrom}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            updatedAtFrom: nextValue,
                          }));
                        }}
                      />
                    </ToolbarField>

                    <ToolbarField
                      label={t`Updated to`}
                      htmlFor="entity-config-updated-at-to"
                    >
                      <Input
                        id="entity-config-updated-at-to"
                        type="date"
                        value={draft.updatedAtTo}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            updatedAtTo: nextValue,
                          }));
                        }}
                      />
                    </ToolbarField>
                  </div>
                </div>
              </section>

              <div className="h-px bg-border/60" />

              <section className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-foreground">
                    {t`Display options`}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t`Control how the config table is sorted and paginated.`}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ToolbarField label={t`Sort`} htmlFor="entity-config-sort">
                    <Select
                      value={getSortValue(draft.sortBy, draft.sortOrder)}
                      onValueChange={(value) => {
                        const [sortBy, sortOrder] = value.split(
                          SORT_SEPARATOR,
                        ) as [
                          CampaignAdminEntityConfigSortKey,
                          CampaignAdminSortOrder,
                        ];
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          sortBy,
                          sortOrder,
                        }));
                      }}
                    >
                      <SelectTrigger id="entity-config-sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.keys(
                            CAMPAIGN_ADMIN_ENTITY_CONFIG_SORTABLE_COLUMNS,
                          ) as CampaignAdminEntityConfigSortKey[]
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
                    htmlFor="entity-config-advanced-limit"
                  >
                    <Select
                      value={String(draft.limit)}
                      onValueChange={(value) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          limit: Number(value),
                        }))
                      }
                    >
                      <SelectTrigger id="entity-config-advanced-limit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPAIGN_ADMIN_ENTITY_CONFIG_PAGE_LIMIT_VALUES.map((limit) => (
                          <SelectItem key={limit} value={String(limit)}>
                            {limit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ToolbarField>
                </div>
              </section>
            </div>
          </div>

          <SheetFooter className="gap-2 border-t border-border/60 px-6 pt-5 sm:justify-between">
            <Button type="button" variant="outline" onClick={handleReset}>
              {t`Clear filters`}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdvancedOpen(false)}
              >
                {t`Close`}
              </Button>
              <Button type="button" onClick={handleApply}>
                {t`Apply filters`}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export type { CampaignAdminEntityConfigToolbarProps };
