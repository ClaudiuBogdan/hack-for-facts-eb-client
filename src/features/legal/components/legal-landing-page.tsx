import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ExternalLink, FileText, Search, Scale } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  LegalActSummaryListItem,
  MonitorulIssueSummary,
  RecentlyModifiedAct,
} from '@/schemas/legal'
import { useLegalLandingData } from '../hooks/use-legal-landing-data'
import { formatLegalDate } from '../lib/legal-formatting'
import { LegalStatusBadge } from './legal-status-badge'
import { CoverageRibbon, DataStatusBadge } from './legal-trust'

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('ro-RO')
    .replace(/\s+/g, ' ')
}

function findMatchingAct(
  query: string,
  acts: readonly LegalActSummaryListItem[],
): LegalActSummaryListItem | null {
  const normalized = normalizeSearch(query)

  if (!normalized) {
    return null
  }

  return (
    acts.find((act) => {
      const candidates = [
        act.actId,
        act.displayCitation,
        `${act.actType} ${act.actNumber} ${act.actYear}`,
        `${act.actType} ${act.actNumber}/${act.actYear}`,
      ].map(normalizeSearch)

      return candidates.some((candidate) => candidate.includes(normalized))
    }) ?? null
  )
}

function getChangeKindLabel(changeKind: string): string {
  switch (changeKind) {
    case 'modificare':
      return t`modificare`
    case 'abrogare-totala':
      return t`abrogare totală`
    case 'abrogare-partiala':
      return t`abrogare parțială`
    default:
      return changeKind
  }
}

function RecentlyModifiedList({
  items,
}: {
  readonly items: readonly RecentlyModifiedAct[]
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={t`Nicio modificare recentă înregistrată`}
        description={t`Mostrele mock nu conțin evenimente recente pentru această secțiune.`}
      />
    )
  }

  return (
    <div className="divide-y rounded-md border border-border">
      {items.map((item) => (
        <Link
          key={`${item.actId}-${item.changeDate}`}
          to="/legislatie/acte/$id"
          params={{ id: item.actId }}
          className="flex flex-col gap-2 p-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold">{item.displayCitation}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {getChangeKindLabel(item.changeKind)} ·{' '}
              {formatLegalDate(item.changeDate)}
              {item.modifierCitation ? ` · ${item.modifierCitation}` : ''}
            </p>
          </div>
          <LegalStatusBadge status={item.status} />
        </Link>
      ))}
    </div>
  )
}

function TodayInMonitorulStrip({
  items,
}: {
  readonly items: readonly MonitorulIssueSummary[]
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={t`Nu există numere Monitorul Oficial pentru azi în mostre`}
        description={t`Secțiunea va folosi cel mai recent număr disponibil când adaptorul live este conectat.`}
      />
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((issue) => (
        <a
          key={issue.issueId}
          href={issue.sourceUrl ?? issue.pdfUrl ?? 'https://monitoruloficial.ro/'}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-border p-3 transition-colors hover:bg-muted/40"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">
                <Trans>
                  Partea {issue.partCode} nr. {issue.issueNumber}
                </Trans>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatLegalDate(issue.issueDate)} · {issue.sectionCount}{' '}
                <Trans>secțiuni</Trans>
              </p>
            </div>
            <ExternalLink
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <Badge className="mt-3" variant={issue.hasFullText ? 'success' : 'warning'}>
            {issue.hasFullText ? (
              <Trans>text disponibil</Trans>
            ) : (
              <Trans>coordonate de publicare</Trans>
            )}
          </Badge>
        </a>
      ))}
    </div>
  )
}

export function LegalLandingPageSkeleton() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    </main>
  )
}

export function LegalLandingPage() {
  const { q } = useSearch({ from: '/legislatie/' })
  const { data, isLoading, isError, error, refetch } = useLegalLandingData()
  const navigate = useNavigate({ from: '/legislatie' })
  const [query, setQuery] = useState(q ?? '')
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null)

  const examples = useMemo(
    () => data?.sampleActs.slice(0, 4) ?? [],
    [data?.sampleActs],
  )

  if (isLoading) {
    return <LegalLandingPageSkeleton />
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Alert variant="destructive">
          <AlertTitle>
            <Trans>Nu am putut încărca pagina de legislație</Trans>
          </AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : t`Eroare necunoscută`}
          </AlertDescription>
        </Alert>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => void refetch()}
        >
          <Trans>Reîncearcă</Trans>
        </Button>
      </main>
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const match = findMatchingAct(query, data.sampleActs)
    setSubmittedQuery(query)

    if (!match) {
      return
    }

    void navigate({
      to: '/legislatie/acte/$id',
      params: { id: match.actId },
    })
  }

  const noResult =
    submittedQuery !== null &&
    normalizeSearch(submittedQuery).length > 0 &&
    !findMatchingAct(submittedQuery, data.sampleActs)

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            <Trans>Legislație</Trans>
          </h1>
          <DataStatusBadge status={data.dataStatus} />
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          <Trans>
            Acte normative din Portal Legislativ și coordonate de publicare din
            Monitorul Oficial, afișate cu status, rezumat și proveniență.
          </Trans>
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-md border border-border bg-muted/20 p-4"
      >
        <label htmlFor="legal-search" className="text-sm font-medium">
          <Trans>Caută o citare sau o mostră de act</Trans>
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="legal-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t`Legea nr. 227/2015`}
            className="sm:flex-1"
          />
          <Button type="submit">
            <Search className="mr-2 h-4 w-4" aria-hidden="true" />
            <Trans>Caută</Trans>
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example) => (
            <Button
              key={example.actId}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void navigate({
                  to: '/legislatie/acte/$id',
                  params: { id: example.actId },
                })
              }}
            >
              {example.displayCitation}
            </Button>
          ))}
        </div>
        {noResult ? (
          <p className="mt-3 text-xs text-muted-foreground">
            <Trans>
              Nu există potrivire în mostrele mock. Căutarea completă și
              rezolvarea citărilor sunt păstrate pentru următorul strat.
            </Trans>
          </p>
        ) : null}
      </form>

      <div className="mt-6">
        <CoverageRibbon coverage={data.coverage} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              <Trans>Modificate recent</Trans>
            </h2>
          </div>
          <RecentlyModifiedList items={data.recentlyModified} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              <Trans>Azi în Monitorul Oficial</Trans>
            </h2>
          </div>
          <TodayInMonitorulStrip items={data.todayInMonitorul} />
        </section>
      </div>
    </main>
  )
}
