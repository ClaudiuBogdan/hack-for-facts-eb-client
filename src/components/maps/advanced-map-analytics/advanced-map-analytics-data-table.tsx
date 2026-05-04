import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, ChevronUp, Filter, MoreHorizontal } from 'lucide-react';
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
  AdvancedMapAnalyticsTableSeriesColumn,
} from './advanced-map-analytics-table-types';

export type {
  AdvancedMapAnalyticsBinsFilterSection,
  AdvancedMapAnalyticsTableRow,
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

  if (columnId === 'county_name') {
    return row.countyName;
  }

  if (columnId === 'siruta_code') {
    return row.sirutaCode;
  }

  const seriesId = getSeriesIdFromColumnId(columnId);
  if (seriesId) {
    const value = row.valuesBySeriesId[seriesId];
    if (value === undefined || !Number.isFinite(value)) {
      return '';
    }

    return value.toString();
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

  return left.sirutaCode.localeCompare(right.sirutaCode);
}

export function AdvancedMapAnalyticsDataTable({
  rows,
  seriesColumns,
  groupingColumns = [],
  mapTitle,
  showExportCsv,
  activeSeriesId,
  onRowClick,
  binsFilterSections,
  onToggleBinFilter,
  onClearPresetBinFilters,
  onClearAllBinFilters,
  hasActiveBinFilters,
}: Readonly<AdvancedMapAnalyticsDataTableProps>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

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
      'uat_name',
      'county_name',
      'siruta_code',
      ...groupingColumns.map((groupingColumn) => getGroupingColumnId(groupingColumn.id)),
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

      ensureVisibleByDefault('uat_name');
      ensureVisibleByDefault('county_name');
      ensureVisibleByDefault('siruta_code');

      for (const groupingColumn of groupingColumns) {
        ensureVisibleByDefault(getGroupingColumnId(groupingColumn.id));
      }

      for (const seriesColumn of seriesColumns) {
        ensureVisibleByDefault(getSeriesColumnId(seriesColumn.id));
      }

      return changed ? nextVisibility : previousVisibility;
    });
  }, [columnVisibility, groupingColumns, seriesColumns, setColumnVisibility]);

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

  const rankBySirutaCode = useMemo(() => {
    const rankMap = new Map<string, number>();
    const hasValidActiveSeries =
      typeof activeSeriesId === 'string' &&
      seriesColumns.some((seriesColumn) => seriesColumn.id === activeSeriesId);

    if (!hasValidActiveSeries) {
      const sortedRows = [...rows].sort(compareRowsByNameAndSiruta);
      for (const [index, row] of sortedRows.entries()) {
        rankMap.set(row.sirutaCode, index + 1);
      }

      return rankMap;
    }

    const rankedRows = rows
      .map((row) => ({
        row,
        activeValue: row.valuesBySeriesId[activeSeriesId],
      }))
      .filter(
        (entry): entry is { row: AdvancedMapAnalyticsTableRow; activeValue: number } =>
          typeof entry.activeValue === 'number' && Number.isFinite(entry.activeValue)
      )
      .sort((left, right) => {
        if (left.activeValue !== right.activeValue) {
          return right.activeValue - left.activeValue;
        }

        return compareRowsByNameAndSiruta(left.row, right.row);
      });

    for (const [index, entry] of rankedRows.entries()) {
      rankMap.set(entry.row.sirutaCode, index + 1);
    }

    return rankMap;
  }, [activeSeriesId, rows, seriesColumns]);

  const columns = useMemo<ColumnDef<AdvancedMapAnalyticsTableRow>[]>(
    () => [
      {
        id: 'row_number',
        header: () => <span className="text-xs text-muted-foreground">{t`#`}</span>,
        size: 40,
        enableHiding: false,
        cell: ({ row }) => {
          const rank = rankBySirutaCode.get(row.original.sirutaCode);

          return (
            <span className="text-xs text-muted-foreground">
              {rank ?? '-'}
            </span>
          );
        },
      },
      {
        id: 'uat_name',
        accessorKey: 'uatName',
        filterFn: (row, _, filterValue) => {
          const searchValue = typeof filterValue === 'string' ? filterValue.trim().toLocaleLowerCase() : '';
          if (searchValue.length === 0) {
            return true;
          }

          return row.original.uatName.toLocaleLowerCase().includes(searchValue);
        },
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t`UAT`}
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            )}
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
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            )}
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
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            )}
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
              {column.getIsSorted() === 'asc' ? (
                <ChevronUp className="h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ),
          cell: ({ row }) => (
            <span className="block truncate" title={row.original.groupValuesByGroupingId?.[groupingColumn.id] ?? ''}>
              {row.original.groupValuesByGroupingId?.[groupingColumn.id] ?? ''}
            </span>
          ),
        };
      }),
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
              {column.getIsSorted() === 'asc' ? (
                <ChevronUp className="h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              )}
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
    ],
    [activeSeriesId, groupingColumns, rankBySirutaCode, seriesColumns]
  );

  const table = useReactTable({
    data: rows,
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
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleExportCsv = useCallback(() => {
    const visibleColumns = table
      .getVisibleLeafColumns()
      .filter(
        (column) =>
          column.id !== 'row_number' &&
          column.id !== 'siruta_code' &&
          column.id !== 'entity_cui'
      );

    const csvHeader = [
      'SIRUTA',
      'CUI',
      ...visibleColumns.map((column) => getColumnLabel(column.id, seriesLabelById, groupingLabelById)),
    ]
      .map((value) => escapeCsvCell(value))
      .join(',');

    const csvRows = table.getSortedRowModel().rows.map((row) => {
      const rowValues = [
        row.original.sirutaCode,
        row.original.entityCui ?? '',
        ...visibleColumns.map((column) => getColumnRowValue(row.original, column.id)),
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
  }, [groupingLabelById, mapTitle, seriesLabelById, table]);

  const uatNameSearchValue = (() => {
    const filterValue = table.getColumn('uat_name')?.getFilterValue();
    return typeof filterValue === 'string' ? filterValue : '';
  })();

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 py-2">
        <div className="w-full sm:w-[280px]">
          <Input
            value={uatNameSearchValue}
            onChange={(event) => {
              table.getColumn('uat_name')?.setFilterValue(event.currentTarget.value);
              table.setPageIndex(0);
            }}
            placeholder={t`Search entity name`}
            aria-label={t`Search entity name`}
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

      <div className="relative flex-grow">
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
                const isClickable = Boolean(onRowClick && row.original.entityCui);

                return (
                  <TableRow
                    key={row.id}
                    onClick={isClickable ? () => onRowClick?.(row.original) : undefined}
                    className={cn(
                      rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20',
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

      <div className="mt-auto border-t bg-card p-3">
        <Pagination
          currentPage={table.getState().pagination.pageIndex + 1}
          pageSize={table.getState().pagination.pageSize}
          totalCount={table.getFilteredRowModel().rows.length}
          onPageChange={(page) => table.setPageIndex(Math.max(0, page - 1))}
          onPageSizeChange={(size) => table.setPageSize(size)}
        />
      </div>
    </div>
  );
}
