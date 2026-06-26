import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, ArrowRight, Scale } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  CompanyLitigationCase,
  CompanyLitigationResult,
} from '@/schemas/justice'
import { useCompanyLitigation } from '../hooks/use-justice-data'
import {
  formatJusticeCount,
  formatJusticeDate,
  getJusticePartyKindLabel,
} from '../lib/justice-format'
import {
  CoverageRibbon,
  IdentityConfidenceBadge,
  JusticeUnavailablePanel,
  PrivacyBoundaryNotice,
  SourceProvenanceDisclosure,
} from './data-trust'
import { getJusticeQueryOutcome } from '../hooks/use-justice-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type LitigationSliceSectionProps = {
  readonly cui: string
  readonly page: number
  readonly onPageChange: (page: number) => void
}

const PAGE_SIZE = 10

export function LitigationSliceSection({
  cui,
  page,
  onPageChange,
}: LitigationSliceSectionProps) {
  const query = useCompanyLitigation({ cui, page, pageSize: PAGE_SIZE })
  const outcome = getJusticeQueryOutcome<CompanyLitigationResult>(query.data)

  if (query.isLoading && !outcome) {
    return <LitigationSliceSkeleton />
  }

  if (query.isError) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
        title={t`Nu am putut încărca litigiile`}
        description={t`Încearcă din nou mai târziu. Datele mock rămân izolate în adaptorul de feature.`}
      />
    )
  }

  if (!outcome) {
    return null
  }

  if (outcome.kind === 'unavailable') {
    return <JusticeUnavailablePanel message={outcome.unavailable.message} />
  }

  if (outcome.kind === 'notFound') {
    return (
      <EmptyState
        title={t`Nu există date de litigii pentru acest profil`}
        description={t`Acesta este un rezultat de acoperire, nu o confirmare că profilul nu apare în instanță.`}
      />
    )
  }

  return (
    <LitigationSliceContent
      result={outcome.data}
      page={page}
      onPageChange={onPageChange}
    />
  )
}

type LitigationSliceContentProps = {
  readonly result: CompanyLitigationResult
  readonly page: number
  readonly onPageChange: (page: number) => void
}

function LitigationSliceContent({
  result,
  page,
  onPageChange,
}: LitigationSliceContentProps) {
  const isGated = result.laneAvailability.companyCandidates === 'gated'
  const total = result.pagination.total ?? 0

  return (
    <section className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              <Trans>Litigii</Trans>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isGated ? (
                <Trans>Corelarea dintre CUI și dosare este în verificare.</Trans>
              ) : (
                <Trans>
                  {formatJusticeCount(result.headline.totalCases)} cauze
                  publicabile ca {getJusticePartyKindLabel(result.headline.asPartyKind)}.
                </Trans>
              )}
            </p>
          </div>
          <Badge variant={isGated ? 'secondary' : 'outline'} className="w-fit">
            {isGated ? <Trans>corelare în verificare</Trans> : <Trans>mock</Trans>}
          </Badge>
        </div>

        <CoverageRibbon provenance={result.provenance} />
        <PrivacyBoundaryNotice variant="candidate-link" />
      </div>

      {result.matchedNameKeys.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            <Trans>Chei publicabile potrivite</Trans>
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.matchedNameKeys.map((match) => (
              <div
                key={match.nameKey}
                className="flex flex-col gap-2 border border-border px-3 py-2 sm:flex-row sm:items-center"
              >
                <span className="text-sm font-medium">{match.displayName}</span>
                <IdentityConfidenceBadge confidence={match.confidence} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isGated ? (
        <EmptyState
          icon={<Scale className="h-5 w-5" aria-hidden />}
          title={t`Litigiile sunt în curs de corelare`}
          description={t`Portal Just nu conține CUI-uri. Până la publicarea candidaților verificați, nu ghicim legături pe bază de nume.`}
        />
      ) : total === 0 ? (
        <EmptyState
          title={t`Nu am găsit cauze în acoperirea curentă`}
          description={t`Cheia publicabilă există, dar fixture-ul mock nu are dosare pentru intervalul acoperit.`}
        />
      ) : (
        <>
          <LitigationSummary result={result} />
          <CompanyLitigationCaseTable cases={result.cases} cui={result.cui} />
          <Pagination
            currentPage={page}
            pageSize={result.pagination.pageSize}
            totalCount={total}
            onPageChange={onPageChange}
            pageSizeOptions={[10, 25, 50]}
          />
        </>
      )}

      <SourceProvenanceDisclosure provenance={result.provenance} />
    </section>
  )
}

type LitigationSummaryProps = {
  readonly result: CompanyLitigationResult
}

function LitigationSummary({ result }: LitigationSummaryProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <SummaryPanel title={<Trans>Instanțe principale</Trans>}>
        {result.summary.topCourts.map((court) => (
          <Link
            key={court.institutionCode}
            to="/justitie/instante/$courtId"
            params={{ courtId: court.institutionCode }}
            className="flex items-center justify-between gap-3 text-sm hover:underline"
          >
            <span>{court.courtName}</span>
            <span className="text-muted-foreground">{court.count}</span>
          </Link>
        ))}
      </SummaryPanel>
      <SummaryPanel title={<Trans>Categorii</Trans>}>
        {result.summary.topCategories.map((category) => (
          <div
            key={category.category}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span>{category.categoryName}</span>
            <span className="text-muted-foreground">{category.count}</span>
          </div>
        ))}
      </SummaryPanel>
      <SummaryPanel title={<Trans>Tendință anuală</Trans>}>
        {result.summary.yearTrend.map((point) => (
          <div key={point.year} className="flex items-center gap-2 text-sm">
            <span className="w-12 text-muted-foreground">{point.year}</span>
            <div className="h-2 flex-1 bg-muted">
              <div
                className="h-2 bg-emerald-600"
                style={{ width: `${Math.min(100, Math.max(8, point.count * 30))}%` }}
              />
            </div>
            <span>{point.count}</span>
          </div>
        ))}
      </SummaryPanel>
    </div>
  )
}

type SummaryPanelProps = {
  readonly title: ReactNode
  readonly children: ReactNode
}

function SummaryPanel({ title, children }: SummaryPanelProps) {
  return (
    <section className="border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  )
}

type CompanyLitigationCaseTableProps = {
  readonly cases: readonly CompanyLitigationCase[]
  readonly cui: string
}

function CompanyLitigationCaseTable({
  cases,
  cui,
}: CompanyLitigationCaseTableProps) {
  return (
    <div className="overflow-x-auto border border-border">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              <Trans>Instanță</Trans>
            </TableHead>
            <TableHead scope="col">
              <Trans>Dosar</Trans>
            </TableHead>
            <TableHead scope="col">
              <Trans>Stadiu</Trans>
            </TableHead>
            <TableHead scope="col">
              <Trans>Rol</Trans>
            </TableHead>
            <TableHead scope="col" className="text-right">
              <Trans>Detalii</Trans>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((item) => (
            <TableRow key={`${item.caseId}-${item.role}`}>
              <TableCell>{item.courtName ?? item.institutionCode}</TableCell>
              <TableCell className="font-mono text-sm">{item.caseNumber}</TableCell>
              <TableCell>
                <div>{item.stageName ?? '—'}</div>
                <div className="text-xs text-muted-foreground">
                  {item.categoryName ?? '—'} ·{' '}
                  {formatJusticeDate(item.latestHearingAt)}
                </div>
              </TableCell>
              <TableCell>{item.role}</TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                  <Link
                    to="/justitie/dosare/$caseId"
                    params={{ caseId: item.caseId }}
                    search={{ from: `companies:${cui}` }}
                  >
                    <Trans>Deschide</Trans>
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LitigationSliceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
