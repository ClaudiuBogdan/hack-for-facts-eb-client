import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Link } from '@tanstack/react-router'
import { TableProperties } from 'lucide-react'
import { CoverageRibbon, PrivacyBoundaryNotice } from '@/components/data-trust'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DEFAULT_ELECTION_HUB_SEARCH } from '@/schemas/elections'
import type { ContestSearch } from '../types'
import {
  useContestCandidacies,
  useContestMandates,
  useContestResults,
} from '../hooks/use-elections'
import { ElectionsPageLayout } from './elections-page-layout'
import {
  CandidacyList,
  ElectionBoundaryBadge,
  GeographyDrilldown,
  MandateAllocationPanel,
  RankedResultsChart,
  RankedResultsTable,
  TurnoutSummary,
  WinnerCard,
} from './election-shared'

type Props = {
  readonly contestKey: string
  readonly search: ContestSearch
  readonly onSearchChange: (next: ContestSearch) => void
}

export function ContestResultExplorerPage({
  contestKey,
  search,
  onSearchChange,
}: Props) {
  const resultsQuery = useContestResults(contestKey, search)
  const mandatesQuery = useContestMandates(contestKey)
  const candidaciesQuery = useContestCandidacies(contestKey)
  const data = resultsQuery.data

  const update = (patch: Partial<ContestSearch>) => {
    onSearchChange({ ...search, ...patch })
  }

  const title =
    data === null || data === undefined
      ? <Trans>Rezultate alegeri</Trans>
      : `${data.contest.officeLabel} - ${data.contest.scopeLabel}`

  return (
    <ElectionsPageLayout
      title={title}
      subtitle={
        <Trans>
          Explorer de rezultate pe competitor si geografie, cu provenienta pentru
          fiecare cifra afisata.
        </Trans>
      }
    >
      {resultsQuery.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      )}

      {resultsQuery.isError && (
        <EmptyState
          icon={<TableProperties className="h-6 w-6" aria-hidden />}
          title={t`Nu am putut incarca rezultatele`}
          description={t`URL-ul a fost pastrat; incearca din nou dupa refresh.`}
        />
      )}

      {data === null && (
        <EmptyState
          icon={<TableProperties className="h-6 w-6" aria-hidden />}
          title={t`Concurs negasit`}
          description={t`Fixture-ul MVP contine contestKey local-2024-cluj-napoca-primar.`}
        />
      )}

      {data !== undefined && data !== null && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <ElectionBoundaryBadge />
            <Button asChild variant="ghost" size="sm">
              <Link
                to="/alegeri/$electionKey"
                params={{ electionKey: data.election.electionKey }}
                search={DEFAULT_ELECTION_HUB_SEARCH}
              >
                <Trans>Inapoi la scrutin</Trans>
              </Link>
            </Button>
          </div>
          <CoverageRibbon coverage={data.coverage} />

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <WinnerCard
              headline={{
                contest: data.contest,
                topCompetitor: data.competitors[0] ?? null,
                turnout: data.turnout,
              }}
            />
            <TurnoutSummary
              turnout={data.turnout}
              title={`${data.contest.officeLabel} - ${data.contest.scopeLabel}`}
            />
          </section>

          <section className="flex flex-wrap gap-2 rounded-md border p-3">
            {(['lista', 'tabel', 'harta'] as const).map((view) => (
              <Button
                key={view}
                type="button"
                size="sm"
                variant={(search.view ?? 'lista') === view ? 'default' : 'outline'}
                onClick={() => update({ view })}
              >
                {view === 'lista' ? <Trans>Lista</Trans> : view === 'tabel' ? <Trans>Tabel</Trans> : <Trans>Harta</Trans>}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant={search.expert === 1 ? 'warning' : 'outline'}
              onClick={() => update({ expert: search.expert === 1 ? 0 : 1 })}
            >
              <Trans>Mod expert</Trans>
            </Button>
          </section>

          {(search.view ?? 'lista') === 'harta' ? (
            <EmptyState
              title={t`Harta este pregatita pentru integrarea API`}
              description={t`Vizualizarea implicita ramane lista populata; harta nu blocheaza MVP-ul.`}
            />
          ) : (
            <GeographyDrilldown
              children={data.children}
              pollingStations={data.pollingStations}
              expert={search.expert === 1}
            />
          )}

          <Tabs
            value={search.tab ?? 'rezultate'}
            onValueChange={(tab) =>
              update({
                tab:
                  tab === 'candidaturi' || tab === 'mandate' || tab === 'date'
                    ? tab
                    : 'rezultate',
              })
            }
          >
            <TabsList className="flex-wrap">
              <TabsTrigger value="rezultate">
                <Trans>Rezultate</Trans>
              </TabsTrigger>
              <TabsTrigger value="candidaturi">
                <Trans>Candidaturi</Trans>
              </TabsTrigger>
              <TabsTrigger value="mandate">
                <Trans>Mandate</Trans>
              </TabsTrigger>
              <TabsTrigger value="date">
                <Trans>Date</Trans>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="rezultate" className="space-y-4">
              <RankedResultsChart
                rows={data.competitors}
                title={`${data.contest.officeLabel} - ${data.contest.scopeLabel}`}
              />
              <RankedResultsTable
                rows={data.competitors}
                title={`${data.contest.officeLabel} - ${data.contest.scopeLabel}`}
              />
            </TabsContent>
            <TabsContent value="candidaturi" className="space-y-3">
              <PrivacyBoundaryNotice />
              <CandidacyList candidacies={candidaciesQuery.data ?? []} />
            </TabsContent>
            <TabsContent value="mandate">
              <MandateAllocationPanel
                mandates={mandatesQuery.data ?? []}
                title={`${data.contest.officeLabel} - ${data.contest.scopeLabel}`}
              />
            </TabsContent>
            <TabsContent value="date">
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                <p>
                  <Trans>
                    Tabelul complet al randurilor brute ramane in adapterul API.
                    In MVP afisam aceleasi randuri agregate cu pointere sursa.
                  </Trans>
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </ElectionsPageLayout>
  )
}
