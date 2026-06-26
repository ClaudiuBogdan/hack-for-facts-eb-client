import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ValueWithCurrency } from './value-with-currency'
import type { ContractModification } from '@/schemas/procurement'

type Props = {
  readonly modifications: readonly ContractModification[]
  readonly className?: string
}

/**
 * Modification timeline: before → after → delta, type, date. A separate
 * "Modificări neasociate" block lists unlinked modifications (~12-20% per
 * UX §6.3) — never hidden. Always paired with a `<table>` fallback (a11y).
 */
export function ModificationTrail({ modifications, className }: Props) {
  const linked = modifications.filter((m) => m.contractId !== null)
  const unlinked = modifications.filter((m) => m.contractId === null)

  if (modifications.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        <Trans>Nicio modificare înregistrată.</Trans>
      </p>
    )
  }

  return (
    <div className={className}>
      {linked.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">
            <Trans>Trail de modificări</Trans>
          </h3>
          <TrailTable modifications={linked} />
        </section>
      ) : null}

      {unlinked.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">
            <Trans>Modificări neasociate</Trans>
          </h3>
          <p className="text-xs text-muted-foreground">
            <Trans>
              Aceste modificări nu sunt legate de un contract părinte în
              sursa de date (~12-20% din cazuri).
            </Trans>
          </p>
          <TrailTable modifications={unlinked} />
        </section>
      ) : null}
    </div>
  )
}

function TrailTable({
  modifications,
}: {
  readonly modifications: readonly ContractModification[]
}) {
  return (
    <>
      {/* Visual timeline */}
      <ol className="space-y-2" aria-hidden>
        {modifications.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2 text-sm"
          >
            <span className="text-xs text-muted-foreground">
              {m.modificationDate ?? t`dată indisponibilă`}
            </span>
            <ValueWithCurrency value={m.valueBefore} notation="compact" />
            <span aria-hidden>→</span>
            <ValueWithCurrency value={m.valueAfter} notation="compact" />
            <span className="text-xs text-muted-foreground">
              (<Trans>delta</Trans>: <ValueWithCurrency value={m.valueDelta} notation="compact" />)
            </span>
            {m.modificationType ? (
              <span className="rounded border border-border px-1.5 py-0.5 text-xs">
                {m.modificationType}
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      {/* Tabular fallback */}
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted-foreground">
          <Trans>Versiune tabelară</Trans>
        </summary>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Trans>Dată</Trans>
              </TableHead>
              <TableHead>
                <Trans>Înainte</Trans>
              </TableHead>
              <TableHead>
                <Trans>După</Trans>
              </TableHead>
              <TableHead>
                <Trans>Delta</Trans>
              </TableHead>
              <TableHead>
                <Trans>Tip</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modifications.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.modificationDate ?? t`indisponibil`}</TableCell>
                <TableCell>
                  <ValueWithCurrency value={m.valueBefore} notation="compact" />
                </TableCell>
                <TableCell>
                  <ValueWithCurrency value={m.valueAfter} notation="compact" />
                </TableCell>
                <TableCell>
                  <ValueWithCurrency value={m.valueDelta} notation="compact" />
                </TableCell>
                <TableCell>{m.modificationType ?? t`indisponibil`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </>
  )
}
