import { RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useReportsConnection } from '@/lib/hooks/useEntityDetails'
import { toReportTypeValue, type GqlReportType } from '@/schemas/reporting'
import type { ReportNode } from '@/lib/api/entities'
import type { ChallengeLocale } from '../../types'

type ChallengeEntityReportsSectionProps = {
  readonly locale: ChallengeLocale
  readonly entityCui: string
  readonly selectedYear: number
  readonly reportType: Extract<GqlReportType, 'PRINCIPAL_AGGREGATED' | 'DETAILED'>
}

const MAX_VISIBLE_REPORTS = 5
const REPORT_FETCH_LIMIT = 24
const DOWNLOAD_TYPE_ORDER: Record<string, number> = {
  PDF: 0,
  XLSX: 1,
  XML: 2,
}

const REPORTS_COPY = {
  ro: {
    title: 'Rapoarte financiare',
    selectedYear: 'An selectat',
    empty: (year: number) =>
      `Nu am găsit rapoarte publicate pentru ${year} în modul selectat.`,
    error: 'Nu am putut încărca rapoartele pentru această perioadă.',
    retry: 'Încearcă din nou',
    showLess: 'Arată mai puține',
    showMore: (count: number) =>
      `Arată încă ${count} ${count === 1 ? 'raport' : 'rapoarte'}`,
    totalCount: (count: number) =>
      `${count} ${count === 1 ? 'raport' : 'rapoarte'}`,
    publishedOn: 'Publicat',
    downloadAriaLabel: (fileType: string, formattedDate: string) =>
      `Descarcă ${fileType} publicat la ${formattedDate}`,
  },
  en: {
    title: 'Financial Reports',
    selectedYear: 'Selected year',
    empty: (year: number) =>
      `No reports were published for ${year} in the selected mode.`,
    error: 'We could not load the reports for this period.',
    retry: 'Try again',
    showLess: 'Show fewer',
    showMore: (count: number) =>
      `Show ${count} more ${count === 1 ? 'report' : 'reports'}`,
    totalCount: (count: number) =>
      `${count} ${count === 1 ? 'report' : 'reports'}`,
    publishedOn: 'Published',
    downloadAriaLabel: (fileType: string, formattedDate: string) =>
      `Download ${fileType} published on ${formattedDate}`,
  },
} as const

function toLocaleTag(locale: ChallengeLocale) {
  return locale === 'en' ? 'en-US' : 'ro-RO'
}

function parseReportDate(reportDate: string) {
  const numericValue = Number(reportDate)
  const normalizedDate = Number.isFinite(numericValue)
    ? new Date(numericValue)
    : new Date(reportDate)

  return Number.isNaN(normalizedDate.getTime()) ? null : normalizedDate
}

function formatReportMonthYear(reportDate: string, locale: ChallengeLocale) {
  const parsedDate = parseReportDate(reportDate)
  if (!parsedDate) return reportDate

  const formatted = new Intl.DateTimeFormat(toLocaleTag(locale), {
    month: 'long',
    year: 'numeric',
  }).format(parsedDate)

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function formatReportDate(reportDate: string, locale: ChallengeLocale) {
  const parsedDate = parseReportDate(reportDate)
  if (!parsedDate) return reportDate

  return new Intl.DateTimeFormat(toLocaleTag(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate)
}

function toTimestamp(reportDate: string) {
  return parseReportDate(reportDate)?.getTime() ?? Number.NEGATIVE_INFINITY
}

function toDownloadType(link: string) {
  const rawExtension = link.split('.').pop()?.split('?')[0]?.toUpperCase() ?? 'FILE'
  return rawExtension
}

function sortDownloadLinks(links: readonly string[]) {
  return [...links].sort((firstLink, secondLink) => {
    const firstType = toDownloadType(firstLink)
    const secondType = toDownloadType(secondLink)
    const firstOrder = DOWNLOAD_TYPE_ORDER[firstType] ?? Number.MAX_SAFE_INTEGER
    const secondOrder = DOWNLOAD_TYPE_ORDER[secondType] ?? Number.MAX_SAFE_INTEGER

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder
    }

    return firstType.localeCompare(secondType)
  })
}

function ChallengeEntityReportsSectionSkeleton() {
  return (
    <div className="divide-y divide-border/40" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 py-3.5"
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3.5 w-36" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-14 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ChallengeEntityReportsRow({
  locale,
  report,
}: {
  readonly locale: ChallengeLocale
  readonly report: ReportNode
}) {
  const copy = REPORTS_COPY[locale]
  const formattedMonthYear = formatReportMonthYear(report.report_date, locale)
  const formattedDate = formatReportDate(report.report_date, locale)
  const sortedDownloadLinks = sortDownloadLinks(report.download_links)

  return (
    <li className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formattedMonthYear}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
          {copy.publishedOn} {formattedDate}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {sortedDownloadLinks.map((link) => {
          const fileType = toDownloadType(link)

          return (
            <a
              key={link}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.downloadAriaLabel(fileType, formattedDate)}
              className="inline-flex h-8 touch-manipulation items-center justify-center rounded-full border border-border/60 bg-background px-3 text-xs font-semibold tracking-[0.12em] text-foreground transition-colors hover:border-border hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {fileType}
            </a>
          )
        })}
      </div>
    </li>
  )
}

export function ChallengeEntityReportsSection({
  locale,
  entityCui,
  selectedYear,
  reportType,
}: ChallengeEntityReportsSectionProps) {
  const copy = REPORTS_COPY[locale]
  const [isExpanded, setIsExpanded] = useState(false)
  const reportsQuery = useReportsConnection({
    filter: {
      entity_cui: entityCui,
      reporting_year: selectedYear,
      report_type: reportType,
    },
    limit: REPORT_FETCH_LIMIT,
    offset: 0,
    enabled: entityCui.length > 0,
  })

  useEffect(() => {
    setIsExpanded(false)
  }, [entityCui, reportType, selectedYear])

  const sortedReports = useMemo(
    () =>
      [...(reportsQuery.data?.nodes ?? [])].sort(
        (firstReport, secondReport) =>
          toTimestamp(secondReport.report_date) -
          toTimestamp(firstReport.report_date),
      ),
    [reportsQuery.data?.nodes],
  )
  const totalCount = reportsQuery.data?.pageInfo.totalCount ?? sortedReports.length
  const hiddenReportCount = Math.max(sortedReports.length - MAX_VISIBLE_REPORTS, 0)
  const visibleReports = isExpanded
    ? sortedReports
    : sortedReports.slice(0, MAX_VISIBLE_REPORTS)
  const canExpand = totalCount > MAX_VISIBLE_REPORTS && hiddenReportCount > 0

  return (
    <Card className="rounded-[28px] border-border/50">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-xl font-black tracking-tight">
            {copy.title}
          </CardTitle>
          <Badge variant="secondary" className="px-3 py-1 font-medium tabular-nums">
            {copy.selectedYear} {selectedYear}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 font-medium tabular-nums">
            {copy.totalCount(totalCount)}
          </Badge>
        </div>
        <CardDescription className="max-w-3xl text-sm leading-6">
          <span className="font-medium text-foreground">
            {toReportTypeValue(reportType)}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5" aria-live="polite">
        {reportsQuery.isLoading ? (
          <ChallengeEntityReportsSectionSkeleton />
        ) : reportsQuery.isError ? (
          <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-5 py-6">
            <p className="text-sm text-muted-foreground">
              {copy.error}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 rounded-full"
              onClick={() => {
                void reportsQuery.refetch()
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              {copy.retry}
            </Button>
          </div>
        ) : visibleReports.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-5 py-6 text-sm text-muted-foreground">
            {copy.empty(selectedYear)}
          </div>
        ) : (
          <>
            <ol className="divide-y divide-border/40">
              {visibleReports.map((report) => (
                <ChallengeEntityReportsRow
                  key={report.report_id}
                  locale={locale}
                  report={report}
                />
              ))}
            </ol>

            {canExpand ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setIsExpanded((previousState) => !previousState)}
                aria-expanded={isExpanded}
              >
                {isExpanded
                  ? copy.showLess
                  : copy.showMore(hiddenReportCount)}
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
