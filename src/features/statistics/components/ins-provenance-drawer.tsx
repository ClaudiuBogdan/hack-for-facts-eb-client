import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
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
import { insTempoDatasetUrl } from '../lib/ins-tempo'
import { buildDataThroughLabel } from '../lib/period'
import { isInsPeriodicity, periodicityLabel } from '../lib/periodicity-labels'

type Props = {
  readonly datasetCode: string
  /** The matrix's name in the reader's language — it names the trigger too. */
  readonly datasetName: string
  readonly periodicity?: readonly string[]
  readonly unitLabel?: string | null
  readonly latestPeriod?: string | null
}

/**
 * Where a territory figure comes from: the matrix, its cadence and unit, how
 * far its data reaches, and the way back to INS Tempo. Opened from a
 * „Sursă" button that names its matrix for assistive tech — a list of
 * seventy identical „Sursă" buttons said nothing about which was which.
 *
 * Not the shared data-trust `SourceProvenanceDrawer`: that one takes a
 * `SourcePointer`; this one reads an INS matrix.
 */
export function InsProvenanceDrawer({
  datasetCode,
  datasetName,
  periodicity,
  unitLabel,
  latestPeriod,
}: Props) {
  const { i18n } = useLingui()
  const dataThrough = buildDataThroughLabel(latestPeriod ?? null)
  const tempoUrl = insTempoDatasetUrl(datasetCode, i18n.locale)
  const cadences = periodicity
    ?.map((item) => (isInsPeriodicity(item) ? periodicityLabel(item) : item))
    .join(', ')

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          aria-label={t`Sursă: ${datasetName}`}
        >
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
              {datasetName} · {datasetCode}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">
              <Trans>Sursă</Trans>
            </dt>
            <dd className="mt-1 text-muted-foreground">
              <Trans>INS Tempo</Trans>
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
          {cadences ? (
            <div>
              <dt className="font-medium text-foreground">
                <Trans>Periodicitate</Trans>
              </dt>
              <dd className="mt-1 text-muted-foreground">{cadences}</dd>
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
