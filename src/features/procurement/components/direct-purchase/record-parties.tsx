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
 */
export function RecordParties({
  authority,
  supplier,
  year,
  supplierNote,
  className,
}: {
  readonly authority: DpParty
  readonly supplier: DpParty & { readonly sme?: boolean | null }
  /** The year the parties' pages open on: the record's. */
  readonly year: number | undefined
  /** What the firm shares the record with: an association, a framework's other firms. */
  readonly supplierNote?: string | null
  readonly className?: string
}) {
  return (
    <dl className={cn('grid gap-x-8 gap-y-5 sm:grid-cols-2', className)}>
      <Party label={t`Cumpărătorul`} party={authority} role="authority" year={year} />
      <Party label={t`Furnizorul`} party={supplier} role="supplier" year={year} tag={supplier.sme ? t`IMM` : null}>
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
  children,
}: {
  readonly label: string
  readonly party: DpParty
  readonly role: 'authority' | 'supplier'
  readonly year: number | undefined
  readonly tag?: string | null
  readonly children?: ReactNode
}) {
  return (
    <div className="min-w-0">
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
