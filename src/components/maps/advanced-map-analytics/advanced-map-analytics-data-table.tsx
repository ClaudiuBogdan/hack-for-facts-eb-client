import { compareMapDecimals, readMapDecimal } from '@/lib/map-series/decimal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, ChevronRight, ChevronUp, Filter, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTablePreferences } from '@/hooks/useTablePreferences';
import { cn, slugify } from '@/lib/utils';
import { formatAdvancedMapAnalyticsSeriesValue } from './advanced-map-analytics-formatting';
import { t } from '@lingui/core/macro';
import type {
  AdvancedMapAnalyticsBinsFilterSection,
  AdvancedMapAnalyticsTableGroupingColumn,
  AdvancedMapAnalyticsTableRow,
  AdvancedMapAnalyticsTableRowMode,
  AdvancedMapAnalyticsTableSeriesColumn,
} from './advanced-map-analytics-table-types';
import {
  getAdvancedMapAnalyticsTableRowId,
  getAdvancedMapAnalyticsTableRowKind,
  getAdvancedMapAnalyticsTableRowSearchText,
  isAdvancedMapAnalyticsGroupedTableRowMode,
} from './advanced-map-analytics-table-rows';
import {
  countAdvancedMapAnalyticsTablePaginationRows,
  paginateAdvancedMapAnalyticsTableRows,
} from './advanced-map-analytics-table-pagination';

export type {
  AdvancedMapAnalyticsBinsFilterSection,
  AdvancedMapAnalyticsTableRow,
  AdvancedMapAnalyticsTableRowMode,
  AdvancedMapAnalyticsTableSeriesColumn,
} from './advanced-map-analytics-table-types';

interface AdvancedMapAnalyticsDataTableProps {
  rows: AdvancedMapAnalyticsTableRow[];
  seriesColumns: AdvancedMapAnalyticsTableSeriesColumn[];
  groupingColumns?: AdvancedMapAnalyticsTableGroupingColumn[];
  mapTitle: string;
  showExportCsv: boolean;
  activeSeriesId?: string;
  onRowClick?: (row: AdvancedMapAnalyticsTableRow) => void;
  rowMode?: AdvancedMapAnalyticsTableRowMode;
  onRowModeChange?: (rowMode: AdvancedMapAnalyticsTableRowMode) => void;
  groupedRowModesAvailable?: boolean;
  showMemberValues?: boolean;
  onShowMemberValuesChange?: (showMemberValues: boolean) => void;
  hiddenUngroupedUatCount?: number;
  binsFilterSections: AdvancedMapAnalyticsBinsFilterSection[];
  onToggleBinFilter: (presetId: string, groupId: string, checked: boolean) => void;
  onClearPresetBinFilters: (presetId: string) => void;
  onClearAllBinFilters: () => void;
  hasActiveBinFilters: boolean;
}

function getSeriesColumnId(seriesId: string): string {
  return `series:${seriesId}`;
}

function getGroupingColumnId(groupingId: string): string {
  return `grouping:${groupingId}`;
}

function getSeriesIdFromColumnId(columnId: string): string | undefined {
  return columnId.startsWith('series:') ? columnId.slice('series:'.length) : undefined;
}

function getGroupingIdFromColumnId(columnId: string): string | undefined {
  return columnId.startsWith('grouping:') ? columnId.slice('grouping:'.length) : undefined;
}

function getColumnLabel(
  columnId: string,
  seriesLabelById: Map<string, string>,
  groupingLabelById: Map<string, string>
): string {
  const seriesId = getSeriesIdFromColumnId(columnId);
  if (seriesId) {
    return seriesLabelById.get(seriesId) ?? seriesId;
  }

  const groupingId = getGroupingIdFromColumnId(columnId);
  if (groupingId) {
    return groupingLabelById.get(groupingId) ?? groupingId;
  }

  if (columnId === 'uat_name') {
    return t`UAT`;
  }

  if (columnId === 'group_identity') {
    return t`Group / UAT`;
  }

  if (columnId === 'county_name') {
    return t`County`;
  }

  if (columnId === 'siruta_code') {
    return 'SIRUTA';
  }

  return columnId;
}

function getColumnRowValue(row: AdvancedMapAnalyticsTableRow, columnId: string): string {
  if (columnId === 'uat_name') {
    return row.uatName;
  }

  if (columnId === 'group_identity') {
    return row.kind === 'group'
      ? row.groupLabel ?? row.uatName
      : row.uatName;
  }

  if (columnId === 'county_name') {
    return row.countyName;
  }

  if (columnId === 'siruta_code') {
    return row.sirutaCode ?? '';
  }

  const seriesId = getSeriesIdFromColumnId(columnId);
  if (seriesId) {
    const value = row.valuesBySeriesId[seriesId];
    if (readMapDecimal(value) === undefined) {
      return '';
    }

    return value ?? '';
  }

  const groupingId = getGroupingIdFromColumnId(columnId);
  if (groupingId) {
    return row.groupValuesByGroupingId?.[groupingId] ?? '';
  }

  return '';
}

function escapeCsvCell(value: string): string {
  const shouldQuote = value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r');
  if (!shouldQuote) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function padTimestampPart(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatTimestampUtc(date: Date): string {
  const year = date.getUTCFullYear();
  const month = padTimestampPart(date.getUTCMonth() + 1);
  const day = padTimestampPart(date.getUTCDate());
  const hours = padTimestampPart(date.getUTCHours());
  const minutes = padTimestampPart(date.getUTCMinutes());
  const seconds = padTimestampPart(date.getUTCSeconds());

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function buildCsvExportFileName(mapTitle: string): string {
  const normalizedTitle = slugify(mapTitle) || 'untitled-map';
  const timestamp = formatTimestampUtc(new Date());
  return `map-${normalizedTitle}-${timestamp}.csv`;
}

function compareRowsByNameAndSiruta(
  left: Pick<AdvancedMapAnalyticsTableRow, 'uatName' | 'sirutaCode'>,
  right: Pick<AdvancedMapAnalyticsTableRow, 'uatName' | 'sirutaCode'>
): number {
  const nameCompare = left.uatName.localeCompare(right.uatName, undefined, {
    sensitivity: 'base',
  });
  if (nameCompare !== 0) {
    return nameCompare;
  }

  return (left.sirutaCode ?? '').localeCompare(right.sirutaCode ?? '');
}

function getTableRowSortValue(row: AdvancedMapAnalyticsTableRow, columnId: string): string | number | undefined {
  if (columnId === 'group_identity' || columnId === 'uat_name') {
    return row.uatName;
  }

  if (columnId === 'county_name') {
    return row.countyName;
  }

  if (columnId === 'siruta_code') {
    return row.sirutaCode ?? '';
  }

  const seriesId = getSeriesIdFromColumnId(columnId);
  if (seriesId) {
    return row.valuesBySeriesId[seriesId];
  }

  const groupingId = getGroupingIdFromColumnId(columnId);
  if (groupingId) {
    return row.groupValuesByGroupingId?.[groupingId] ?? '';
  }

  return undefined;
}

function compareTableRowsByColumn(
  left: AdvancedMapAnalyticsTableRow,
  right: AdvancedMapAnalyticsTableRow,
  columnId: string,
  desc: boolean
): number {
  const leftValue = getTableRowSortValue(left, columnId);
  const rightValue = getTableRowSortValue(right, columnId);
  const leftMissing = leftValue === undefined || leftValue === '';
  const rightMissing = rightValue === undefined || rightValue === '';

  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) {
      return compareRowsByNameAndSiruta(left, right);
    }
    return leftMissing ? 1 : -1;
  }

  let result: number;
  if (getSeriesIdFromColumnId(columnId)) {
    result = compareMapDecimals(String(leftValue), String(rightValue));
  } else {
    result = String(leftValue).localeCompare(String(rightValue), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }

  if (result === 0) {
    result = compareRowsByNameAndSiruta(left, right);
  }

  return desc ? -result : result;
}

function filterTableRowsBySearch(
  rows: AdvancedMapAnalyticsTableRow[],
  searchValue: string,
  rowMode: AdvancedMapAnalyticsTableRowMode
): AdvancedMapAnalyticsTableRow[] {
  const search = searchValue.trim().toLocaleLowerCase();
  if (!search) {
    return rows;
  }

  if (rowMode !== 'group_rows_with_members') {
    return rows.filter((row) =>
      rowMode === 'uat_rows'
        ? row.uatName.toLocaleLowerCase().includes(search)
        : getAdvancedMapAnalyticsTableRowSearchText(row).includes(search)
    );
  }

  const rowsByParentId = new Map<string, AdvancedMapAnalyticsTableRow[]>();
  const result: AdvancedMapAnalyticsTableRow[] = [];

  for (const row of rows) {
    if (getAdvancedMapAnalyticsTableRowKind(row) !== 'group-member' || !row.parentRowId) {
      continue;
    }
    const children = rowsByParentId.get(row.parentRowId) ?? [];
    children.push(row);
    rowsByParentId.set(row.parentRowId, children);
  }

  for (const row of rows) {
    const kind = getAdvancedMapAnalyticsTableRowKind(row);
    if (kind === 'group-member') {
      continue;
    }

    const rowMatches = [
      row.uatName,
      row.groupId,
      row.groupLabel,
      row.groupWorkspaceLabel,
      row.primaryUatName,
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLocaleLowerCase()
      .includes(search);
    const children = rowsByParentId.get(getAdvancedMapAnalyticsTableRowId(row)) ?? [];
    const matchingChildren = children.filter((child) =>
      getAdvancedMapAnalyticsTableRowSearchText(child).includes(search)
    );

    if (!rowMatches && matchingChildren.length === 0) {
      continue;
    }

    result.push(row);
    result.push(...(rowMatches ? children : matchingChildren));
  }

  return result;
}

function applyGroupedRowExpansion(
  rows: AdvancedMapAnalyticsTableRow[],
  collapsedGroupRowIds: Set<string>,
  rowMode: AdvancedMapAnalyticsTableRowMode,
  hasSearch: boolean
): AdvancedMapAnalyticsTableRow[] {
  if (rowMode !== 'group_rows_with_members' || hasSearch || collapsedGroupRowIds.size === 0) {
    return rows;
  }

  return rows.filter((row) => {
    if (getAdvancedMapAnalyticsTableRowKind(row) !== 'group-member') {
      return true;
    }
    return !row.parentRowId || !collapsedGroupRowIds.has(row.parentRowId);
  });
}

function sortTableRows(
  rows: AdvancedMapAnalyticsTableRow[],
  sorting: SortingState,
  rowMode: AdvancedMapAnalyticsTableRowMode
): AdvancedMapAnalyticsTableRow[] {
  const activeSort = sorting[0];
  if (!activeSort) {
    return rows;
  }

  if (rowMode !== 'group_rows_with_members') {
    return [...rows].sort((left, right) =>
      compareTableRowsByColumn(left, right, activeSort.id, activeSort.desc)
    );
  }

  const blocks: Array<{
    parent: AdvancedMapAnalyticsTableRow;
    children: AdvancedMapAnalyticsTableRow[];
  }> = [];
  const currentBlockByParentId = new Map<string, {
    parent: AdvancedMapAnalyticsTableRow;
    children: AdvancedMapAnalyticsTableRow[];
  }>();

  for (const row of rows) {
    const kind = getAdvancedMapAnalyticsTableRowKind(row);
    if (kind === 'group-member') {
      const block = row.parentRowId ? currentBlockByParentId.get(row.parentRowId) : undefined;
      if (block) {
        block.children.push(row);
      }
      continue;
    }

    const block = { parent: row, children: [] };
    blocks.push(block);
    currentBlockByParentId.set(getAdvancedMapAnalyticsTableRowId(row), block);
  }

  return blocks
    .sort((left, right) =>
      compareTableRowsByColumn(left.parent, right.parent, activeSort.id, activeSort.desc)
    )
    .flatMap((block) => [block.parent, ...block.children]);
}

export function AdvancedMapAnalyticsDataTable({
  rows,
  seriesColumns,
  groupingColumns = [],
  mapTitle,
  showExportCsv,
  activeSeriesId,
  onRowClick,
  rowMode = 'uat_rows',
  onRowModeChange,
  groupedRowModesAvailable = false,
  showMemberValues = true,
  onShowMemberValuesChange,
  hiddenUngroupedUatCount = 0,
  binsFilterSections,
  onToggleBinFilter,
  onClearPresetBinFilters,
  onClearAllBinFilters,
  hasActiveBinFilters,
}: Readonly<AdvancedMapAnalyticsDataTableProps>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchValue, setSearchValue] = useState('');
  const [collapsedGroupRowIds, setCollapsedGroupRowIds] = useState<Set<string>>(() => new Set());
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const isGroupedRowMode = isAdvancedMapAnalyticsGroupedTableRowMode(rowMode);

  useEffect(() => {
    const hasValidActiveSeries =
      typeof activeSeriesId === 'string' &&
      seriesColumns.some((seriesColumn) => seriesColumn.id === activeSeriesId);

    if (!hasValidActiveSeries) {
      setSorting([]);
      return;
    }

    setSorting([
      {
        id: getSeriesColumnId(activeSeriesId),
        desc: true,
      },
    ]);
  }, [activeSeriesId, seriesColumns]);

  const { density, setDensity, columnVisibility, setColumnVisibility } = useTablePreferences(
    'advanced-map-analytics-data-table',
    {
      columnVisibility: {
        uat_name: true,
        county_name: true,
        siruta_code: true,
      },
    }
  );

  useEffect(() => {
    const requiredColumnIds = [
      ...(isGroupedRowMode
        ? ['group_identity']
        : [
            'uat_name',
            'county_name',
            'siruta_code',
            ...groupingColumns.map((groupingColumn) => getGroupingColumnId(groupingColumn.id)),
          ]),
      ...seriesColumns.map((seriesColumn) => getSeriesColumnId(seriesColumn.id)),
    ];

    const hasMissingDefaults = requiredColumnIds.some(
      (columnId) => columnVisibility[columnId] === undefined
    );
    if (!hasMissingDefaults) {
      return;
    }

    setColumnVisibility((previousVisibility: Record<string, boolean>) => {
      const nextVisibility = { ...previousVisibility };
      let changed = false;

      const ensureVisibleByDefault = (columnId: string) => {
        if (nextVisibility[columnId] === undefined) {
          nextVisibility[columnId] = true;
          changed = true;
        }
      };

      if (isGroupedRowMode) {
        ensureVisibleByDefault('group_identity');
      } else {
        ensureVisibleByDefault('uat_name');
        ensureVisibleByDefault('county_name');
        ensureVisibleByDefault('siruta_code');

        for (const groupingColumn of groupingColumns) {
          ensureVisibleByDefault(getGroupingColumnId(groupingColumn.id));
        }
      }

      for (const seriesColumn of seriesColumns) {
        ensureVisibleByDefault(getSeriesColumnId(seriesColumn.id));
      }

      return changed ? nextVisibility : previousVisibility;
    });
  }, [columnVisibility, groupingColumns, isGroupedRowMode, seriesColumns, setColumnVisibility]);

  const seriesLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const seriesColumn of seriesColumns) {
      map.set(seriesColumn.id, seriesColumn.label);
    }
    return map;
  }, [seriesColumns]);

  const groupingLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const groupingColumn of groupingColumns) {
      map.set(groupingColumn.id, groupingColumn.label);
    }
    return map;
  }, [groupingColumns]);

  const searchedRows = useMemo(
    () => filterTableRowsBySearch(rows, searchValue, rowMode),
    [rowMode, rows, searchValue]
  );
  const expandedRows = useMemo(
    () => applyGroupedRowExpansion(
      searchedRows,
      collapsedGroupRowIds,
      rowMode,
      searchValue.trim().length > 0
    ),
    [collapsedGroupRowIds, rowMode, searchedRows, searchValue]
  );
  const sortedRows = useMemo(
    () => sortTableRows(expandedRows, sorting, rowMode),
    [expandedRows, rowMode, sorting]
  );
  const paginationTotalCount = useMemo(
    () => countAdvancedMapAnalyticsTablePaginationRows(sortedRows, rowMode),
    [rowMode, sortedRows]
  );
  const paginatedRows = useMemo(
    () => paginateAdvancedMapAnalyticsTableRows(
      sortedRows,
      rowMode,
      pagination.pageIndex,
      pagination.pageSize
    ),
    [pagination.pageIndex, pagination.pageSize, rowMode, sortedRows]
  );

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(paginationTotalCount / Math.max(1, pagination.pageSize)));
    if (pagination.pageIndex < pageCount) {
      return;
    }

    setPagination((current) => ({
      ...current,
      pageIndex: pageCount - 1,
    }));
  }, [pagination.pageIndex, pagination.pageSize, paginationTotalCount]);

  const displayRankByRowId = useMemo(() => {
    const rankMap = new Map<string, string>();

    if (isAdvancedMapAnalyticsGroupedTableRowMode(rowMode)) {
      let groupRank = 0;
      let memberRank = 0;
      let currentParentRowId: string | undefined;

      for (const row of sortedRows) {
        const rowId = getAdvancedMapAnalyticsTableRowId(row);
        const kind = getAdvancedMapAnalyticsTableRowKind(row);
        if (kind === 'group-member') {
          if (row.parentRowId && row.parentRowId === currentParentRowId && groupRank > 0) {
            memberRank += 1;
            rankMap.set(rowId, `${groupRank}.${memberRank}`);
          }
          continue;
        }

        groupRank += 1;
        memberRank = 0;
        currentParentRowId = rowId;
        rankMap.set(rowId, String(groupRank));
      }

      return rankMap;
    }

    const rankableRows = rows.filter((row) =>
      getAdvancedMapAnalyticsTableRowKind(row) !== 'group-member'
    );
    const hasValidActiveSeries =
      typeof activeSeriesId === 'string' &&
      seriesColumns.some((seriesColumn) => seriesColumn.id === activeSeriesId);

    if (!hasValidActiveSeries) {
      const sortedRows = [...rankableRows].sort(compareRowsByNameAndSiruta);
      for (const [index, row] of sortedRows.entries()) {
        rankMap.set(getAdvancedMapAnalyticsTableRowId(row), String(index + 1));
      }

      return rankMap;
    }

    const rankedRows = rankableRows
      .map((row) => ({
        row,
        activeValue: row.valuesBySeriesId[activeSeriesId],
      }))
      .filter(
        (entry): entry is { row: AdvancedMapAnalyticsTableRow; activeValue: string } =>
          typeof entry.activeValue === 'string' && readMapDecimal(entry.activeValue) !== undefined
      )
      .sort((left, right) => {
        const order = compareMapDecimals(right.activeValue, left.activeValue);
        if (order !== 0) {
          return order;
        }

        return compareRowsByNameAndSiruta(left.row, right.row);
      });

    for (const [index, entry] of rankedRows.entries()) {
      rankMap.set(getAdvancedMapAnalyticsTableRowId(entry.row), String(index + 1));
    }

    return rankMap;
  }, [activeSeriesId, rowMode, rows, seriesColumns, sortedRows]);

  const columns = useMemo<ColumnDef<AdvancedMapAnalyticsTableRow>[]>(() => {
    const renderSortIcon = (sortState: false | 'asc' | 'desc') => {
      if (sortState === 'asc') {
        return <ChevronUp className="h-4 w-4" />;
      }
      if (sortState === 'desc') {
        return <ChevronDown className="h-4 w-4" />;
      }
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    };

    const staticColumns: ColumnDef<AdvancedMapAnalyticsTableRow>[] = isGroupedRowMode
      ? [
          {
            id: 'group_identity',
            accessorFn: (row) => row.uatName,
            header: ({ column }) => (
              <button
                type="button"
                className="inline-flex items-center gap-1"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                {t`Group / UAT`}
                {renderSortIcon(column.getIsSorted())}
              </button>
            ),
            cell: ({ row }) => {
              const kind = getAdvancedMapAnalyticsTableRowKind(row.original);
              const rowId = getAdvancedMapAnalyticsTableRowId(row.original);
              const canExpand =
                rowMode === 'group_rows_with_members' &&
                kind === 'group' &&
                (row.original.memberCount ?? 0) > 0;
              const isCollapsed = collapsedGroupRowIds.has(rowId);
              const extraMemberCount = Math.max(0, (row.original.memberCount ?? 0) - 1);

              return (
                <div
                  className={cn(
                    'flex min-w-0 items-center gap-2',
                    kind === 'group-member' && 'pl-7 text-muted-foreground'
                  )}
                >
                  {canExpand ? (
                    <button
                      type="button"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={isCollapsed ? t`Expand group` : t`Collapse group`}
                      aria-expanded={!isCollapsed}
                      onClick={(event) => {
                        event.stopPropagation();
                        setCollapsedGroupRowIds((current) => {
                          const next = new Set(current);
                          if (next.has(rowId)) {
                            next.delete(rowId);
                          } else {
                            next.add(rowId);
                          }
                          return next;
                        });
                      }}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <span className="h-5 w-5 shrink-0" aria-hidden="true" />
                  )}

                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block truncate',
                        kind === 'group' && 'font-semibold text-foreground'
                      )}
                      title={row.original.uatName}
                    >
                      {row.original.uatName}
                    </span>
                    {kind === 'group' ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.original.primaryUatName
                          ? extraMemberCount > 0
                            ? t`${row.original.primaryUatName} +${extraMemberCount}`
                            : row.original.primaryUatName
                          : t`${row.original.memberCount ?? 0} UATs`}
                      </span>
                    ) : (
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.original.sirutaCode ?? ''}
                      </span>
                    )}
                  </span>
                </div>
              );
            },
          },
        ]
      : [
          {
            id: 'uat_name',
            accessorKey: 'uatName',
            header: ({ column }) => (
              <button
                type="button"
                className="inline-flex items-center gap-1"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                {t`UAT`}
                {renderSortIcon(column.getIsSorted())}
              </button>
            ),
            cell: ({ row }) => (
              <span className="block truncate" title={row.original.uatName}>
                {row.original.uatName}
              </span>
            ),
          },
          {
            id: 'county_name',
            accessorKey: 'countyName',
            header: ({ column }) => (
              <button
                type="button"
                className="inline-flex items-center gap-1"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                {t`County`}
                {renderSortIcon(column.getIsSorted())}
              </button>
            ),
            cell: ({ row }) => (
              <span className="block truncate" title={row.original.countyName}>
                {row.original.countyName}
              </span>
            ),
          },
          {
            id: 'siruta_code',
            accessorKey: 'sirutaCode',
            header: ({ column }) => (
              <button
                type="button"
                className="inline-flex items-center gap-1"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                SIRUTA
                {renderSortIcon(column.getIsSorted())}
              </button>
            ),
            cell: ({ row }) => <span>{row.original.sirutaCode}</span>,
          },
          ...groupingColumns.map<ColumnDef<AdvancedMapAnalyticsTableRow>>((groupingColumn) => {
            const columnId = getGroupingColumnId(groupingColumn.id);
            return {
              id: columnId,
              accessorFn: (row) => row.groupValuesByGroupingId?.[groupingColumn.id] ?? '',
              header: ({ column }) => (
                <button
                  type="button"
                  className="inline-flex w-full items-center gap-1"
                  onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                  title={groupingColumn.label}
                >
                  <span className="truncate max-w-[220px]">{groupingColumn.label}</span>
                  {renderSortIcon(column.getIsSorted())}
                </button>
              ),
              cell: ({ row }) => (
                <span className="block truncate" title={row.original.groupValuesByGroupingId?.[groupingColumn.id] ?? ''}>
                  {row.original.groupValuesByGroupingId?.[groupingColumn.id] ?? ''}
                </span>
              ),
            };
          }),
        ];

    return [
      {
        id: 'row_number',
        header: () => <span className="text-xs text-muted-foreground">{t`#`}</span>,
        size: 40,
        enableHiding: false,
        cell: ({ row }) => {
          const rank = displayRankByRowId.get(getAdvancedMapAnalyticsTableRowId(row.original));

          return (
            <span className="text-xs text-muted-foreground">
              {rank ?? '-'}
            </span>
          );
        },
      },
      ...staticColumns,
      ...seriesColumns.map<ColumnDef<AdvancedMapAnalyticsTableRow>>((seriesColumn) => {
        const columnId = getSeriesColumnId(seriesColumn.id);
        const isActiveSeries = seriesColumn.id === activeSeriesId;
        return {
          id: columnId,
          accessorFn: (row) => row.valuesBySeriesId[seriesColumn.id],
          header: ({ column }) => (
            <button
              type="button"
              className={cn(
                'inline-flex w-full items-center justify-end gap-1',
                isActiveSeries && 'font-semibold text-primary'
              )}
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              title={seriesColumn.label}
            >
              <span className="truncate max-w-[220px]">
                {seriesColumn.label}
                {isActiveSeries ? t` (active)` : ''}
              </span>
              {renderSortIcon(column.getIsSorted())}
            </button>
          ),
          cell: ({ row }) => (
            <span>
              {formatAdvancedMapAnalyticsSeriesValue(
                row.original.valuesBySeriesId[seriesColumn.id],
                seriesColumn.unit
              )}
            </span>
          ),
          meta: {
            seriesLabel: seriesColumn.label,
          },
        };
      }),
    ];
  }, [
    activeSeriesId,
    collapsedGroupRowIds,
    displayRankByRowId,
    groupingColumns,
    isGroupedRowMode,
    rowMode,
    seriesColumns,
  ]);

  const table = useReactTable({
    data: paginatedRows,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination: isGroupedRowMode,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    ...(!isGroupedRowMode ? { getPaginationRowModel: getPaginationRowModel() } : {}),
  });

  const handleExportCsv = useCallback(() => {
    const groupedExport = isAdvancedMapAnalyticsGroupedTableRowMode(rowMode);
    const visibleColumns = table
      .getVisibleLeafColumns()
      .filter(
        (column) => {
          if (column.id === 'row_number' || column.id === 'entity_cui') {
            return false;
          }
          if (groupedExport) {
            return column.id !== 'group_identity';
          }
          return column.id !== 'siruta_code';
        }
      );

    const csvHeader = (groupedExport
      ? [
          'Row type',
          'Group ID',
          'Group',
          'SIRUTA',
          'UAT',
          'Member count',
          ...visibleColumns.map((column) => getColumnLabel(column.id, seriesLabelById, groupingLabelById)),
        ]
      : [
          'SIRUTA',
          'CUI',
          ...visibleColumns.map((column) => getColumnLabel(column.id, seriesLabelById, groupingLabelById)),
        ])
      .map((value) => escapeCsvCell(value))
      .join(',');

    const csvRows = sortedRows.map((row) => {
      const kind = getAdvancedMapAnalyticsTableRowKind(row);
      const rowValues = groupedExport
        ? [
            kind,
            row.groupId ?? '',
            row.groupLabel ?? (kind === 'group' ? row.uatName : ''),
            kind === 'group-member' ? row.sirutaCode ?? '' : '',
            kind === 'group-member' ? row.uatName : '',
            kind === 'group' ? String(row.memberCount ?? '') : '',
            ...visibleColumns.map((column) => getColumnRowValue(row, column.id)),
          ]
        : [
            row.sirutaCode ?? '',
            row.entityCui ?? '',
            ...visibleColumns.map((column) => getColumnRowValue(row, column.id)),
          ];
      return rowValues.map((value) => escapeCsvCell(value)).join(',');
    });

    const csv = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildCsvExportFileName(mapTitle);
    anchor.click();
    URL.revokeObjectURL(url);
  }, [groupingLabelById, mapTitle, rowMode, seriesLabelById, sortedRows, table]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 py-2">
        <div className="w-full sm:w-[280px]">
          <Input
            value={searchValue}
            onChange={(event) => {
              setSearchValue(event.currentTarget.value);
              table.setPageIndex(0);
            }}
            placeholder={isGroupedRowMode ? t`Search group or UAT` : t`Search entity name`}
            aria-label={isGroupedRowMode ? t`Search group or UAT` : t`Search entity name`}
            className="h-8"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t`Filter`}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] w-80 overflow-y-auto">
            <DropdownMenuLabel>{t`Bins`}</DropdownMenuLabel>
            {binsFilterSections.length === 0 ? (
              <div className="px-2 py-2 text-sm text-muted-foreground">
                {t`No bins presets configured.`}
              </div>
            ) : (
              binsFilterSections.map((section, sectionIndex) => (
                <div key={section.presetId}>
                  {sectionIndex > 0 ? <DropdownMenuSeparator /> : null}
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span
                      className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      title={section.presetLabel}
                    >
                      {section.presetLabel}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:text-muted-foreground"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onClearPresetBinFilters(section.presetId);
                      }}
                      disabled={section.options.every((option) => !option.checked)}
                    >
                      {t`Clear`}
                    </button>
                  </div>

                  {section.disabledReason ? (
                    <div className="px-2 pb-2 text-xs text-muted-foreground">
                      {section.disabledReason}
                    </div>
                  ) : section.options.length === 0 ? (
                    <div className="px-2 pb-2 text-xs text-muted-foreground">
                      {t`No bins configured.`}
                    </div>
                  ) : (
                    section.options.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={`${section.presetId}:${option.groupId}`}
                        checked={option.checked}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(checked) =>
                          onToggleBinFilter(section.presetId, option.groupId, checked === true)
                        }
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10"
                            style={{ backgroundColor: option.color }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{option.label}</span>
                        </span>
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </div>
              ))
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!hasActiveBinFilters}
              onSelect={(event) => {
                event.preventDefault();
                if (hasActiveBinFilters) {
                  onClearAllBinFilters();
                }
              }}
            >
              {t`Clear all filters`}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t`View`}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>{t`Rows`}</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={rowMode === 'uat_rows'}
              onCheckedChange={(checked) => checked && onRowModeChange?.('uat_rows')}
            >
              {t`UATs`}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={rowMode === 'group_rows'}
              disabled={!groupedRowModesAvailable}
              onCheckedChange={(checked) => checked && onRowModeChange?.('group_rows')}
            >
              {t`Groups`}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={rowMode === 'group_rows_with_members'}
              disabled={!groupedRowModesAvailable}
              onCheckedChange={(checked) => checked && onRowModeChange?.('group_rows_with_members')}
            >
              {t`Groups with UATs`}
            </DropdownMenuCheckboxItem>
            {rowMode === 'group_rows_with_members' ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={showMemberValues}
                  onCheckedChange={(checked) => onShowMemberValuesChange?.(checked === true)}
                >
                  {t`Show member values`}
                </DropdownMenuCheckboxItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setCollapsedGroupRowIds(new Set());
                  }}
                >
                  {t`Expand all`}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setCollapsedGroupRowIds(
                      new Set(
                        rows
                          .filter((row) => getAdvancedMapAnalyticsTableRowKind(row) === 'group')
                          .map((row) => getAdvancedMapAnalyticsTableRowId(row))
                      )
                    );
                  }}
                >
                  {t`Collapse all`}
                </DropdownMenuItem>
              </>
            ) : null}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t`Density`}</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={density === 'comfortable'}
              onCheckedChange={(checked) => checked && setDensity('comfortable')}
            >
              {t`Comfortable`}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={density === 'compact'}
              onCheckedChange={(checked) => checked && setDensity('compact')}
            >
              {t`Compact`}
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t`Columns`}</DropdownMenuLabel>
            {table
              .getAllLeafColumns()
              .filter((column) => column.id !== 'row_number')
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
                  >
                    {getColumnLabel(column.id, seriesLabelById, groupingLabelById)}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>

        {showExportCsv ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={rows.length === 0}
          >
            {t`Export CSV`}
          </Button>
        ) : null}
        </div>
      </div>

      {isGroupedRowMode && hiddenUngroupedUatCount > 0 ? (
        <div className="shrink-0 pb-2 text-xs text-muted-foreground">
          {t`${hiddenUngroupedUatCount} ungrouped UATs hidden.`}
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-6 bg-gradient-to-l from-card to-transparent md:hidden" />
        <div className="h-full overflow-auto rounded-md border bg-card">
        <Table className="min-w-[920px]">
          <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'whitespace-nowrap bg-card/95 text-xs font-semibold',
                      density === 'compact' ? 'px-2 py-2' : 'px-3 py-3'
                    )}
                    style={{
                      textAlign: header.column.id === 'row_number' ||
                        header.column.id === 'group_identity' ||
                        header.column.id === 'uat_name' ||
                        header.column.id === 'county_name' ||
                        header.column.id === 'siruta_code'
                        ? 'left'
                        : 'right',
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {t`No rows available.`}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => {
                const rowKind = getAdvancedMapAnalyticsTableRowKind(row.original);
                const isClickable = Boolean(
                  rowMode === 'uat_rows' &&
                  rowKind === 'uat' &&
                  onRowClick &&
                  row.original.entityCui
                );

                return (
                  <TableRow
                    key={getAdvancedMapAnalyticsTableRowId(row.original)}
                    onClick={isClickable ? () => onRowClick?.(row.original) : undefined}
                    className={cn(
                      rowKind === 'group'
                        ? 'bg-primary/5'
                        : rowKind === 'group-member'
                          ? 'bg-background'
                          : rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                      isClickable && 'cursor-pointer hover:bg-primary/5'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'max-w-[280px] truncate text-xs align-middle',
                          density === 'compact' ? 'px-2 py-1.5' : 'px-3 py-2.5'
                        )}
                        style={{
                          textAlign:
                            cell.column.id === 'row_number' ||
                            cell.column.id === 'group_identity' ||
                            cell.column.id === 'uat_name' ||
                            cell.column.id === 'county_name' ||
                            cell.column.id === 'siruta_code'
                              ? 'left'
                              : 'right',
                        }}
                      >
                        <span className="block truncate">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      <div className="mt-auto shrink-0 border-t bg-card p-3">
        <Pagination
          currentPage={table.getState().pagination.pageIndex + 1}
          pageSize={table.getState().pagination.pageSize}
          totalCount={paginationTotalCount}
          onPageChange={(page) => table.setPageIndex(Math.max(0, page - 1))}
          onPageSizeChange={(size) => {
            table.setPageSize(size);
            table.setPageIndex(0);
          }}
        />
      </div>
    </div>
  );
}
