import { ExternalLink, FileWarning, Hash, Table2 } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingRows } from './LoadingRows'
import { BlockedDataState } from './BlockedDataState'
import { useEvidenceDetail } from '../hooks/use-public-investments-data'
import {
  confidenceLabel,
  linkHealthLabel,
  renderRedactedExcerpt,
  sourceKindLabel,
} from '../lib/display'

type Props = {
  readonly sourceRowKey: string | null
  readonly objectiveId?: string | null
  readonly onClose: () => void
}

export function SourceProvenanceDrawer({ sourceRowKey, objectiveId, onClose }: Props) {
  const query = useEvidenceDetail(sourceRowKey, objectiveId ?? undefined)
  const data = query.data
  const redactedLabel = t`nume reținut - verificare în curs`
  const excerpt = renderRedactedExcerpt(data?.rawPayloadExcerpt, redactedLabel)

  return (
    <Sheet open={Boolean(sourceRowKey)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            <Trans>Dovada sursei</Trans>
          </SheetTitle>
          <SheetDescription>
            <Trans>Lanțul de custodie pentru rândul din sursa publică.</Trans>
          </SheetDescription>
        </SheetHeader>

        {!sourceRowKey && null}
        {sourceRowKey && query.isLoading && <LoadingRows rows={2} />}
        {query.isBlocked && (
          <BlockedDataState
            reason={query.blockedReason}
            messageKey={query.blockedMessageKey}
            messageParams={query.blockedMessageParams}
          />
        )}
        {query.isError && (
          <div className="rounded-md border border-destructive/30 p-4 text-sm text-destructive">
            <Trans>Nu am putut încărca dovada.</Trans>
          </div>
        )}

        {data && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{sourceKindLabel(data.ref.sourceUrlKind)}</Badge>
              <Badge variant={data.linkHealth === 'dead' ? 'warning' : 'outline'}>
                {linkHealthLabel(data.linkHealth)}
              </Badge>
              {data.amountConfidence && (
                <Badge
                  variant={data.amountConfidence === 'suspect_x1000' ? 'warning' : 'outline'}
                >
                  {confidenceLabel(data.amountConfidence)}
                </Badge>
              )}
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <ProvenanceItem
                icon={<Table2 className="h-4 w-4" aria-hidden="true" />}
                label={t`Fișier`}
                value={data.sourceFileName ?? t`Nedisponibil`}
              />
              <ProvenanceItem
                icon={<Table2 className="h-4 w-4" aria-hidden="true" />}
                label={t`Tabel`}
                value={data.evidenceTable ?? t`Nedisponibil`}
              />
              <ProvenanceItem
                icon={<Hash className="h-4 w-4" aria-hidden="true" />}
                label={t`Cheie`}
                value={data.evidenceKey ?? data.ref.sourceRowKey}
              />
              <ProvenanceItem
                icon={<Hash className="h-4 w-4" aria-hidden="true" />}
                label={t`Row hash`}
                value={data.ref.rowHash ?? t`Nedisponibil`}
              />
            </dl>

            {data.ref.sourceUrl && (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <a href={data.ref.sourceUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <Trans>Deschide sursa</Trans>
                </a>
              </Button>
            )}

            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FileWarning className="h-4 w-4" aria-hidden="true" />
                <Trans>Extras raw</Trans>
              </h3>
              {excerpt ? (
                <>
                  {data.redactionMarkerKey && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                      <Trans>Identificatorii cu risc personal sunt reținuți în extras.</Trans>
                    </p>
                  )}
                  <pre className="max-h-[45vh] overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
                    {excerpt}
                  </pre>
                </>
              ) : (
                <p className="rounded-md border border-dashed p-3 text-muted-foreground">
                  <Trans>Nu există extras raw disponibil pentru acest rând.</Trans>
                </p>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function ProvenanceItem({
  icon,
  label,
  value,
}: {
  readonly icon: React.ReactNode
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="rounded-md border p-3">
      <dt className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 break-words font-medium">{value}</dd>
    </div>
  )
}
