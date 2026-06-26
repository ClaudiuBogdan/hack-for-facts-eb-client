import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { getScraperDatasetById } from '@/lib/scraper-references'
import { buildDataThroughLabel } from '../lib/period'

const PERIODICITY_LABELS: Readonly<Record<string, string>> = {
  ANNUAL: t`anual`,
  QUARTERLY: t`trimestrial`,
  MONTHLY: t`lunar`,
}

type SourceProvenanceDrawerProps = {
  readonly datasetCode: string
  readonly datasetName: string | null
  readonly periodicity?: readonly string[]
  readonly unitLabel?: string | null
  readonly latestPeriod?: string | null
}

export function SourceProvenanceDrawer({
  datasetCode,
  datasetName,
  periodicity,
  unitLabel,
  latestPeriod,
}: SourceProvenanceDrawerProps) {
  const reference = getScraperDatasetById('ins-indicators')
  const dataThrough = buildDataThroughLabel(latestPeriod ?? null)
  const fallbackSource = t`INS Tempo`
  const tempoUrl = `https://statistici.insse.ro/tempoins/index.jsp?ind=${encodeURIComponent(datasetCode)}&lang=ro&page=tempo3`
  const periodicityLabel = periodicity
    ?.map((item) => PERIODICITY_LABELS[item] ?? item)
    .join(', ')

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <Info className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          <Trans>Sursă</Trans>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            <Trans>Proveniență INS</Trans>
          </SheetTitle>
          <SheetDescription>
            <Trans>Detalii despre setul de date și limita de acoperire.</Trans>
          </SheetDescription>
        </SheetHeader>
        <dl className="mt-6 space-y-4 text-sm">
          <div>
            <dt className="font-medium text-foreground">
              <Trans>Set de date</Trans>
            </dt>
            <dd className="mt-1 text-muted-foreground">
              {datasetName || datasetCode} · {datasetCode}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">
              <Trans>Sursă</Trans>
            </dt>
            <dd className="mt-1 text-muted-foreground">
              {reference?.title ?? fallbackSource}
            </dd>
          </div>
          {dataThrough ? (
            <div>
              <dt className="font-medium text-foreground">
                <Trans>Acoperire temporală</Trans>
              </dt>
              <dd className="mt-1 text-muted-foreground">{dataThrough}</dd>
            </div>
          ) : null}
          {periodicityLabel ? (
            <div>
              <dt className="font-medium text-foreground">
                <Trans>Periodicitate</Trans>
              </dt>
              <dd className="mt-1 text-muted-foreground">
                {periodicityLabel}
              </dd>
            </div>
          ) : null}
          {unitLabel ? (
            <div>
              <dt className="font-medium text-foreground">
                <Trans>Unitate</Trans>
              </dt>
              <dd className="mt-1 text-muted-foreground">{unitLabel}</dd>
            </div>
          ) : null}
          <div>
            <dt className="font-medium text-foreground">
              <Trans>Sursă publică</Trans>
            </dt>
            <dd className="mt-1 text-muted-foreground">
              <a
                href={tempoUrl}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                <Trans>Deschide matricea în INS Tempo</Trans>{' '}
                <span className="sr-only">
                  <Trans>(se deschide într-un tab nou)</Trans>
                </span>
              </a>
            </dd>
          </div>
        </dl>
      </SheetContent>
    </Sheet>
  )
}
