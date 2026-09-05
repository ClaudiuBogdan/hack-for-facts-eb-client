import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import type { StatisticsDatasetDetailSearch } from '@/schemas/statistics'
import { searchInsTerritories } from '../api/graphql/statistics-fetchers'
import { type DetailSearchPatch } from '../lib/dataset-selection'

/** Canonical territory is an independent intersection, never an INS source-member choice. */
export function DetailTerritoryControl({
  search,
  onChange,
}: {
  readonly search: StatisticsDatasetDetailSearch
  readonly onChange: (patch: DetailSearchPatch) => void
}) {
  const inputId = useId()
  const [draft, setDraft] = useState('')
  const [offsets, setOffsets] = useState([0])
  const term = useDebouncedValue(draft.trim(), 300)
  const offset = offsets[offsets.length - 1]
  const query = useQuery({
    queryKey: ['statisticsCanonicalTerritories', 'native-v1', term, offset],
    queryFn: async ({ signal }) => {
      const page = await searchInsTerritories({
        filter: {
          ...(term ? { search: term } : {}),
          levels: ['NATIONAL', 'NUTS3', 'LAU'],
        },
        limit: 20,
        offset,
        signal,
      })
      if (page.hasNextPage && page.rows.length === 0)
        throw new Error('Empty continuing territory page')
      return page
    },
    staleTime: 60_000,
  })
  const loading = query.isFetching || query.isPending || draft.trim() !== term
  const data = !loading && !query.isError ? query.data : undefined

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>
        <Trans>Filtru teritorial canonic</Trans>
      </Label>
      <p className="text-xs text-muted-foreground">
        <Trans>
          Filtrul se intersectează cu selecțiile geografice INS de mai jos.
        </Trans>
      </p>
      <Input
        id={inputId}
        value={draft}
        placeholder={t`Caută o localitate sau un județ`}
        onChange={(event) => {
          setDraft(event.target.value)
          setOffsets([0])
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange({ teritoriu: 'cod:RO' })}
        >
          <Trans>România</Trans>
        </Button>
        {search.teritoriu !== undefined ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ teritoriu: undefined })}
          >
            <Trans>Șterge filtrul teritorial</Trans>
          </Button>
        ) : null}
      </div>
      {loading ? (
        <p role="status">
          <Trans>Se încarcă…</Trans>
        </p>
      ) : null}
      {query.isError && draft.trim() === term ? (
        <div role="alert">
          <p>
            <Trans>Nu am putut căuta teritoriile.</Trans>
          </p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            <Trans>Reîncearcă</Trans>
          </Button>
        </div>
      ) : null}
      {data?.rows.length === 0 ? (
        <p>
          <Trans>Niciun teritoriu nu se potrivește cu acest termen.</Trans>
        </p>
      ) : null}
      {data ? (
        <>
          <ul className="max-h-60 overflow-y-auto divide-y rounded border">
            {data.rows.map((row) => {
              const token =
                row.level === 'LAU' && row.siruta
                  ? `siruta:${row.siruta}`
                  : row.level === 'NUTS3' || row.level === 'NATIONAL'
                    ? `cod:${row.code}`
                    : null
              return (
                <li key={`${row.level}:${row.code}`}>
                  <button
                    type="button"
                    disabled={token === null}
                    className="w-full p-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                    onClick={() => {
                      if (token) onChange({ teritoriu: token })
                    }}
                  >
                    <span className="block font-medium">
                      {row.name ?? row.code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {[row.level, row.code, row.countyName, row.siruta]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {offsets.length > 1 || data.hasNextPage ? (
            <div className="flex justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={offsets.length === 1}
                onClick={() => setOffsets((values) => values.slice(0, -1))}
              >
                <Trans>Anterior</Trans>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!data.hasNextPage || data.rows.length === 0}
                onClick={() =>
                  setOffsets((values) => [...values, offset + data.rows.length])
                }
              >
                <Trans>Următor</Trans>
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
