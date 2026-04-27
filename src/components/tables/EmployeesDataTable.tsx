import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  PaginationState,
  ColumnDef,
} from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { EnrichedEmployeeData } from '@/schemas/employeeData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatCurrency, formatNumber, getSignClass } from '@/lib/utils'; // Assuming you have a `cn` utility
import { CalculationLegend } from '@/components/entities/views/CalculationLegend';

type EmployeeRowData = EnrichedEmployeeData & {
  __entityCui?: string;
  __uatNameAccurate?: string;
  __spendingTotal2024?: number;
  __spendingPerCapita2024?: number;
};

type EmployeesDataTableProps = {
  data: readonly EmployeeRowData[] | null;
  sorting: SortingState;
  setSorting: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
  pagination: PaginationState;
  setPagination: (updater: PaginationState | ((old: PaginationState) => PaginationState)) => void;
};

export function EmployeesDataTable({ data, sorting, setSorting, pagination, setPagination }: EmployeesDataTableProps) {
  const columns = useMemo<ColumnDef<EmployeeRowData>[]>(() => [
    {
      accessorKey: 'uatName',
      header: 'UAT',
      cell: ({ row }) => {
        const name = row.original.__uatNameAccurate ?? row.original.uatName ?? '';
        const cui = row.original.__entityCui;

        if (cui) {
          return (
            <Link to="/entities/$cui" params={{ cui }} search={{ view: 'employees' }} className="underline-offset-2 hover:underline">
              {name}
            </Link>
          );
        }
        return <span>{name}</span>;
      },
    },
    createNumericColumn('employeesPer1000Capita', 'Angajați / 1.000 loc.', 'Personal raportat la 1.000 locuitori. Mai mic = mai eficient.'),
    createNumericColumn('occupiedPosts', 'Posturi ocupate (S)', 'Total angajați actuali (S).'),
    createNumericColumn('totalPostsActual', 'Total posturi', 'Posturile din organigramă (ocupate + vacante).'),
    createNumericColumn('uatPopulation', 'Populație', 'Populația estimată a UAT-ului.', false),
    {
      accessorKey: '__spendingTotal2024',
      header: 'Cheltuieli totale 2024',
      cell: ({ getValue }) => withTooltip(formatOptionalCurrency(getValue<number>()), 'Total cheltuieli în anul 2024.'),
    },
    {
      accessorKey: '__spendingPerCapita2024',
      header: 'Cheltuieli per capita 2024',
      cell: ({ getValue }) => withTooltip(formatOptionalCurrency(getValue<number>()), 'Cheltuieli pe locuitor în 2024.'),
    },
    createNumericColumn(
      'totalPostsReduction45',
      'Total cu reducere -45% (R)',
      'R = I + J + L + M + N + O, unde I = G × 55%. Literele corespund coloanelor din fișierul sursă XLS.'
    ),
    createDiffColumn(
      'diff45VsOccupied',
      'Dif. -45% vs. ocupate (U)',
      'U = R − S. Negativ = deficit; Pozitiv = excedent față de limita simulată. Literele corespund coloanelor din fișierul sursă XLS.'
    ),
    createNumericColumn(
      'totalPostsReduction40',
      'Total cu reducere -40% (Q)',
      'Q = H + J + L + M + N + O, unde H = G × 60%. Literele corespund coloanelor din fișierul sursă XLS.'
    ),
    createDiffColumn(
      'diff40VsOccupied',
      'Dif. -40% vs. ocupate (T)',
      'T = Q − S. Negativ = deficit; Pozitiv = excedent față de limita simulată. Literele corespund coloanelor din fișierul sursă XLS.'
    ),
    createNumericColumn('maxPostsFromOUG63', 'Maxim legal (OUG 63/2010) (G)', 'Limită superioară în funcție de populație (G).', false),
  ], []);

  const table = useReactTable<EmployeeRowData>({
    data: [...(data ?? [])] as EmployeeRowData[],
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <div className="rounded-md border bg-card overflow-auto max-w-full relative">
        <Table className="min-w-[900px] md:min-w-full text-sm">
          <TableHeader className="sticky top-0 z-10 bg-card border-b">
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const isFirstColumn = header.column.id === 'uatName';
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "whitespace-nowrap",
                        isFirstColumn ? "text-left sticky left-0 z-20 bg-card border-r" : "text-right"
                      )}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "flex items-center gap-1",
                            header.column.getCanSort() && "cursor-pointer select-none",
                            !isFirstColumn && "justify-end"
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: '▲', desc: '▼' }[header.column.getIsSorted() as string]}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row, rowIndex) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => {
                  const isFirstColumn = cell.column.id === 'uatName';
                  return (
                    <TableCell
                      key={cell.id}
                      // Simplified background logic using `cn` and modulo operator.
                      className={cn(
                        "whitespace-nowrap align-middle",
                        rowIndex % 2 === 0 ? "bg-background" : "bg-muted",
                        isFirstColumn ? "text-left sticky left-0 z-10 border-r" : "text-right",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-2 md:p-3 border-t bg-card sticky bottom-0">
          <Pagination
            currentPage={table.getState().pagination.pageIndex + 1}
            pageSize={table.getState().pagination.pageSize}
            totalCount={table.getPrePaginationRowModel().rows.length}
            onPageChange={(page) => table.setPageIndex(page - 1)}
            onPageSizeChange={table.setPageSize}
          />
        </div>
      </div>
      <div className="mt-4">
        <CalculationLegend />
      </div>
    </>
  );
}

/** Wraps content in a tooltip. */
const withTooltip = (content: React.ReactNode, text: string) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{content}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

/** Formats a numeric value, returning 'N/A' if nullish. */
const formatOptionalNumber = (value: number | null | undefined, options: 'compact' | 'standard' = 'standard') => {
  if (!value) {
    return 'N/A';
  }
  return options === 'compact' ? formatNumber(value, 'compact') : value.toLocaleString('ro-RO');
};

/** Formats a currency value, returning 'N/A' if nullish. */
const formatOptionalCurrency = (value: number | null | undefined) => {
  if (!value) {
    return 'N/A';
  }
  return formatCurrency(value, 'compact');
}

// --- 4. Reusable Column Definition Factories ---
// These functions reduce boilerplate and make the columns array more declarative.

/** Creates a standard numeric column definition with a tooltip. */
const createNumericColumn = (
  id: keyof EmployeeRowData,
  header: string,
  tooltipText: string,
  useCompactFormatting = true,
): ColumnDef<EmployeeRowData> => ({
  accessorKey: id,
  header,
  cell: ({ getValue }) => withTooltip(
    formatOptionalNumber(getValue<number>(), useCompactFormatting ? 'compact' : 'standard'),
    tooltipText
  ),
});

/** Creates a column for showing the difference, with color-coded values. */
const createDiffColumn = (
  id: keyof EmployeeRowData,
  header: string,
  tooltipText: string,
): ColumnDef<EmployeeRowData> => ({
  accessorKey: id,
  header,
  cell: ({ getValue }) => {
    const value = getValue<number>() ?? 0;
    const content = <span className={getSignClass(value)}>{value.toLocaleString('ro-RO')}</span>;
    return withTooltip(content, tooltipText);
  },
});
