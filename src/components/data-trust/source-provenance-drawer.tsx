import { Trans } from '@lingui/react/macro'
import { Copy, ExternalLink, FileWarning } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { SourcePointer } from '@/schemas/elections'
import { FreshnessBadge } from './freshness-badge'
import { useProvenance } from './provenance-context'

function truncateHash(hash: string | null): string {
  if (hash === null) return '-'
  if (hash.length <= 16) return hash
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`
}

function copyText(value: string | null): void {
  if (value === null || typeof navigator === 'undefined') return
  void navigator.clipboard?.writeText(value)
}

function accessLabel(pointer: SourcePointer) {
  if (pointer.accessStatus === 'ok') return <Trans>Sursa accesibila</Trans>
  if (pointer.accessStatus === 'inaccessible_with_evidence') {
    return <Trans>Sursa inaccesibila (cu dovada)</Trans>
  }
  return <Trans>Resursa de revizuit</Trans>
}

function PointerRow({
  pointer,
  index,
}: {
  readonly pointer: SourcePointer
  readonly index: number
}) {
  const rowNumber =
    pointer.sourceRowNumber === null
      ? '-'
      : pointer.sourceRowNumber.toLocaleString('ro-RO')

  return (
    <div className="rounded-md border bg-background p-3 text-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            <Trans>Pointer sursa {index}</Trans>
          </p>
          <p className="break-all font-medium">{pointer.sourceResourceId}</p>
        </div>
        <Badge variant={pointer.accessStatus === 'ok' ? 'secondary' : 'warning'}>
          {accessLabel(pointer)}
        </Badge>
      </div>
      <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">
          <Trans>Fisier</Trans>
        </dt>
        <dd className="break-all">{pointer.sourceFileId ?? '-'}</dd>
        <dt className="text-muted-foreground">
          <Trans>Rand</Trans>
        </dt>
        <dd>{rowNumber}</dd>
        <dt className="text-muted-foreground">
          <Trans>Hash rand</Trans>
        </dt>
        <dd className="flex min-w-0 items-center gap-1">
          <span className="break-all font-mono">{truncateHash(pointer.sourceRowHash)}</span>
          {pointer.sourceRowHash !== null && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => copyText(pointer.sourceRowHash)}
              aria-label="Copiaza hash-ul randului"
            >
              <Copy className="h-3 w-3" aria-hidden />
            </Button>
          )}
        </dd>
        <dt className="text-muted-foreground">
          <Trans>Autoritate</Trans>
        </dt>
        <dd>{pointer.authority}</dd>
        <dt className="text-muted-foreground">
          <Trans>Familie sursa</Trans>
        </dt>
        <dd className="break-all">{pointer.sourceFamily}</dd>
      </dl>
      <div className="mt-3">
        {pointer.resourceUrl === null ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>
              <Trans>
                Nu avem un link public functional pentru aceasta resursa; lacuna
                este pastrata ca dovada, nu completata cu zero.
              </Trans>
            </p>
          </div>
        ) : (
          <Button asChild variant="outline" size="sm">
            <a href={pointer.resourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-3.5 w-3.5" aria-hidden />
              <Trans>Deschide resursa oficiala</Trans>
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

export function SourceProvenanceDrawer() {
  const { openRequest, closeProvenance } = useProvenance()
  const context = openRequest?.context
  const pointers = openRequest?.pointers ?? []
  const primaryPointer = pointers[0]

  return (
    <Sheet
      open={openRequest !== null}
      onOpenChange={(open) => {
        if (!open) closeProvenance()
      }}
    >
      <SheetContent side="right" className="flex h-full w-full max-w-full flex-col overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="pr-8">
            {context?.entityTitle ?? <Trans>Provenienta sursa</Trans>}
          </SheetTitle>
          <SheetDescription>
            {context?.valueDisplay ?? <Trans>Valoare afisata cu pointer sursa.</Trans>}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-5 py-4">
          <section className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              <Trans>Sumar metrica</Trans>
            </p>
            <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">
                <Trans>Metrica</Trans>
              </dt>
              <dd>{context?.metricLabel ?? '-'}</dd>
              <dt className="text-muted-foreground">
                <Trans>Cod sursa</Trans>
              </dt>
              <dd>{context?.sourceMetricCode ?? '-'}</dd>
              <dt className="text-muted-foreground">
                <Trans>Mapare</Trans>
              </dt>
              <dd>{context?.mappingStatus ?? '-'}</dd>
              <dt className="text-muted-foreground">
                <Trans>Resolver</Trans>
              </dt>
              <dd>{context?.resolverVersion ?? '-'}</dd>
            </dl>
            {context?.isAggregate === true && (
              <p className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                <Trans>
                  Valoarea afisata este o agregare a mai multor randuri de sursa.
                </Trans>
              </p>
            )}
          </section>

          <section className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              <Trans>Sursa</Trans>
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">{primaryPointer?.authority ?? '-'}</Badge>
              <Badge variant="secondary">{primaryPointer?.sourceFamily ?? '-'}</Badge>
              <FreshnessBadge asOf={primaryPointer?.sourceUpdatedAt ?? null} />
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              <Trans>Pointere</Trans>
            </p>
            {pointers.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                <Trans>Provenienta indisponibila pentru aceasta valoare.</Trans>
              </div>
            ) : (
              pointers.map((pointer, index) => (
                <PointerRow
                  key={`${pointer.sourceResourceId}-${pointer.sourceRowHash ?? index}`}
                  pointer={pointer}
                  index={index + 1}
                />
              ))
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
