import { useState, type ReactNode } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowRight, Search, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { JusticeOverview } from '@/schemas/justice'
import {
  CoverageRibbon,
  JusticeUnavailablePanel,
  PrivacyBoundaryNotice,
  SourceProvenanceDisclosure,
} from '@/features/justice/components/data-trust'
import {
  getJusticeQueryOutcome,
  useJusticeOverview,
} from '@/features/justice/hooks/use-justice-data'
import {
  formatJusticeCountCompact,
  getJusticeCourtLevelLabel,
  looksLikeCaseNumber,
} from '@/features/justice/lib/justice-format'

export const Route = createFileRoute('/justitie/')({
  component: JusticeLandingRoute,
  head: () => ({
    meta: [{ title: `${t`Justiție`} — Transparenta.eu` }],
  }),
})

function JusticeLandingRoute() {
  const query = useJusticeOverview()
  const outcome = getJusticeQueryOutcome<JusticeOverview>(query.data)

  if (query.isLoading && !outcome) {
    return <JusticeLandingSkeleton />
  }

  if (query.isError) {
    return (
      <JusticePageShell>
        <EmptyState
          title={t`Nu am putut încărca datele despre justiție`}
          description={t`Încearcă din nou mai târziu. Modul mock rămâne izolat în adaptorul de feature.`}
        />
      </JusticePageShell>
    )
  }

  if (!outcome) {
    return null
  }

  if (outcome.kind === 'unavailable') {
    return (
      <JusticePageShell>
        <JusticeUnavailablePanel message={outcome.unavailable.message} />
      </JusticePageShell>
    )
  }

  if (outcome.kind === 'notFound') {
    return (
      <JusticePageShell>
        <EmptyState
          title={t`Nu există agregate de justiție`}
          description={t`Acesta este un rezultat de acoperire, nu o confirmare de inexistență.`}
        />
      </JusticePageShell>
    )
  }

  return <JusticeLandingContent overview={outcome.data} />
}

type JusticeLandingContentProps = {
  readonly overview: JusticeOverview
}

function JusticeLandingContent({ overview }: JusticeLandingContentProps) {
  return (
    <JusticePageShell>
      <section className="space-y-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            <Trans>Metadata publică, cu persoane protejate structural</Trans>
          </div>
          <div className="max-w-4xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              <Trans>Justiție</Trans>
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              <Trans>
                Explorează dosare și instanțe din Portal Just fără căutare după
                persoane fizice și fără text de soluții.
              </Trans>
            </p>
          </div>
        </div>

        <CoverageRibbon provenance={overview.provenance} />
        <JusticeSafeLookup />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <JusticeStat label={<Trans>Cauze</Trans>} value={overview.totals.cases} />
          <JusticeStat
            label={<Trans>Ședințe</Trans>}
            value={overview.totals.hearings}
          />
          <JusticeStat label={<Trans>Apeluri</Trans>} value={overview.totals.appeals} />
          <JusticeStat label={<Trans>Instanțe</Trans>} value={overview.totals.courts} />
          <JusticeStat
            label={<Trans>Chei publicabile</Trans>}
            value={overview.totals.publishableNameKeys}
          />
        </div>

        <PrivacyBoundaryNotice variant="metadata-only" />

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="border border-border p-4">
            <h2 className="text-lg font-semibold text-foreground">
              <Trans>Acoperire pe nivel de instanță</Trans>
            </h2>
            <div className="mt-4 space-y-3">
              {overview.byTier.map((tier) => (
                <Link
                  key={tier.tier}
                  to="/justitie/cautare"
                  search={{ tier: tier.tier }}
                  className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 text-sm last:border-0 hover:underline"
                >
                  <span>{getJusticeCourtLevelLabel(tier.tier)}</span>
                  <span className="text-muted-foreground">
                    {tier.courtCount} <Trans>instanțe</Trans> ·{' '}
                    {formatJusticeCountCompact(tier.caseCount)}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="border border-border p-4">
            <h2 className="text-lg font-semibold text-foreground">
              <Trans>Instanțe cu volum ridicat</Trans>
            </h2>
            <div className="mt-4 space-y-3">
              {overview.topCourts.map((court, index) => (
                <Link
                  key={court.institutionCode}
                  to="/justitie/instante/$courtId"
                  params={{ courtId: court.institutionCode }}
                  className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 text-sm last:border-0 hover:underline"
                >
                  <span>
                    <span className="text-muted-foreground">{index + 1}.</span>{' '}
                    {court.courtName}
                  </span>
                  <span className="text-muted-foreground">
                    {formatJusticeCountCompact(court.caseCount)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border border-border p-4">
          <h2 className="text-lg font-semibold text-foreground">
            <Trans>Subțiere istorică</Trans>
          </h2>
          <div className="mt-4 space-y-2">
            {overview.coverage.yearCounts.map((point) => {
              const max = Math.max(...overview.coverage.yearCounts.map((item) => item.count))
              const width = max > 0 ? Math.max(6, (point.count / max) * 100) : 0
              return (
                <div key={point.year} className="grid grid-cols-[4rem_1fr_5rem] items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{point.year}</span>
                  <div className="h-2 bg-muted">
                    <div className="h-2 bg-sky-600" style={{ width: `${width}%` }} />
                  </div>
                  <span className="text-right text-muted-foreground">
                    {formatJusticeCountCompact(point.count)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        <SourceProvenanceDisclosure provenance={overview.provenance} />
      </section>
    </JusticePageShell>
  )
}

function JusticeSafeLookup() {
  const navigate = useNavigate({ from: '/justitie' })
  const [value, setValue] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (!looksLikeCaseNumber(trimmed)) {
      setMessage(
        t`Introdu un număr exact de dosar sau folosește filtrele din căutarea avansată. Textul liber nu este păstrat în URL.`,
      )
      return
    }
    void navigate({
      to: '/justitie/cautare',
      search: { caseNumber: trimmed },
    })
  }

  return (
    <section className="border border-border bg-background p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <label htmlFor="justice-safe-lookup" className="text-sm font-medium">
            <Trans>Caută după număr exact de dosar</Trans>
          </label>
          <Input
            id="justice-safe-lookup"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setMessage(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
            }}
            placeholder={t`ex. 1234/3/2024`}
            className="mt-2"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            <Trans>
              Nu persistăm text liber sau nume de persoane. Pentru companii și
              instituții folosește filtrele publicabile.
            </Trans>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={submit}>
            <Search className="mr-2 h-4 w-4" aria-hidden />
            <Trans>Caută</Trans>
          </Button>
          <Button asChild variant="outline">
            <Link to="/justitie/cautare">
              <Trans>Filtre avansate</Trans>
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm text-amber-700">{message}</p> : null}
    </section>
  )
}

type JusticeStatProps = {
  readonly label: ReactNode
  readonly value: number
}

function JusticeStat({ label, value }: JusticeStatProps) {
  return (
    <dl className="border border-border p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-2xl font-semibold text-foreground">
        {formatJusticeCountCompact(value)}
      </dd>
    </dl>
  )
}

type JusticePageShellProps = {
  readonly children: ReactNode
}

function JusticePageShell({ children }: JusticePageShellProps) {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <nav className="flex flex-wrap gap-2 text-sm" aria-label={t`Justiție`}>
        <Link to="/justitie" className="font-medium hover:underline">
          <Trans>Prezentare</Trans>
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link to="/justitie/cautare" className="font-medium hover:underline">
          <Trans>Caută cauze</Trans>
        </Link>
      </nav>
      {children}
    </main>
  )
}

function JusticeLandingSkeleton() {
  return (
    <JusticePageShell>
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </JusticePageShell>
  )
}
