import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Link } from '@tanstack/react-router'
import { Archive, Search, Vote } from 'lucide-react'
import { CoverageRibbon } from '@/components/data-trust'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  DEFAULT_CONTEST_SEARCH,
  DEFAULT_ELECTION_HUB_SEARCH,
  DEFAULT_ELECTIONS_LANDING_SEARCH,
} from '@/schemas/elections'
import type { ElectionsLandingSearch, ElectionFamily } from '../types'
import { useElectionsIndex } from '../hooks/use-elections'
import { ElectionsPageLayout } from './elections-page-layout'
import { WinnerCard } from './election-shared'
import { familyLabel, formatDate } from '../lib/format'
import { presidentialHeadline } from '../mocks/fixtures/elections-fixtures'

type Props = {
  readonly search: ElectionsLandingSearch
  readonly onSearchChange: (next: ElectionsLandingSearch) => void
}

const families: readonly ElectionFamily[] = [
  'local',
  'prezidentiale',
  'parlamentare',
  'europarlamentare',
  'referendum',
]

function toggleFamily(
  current: readonly ElectionFamily[],
  family: ElectionFamily,
): readonly ElectionFamily[] {
  return current.includes(family)
    ? current.filter((item) => item !== family)
    : [...current, family]
}

export function ElectionsLandingPage({ search, onSearchChange }: Props) {
  const query = useElectionsIndex(search)
  const data = query.data

  const update = (patch: Partial<ElectionsLandingSearch>) => {
    onSearchChange({ ...search, ...patch })
  }

  return (
    <ElectionsPageLayout
      title={<Trans>Rezultate alegeri</Trans>}
      subtitle={
        <Trans>
          Rezultatele alegerilor din Romania, 1992-2025, explorabile cu sursa
          langa fiecare cifra.
        </Trans>
      }
    >
      {query.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      )}

      {query.isError && (
        <EmptyState
          icon={<Vote className="h-6 w-6" aria-hidden />}
          title={t`Nu am putut incarca alegerile`}
          description={t`URL-ul a fost pastrat; incearca din nou dupa refresh.`}
        />
      )}

      {data !== undefined && (
        <div className="space-y-5">
          <CoverageRibbon coverage={data.coverage} />

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <WinnerCard headline={presidentialHeadline} />
            <div className="rounded-md border p-4">
              <p className="text-sm font-semibold">
                <Trans>Cauta zona ta</Trans>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                <Trans>
                  Intrarea geografica foloseste acum fixture-ul validat pentru
                  Cluj-Napoca.
                </Trans>
              </p>
              <Button asChild className="mt-4 w-full">
                <Link
                  to="/alegeri/contest/$contestKey"
                  params={{ contestKey: 'local-2024-cluj-napoca-primar' }}
                  search={DEFAULT_CONTEST_SEARCH}
                >
                  <Trans>Cluj-Napoca - primar 2024</Trans>
                </Link>
              </Button>
            </div>
          </section>

          <section className="sticky top-2 z-10 rounded-md border bg-background/95 p-3 shadow-sm backdrop-blur">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label className="relative block">
                <span className="sr-only">
                  <Trans>Cauta alegeri</Trans>
                </span>
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
                <Input
                  value={search.q ?? ''}
                  onChange={(event) => update({ q: event.target.value })}
                  placeholder={t`Cauta dupa nume, an sau autoritate`}
                  className="pl-9"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={search.arhiva === 1}
                  onCheckedChange={(checked) => update({ arhiva: checked ? 1 : 0 })}
                />
                <span><Trans>Include arhiva 1992-2007</Trans></span>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {families.map((family) => {
                const active = search.family.includes(family)
                return (
                  <Button
                    key={family}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => update({ family: toggleFamily(search.family, family) })}
                  >
                    {familyLabel(family)}
                  </Button>
                )
              })}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onSearchChange({
                    ...DEFAULT_ELECTIONS_LANDING_SEARCH,
                  })
                }
              >
                <Trans>Reseteaza</Trans>
              </Button>
            </div>
          </section>

          {data.items.length === 0 ? (
            <EmptyState
              icon={<Archive className="h-6 w-6" aria-hidden />}
              title={t`Nicio alegere nu corespunde filtrelor`}
              description={t`Reseteaza filtrele sau include arhiva istorica.`}
            />
          ) : (
            <section className="space-y-3">
              {data.items.map((election) => (
                <Link
                  key={election.electionKey}
                  to="/alegeri/$electionKey"
                  params={{ electionKey: election.electionKey }}
                  search={DEFAULT_ELECTION_HUB_SEARCH}
                  className="group block rounded-md border p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        {familyLabel(election.family)} · {election.authority}
                      </p>
                      <h2 className="mt-1 font-semibold">{election.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(election.date)}
                      </p>
                    </div>
                    <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                      {election.isFinal ? <Trans>Final</Trans> : <Trans>Provizoriu</Trans>}
                    </span>
                  </div>
                </Link>
              ))}
              {search.arhiva !== 1 && data.hiddenArchiveCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  <Trans>
                    Exista scrutine istorice ascunse; activeaza arhiva pentru
                    a le vedea.
                  </Trans>
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </ElectionsPageLayout>
  )
}
