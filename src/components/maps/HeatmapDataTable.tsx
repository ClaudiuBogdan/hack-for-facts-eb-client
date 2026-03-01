import React, { useEffect, useMemo } from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    SortingState,
    getSortedRowModel,
    getPaginationRowModel,
    PaginationState,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
// Removed unused Select components
import {
    ChevronUp,
    ChevronDown,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
} from "lucide-react";
import { HeatmapCountyDataPoint, HeatmapUATDataPoint } from "@/schemas/heatmap";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { getMergedColumnOrder, moveColumnOrder } from "@/lib/table-utils";
import { useTablePreferences } from "@/hooks/useTablePreferences";
import { Pagination } from "@/components/ui/pagination";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useMapFilter } from "@/hooks/useMapFilter";
import type { Currency } from "@/schemas/charts";
import { useUserCurrency } from "@/lib/hooks/useUserCurrency";

interface HeatmapDataTableProps {
    data: (HeatmapUATDataPoint | HeatmapCountyDataPoint)[];
    isLoading: boolean;
    sorting: SortingState;
    setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
    pagination: PaginationState;
    setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
    mapViewType: "UAT" | "County";
}

export function HeatmapDataTable({
    data,
    isLoading,
    sorting,
    setSorting,
    pagination,
    setPagination,
    mapViewType,
}: HeatmapDataTableProps) {
    const isUatView = mapViewType === 'UAT';
    const { mapState } = useMapFilter();
    const [userCurrency] = useUserCurrency();
    const normalizationRaw = mapState.filters.normalization ?? 'total';
    const currencyCode: Currency =
        normalizationRaw === 'total_euro' || normalizationRaw === 'per_capita_euro'
            ? 'EUR'
            : ((mapState.filters.currency ?? userCurrency) as Currency);

    const { density, setDensity, columnVisibility, setColumnVisibility, currencyFormat, setCurrencyFormat } = useTablePreferences('heatmap-data-table', {
        columnVisibility: {
            name: true,
            county_name: isUatView,
            population: true,
            total_amount: true,
            per_capita_amount: true,
        },
    });
    const getColumnMenuAriaLabel = (columnId: string) => t`Open ${columnId} column menu`;

    const columns = useMemo<ColumnDef<HeatmapUATDataPoint | HeatmapCountyDataPoint>[]>(
        () => [
            {
                id: 'row_number',
                header: () => <span className="text-xs text-muted-foreground pl-2">#</span>,
                size: 30,
                minSize: 30,
                maxSize: 56,
                enableResizing: true,
                enableHiding: false,
                cell: ({ row, table }) => {
                    const { pageIndex, pageSize } = table.getState().pagination
                    const start = pageIndex * pageSize
                    return (
                        <span className="block text-left w-full text-xs text-muted-foreground pl-2" aria-label={t`Row ${start + row.index + 1}`}>
                            {start + row.index + 1}
                        </span>
                    );
                },
            },
            {
                accessorKey: "name",
                header: ({ column, table }) => {
                    const merged = getMergedColumnOrder(table, ['row_number'])
                    const movable = merged.filter((id) => id !== 'row_number')
                    const idx = movable.indexOf(column.id!)
                    const disableLeft = idx <= 0 || idx === -1
                    const disableRight = idx === -1 || idx >= movable.length - 1
                    const move = (dir: 'left' | 'right') => {
                        const updated = moveColumnOrder(merged, column.id!, dir, ['row_number'])
                        table.setColumnOrder(updated)
                    }
                    return (
                        <div className="flex items-center gap-1 select-none">
                            <div
                                className="flex items-center gap-1 cursor-pointer"
                                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            >
                                <Trans>Name</Trans>
                                {column.getIsSorted() === "asc" ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : column.getIsSorted() === "desc" ? (
                                    <ChevronDown className="w-4 h-4" />
                                ) : (
                                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        aria-label={getColumnMenuAriaLabel(column.id ?? 'column')}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-44" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuLabel><Trans>Column</Trans></DropdownMenuLabel>
                                    <DropdownMenuItem disabled={disableLeft} onSelect={() => !disableLeft && move('left')}>
                                        <ChevronLeft className="w-3 h-3 mr-1" /> <Trans>Move left</Trans>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={disableRight} onSelect={() => !disableRight && move('right')}>
                                        <ChevronRight className="w-3 h-3 mr-1" /> <Trans>Move right</Trans>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => column.toggleVisibility(false)}><Trans>Hide</Trans></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                },
                cell: ({ row }) => {
                    const original = row.original;
                    const name = 'uat_name' in original ? original.uat_name : original.county_name;
                    const code = 'uat_code' in original ? original.uat_code : undefined;

                    if (code) {
                        return <Link to="/entities/$cui" params={{ cui: code }} className="truncate" title={name}>{name}</Link>;
                    }
                    return <div className="truncate" title={name}>{name}</div>;
                },
            },
            {
                accessorKey: "county_name",
                header: ({ column, table }) => {
                    const merged = getMergedColumnOrder(table, ['row_number'])
                    const movable = merged.filter((id) => id !== 'row_number')
                    const idx = movable.indexOf(column.id!)
                    const disableLeft = idx <= 0 || idx === -1
                    const disableRight = idx === -1 || idx >= movable.length - 1
                    const move = (dir: 'left' | 'right') => {
                        const updated = moveColumnOrder(merged, column.id!, dir, ['row_number'])
                        table.setColumnOrder(updated)
                    }
                    return (
                        <div className="flex items-center gap-1 select-none">
                            <div
                                className="flex items-center gap-1 cursor-pointer"
                                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            >
                                <Trans>County</Trans>
                                {column.getIsSorted() === "asc" ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : column.getIsSorted() === "desc" ? (
                                    <ChevronDown className="w-4 h-4" />
                                ) : (
                                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        aria-label={getColumnMenuAriaLabel(column.id ?? 'column')}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-44" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuLabel><Trans>Column</Trans></DropdownMenuLabel>
                                    <DropdownMenuItem disabled={disableLeft} onSelect={() => !disableLeft && move('left')}>
                                        <ChevronLeft className="w-3 h-3 mr-1" /> <Trans>Move left</Trans>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={disableRight} onSelect={() => !disableRight && move('right')}>
                                        <ChevronRight className="w-3 h-3 mr-1" /> <Trans>Move right</Trans>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => column.toggleVisibility(false)}><Trans>Hide</Trans></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                },
                cell: ({ row }) => {
                    const original = row.original;
                    return 'county_name' in original ? original.county_name : '-';
                },
                id: 'county_name',
            },
            {
                accessorKey: "population",
                header: ({ column, table }) => {
                    const merged = getMergedColumnOrder(table, ['row_number'])
                    const movable = merged.filter((id) => id !== 'row_number')
                    const idx = movable.indexOf(column.id!)
                    const disableLeft = idx <= 0 || idx === -1
                    const disableRight = idx === -1 || idx >= movable.length - 1
                    const move = (dir: 'left' | 'right') => {
                        const updated = moveColumnOrder(merged, column.id!, dir, ['row_number'])
                        table.setColumnOrder(updated)
                    }
                    return (
                        <div className="flex items-center gap-1 select-none justify-end w-full text-right">
                            <div
                                className="flex items-center gap-1 cursor-pointer"
                                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            >
                                <Trans>Population</Trans>
                                {column.getIsSorted() === "asc" ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : column.getIsSorted() === "desc" ? (
                                    <ChevronDown className="w-4 h-4" />
                                ) : (
                                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        aria-label={getColumnMenuAriaLabel(column.id ?? 'column')}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuLabel><Trans>Column</Trans></DropdownMenuLabel>
                                    <DropdownMenuItem disabled={disableLeft} onSelect={() => !disableLeft && move('left')}>
                                        <ChevronLeft className="w-3 h-3 mr-1" /> <Trans>Move left</Trans>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={disableRight} onSelect={() => !disableRight && move('right')}>
                                        <ChevronRight className="w-3 h-3 mr-1" /> <Trans>Move right</Trans>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => column.toggleVisibility(false)}><Trans>Hide</Trans></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                },
                cell: ({ row }) => {
                    const original = row.original;
                    const population = 'population' in original ? original.population : ('county_population' in original ? original.county_population : null);
                    return <div className="text-right">{population ? formatNumber(population) : "-"}</div>;
                },
            },
            {
                accessorKey: "total_amount",
                header: ({ column, table }) => {
                    const merged = getMergedColumnOrder(table, ['row_number'])
                    const movable = merged.filter((id) => id !== 'row_number')
                    const idx = movable.indexOf(column.id!)
                    const disableLeft = idx <= 0 || idx === -1
                    const disableRight = idx === -1 || idx >= movable.length - 1
                    const move = (dir: 'left' | 'right') => {
                        const updated = moveColumnOrder(merged, column.id!, dir, ['row_number'])
                        table.setColumnOrder(updated)
                    }
                    return (
                        <div className="flex items-center gap-1 select-none justify-end w-full text-right">
                            <div
                                className="flex items-center gap-1 cursor-pointer"
                                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            >
                                <Trans>Total Amount</Trans>
                                {column.getIsSorted() === "asc" ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : column.getIsSorted() === "desc" ? (
                                    <ChevronDown className="w-4 h-4" />
                                ) : (
                                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        aria-label={getColumnMenuAriaLabel(column.id ?? 'column')}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuLabel><Trans>Column</Trans></DropdownMenuLabel>
                                    <DropdownMenuItem disabled={disableLeft} onSelect={() => !disableLeft && move('left')}>
                                        <ChevronLeft className="w-3 h-3 mr-1" /> <Trans>Move left</Trans>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={disableRight} onSelect={() => !disableRight && move('right')}>
                                        <ChevronRight className="w-3 h-3 mr-1" /> <Trans>Move right</Trans>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => column.toggleVisibility(false)}><Trans>Hide</Trans></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                },
                cell: ({ row }) => {
                    const value = row.getValue("total_amount") as number;
                    if (currencyFormat === 'both') {
                        return (
                            <div className="text-right">
                                <span className="block text-xs" title={formatCurrency(value, 'standard', currencyCode)}>{formatCurrency(value, 'standard', currencyCode)}</span>
                                <span className="block text-xs text-muted-foreground">{formatCurrency(value, 'compact', currencyCode)}</span>
                            </div>
                        );
                    }
                    const effectiveCurrency: 'RON' | 'EUR' | 'USD' = currencyFormat === 'euro' ? 'EUR' : currencyCode;
                    return <span className="block text-right text-xs" title={formatCurrency(value, 'standard', effectiveCurrency)}>{formatCurrency(value, 'compact', effectiveCurrency)}</span>
                },
            },
            {
                accessorKey: "per_capita_amount",
                header: ({ column, table }) => {
                    const merged = getMergedColumnOrder(table, ['row_number'])
                    const movable = merged.filter((id) => id !== 'row_number')
                    const idx = movable.indexOf(column.id!)
                    const disableLeft = idx <= 0 || idx === -1
                    const disableRight = idx === -1 || idx >= movable.length - 1
                    const move = (dir: 'left' | 'right') => {
                        const updated = moveColumnOrder(merged, column.id!, dir, ['row_number'])
                        table.setColumnOrder(updated)
                    }
                    return (
                        <div className="flex items-center gap-1 select-none justify-end w-full text-right">
                            <div
                                className="flex items-center gap-1 cursor-pointer"
                                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            >
                                <Trans>Amount Per Capita</Trans>
                                {column.getIsSorted() === "asc" ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : column.getIsSorted() === "desc" ? (
                                    <ChevronDown className="w-4 h-4" />
                                ) : (
                                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        aria-label={getColumnMenuAriaLabel(column.id ?? 'column')}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuLabel><Trans>Column</Trans></DropdownMenuLabel>
                                    <DropdownMenuItem disabled={disableLeft} onSelect={() => !disableLeft && move('left')}>
                                        <ChevronLeft className="w-3 h-3 mr-1" /> <Trans>Move left</Trans>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={disableRight} onSelect={() => !disableRight && move('right')}>
                                        <ChevronRight className="w-3 h-3 mr-1" /> <Trans>Move right</Trans>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => column.toggleVisibility(false)}><Trans>Hide</Trans></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                },
                cell: ({ row }) => {
                    const value = row.getValue("per_capita_amount") as number;
                    if (currencyFormat === 'both') {
                        return (
                            <div className="text-right">
                                <span className="block text-xs" title={`${formatCurrency(value, 'standard', currencyCode)}${t` / capita`}`}>{formatCurrency(value, 'standard', currencyCode)}{t` / capita`}</span>
                                <span className="block text-xs text-muted-foreground">{formatCurrency(value, 'compact', currencyCode)}{t` / capita`}</span>
                            </div>
                        );
                    }
                    const effectiveCurrency: 'RON' | 'EUR' | 'USD' = currencyFormat === 'euro' ? 'EUR' : currencyCode;
                    return <span className="block text-right text-xs" title={`${formatCurrency(value, 'standard', effectiveCurrency)}${t` / capita`}`}>{formatCurrency(value, 'compact', effectiveCurrency)}{t` / capita`}</span>
                },
            },
        ],
        [currencyFormat, currencyCode]
    );

    const table = useReactTable({
        data: data || [],
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
        manualPagination: false,
        manualSorting: false,
    });

    useEffect(() => {
        // Keep county column visibility in sync with map view type by default
        setColumnVisibility((v: Record<string, boolean>) => ({ ...v, county_name: isUatView }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isUatView])

    if (isLoading) {
        return (
            <div className="rounded-md border space-y-2 p-4 bg-card animate-pulse">
                <div className="h-8 bg-muted rounded" />
                {Array.from({ length: pagination.pageSize }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                ))}
            </div>
        );
    }

    const totalCount = data?.length ?? 0;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-end gap-2 py-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm"><Trans>View</Trans></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel><Trans>Density</Trans></DropdownMenuLabel>
                        <DropdownMenuCheckboxItem checked={density === 'comfortable'} onCheckedChange={(c) => c && setDensity('comfortable')}><Trans>Comfortable</Trans></DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={density === 'compact'} onCheckedChange={(c) => c && setDensity('compact')}><Trans>Compact</Trans></DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel><Trans>Currency</Trans></DropdownMenuLabel>
                        <DropdownMenuCheckboxItem checked={currencyFormat === 'standard'} onCheckedChange={(c) => c && setCurrencyFormat('standard')}><Trans>Standard</Trans></DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={currencyFormat === 'compact'} onCheckedChange={(c) => c && setCurrencyFormat('compact')}><Trans>Compact</Trans></DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={currencyFormat === 'both'} onCheckedChange={(c) => c && setCurrencyFormat('both')}><Trans>Both</Trans></DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel><Trans>Columns</Trans></DropdownMenuLabel>
                        <DropdownMenuCheckboxItem checked={columnVisibility?.name !== false} onCheckedChange={(c) => setColumnVisibility((v: Record<string, boolean>) => ({ ...v, name: Boolean(c) }))}><Trans>Name</Trans></DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={columnVisibility?.county_name !== false} onCheckedChange={(c) => setColumnVisibility((v: Record<string, boolean>) => ({ ...v, county_name: Boolean(c) }))}><Trans>County</Trans></DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={columnVisibility?.population !== false} onCheckedChange={(c) => setColumnVisibility((v: Record<string, boolean>) => ({ ...v, population: Boolean(c) }))}><Trans>Population</Trans></DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={columnVisibility?.total_amount !== false} onCheckedChange={(c) => setColumnVisibility((v: Record<string, boolean>) => ({ ...v, total_amount: Boolean(c) }))}><Trans>Total Amount</Trans></DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={columnVisibility?.per_capita_amount !== false} onCheckedChange={(c) => setColumnVisibility((v: Record<string, boolean>) => ({ ...v, per_capita_amount: Boolean(c) }))}><Trans>Amount Per Capita</Trans></DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="rounded-md border bg-card overflow-auto scrollbar-thin scrollbar-thumb-muted/40 scrollbar-track-transparent flex-grow">
                <Table className="min-w-[700px] md:min-w-full text-sm md:text-base relative">
                    <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={`font-bold ${density === 'compact' ? 'px-2 py-2' : 'px-2 py-3 md:px-4 md:py-3'} whitespace-nowrap text-xs md:text-sm bg-card/95`}
                                        style={{ textAlign: header.column.id === 'name' ? 'left' : 'right' }}
                                    >
                                        <div className={`flex items-center gap-1 ${header.column.id === 'name' ? '' : 'justify-end'}`}>
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row, rowIdx) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className={`transition-colors ${rowIdx % 2 === 0 ? "bg-background" : "bg-muted/30"} hover:bg-primary/5`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={`${density === 'compact' ? 'px-2 py-1.5' : 'px-2 py-2 md:px-4 md:py-3'} max-w-[140px] md:max-w-[220px] truncate align-middle text-xs md:text-sm`}
                                            title={String(cell.getValue())}
                                            style={{ textAlign: cell.column.id === 'name' ? 'left' : 'right' }}
                                        >
                                            <span className="block truncate" tabIndex={0} aria-label={String(cell.getValue())}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </span>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    <Trans>No results found.</Trans>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="mt-auto p-2 md:p-4 border-t bg-card">
                <Pagination
                    currentPage={table.getState().pagination.pageIndex + 1}
                    pageSize={table.getState().pagination.pageSize}
                    totalCount={totalCount}
                    onPageChange={(p) => table.setPageIndex(Math.max(0, p - 1))}
                    onPageSizeChange={(s) => table.setPageSize(s)}
                />
            </div>
        </div>
    );
}
