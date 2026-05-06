import type {
  AdvancedMapAnalyticsTableRow,
  AdvancedMapAnalyticsTableRowMode,
} from './advanced-map-analytics-table-types';
import {
  getAdvancedMapAnalyticsTableRowKind,
  isAdvancedMapAnalyticsGroupedTableRowMode,
} from './advanced-map-analytics-table-rows';

export function countAdvancedMapAnalyticsTablePaginationRows(
  rows: AdvancedMapAnalyticsTableRow[],
  rowMode: AdvancedMapAnalyticsTableRowMode
): number {
  if (!isAdvancedMapAnalyticsGroupedTableRowMode(rowMode)) {
    return rows.length;
  }

  return rows.filter((row) => getAdvancedMapAnalyticsTableRowKind(row) !== 'group-member').length;
}

export function paginateAdvancedMapAnalyticsTableRows(
  rows: AdvancedMapAnalyticsTableRow[],
  rowMode: AdvancedMapAnalyticsTableRowMode,
  pageIndex: number,
  pageSize: number
): AdvancedMapAnalyticsTableRow[] {
  if (!isAdvancedMapAnalyticsGroupedTableRowMode(rowMode)) {
    return rows;
  }

  const safePageIndex = Math.max(0, pageIndex);
  const safePageSize = Math.max(1, pageSize);
  const startIndex = safePageIndex * safePageSize;
  const endIndex = startIndex + safePageSize;
  const paginatedRows: AdvancedMapAnalyticsTableRow[] = [];
  let parentIndex = 0;
  let includeCurrentGroup = false;

  for (const row of rows) {
    const kind = getAdvancedMapAnalyticsTableRowKind(row);
    if (kind === 'group-member') {
      if (includeCurrentGroup) {
        paginatedRows.push(row);
      }
      continue;
    }

    includeCurrentGroup = parentIndex >= startIndex && parentIndex < endIndex;
    parentIndex += 1;
    if (includeCurrentGroup) {
      paginatedRows.push(row);
    }
  }

  return paginatedRows;
}
