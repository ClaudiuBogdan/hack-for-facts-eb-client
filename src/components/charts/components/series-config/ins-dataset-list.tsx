import { useState } from 'react';
import { t } from '@lingui/core/macro';
import type { VirtualItem } from '@tanstack/react-virtual';

import { useMultiSelectInfinite } from '@/components/filters/base-filter/hooks/useMultiSelectInfinite';
import { ErrorDisplay } from '@/components/filters/base-filter/ErrorDisplay';
import type { BaseListProps, OptionItem, PageData } from '@/components/filters/base-filter/interfaces';
import { ListContainer } from '@/components/filters/base-filter/ListContainer';
import { ListOption } from '@/components/filters/base-filter/ListOption';
import { SearchInput } from '@/components/filters/base-filter/SearchInput';
import { searchInsDatasets } from '@/lib/api/ins';
import type { InsDataset } from '@/schemas/ins';
import { cn, getUserLocale } from '@/lib/utils';

const MAX_CLIENT_FILTER_PAGE_SCAN_COUNT = 20;

function getDatasetDisplayName(dataset: InsDataset, locale: 'ro' | 'en'): string {
  if (locale === 'en') {
    return dataset.name_en || dataset.name_ro || dataset.code;
  }
  return dataset.name_ro || dataset.name_en || dataset.code;
}

function getDatasetListLabel(dataset: InsDataset, locale: 'ro' | 'en'): string {
  return `${dataset.code} - ${getDatasetDisplayName(dataset, locale)}`;
}

export interface InsDatasetListFilter {
  hasUatData?: boolean;
  hasSiruta?: boolean;
}

interface InsDatasetListProps extends BaseListProps {
  datasetFilter?: InsDatasetListFilter;
}

function matchesDatasetFilter(dataset: InsDataset, datasetFilter?: InsDatasetListFilter): boolean {
  if (!datasetFilter) {
    return true;
  }

  if (datasetFilter.hasUatData === true && !dataset.has_uat_data) {
    return false;
  }

  if (datasetFilter.hasSiruta === true && !dataset.has_siruta) {
    return false;
  }

  return true;
}

export function InsDatasetList({
  selectedOptions,
  toggleSelect,
  pageSize = 100,
  className,
  datasetFilter,
}: InsDatasetListProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const locale = getUserLocale() === 'en' ? 'en' : 'ro';
  const searchVisibilityThreshold = 15;

  const {
    items,
    totalCount,
    parentRef,
    rowVirtualizer,
    isLoading,
    isError,
    error,
    refetch,
    isFetchingNextPage,
  } = useMultiSelectInfinite<InsDataset>({
    itemSize: 48,
    queryKey: [
      'ins-datasets',
      searchFilter,
      String(datasetFilter?.hasUatData ?? ''),
      String(datasetFilter?.hasSiruta ?? ''),
    ],
    queryFn: async ({ pageParam = 0 }): Promise<PageData<InsDataset>> => {
      const shouldScanForSirutaMatches = datasetFilter?.hasSiruta === true;
      let lastPageInfo!: {
        totalCount: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
      };
      const filteredNodes: InsDataset[] = [];
      let nextOffset = pageParam;
      let scannedPageCount = 0;
      let shouldContinueScanning = true;

      while (shouldContinueScanning) {
        const response = await searchInsDatasets({
          filter: {
            search: searchFilter.trim() || undefined,
            hasUatData: datasetFilter?.hasUatData,
          },
          limit: pageSize,
          offset: nextOffset,
        });

        lastPageInfo = response.pageInfo;
        const currentPageNodes = response.nodes ?? [];
        nextOffset += currentPageNodes.length;
        filteredNodes.push(
          ...currentPageNodes.filter((dataset) =>
            matchesDatasetFilter(dataset, datasetFilter)
          )
        );
        scannedPageCount += 1;

        const exhaustedBackendPages = !response.pageInfo.hasNextPage || currentPageNodes.length === 0;
        const reachedScanLimit = scannedPageCount >= MAX_CLIENT_FILTER_PAGE_SCAN_COUNT;
        const foundClientFilteredResults = filteredNodes.length > 0;
        const shouldStopScanning =
          !shouldScanForSirutaMatches ||
          exhaustedBackendPages ||
          reachedScanLimit ||
          foundClientFilteredResults;

        if (shouldStopScanning) {
          shouldContinueScanning = false;
        }
      }

      return {
        nodes: filteredNodes,
        pageInfo: lastPageInfo,
        nextOffset,
      };
    },
  });

  const showSearchInput = searchFilter.length > 0 || totalCount > searchVisibilityThreshold;
  const showNoResults = !isLoading && !isError && items.length === 0 && searchFilter.length > 0;
  const isEmpty = !isLoading && !isError && items.length === 0 && searchFilter.length === 0;

  return (
    <div className={cn('w-full flex flex-col space-y-3', className)}>
      {showSearchInput && (
        <SearchInput
          onChange={setSearchFilter}
          placeholder={t`Search INS datasets (ex: POP107D)`}
          initialValue={searchFilter}
        />
      )}

      {isError && error && (
        <ErrorDisplay
          error={error as Error}
          refetch={refetch}
          title={t`Could not load INS datasets`}
        />
      )}

      {!isError && (
        <ListContainer
          ref={parentRef}
          height={rowVirtualizer.getTotalSize()}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isLoading}
          isSearchResultsEmpty={showNoResults}
          isEmpty={isEmpty}
          className="min-h-[10rem]"
          ariaLabel={t`INS dataset options`}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
            const dataset = items[virtualRow.index];
            if (!dataset) return null;

            const optionId = dataset.code;
            const optionLabel = getDatasetListLabel(dataset, locale);
            const isSelected = selectedOptions.some((item: OptionItem) => String(item.id) === optionId);

            return (
              <ListOption
                key={optionId}
                uniqueIdPart={optionId}
                onClick={() => toggleSelect({ id: optionId, label: optionLabel })}
                label={optionLabel}
                selected={isSelected}
                optionHeight={virtualRow.size}
                optionStart={virtualRow.start}
              />
            );
          })}
        </ListContainer>
      )}
    </div>
  );
}
