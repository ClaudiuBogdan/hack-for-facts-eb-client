import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Button } from "@/components/ui/button";
import { fetchInsDatasetPage } from "../api/graphql/statistics-fetchers";
import { StatisticsDebouncedSearchInput } from "./filters/statistics-debounced-search-input";

const PAGE_SIZE = 20;

/** General catalog discovery; exact entity coverage is checked after selection. */
export function EntityInsDatasetPicker({
  selectedCode,
  onSelect,
}: {
  readonly selectedCode: string | null;
  readonly onSelect: (code: string) => void;
}) {
  const [search, setSearch] = useState<string | undefined>();
  const [offsets, setOffsets] = useState([0]);
  const offset = offsets[offsets.length - 1];
  const query = useQuery({
    queryKey: ["statistics", "native-entity-catalog-v1", search ?? "", offset],
    queryFn: async ({ signal }) => {
      const page = await fetchInsDatasetPage({
        filter: { search, dataStatus: ["AVAILABLE"] },
        limit: PAGE_SIZE,
        offset,
        signal,
      });
      const end = offset + page.datasets.length;
      if (
        page.datasets.length > PAGE_SIZE ||
        new Set(page.datasets.map((dataset) => dataset.code)).size !==
          page.datasets.length ||
        (page.hasNextPage && !page.datasets.length) ||
        (page.totalCount >= 0 &&
          (end > page.totalCount || page.hasNextPage !== end < page.totalCount))
      ) {
        throw new Error("Invalid native INS catalog page");
      }
      return page;
    },
    placeholderData: () => undefined,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const page = query.isSuccess && !query.isFetching ? query.data : null;
  return (
    <section className="space-y-3" aria-label={t`INS dataset catalog`}>
      <h3 className="text-sm font-semibold">
        <Trans>Choose an INS dataset</Trans>
      </h3>
      <p className="text-xs text-muted-foreground">
        <Trans>
          This is the general INS catalog. Availability for this entity's area
          is checked after you select a dataset.
        </Trans>
      </p>
      <StatisticsDebouncedSearchInput
        value={search}
        onCommit={(next) => {
          setSearch(next);
          setOffsets([0]);
        }}
        inputId="entity-ins-dataset-search"
        placeholder={t`Search INS datasets…`}
        ariaLabel={t`Search INS datasets`}
        clearLabel={t`Clear dataset search`}
      />
      {query.isFetching ? (
        <p role="status">
          <Trans>Loading datasets…</Trans>
        </p>
      ) : null}
      {query.isError ? (
        <div role="alert">
          <p>
            <Trans>We could not load the dataset catalog.</Trans>
          </p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            <Trans>Retry</Trans>
          </Button>
        </div>
      ) : null}
      {page?.datasets.length === 0 ? (
        <p>
          <Trans>No datasets match this search.</Trans>
        </p>
      ) : null}
      {page ? (
        <>
          <ul className="max-h-64 overflow-y-auto divide-y rounded-md border">
            {page.datasets.map((dataset) => (
              <li key={dataset.code}>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start whitespace-normal px-3 py-2 text-left"
                  aria-pressed={selectedCode === dataset.code}
                  onClick={() => onSelect(dataset.code)}
                >
                  <span>
                    <span className="block">
                      {dataset.nameRo ?? dataset.code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dataset.code}
                    </span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={offsets.length === 1 || query.isFetching}
          onClick={() => setOffsets((current) => current.slice(0, -1))}
        >
          <Trans>Previous datasets</Trans>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!page?.hasNextPage}
          onClick={() => {
            if (page?.hasNextPage)
              setOffsets((current) => [
                ...current,
                offset + page.datasets.length,
              ]);
          }}
        >
          <Trans>Next datasets</Trans>
        </Button>
      </div>
    </section>
  );
}
