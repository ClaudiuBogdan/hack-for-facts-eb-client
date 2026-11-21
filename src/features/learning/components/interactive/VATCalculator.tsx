import { useState, useMemo, useEffect } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { t } from '@lingui/core/macro'
import { 
  Info,
  Plus, 
  Minus,
  TrendingUp
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// -----------------------------------------------------------------------------
// CONSTANTS & TYPES
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: 0,
  }).format(amount)
}

function calculateVatAmount(grossAmount: number, rate: number) {
  // VAT = Gross - (Gross / (1 + rate))
  return grossAmount - (grossAmount / (1 + rate))
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(value, { mass: 0.5, stiffness: 100, damping: 15 })
  const display = useTransform(spring, (current) => formatCurrency(Math.floor(current)))

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  return <motion.span className={cn("tabular-nums", className)}>{display}</motion.span>
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------

export function VATCalculator() {

  const [totalSpending, setTotalSpending] = useState(3000)

  const results = useMemo(() => {
    // Hidden "Average Profile" Logic: 40% Essentials (11%), 60% General (21%)
    const SHARE_LOW_RATE = 0.40
    const SHARE_STD_RATE = 0.60

    const amountLow = totalSpending * SHARE_LOW_RATE
    const amountStd = totalSpending * SHARE_STD_RATE

    const vatLow = calculateVatAmount(amountLow, 0.11)
    const vatStd = calculateVatAmount(amountStd, 0.21)

    const totalVat = vatLow + vatStd
    const totalNet = totalSpending - totalVat
    const effectiveRate = totalNet > 0 ? totalVat / totalNet : 0

    return { totalVat, totalNet, effectiveRate }
  }, [totalSpending])

  return (
    <div className="w-full mx-auto py-12 px-4 select-none">
      <Card className="rounded-[3rem] shadow-xl relative overflow-hidden">
        
        {/* TOP SECTION: INPUT */}
        <div className="relative z-10 p-8 md:p-12 pb-6 flex flex-col items-center text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-black uppercase tracking-widest text-primary">
            <TrendingUp className="w-3.5 h-3.5" /> {t`VAT Reality Check`}
          </div>

          <div className="space-y-4 w-full">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t`I spend monthly`}</p>
            
            <div className="flex items-center justify-center gap-6">
               <Button
                  variant="outline" 
                  size="icon"
                  onClick={() => setTotalSpending(s => Math.max(0, s - 100))}
                className="w-10 h-10 md:w-14 md:h-14 rounded-full border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-sm"
              >
                <Minus className="w-4 h-4 md:w-6 md:h-6" />
              </Button>
              
              <div className="relative group">
                <div className="flex items-baseline justify-center gap-1 md:gap-2">
                    <Input 
                      type="number"
                      value={totalSpending}
                      onChange={(e) => setTotalSpending(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-40 md:w-64 bg-transparent border-none text-5xl md:text-8xl font-black text-center p-0 h-auto focus:ring-0 text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-muted-foreground tracking-tighter"
                      placeholder="0"
                    />
                  <span className="text-xl md:text-2xl font-black text-muted-foreground self-start mt-2 md:mt-4">RON</span>
                </div>
              </div>

              <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTotalSpending(s => s + 100)}
                className="w-10 h-10 md:w-14 md:h-14 rounded-full border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 md:w-6 md:h-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: THE BREAKDOWN */}
        <div className="relative z-10 p-8 md:p-12 pt-2 space-y-10">
            
            {/* The Bar */}
            <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span>{t`Seller Keeps`}</span>
                    <span>{t`State Takes`}</span>
                </div>
                <div className="relative h-6 bg-muted rounded-full overflow-hidden w-full flex shadow-inner">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${totalSpending > 0 ? (results.totalNet / totalSpending) * 100 : 0}%` }}
                        className="h-full bg-chart-1"
                    />
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${totalSpending > 0 ? (results.totalVat / totalSpending) * 100 : 0}%` }}
                        className="h-full bg-chart-2"
                    />
                </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-12 md:gap-y-8">
                <div className="space-y-2 p-4 rounded-3xl bg-primary/10 border border-primary/20">
                    <div className="text-[10px] font-black uppercase tracking-widest text-foreground">{t`Net Price`}</div>
                    <div className="text-3xl font-black text-foreground tracking-tight">{formatCurrency(results.totalNet)}</div>
                    <p className="text-[11px] font-medium text-foreground leading-tight">
                        {t`The actual value of goods & services you receive.`}
                    </p>
                </div>
                <div className="space-y-2 p-4 rounded-3xl bg-muted border border-border">
                     <div className="text-[10px] font-black uppercase tracking-widest text-foreground">{t`VAT Collected`}</div>
                     <div className="text-3xl font-black text-foreground tracking-tight">
                        <AnimatedNumber value={results.totalVat} />
                     </div>
                     <p className="text-[11px] font-medium text-foreground leading-tight">
                        {t`Money the seller collects just to pass to the state.`}
                     </p>
                </div>
            </div>

            {/* BOTTOM SECTION: ANNUAL IMPACT */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-foreground text-background p-8 space-y-6">
                <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                     <div className="inline-flex items-center gap-2 text-background text-[10px] font-black uppercase tracking-widest">
                        <Info className="w-3 h-3" /> {t`Why it matters`}
                     </div>
                     
                     <div className="space-y-2">
                        <p className="text-background font-medium">
                            {t`In one year, you will pay`}
                        </p>
                <div className="text-3xl md:text-6xl font-black text-background tracking-tighter">
                             {formatCurrency(results.totalVat * 12)}
                        </div>
                        <p className="text-background text-sm">
                            {t`in "invisible" consumption taxes.`}
                        </p>
                     </div>
                </div>
            </div>

            <div className="text-center px-4">
                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                     {t`Calculations assume a basket of 40% essential goods (11% VAT) and 60% general goods (21% VAT).`}
                </p>
            </div>
        </div>
      </Card>
    </div>
  )
}
