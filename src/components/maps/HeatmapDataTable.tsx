import React, { useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { HeatmapUATDataPoint } from "@/lib/api/dataDiscovery";
import { formatCurrency, formatNumberRO } from "@/lib/utils";

interface HeatmapDataTableProps {
  data: HeatmapUATDataPoint[];
  isLoading: boolean;
  sorting: SortingState;
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
}

export function HeatmapDataTable({
  data,
  isLoading,
  sorting,
  setSorting,
  pagination,
  setPagination,
}: HeatmapDataTableProps) {
  const columns = useMemo<ColumnDef<HeatmapUATDataPoint>[]>(
    () => [
      {
        accessorKey: "uat_name",
        header: ({ column }) => (
          <div
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            UAT Name
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ),
        cell: ({ row }) => <div className="truncate" title={row.getValue("uat_name")}>{row.getValue("uat_name")}</div>,
      },
      {
        accessorKey: "county_name",
        header: ({ column }) => (
          <div
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            County
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ),
        cell: ({ row }) => row.getValue("county_name") || "-",
      },
      {
        accessorKey: "population",
        header: ({ column }) => (
          <div
            className="flex items-center gap-1 cursor-pointer text-right w-full justify-end"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Population
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ),
        cell: ({ row }) => {
          const population = row.getValue("population") as number | null;
          return <div className="text-right">{population ? formatNumberRO(population) : "-"}</div>;
        },
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <div
            className="flex items-center gap-1 cursor-pointer text-right w-full justify-end"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Amount (Payment)
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ),
        cell: ({ row }) => <div className="text-right">{formatCurrency(row.getValue("amount"))}</div>,
      },
      {
        accessorKey: "total_amount",
        header: ({ column }) => (
          <div
            className="flex items-center gap-1 cursor-pointer text-right w-full justify-end"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Total Amount (Commitment)
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ),
        cell: ({ row }) => <div className="text-right">{formatCurrency(row.getValue("total_amount"))}</div>,
      },
      {
        accessorKey: "per_capita_amount",
        header: ({ column }) => (
          <div
            className="flex items-center gap-1 cursor-pointer text-right w-full justify-end"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Per Capita Amount
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ),
        cell: ({ row }) => <div className="text-right">{formatCurrency(row.getValue("per_capita_amount"))}</div>,
      },
    ],
    []
  );

  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false, // Data is client-side
    manualSorting: false, // Data is client-side
  });

  if (isLoading) {
    // Simple loading state for now, can be enhanced
    return (
      <div className="rounded-md border space-y-2 p-4 bg-card animate-pulse">
        <div className="h-8 bg-muted rounded" />
        {Array.from({ length: pagination.pageSize }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }
  
  // More code will be added here for table rendering and pagination UI
  return (
    <div className="flex flex-col h-full">
      <div className="rounded-md border bg-card overflow-auto scrollbar-thin scrollbar-thumb-muted/40 scrollbar-track-transparent flex-grow">
        <Table className="min-w-[700px] md:min-w-full text-sm md:text-base relative">
          <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="font-bold px-2 py-3 md:px-4 md:py-3 whitespace-nowrap text-xs md:text-sm bg-card/95 cursor-pointer"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ textAlign: header.column.id === 'uat_name' || header.column.id === 'county_name' ? 'left' : 'right' }}
                  >
                    <div className={`flex items-center gap-1 ${header.column.id === 'uat_name' || header.column.id === 'county_name' ? '' : 'justify-end'}`}>
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
                      className="px-2 py-2 md:px-4 md:py-3 max-w-[140px] md:max-w-[220px] truncate align-middle text-xs md:text-sm"
                      title={String(cell.getValue())}
                      style={{ textAlign: cell.column.id === 'uat_name' || cell.column.id === 'county_name' ? 'left' : 'right' }}
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
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between mt-auto gap-4 p-2 md:p-4 border-t bg-card">
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 md:space-x-4 w-full md:w-auto text-xs md:text-sm">
          <span className="text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() > 0 ? table.getPageCount() : 1}
          </span>
          <div className="flex items-center space-x-1 md:space-x-2">
            <span className="text-muted-foreground">| Show</span>
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => table.setPageSize(parseInt(value))}
            >
              <SelectTrigger className="h-7 md:h-8 w-[60px] md:w-[70px] text-xs md:text-sm" aria-label="Select page size">
                <SelectValue placeholder={table.getState().pagination.pageSize.toString()} />
              </SelectTrigger>
              <SelectContent>
                {[10, 15, 20, 30, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">of {table.getFilteredRowModel().rows.length} entries</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center space-x-1 md:space-x-2 w-full md:w-auto justify-center md:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 md:h-8 md:w-8 p-0"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 md:h-8 md:w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
          </Button>

          {/* Page numbers could be added here similarly to DataDisplay.tsx if desired */}

          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 md:h-8 md:w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 md:h-8 md:w-8 p-0"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage() || table.getPageCount() === 0}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 