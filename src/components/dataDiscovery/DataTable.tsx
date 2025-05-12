import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { BudgetLineItem } from "@/lib/api/dataDiscovery";
import { formatCurrency } from "@/lib/utils";
import { useMemo } from "react";
import { ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { SortOrder } from "@/schemas/interfaces";

interface DataTableProps {
  data: BudgetLineItem[];
  isLoading: boolean;
  sort: SortOrder;
  onSortColumn: (columnId: string) => void;
}

export function DataTable({ data, isLoading, sort, onSortColumn }: DataTableProps) {
  // Process the data to ensure we have the fields we need
  const processedData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        // Ensure these fields exist for the table
        functional_name:
          item.functional_name ||
          item.functionalClassification?.functional_name ||
          "-",
        economic_name:
          item.economic_name ||
          item.economicClassification?.economic_name ||
          "-",
      })),
    [data]
  );

  // Define columns with sortable headers
  const columns = useMemo<ColumnDef<BudgetLineItem>[]>(
    () => [
      {
        accessorKey: "entity_name",
        header: () => (
          <div
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => onSortColumn("entity_name")}
          >
            Entity
            {sort.by === "entity_cui" ? (
              sort.order === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ),
      },
      {
        accessorKey: "reporting_year",
        header: () => (
          <div
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => onSortColumn("reporting_year")}
          >
            Year
            {sort.by === "year" ? (
              sort.order === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ),
      },
      {
        accessorKey: "account_category",
        header: () => (
          <div
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => onSortColumn("account_category")}
          >
            Account Category
            {sort.by === "account_category" ? (
              sort.order === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ),
        cell: ({ row }) => {
          const accountCategory = row.getValue("account_category");
          const accountLabel =
            accountCategory === "ch"
              ? "Cheltuieli"
              : accountCategory === "vn"
                ? "Venituri"
                : "Altele";
          return (
            <div
              className="max-w-[200px] truncate"
              title={String(accountLabel)}
            >
              {accountLabel}
            </div>
          );
        },
      },
      {
        accessorKey: "functional_name",
        header: () => (
          <div
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => onSortColumn("functional_name")}
          >
            Functional Category
            {sort.by === "functional_code" ? (
              sort.order === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ),
        cell: ({ row }) => (
          <div
            className="max-w-[200px] truncate"
            title={String(row.getValue("functional_name"))}
          >
            <span className="font-mono text-xs text-muted-foreground mr-1">
              {row.original.functional_code}
            </span>
            {row.getValue("functional_name")}
          </div>
        ),
      },
      {
        accessorKey: "economic_name",
        header: () => (
          <div
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => onSortColumn("economic_name")}
          >
            Economic Category
            {sort.by === "economic_code" ? (
              sort.order === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ),
        cell: ({ row }) => (
          <div
            className="max-w-[200px] truncate"
            title={String(row.getValue("economic_name"))}
          >
            <span className="font-mono text-xs text-muted-foreground mr-1">
              {row.original.economic_code}
            </span>
            {row.getValue("economic_name")}
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: () => (
          <div
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => onSortColumn("amount")}
          >
            Amount
            {sort.by === "amount" ? (
              sort.order === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ),
        cell: ({ row }) => formatCurrency(row.getValue("amount")),
      },
    ],
    [sort.by, sort.order, onSortColumn]
  );

  const table = useReactTable({
    data: processedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Removed getPaginationRowModel to show all data
  });

  if (isLoading) {
    return (
      <div className="rounded-md border space-y-2 p-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* Removed pagination controls */}
    </div>
  );
}
