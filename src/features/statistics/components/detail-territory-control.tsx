import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import type { InsTerritoryLevel } from '@/schemas/ins'
import type {
  StatisticsDatasetDetailSearch,
  StatisticsTerritorySearchRow,
} from '@/schemas/statistics'
import { searchInsTerritories } from '../api/graphql/statistics-fetchers'
import { type DetailSearchPatch } from '../lib/dataset-selection'
import { statisticsTheme } from '../lib/statistics-theme'
import { DetailOptionList, type DetailOption } from './detail-option-list'

/** Territories read per scroll; the list asks for the next as it nears the end. */
const TERRITORY_PAGE_SIZE = 100

/**
 * Canonical territory is an independent intersection, never an INS
 * source-member choice. The same list as every other axis of the rail: a
 * search, the territories as one scrolling list, the way back to the whole
 * country in the footer.
 */
export function DetailTerritoryControl({
  search,
  onChange,
  levels,
  variant = 'panel',
  onPicked,
}: {
  readonly search: StatisticsDatasetDetailSearch
  readonly onChange: (patch: DetailSearchPatch) => void
  /**
   * The levels THIS dataset publishes — `datasetTerritoryLevels`. Searching
   * every level for every matrix offered a national-only series every county
   * in the country, and choosing one wrote a filter no row could satisfy.
   */
  readonly levels: readonly InsTerritoryLevel[]
  /**
   * `panel` paints a popover edge to edge, with its own header; `field` is
   * the labelled form the phone sheet stacks.
   */
  readonly variant?: 'panel' | 'field'
  /** Close the surface the control is in, once a territory has been chosen. */
  readonly onPicked?: () => void
}) {
  const [draft, setDraft] = useState('')
  const term = useDebouncedValue(draft.trim(), 300)
  const levelKey = [...levels].join(',')
  const query = useInfiniteQuery({
    queryKey: ['statisticsCanonicalTerritories', 'scroll-v1', levelKey, term],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const page = await searchInsTerritories({
        filter: {
          ...(term ? { search: term } : {}),
          levels: [...levels],
        },
        limit: TERRITORY_PAGE_SIZE,
        offset: pageParam,
        signal,
      })
      if (page.hasNextPage && page.rows.length === 0)
        throw new Error('Empty continuing territory page')
      return page
    },
    // The offset of the next page is the number of rows already held, not a
    // page counter: a server that returned a short page must not be asked to
    // skip rows it never sent.
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasNextPage
        ? pages.reduce((count, page) => count + page.rows.length, 0)
        : undefined,
    staleTime: 60_000,
  })
  const loading = query.isPending || draft.trim() !== term
  const options =
    loading || query.isError ? [] : flattenTerritories(query.data?.pages)
  const totalCount = loading || query.isError ? undefined : query.data?.pages[0]?.totalCount
  const selectedKey = typeof search.teritoriu === 'string' ? search.teritoriu : null

  const pick = (token: string | undefined) => {
    onChange({ teritoriu: token })
    onPicked?.()
  }

  return (
    <div className="flex flex-col">
      {variant === 'panel' ? (
        <div className={statisticsTheme.optionPanelHeader}>
          <p className={statisticsTheme.sectionLabel}>
            <Trans>Teritoriu</Trans>
          </p>
        </div>
      ) : (
        <p className="mb-1.5 text-sm font-medium">
          <Trans>Teritoriu</Trans>
        </p>
      )}
      <div className={variant === 'field' ? 'rounded-md border border-border/70' : undefined}>
        <DetailOptionList
          label={t`Teritoriu`}
          placeholder={t`Caută o localitate sau un județ`}
          draft={draft}
          onDraftChange={setDraft}
          options={options}
          selectedKey={selectedKey}
          onPick={(option) => pick(option.key)}
          loading={loading}
          error={
            query.isError ? (
              <>
                <p className="text-destructive">
                  <Trans>Nu am putut căuta teritoriile.</Trans>
                </p>
                <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                  <Trans>Reîncearcă</Trans>
                </Button>
              </>
            ) : undefined
          }
          empty={query.isSuccess && options.length === 0}
          emptyLabel={t`Niciun teritoriu nu se potrivește cu acest termen.`}
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          fetchNextPage={() => void query.fetchNextPage()}
        />
        <div className={statisticsTheme.optionPanelFooter}>
          <span role="status" className="min-w-0">
            {totalCount !== undefined && totalCount >= 0
              ? plural(totalCount, {
                  one: 'un teritoriu',
                  few: '# teritorii',
                  other: '# de teritorii',
                })
              : null}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => pick('cod:RO')}
              className="rounded-sm px-1 py-1 font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trans>România</Trans>
            </button>
            {search.teritoriu !== undefined ? (
              <button
                type="button"
                onClick={() => pick(undefined)}
                className="rounded-sm px-1 py-1 font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trans>Șterge filtrul teritorial</Trans>
              </button>
            ) : null}
          </span>
        </div>
      </div>
      <p className="px-3 pb-2 pt-1.5 text-xs text-muted-foreground">
        <Trans>
          Filtrul se intersectează cu selecțiile geografice INS de mai jos.
        </Trans>
      </p>
    </div>
  )
}

/**
 * The pages as rows the list can draw, keyed by the token the URL carries.
 * A row at a level with no token — nothing the filter can name — is left
 * out rather than shown disabled: the dataset's own levels are the only ones
 * asked for, so there should be none.
 */
function flattenTerritories(
  pages: readonly { readonly rows: readonly StatisticsTerritorySearchRow[] }[] | undefined,
): readonly DetailOption[] {
  const seen = new Set<string>()
  const options: DetailOption[] = []
  for (const page of pages ?? []) {
    for (const row of page.rows) {
      const token =
        row.level === 'LAU' && row.siruta
          ? `siruta:${row.siruta}`
          : row.level === 'NUTS3' || row.level === 'NATIONAL'
            ? `cod:${row.code}`
            : null
      if (!token || seen.has(token)) continue
      seen.add(token)
      options.push({
        key: token,
        label: row.name ?? row.code,
        meta: [row.level, row.code, row.countyName, row.siruta].filter(Boolean).join(' · '),
      })
    }
  }
  return options
}
