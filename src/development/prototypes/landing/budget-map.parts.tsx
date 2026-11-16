import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Minus, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MapPicker } from './budget-map.picker'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { BUDGET_YEAR, PROTOTYPE_MARKER, formatLei, formatShare, type MeasureId } from './budget-map.data'

/**
 * The chrome every variant shares — title, the map picker, zoom buttons,
 * legend and the card for the primărie under the finger — so the variants
 * differ only in the drawing surface.
 */

export function MapShell({
  variant,
  measureId,
  onMeasure,
  children,
  controls,
  legend,
  card,
  status,
}: {
  readonly variant: string
  readonly measureId: MeasureId
  readonly onMeasure: (id: MeasureId) => void
  readonly children: ReactNode
  readonly controls?: ReactNode
  readonly legend?: ReactNode
  readonly card?: ReactNode
  readonly status?: ReactNode
}) {
  return (
    <section className="w-full border-y bg-background" data-dev-marker={PROTOTYPE_MARKER} data-budget-map={variant}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3 px-4 pt-8 pb-4 sm:px-6">
        <div>
          <MonoLabel className="block text-primary">Harta primăriilor · {BUDGET_YEAR}</MonoLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Cum stă fiecare primărie cu bugetul</h2>
        </div>
        <MapPicker value={measureId} onChange={onMeasure} />
      </div>
      <div className="relative w-full">
        {children}
        {controls ? <div className="absolute top-3 right-3 flex flex-col gap-1.5">{controls}</div> : null}
        {status ? <div className="pointer-events-none absolute inset-0 grid place-items-center">{status}</div> : null}
        {card ? <div className="pointer-events-none absolute top-3 left-3 hidden w-72 sm:block">{card}</div> : null}
      </div>
      {card ? <div className="px-4 pt-3 sm:hidden">{card}</div> : null}
      <div className="mx-auto max-w-6xl px-4 pt-3 pb-8 sm:px-6">{legend}</div>
    </section>
  )
}

export function ZoomControls({
  onIn,
  onOut,
  onReset,
  zoomed,
  canZoomIn = true,
}: {
  readonly onIn: () => void
  readonly onOut: () => void
  readonly onReset: () => void
  readonly zoomed: boolean
  readonly canZoomIn?: boolean
}) {
  return (
    <>
      <Button size="icon" variant="outline" className="size-10 bg-background/90 sm:size-8" aria-label="Apropie" onClick={onIn} disabled={!canZoomIn}>
        <Plus className="size-4" />
      </Button>
      <Button size="icon" variant="outline" className="size-10 bg-background/90 sm:size-8" aria-label="Depărtează" onClick={onOut} disabled={!zoomed}>
        <Minus className="size-4" />
      </Button>
      <Button size="icon" variant="outline" className="size-10 bg-background/90 sm:size-8" aria-label="Toată țara" onClick={onReset} disabled={!zoomed}>
        <RotateCcw className="size-4" />
      </Button>
    </>
  )
}

export interface CardUat {
  readonly title: string
  readonly county: string
  readonly income: number | null
  readonly expenses: number | null
  readonly cui: string
}

export function UatCard({ uat, pinned, className }: { readonly uat: CardUat | null; readonly pinned: boolean; readonly className?: string }) {
  if (!uat) {
    return (
      <div className={cn('rounded-md border bg-background/95 p-3 text-sm text-muted-foreground shadow-sm', className)}>
        Atinge o localitate pentru cifrele primăriei. Două degete pentru zoom.
      </div>
    )
  }
  const balance = uat.income !== null && uat.expenses !== null ? uat.income - uat.expenses : null
  const share = balance !== null && uat.income ? balance / uat.income : null
  return (
    <div className={cn('pointer-events-auto rounded-md border bg-background/95 p-3 text-sm shadow-sm', className)}>
      <p className="font-semibold text-foreground">{uat.title}</p>
      <p className="text-xs text-muted-foreground">Județul {uat.county}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 tabular-nums">
        <dt className="text-muted-foreground">Venituri</dt>
        <dd className="text-right">{formatLei(uat.income)}</dd>
        <dt className="text-muted-foreground">Cheltuieli</dt>
        <dd className="text-right">{formatLei(uat.expenses)}</dd>
        <dt className="text-muted-foreground">Sold</dt>
        <dd className={cn('text-right font-medium', balance !== null && balance < 0 ? 'text-destructive' : 'text-foreground')}>
          {formatLei(balance)} · {formatShare(share)}
        </dd>
      </dl>
      {uat.cui ? (
        <Link
          to="/entities/$cui"
          params={{ cui: uat.cui }}
          className={cn('mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary hover:underline sm:min-h-0', !pinned && 'sm:hidden')}
        >
          Deschide pagina primăriei <ArrowRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  )
}

export function MapStatus({ children }: { readonly children: ReactNode }) {
  return <span className="rounded-md border bg-background/90 px-3 py-1.5 text-sm text-muted-foreground">{children}</span>
}
