import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { DpParty } from '../../lib/direct-purchase-model'
import { PartyName } from './direct-purchase-head'

/**
 * The record's two parties, as the last column of its facts (the owner, 1
 * October 2026): who bought and who sold, each a way to its procurement
 * page, its CUI under its name — on a direct purchase and on a contract
 * alike. Beside the facts on a wide screen, under them on a smaller one.
 *
 * `rows`: on a wide screen, beside facts laid out on a grid's rows, the list
 * takes the same rows (a subgrid spanning them all): the buyer level with the
 * first row of facts and as tall as it, the firm from the second row on (the
 * owner, 2 October 2026). The grid must have at least two rows.
 */
export function RecordParties({
  authority,
  supplier,
  year,
  supplierNote,
  rows = false,
  className,
}: {
  readonly authority: DpParty
  readonly supplier: DpParty & { readonly sme?: boolean | null }
  /** The year the parties' pages open on: the record's. */
  readonly year: number | undefined
  /** What the firm shares the record with: an association, a framework's other firms. */
  readonly supplierNote?: string | null
  readonly rows?: boolean
  readonly className?: string
}) {
  return (
    <dl className={cn('grid gap-x-8 gap-y-5 sm:grid-cols-2', rows && 'lg:row-span-full lg:grid-rows-subgrid lg:gap-y-6', className)}>
      <Party label={t`Cumpărătorul`} party={authority} role="authority" year={year} />
      <Party label={t`Furnizorul`} party={supplier} role="supplier" year={year} tag={supplier.sme ? t`IMM` : null} className={rows ? 'lg:row-start-2 lg:row-end-[-1]' : undefined}>
        {supplierNote ? <span className="mt-1 block text-muted-foreground">{supplierNote}</span> : null}
      </Party>
    </dl>
  )
}

function Party({
  label,
  party,
  role,
  year,
  tag,
  className,
  children,
}: {
  readonly label: string
  readonly party: DpParty
  readonly role: 'authority' | 'supplier'
  readonly year: number | undefined
  readonly tag?: string | null
  readonly className?: string
  readonly children?: ReactNode
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt>
        <MonoLabel className="text-muted-foreground">{label}</MonoLabel>
      </dt>
      <dd className="mt-2 text-sm leading-snug text-foreground [overflow-wrap:anywhere]">
        <PartyName party={party} role={role} year={year} />
        <span className="mt-1 block font-mono text-xs tabular-nums text-muted-foreground">
          {party.cui ? `CUI ${party.cui}` : t`fără CUI în SEAP`}
          {tag ? ` · ${tag}` : ''}
        </span>
        {children}
      </dd>
    </div>
  )
}
