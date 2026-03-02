import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
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
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTablePreferences } from '@/hooks/useTablePreferences';
import { cn, slugify } from '@/lib/utils';
import { formatAdvancedMapAnalyticsSeriesValue } from './advanced-map-analytics-formatting';
import { t } from '@lingui/core/macro';
import type {
  AdvancedMapAnalyticsBinsFilterSection,
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

function getSeriesIdFromColumnId(columnId: string): string | undefined {
  return columnId.startsWith('series:') ? columnId.slice('series:'.length) : undefined;
}

function getColumnLabel(
  columnId: string,
  seriesLabelById: Map<string, string>
): string {
  const seriesId = getSeriesIdFromColumnId(columnId);
  if (seriesId) {
    return seriesLabelById.get(seriesId) ?? seriesId;
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
  if (!seriesId) {
    return '';
  }

  const value = row.valuesBySeriesId[seriesId];
  if (value === undefined || !Number.isFinite(value)) {
    return '';
  }

  return value.toString();
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

export function AdvancedMapAnalyticsDataTable({
  rows,
  seriesColumns,
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
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
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

      for (const seriesColumn of seriesColumns) {
        ensureVisibleByDefault(getSeriesColumnId(seriesColumn.id));
      }

      return changed ? nextVisibility : previousVisibility;
    });
  }, [columnVisibility, seriesColumns, setColumnVisibility]);

  const seriesLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const seriesColumn of seriesColumns) {
      map.set(seriesColumn.id, seriesColumn.label);
    }
    return map;
  }, [seriesColumns]);

  const columns = useMemo<ColumnDef<AdvancedMapAnalyticsTableRow>[]>(
    () => [
      {
        id: 'row_number',
        header: () => <span className="text-xs text-muted-foreground">{t`#`}</span>,
        size: 40,
        enableHiding: false,
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination;
          return (
            <span className="text-xs text-muted-foreground">
              {pageIndex * pageSize + row.index + 1}
            </span>
          );
        },
      },
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
    [activeSeriesId, seriesColumns]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      pagination,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
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
      ...visibleColumns.map((column) => getColumnLabel(column.id, seriesLabelById)),
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
  }, [mapTitle, seriesLabelById, table]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end gap-2 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              {t`Filter`}
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
              <MoreHorizontal className="mr-2 h-4 w-4" />
              {t`View`}
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
                    {getColumnLabel(column.id, seriesLabelById)}
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

      <div className="flex-grow overflow-auto rounded-md border bg-card">
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

      <div className="mt-auto border-t bg-card p-3">
        <Pagination
          currentPage={table.getState().pagination.pageIndex + 1}
          pageSize={table.getState().pagination.pageSize}
          totalCount={rows.length}
          onPageChange={(page) => table.setPageIndex(Math.max(0, page - 1))}
          onPageSizeChange={(size) => table.setPageSize(size)}
        />
      </div>
    </div>
  );
}
