import { useState } from 'react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { moneyText } from '@/features/national-budget/home/lib/home-format'
import { cn } from '@/lib/utils'
import { type HundredLine, useHundred, useOfficialTotals } from './persoana.data'
import { BORROWED_FILL, REST_FILL, toneOf } from './persoana.sections'
import { usePersonYear } from './persoana.shell'

/**
 * Lei out of every 100, spent or collected: a hundred cells and the receipt
 * of the largest lines. Built for the hero (owner: „use a hundred as
 * comparison"), kept for the spending and revenue sections once the hero
 * took the balance (owner picked design B, 25 November 2026).
 */

// ───────────────────────────────────────────────────────────── the panel ──

type Side = 'spending' | 'revenue'

/** A hundred cells, one leu each, coloured by the line it belongs to; „the rest" hatched, the borrowed part last. */
function HundredStrip({ lines }: { readonly lines: readonly HundredLine[] }) {
  const named = lines.filter((line) => !line.rest).length
  const cells = lines.flatMap((line, rank) => Array.from({ length: line.lei }, () => ({ key: line.key, rest: line.rest, style: line.rest ? undefined : toneOf(rank, named).style })))
  return (
    <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[3px]" role="img" aria-label="O sută de lei, câte un pătrat pentru fiecare leu">
      {cells.map((cell, index) => (
        <span key={index} className={cn('aspect-square rounded-[2px]', cell.rest && REST_FILL)} style={cell.style} />
      ))}
    </div>
  )
}

function HundredPanel({ side }: { readonly side: Side }) {
  const { view } = usePersonYear()
  const { whole, lines } = useHundred(view, side)
  const totals = useOfficialTotals(view)
  if (!whole) return <p className="text-sm text-muted-foreground">Buletinul acestui an nu are împărțirea pe rânduri.</p>
  const named = lines.filter((line) => !line.rest)
  const shown = named.slice(0, 6)
  const others = 100 - shown.reduce((sum, line) => sum + line.lei, 0)
  return (
    <div>
      <HundredStrip lines={lines} />
      <ul className="mt-5 space-y-2 font-mono text-[13px]">
        {shown.map((line, rank) => (
          <li key={line.key} className="flex items-baseline gap-2">
            <span aria-hidden="true" className="size-2 shrink-0 translate-y-[-1px] rounded-[2px]" style={toneOf(rank, named.length).style} />
            <span className="min-w-0 truncate">{line.label}</span>
            <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-foreground/30" />
            <span className="shrink-0 tabular-nums">{line.lei} lei</span>
          </li>
        ))}
        <li className="flex items-baseline gap-2 text-muted-foreground">
          <span aria-hidden="true" className={cn('size-2 shrink-0 translate-y-[-1px] rounded-[2px]', REST_FILL)} />
          <span>Restul</span>
          <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-foreground/20" />
          <span className="tabular-nums">{others} lei</span>
        </li>
      </ul>
      <div className="my-4 border-t border-dashed border-foreground/30" />
      <p className="flex items-baseline justify-between font-mono text-sm font-semibold">
        <span>{side === 'spending' ? 'Cheltuiți' : 'Încasați'}</span>
        <span className="tabular-nums">100 lei</span>
      </p>
      {side === 'spending' && totals.deficit ? (
        <div className="mt-2 space-y-1 font-mono text-[13px] text-muted-foreground">
          <p className="flex justify-between">
            <span>plătiți din încasări</span>
            <span className="tabular-nums">{totals.fromRevenue} lei</span>
          </p>
          <p className="flex justify-between">
            <span className="inline-flex items-center gap-2">
              <span className={cn('size-2 rounded-[2px]', BORROWED_FILL)} />
              plătiți din împrumut
            </span>
            <span className="tabular-nums">{totals.borrowed} lei</span>
          </p>
        </div>
      ) : null}
      <p className="mt-4 text-xs text-muted-foreground">
        Din {moneyText(whole)}, {view.text}. Bugetul general consolidat.
      </p>
    </div>
  )
}

export function HundredCard() {
  const { view } = usePersonYear()
  const [side, setSide] = useState<Side>('spending')
  return (
    <div className="border bg-background p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <MonoLabel className="text-primary">
          Din fiecare 100 de lei {side === 'spending' ? 'cheltuiți' : 'încasați'}, {view.partial ? `${view.year}, până acum` : view.year}
        </MonoLabel>
        <div className="inline-flex shrink-0 rounded-md border p-0.5 text-sm" role="group" aria-label="Partea bugetului">
          {(['spending', 'revenue'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={side === value}
              onClick={() => setSide(value)}
              className={cn('rounded-[5px] px-3 py-1 transition-colors', side === value ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
            >
              {value === 'spending' ? 'Cheltuieli' : 'Venituri'}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <HundredPanel side={side} />
      </div>
    </div>
  )
}

