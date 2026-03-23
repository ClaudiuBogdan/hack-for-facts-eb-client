import type { Currency } from '@/schemas/charts'
import { formatBudget2026Currency } from '../formatting'
import { SectionWrapper } from './section-wrapper'
import { AnimatedCounter } from './animated-counter'
import type { BudgetTotals } from '../types'

type Props = {
  readonly totals: BudgetTotals
  readonly currency: Currency
}

export function HeroSection({ totals, currency }: Props) {
  const total2026 = totals.credite_bugetare.propuneri_2026
  const total2025 = totals.credite_bugetare.executie_preliminata_2025
  const entityCount = totals.entity_count
  const yoyPct = total2025 > 0 ? ((total2026 - total2025) / total2025) * 100 : 0

  return (
    <SectionWrapper id="hero">
      {(inView) => (
        <div className="relative overflow-hidden rounded-[40px] border border-blue-500/20 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 p-6 shadow-xl shadow-primary/5 sm:p-10 md:p-14">
          {/* Subtle radial glow */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/15 blur-[100px]" />

          <div className="relative space-y-10 text-center">
            <div className="space-y-5">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-blue-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-300 animate-pulse" />
                  {'Anexa 3 - Proiect de lege'}
                </span>
              </div>

              <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-7xl">
                {'Bugetul de Stat'}
                <br />
                <span className="text-blue-100">2026</span>
              </h1>

              <p className="mx-auto max-w-lg text-base font-medium leading-relaxed text-blue-100/90 sm:text-lg">
                {'Creditele bugetare propuse pentru 2026, agregate din tabelul oficial al Anexei 3 pe ordonatori principali.'}
              </p>
            </div>

            {/* Giant number */}
            <div className="space-y-2">
              <div className="text-6xl font-black tracking-tight text-white sm:text-7xl md:text-8xl">
                <AnimatedCounter
                  value={total2026}
                  inView={inView}
                  formatter={(latest) => formatBudget2026Currency(latest, currency, 'compact')}
                />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200/80">
                {'valoare afisata in moneda selectata'}
              </p>
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2.5">
                <span className="text-sm text-blue-100/80">Institutii</span>
                <span className="text-sm font-bold text-white">
                  <AnimatedCounter value={entityCount} inView={inView} />
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2.5">
                <span className="text-sm text-blue-100/80">vs. preliminat 2025</span>
                <span className={`text-sm font-bold ${yoyPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  <AnimatedCounter
                    value={parseFloat(Math.abs(yoyPct).toFixed(1))}
                    prefix={yoyPct >= 0 ? '+' : '-'}
                    suffix="%"
                    decimals={1}
                    inView={inView}
                  />
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2.5">
                <span className="text-sm text-blue-100/80">Ani acoperiti</span>
                <span className="text-sm font-bold text-white">2024 - 2029</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionWrapper>
  )
}
