import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  VisibilityState,
  OnChangeFn,
  ColumnPinningState,
  ColumnSizingState,
} from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatNumber, getNormalizationUnit } from '@/lib/utils'
import { yValueFormatter } from '@/components/charts/components/chart-renderer/utils'
import type { EntityAnalyticsDataPoint } from '@/schemas/entity-analytics'
import { ArrowUpDown, ChevronDown, ChevronUp, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { getMergedColumnOrder, moveColumnOrder } from '@/lib/table-utils'
import { Link } from '@tanstack/react-router'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Trans } from '@lingui/react/macro'
import type { Currency, Normalization } from '@/schemas/charts'

interface Props {
  data: readonly EntityAnalyticsDataPoint[]
  isLoading?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange: (by: string, order: 'asc' | 'desc') => void
  normalization?: Normalization
  currency?: Currency
  density?: 'comfortable' | 'compact'
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>
  columnPinning?: ColumnPinningState
  onColumnPinningChange?: OnChangeFn<ColumnPinningState>
  columnSizing?: ColumnSizingState
  onColumnSizingChange?: OnChangeFn<ColumnSizingState>
  columnOrder?: string[]
  onColumnOrderChange?: OnChangeFn<string[]>
  currencyFormat?: 'standard' | 'compact' | 'both' | 'euro'
  rowNumberStart?: number
}

export function EntityAnalyticsTable({ data, isLoading, sortBy, sortOrder, onSortChange, density = 'comfortable', columnVisibility, onColumnVisibilityChange, columnPinning, onColumnPinningChange, columnSizing, onColumnSizingChange, columnOrder, onColumnOrderChange, currencyFormat = 'compact', rowNumberStart = 0, normalization = 'total', currency }: Props) {
  const unit = getNormalizationUnit({ normalization: normalization ?? 'total', currency: currency ?? 'RON' })
  const currencyCode: Currency = currency ?? (unit.includes('EUR') ? 'EUR' : 'RON')
  const isPercentGdp = normalization === 'percent_gdp' || unit.startsWith('%')
  const columns: ColumnDef<EntityAnalyticsDataPoint>[] = [
    {
      id: 'row_number',
      header: () => <span className="text-xs text-muted-foreground">#</span>,
      cell: ({ row }) => (
        <span className="block text-left w-full text-xs text-muted-foreground pl-2" aria-label={`Row ${rowNumberStart + row.index + 1}`}>
          {rowNumberStart + row.index + 1}
        </span>
      ),
      size: 30,
      minSize: 30,
      maxSize: 56,
      enableResizing: true,
      enableHiding: false,
    },
    {
      id: 'entity_name',
      size: 500,
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggle(column.id)}>
          <Trans>Entity</Trans>
          {renderSortIcon(column.id)}
        </div>
      ),
      cell: ({ row }) => (
        <Link to="/entities/$cui" params={{ cui: row.original.entity_cui }} className="truncate hover:underline" title={row.original.entity_name}>
          {row.original.entity_name}
        </Link>
      ),
    },
    {
      id: 'county_name',
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggle(column.id)}>
          <Trans>County</Trans>
          {renderSortIcon(column.id)}
        </div>
      ),
      cell: ({ row }) => row.original.county_name ?? '-',
    },
    {
      id: 'population',
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggle(column.id)}>
          <Trans>Population</Trans>
          {renderSortIcon(column.id)}
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.population != null ? formatNumber(row.original.population) : '-'}
        </div>
      ),
    },
    {
      id: 'per_capita_amount',
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggle(column.id)}>
          <Trans>Per Capita</Trans>
          {renderSortIcon(column.id)}
        </div>
      ),
      cell: ({ row }) => {
        if (isPercentGdp) {
          return <span className="block text-right text-xs text-muted-foreground">-</span>
        }
        if (row.original.population == null) {
          return <span className="block text-right text-xs text-muted-foreground">-</span>
        }

        if (currencyFormat === 'both') {
          return (
            <div className="text-right">
              <span className="block text-xs" title={`${formatCurrency(row.original.per_capita_amount, 'standard', currencyCode)} / capita`}>
                {formatCurrency(row.original.per_capita_amount, 'standard', currencyCode)} / capita
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatCurrency(row.original.per_capita_amount, 'compact', currencyCode)} / capita
              </span>
            </div>
          )
        }
        const view = currencyFormat === 'standard' ? 'standard' : 'compact'
        return (
          <span className="block text-right text-xs" title={`${formatCurrency(row.original.per_capita_amount, 'standard', currencyCode)} / capita`}>
            {formatCurrency(row.original.per_capita_amount, view as 'standard' | 'compact', currencyCode)} / capita
          </span>
        )
      }
    },
    {
      id: 'total_amount',
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggle(column.id)}>
          <Trans>Total Amount</Trans>
          {renderSortIcon(column.id)}
        </div>
      ),
      cell: ({ row }) => {
        if (isPercentGdp) {
          if (currencyFormat === 'both') {
            return (
              <div className="text-right">
                <span className="block text-xs" title={yValueFormatter(row.original.total_amount, unit, 'standard')}>
                  {yValueFormatter(row.original.total_amount, unit, 'standard')}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {yValueFormatter(row.original.total_amount, unit, 'compact')}
                </span>
              </div>
            )
          }
          const view = currencyFormat === 'standard' ? 'standard' : 'compact'
          return (
            <span className="block text-right text-xs" title={yValueFormatter(row.original.total_amount, unit, 'standard')}>
              {yValueFormatter(row.original.total_amount, unit, view)}
            </span>
          )
        }

        if (currencyFormat === 'both') {
          return (
            <div className="text-right">
              <span className="block text-xs" title={formatCurrency(row.original.total_amount, 'standard', currencyCode)}>
                {formatCurrency(row.original.total_amount, 'standard', currencyCode)}
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatCurrency(row.original.total_amount, 'compact', currencyCode)}
              </span>
            </div>
          )
        }
        const view = currencyFormat === 'standard' ? 'standard' : 'compact'
        return (
          <span className="block text-right text-xs" title={formatCurrency(row.original.total_amount, 'standard', currencyCode)}>
            {formatCurrency(row.original.total_amount, view as 'standard' | 'compact', currencyCode)}
          </span>
        )
      },
    },
  ]

  const toggle = (id: string) => {
    if (sortBy !== id) {
      onSortChange(id, 'asc')
      return
    }
    onSortChange(id, sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const renderSortIcon = (id: string) => {
    if (sortBy !== id) return <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const enforcedColumnOrder = ['row_number', ...((columnOrder ?? []).filter((id) => id !== 'row_number'))]
  const handleOrderChange: OnChangeFn<string[]> = (updater) => {
    const next = typeof updater === 'function' ? (updater as (old: string[]) => string[])(enforcedColumnOrder) : updater
    const rest = (next ?? []).filter((id) => id !== 'row_number')
    onColumnOrderChange?.(['row_number', ...rest])
  }
  const moveColumn = (id: string, direction: 'left' | 'right') => {
    const merged = getMergedColumnOrder(table, ['row_number'])
    const updated = moveColumnOrder(merged, id, direction, ['row_number'])
    table.setColumnOrder(updated)
    onColumnOrderChange?.(updated)
  }

  const table = useReactTable({
    data: data as EntityAnalyticsDataPoint[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      columnVisibility,
      columnPinning,
      columnSizing,
      columnOrder: enforcedColumnOrder,
    },
    onColumnVisibilityChange,
    onColumnPinningChange,
    onColumnSizingChange,
    onColumnOrderChange: handleOrderChange,
    defaultColumn: {
      size: 180,
      minSize: 100,
      maxSize: 600,
    },
    columnResizeMode: 'onChange',
  })

  if (isLoading) {
    return (
      <div className="rounded-md border space-y-2 p-4 bg-card animate-pulse">
        <div className="h-8 bg-muted rounded" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table className="table-fixed">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className={`relative ${density === 'compact' ? 'px-2 py-1.5' : ''} whitespace-nowrap`} style={{ width: `${(header.column as unknown as { getSize?: () => number }).getSize?.() ?? 180}px` }}>
                  {header.isPlaceholder ? null : (
                    header.column.id === 'row_number' ? (
                      <div className="flex items-center justify-start select-none pl-2">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 select-none">
                        <div className="min-w-0 flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                aria-label={`${header.column.id} menu`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-44" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuLabel><Trans>Column</Trans></DropdownMenuLabel>
                              {(() => {
                                const merged = getMergedColumnOrder(table, ['row_number'])
                                const movable = merged.filter((id) => id !== 'row_number')
                                const idx = movable.indexOf(header.column.id)
                                const disableLeft = idx <= 0 || idx === -1
                                const disableRight = idx === -1 || idx >= movable.length - 1
                                return (
                                  <>
                                    <DropdownMenuItem disabled={disableLeft} onSelect={() => !disableLeft && moveColumn(header.column.id, 'left')}>
                                      <ChevronLeft className="w-3 h-3 mr-1" /> <Trans>Move left</Trans>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={disableRight} onSelect={() => !disableRight && moveColumn(header.column.id, 'right')}>
                                      <ChevronRight className="w-3 h-3 mr-1" /> <Trans>Move right</Trans>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => header.column.toggleVisibility(false)}><Trans>Hide</Trans></DropdownMenuItem>
                                  </>
                                )
                              })()}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  )}
                  {header.column.id === 'row_number' ? null : header.column.getCanResize?.() ? (
                    <div
                      onMouseDown={header.getResizeHandler?.()}
                      onTouchStart={header.getResizeHandler?.()}
                      className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none ${header.column.getIsResizing?.() ? 'bg-primary/50' : 'hover:bg-primary/30'}`}
                      aria-hidden
                    />
                  ) : null}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={`${density === 'compact' ? 'px-2 py-1.5' : ''} overflow-hidden whitespace-nowrap text-ellipsis`}
                  style={{ width: `${(cell.column as unknown as { getSize?: () => number }).getSize?.()}px` }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
