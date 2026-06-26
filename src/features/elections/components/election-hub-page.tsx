import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { CoverageRibbon } from '@/components/data-trust'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ElectionHubSearch } from '../types'
import { useElection } from '../hooks/use-elections'
import { ElectionsPageLayout } from './elections-page-layout'
import { ContestLinkRow, WinnerCard } from './election-shared'
import { familyLabel, formatDate } from '../lib/format'

type Props = {
  readonly electionKey: string
  readonly search: ElectionHubSearch
  readonly onSearchChange: (next: ElectionHubSearch) => void
}

export function ElectionHubPage({ electionKey, search, onSearchChange }: Props) {
  const query = useElection(electionKey, search)
  const data = query.data

  const update = (patch: Partial<ElectionHubSearch>) => {
    onSearchChange({ ...search, ...patch })
  }

  return (
    <ElectionsPageLayout
      title={data?.election?.name ?? <Trans>Alegeri</Trans>}
      subtitle={
        data?.election === null ? undefined : (
          <Trans>Hub de scrutin cu concursuri, acoperire si rezultate principale.</Trans>
        )
      }
    >
      {query.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      )}

      {data?.election === null && (
        <EmptyState
          title={t`Scrutin negasit`}
          description={t`Cheia ceruta nu exista in fixture-ul MVP.`}
        />
      )}

      {data?.election !== undefined && data.election !== null && (
        <div className="space-y-5">
          <CoverageRibbon coverage={data.election.coverage} />
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{familyLabel(data.election.family)}</span>
            <span>·</span>
            <span>{formatDate(data.election.date)}</span>
            <span>·</span>
            <span>{data.election.isFinal ? <Trans>Final</Trans> : <Trans>Provizoriu</Trans>}</span>
          </div>

          {data.headline.length > 0 && (
            <section className="grid gap-3 md:grid-cols-2">
              {data.headline.map((headline) => (
                <WinnerCard key={headline.contest.contestKey} headline={headline} compact />
              ))}
            </section>
          )}

          <Tabs
            value={search.tab ?? 'contests'}
            onValueChange={(tab) =>
              update({ tab: tab === 'sumar' ? 'sumar' : 'contests' })
            }
          >
            <TabsList>
              <TabsTrigger value="contests">
                <Trans>Concursuri</Trans>
              </TabsTrigger>
              <TabsTrigger value="sumar">
                <Trans>Sumar</Trans>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="contests" className="space-y-3">
              <div className="rounded-md border p-3">
                <Input
                  value={search.q ?? ''}
                  onChange={(event) => update({ q: event.target.value })}
                  placeholder={t`Filtreaza dupa functie sau localitate`}
                />
              </div>
              {data.contests.length === 0 ? (
                <EmptyState
                  title={t`Niciun concurs nu corespunde filtrelor`}
                  description={t`Pastrez cheia scrutinului si poti reseta cautarea.`}
                />
              ) : (
                <div className="space-y-2">
                  {data.contests.map((contest) => (
                    <ContestLinkRow
                      key={contest.contestKey}
                      contest={contest}
                      isMockBacked={
                        contest.contestKey === 'local-2024-cluj-napoca-primar'
                      }
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="sumar" className="space-y-3">
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                <p>
                  <Trans>
                    Sumarul pastreaza distinctia dintre rezultate de alegeri si
                    voturi parlamentare. Legaturile catre mandate parlamentare
                    raman indisponibile pana cand tabela dedicata este populata.
                  </Trans>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => update({ tab: 'contests' })}
                >
                  <Trans>Vezi concursurile</Trans>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </ElectionsPageLayout>
  )
}
