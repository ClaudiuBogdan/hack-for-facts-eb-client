import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  CalendarDays,
  FileSearch,
  Landmark,
  Scale,
} from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { LegalAct, LegalActKeyDate } from '@/schemas/legal'
import { useLegalAct } from '../hooks/use-legal-act'
import { formatLegalDate } from '../lib/legal-formatting'
import { LegalStatusBadge } from './legal-status-badge'
import {
  AIProvenanceNotice,
  DataStatusBadge,
  SourceProvenancePanel,
} from './legal-trust'
import { MonitorulPublicationCard } from './monitorul-publication-card'

type LegalActPageProps = {
  readonly actId: string
}

type KeyDatesRowProps = {
  readonly act: LegalAct
}

function buildKeyDates(act: LegalAct): readonly LegalActKeyDate[] {
  const summaryDates = act.summary?.keyDates ?? []

  if (summaryDates.length > 0) {
    return summaryDates
  }

  if (act.entryIntoForce) {
    return [{ label: t`Intrare în vigoare`, date: act.entryIntoForce }]
  }

  return []
}

function KeyDatesRow({ act }: KeyDatesRowProps) {
  const dates = buildKeyDates(act)

  if (dates.length === 0) {
    return (
      <EmptyState
        title={t`Date-cheie indisponibile`}
        description={t`Sursele încărcate nu au furnizat date-cheie pentru acest act.`}
      />
    )
  }

  return (
    <section aria-label={t`Date-cheie`} className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">
          <Trans>Date-cheie</Trans>
        </h2>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {dates.map((date) => (
          <div
            key={`${date.label}-${date.date}`}
            className="rounded-md border border-border bg-muted/20 p-3"
          >
            <dt className="text-xs font-medium text-muted-foreground">
              {date.label}
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {formatLegalDate(date.date)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        <Trans>
          Datele sunt preluate din sumarul Portal Legislativ și din câmpurile
          de intrare în vigoare ale actului.
        </Trans>
      </p>
    </section>
  )
}

function ActHeader({ act }: { readonly act: LegalAct }) {
  const issuer = act.issuerRaw ?? act.issuerSlug

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <nav className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/legislatie" className="hover:text-foreground">
            <Trans>Legislație</Trans>
          </Link>
          <span aria-hidden="true">/</span>
          <span>
            <Trans>Acte</Trans>
          </span>
        </nav>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {act.displayCitation}
              </h1>
              <LegalStatusBadge
                status={act.status}
                modificationCount={act.modificationCount}
                showModificationSuffix
              />
              <DataStatusBadge status={act.dataStatus} />
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Scale className="h-4 w-4" aria-hidden="true" />
                {act.actType.toUpperCase()} · {act.actYear}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Landmark className="h-4 w-4" aria-hidden="true" />
                {issuer}
              </span>
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              <Trans>Versiune canonică</Trans>
            </p>
            <p>{act.canonicalDocumentId}</p>
          </div>
        </div>
      </div>
    </header>
  )
}

function SummaryPanel({ act }: { readonly act: LegalAct }) {
  const summary = act.summary

  if (!summary) {
    return (
      <section aria-label={t`Rezumat în limbaj simplu`}>
        <EmptyState
          icon={<FileSearch className="h-5 w-5" aria-hidden="true" />}
          title={t`Rezumatul în limbaj simplu nu este încă disponibil`}
          description={t`Statusul, datele-cheie și coordonatele de publicare rămân vizibile din sursele deterministe.`}
        />
      </section>
    )
  }

  const summaryText =
    summary.plainLanguageSummary ?? summary.summary ?? summary.description

  return (
    <section aria-label={t`Rezumat în limbaj simplu`} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          <Trans>Ce înseamnă acest act</Trans>
        </h2>
        {summary.domains.length > 0 ? (
          <div className="hidden flex-wrap gap-1 sm:flex">
            {summary.domains.slice(0, 3).map((domain) => (
              <Badge key={domain} variant="secondary">
                {domain}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      {summaryText ? (
        <p className="text-sm leading-7 text-foreground">{summaryText}</p>
      ) : (
        <EmptyState
          title={t`Textul rezumatului lipsește`}
          description={t`Metadatele AI există, dar textul publicabil nu este încă disponibil.`}
        />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/20 p-3">
          <h3 className="text-sm font-semibold">
            <Trans>Pe cine afectează</Trans>
          </h3>
          {summary.affectedAudiences.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {summary.affectedAudiences.map((audience) => (
                <Badge key={audience} variant="outline">
                  {audience}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              <Trans>Audiențe neclasificate în sumar.</Trans>
            </p>
          )}
        </div>
        <div className="rounded-md border border-border bg-muted/20 p-3">
          <h3 className="text-sm font-semibold">
            <Trans>Impact fiscal și sancțiuni</Trans>
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {summary.fiscalImpact ?? t`Impact fiscal neclasificat.`}
          </p>
          {summary.penaltiesMentioned.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {summary.penaltiesMentioned.map((penalty) => (
                <li key={penalty}>{penalty}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <AIProvenanceNotice summary={summary} sourceUrl={act.source.sourceUrl} />
    </section>
  )
}

function LegalActNotFound({ actId }: { readonly actId: string }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <EmptyState
        icon={<FileSearch className="h-6 w-6" aria-hidden="true" />}
        title={t`Actul nu a fost găsit`}
        description={t`Nu există o mostră mock sau un răspuns live pentru identificatorul ${actId}.`}
      />
      <Button asChild variant="outline" className="mt-4">
        <Link to="/legislatie">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          <Trans>Înapoi la Legislație</Trans>
        </Link>
      </Button>
    </main>
  )
}

export function LegalActPageSkeleton() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </main>
  )
}

export function LegalActPage({ actId }: LegalActPageProps) {
  const { data: act, isError, isLoading, error, refetch } = useLegalAct(actId)

  if (isLoading) {
    return <LegalActPageSkeleton />
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Alert variant="destructive">
          <AlertTitle>
            <Trans>Nu am putut încărca actul</Trans>
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

  if (!act) {
    return <LegalActNotFound actId={actId} />
  }

  return (
    <>
      <ActHeader act={act} />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-8">
            <SummaryPanel act={act} />
            <KeyDatesRow act={act} />
            <MonitorulPublicationCard publication={act.mo} />
          </div>

          <aside className="space-y-4">
            <SourceProvenancePanel
              source={act.source}
              title={t`Proveniența actului`}
            />
            <section className="rounded-md border border-border bg-muted/20 p-3 text-sm">
              <h2 className="font-semibold">
                <Trans>Legături conexe</Trans>
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                <Trans>
                  Cronologia, referințele, structura documentului și legăturile
                  parlamentare sunt păstrate pentru următorul strat al
                  domeniului legal.
                </Trans>
              </p>
              {act.mo?.pdfUrl ? (
                <a
                  href={act.mo.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  <Trans>Deschide dovada publicării</Trans>
                </a>
              ) : null}
            </section>
          </aside>
        </div>
      </main>
    </>
  )
}
