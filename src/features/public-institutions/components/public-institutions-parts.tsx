import type { ReactNode } from 'react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { Currency } from '@/schemas/charts'
import { partsOf } from '../lib/public-institutions-anchors'

/** A group of a menu's entries under a quiet caption. */
export function MonoLabelGroup({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="py-1">
      <MonoLabel className="block px-2 py-1 text-muted-foreground">{label}</MonoLabel>
      {children}
    </div>
  )
}

/** An amount as its digits and its scale apart („259,69” · „mld. RON”), the exact value on hover and for a screen reader. */
export function Amount({ value, currency, locale, unit, strong }: { readonly value: number | null | undefined; readonly currency: Currency; readonly locale: string; readonly unit?: string; readonly strong: boolean }) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  const parts = partsOf(value, { currency, locale, unit })
  return (
    <span title={parts.exact}>
      <span aria-hidden="true">
        <span className={cn(strong && 'font-semibold text-foreground')}>{parts.digits}</span>
        {parts.scale ? <span className="ml-1 text-xs text-muted-foreground">{parts.scale}</span> : null}
      </span>
      <span className="sr-only">{parts.exact}</span>
    </span>
  )
}
