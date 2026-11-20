import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowRight, RotateCcw, Building2, AlertCircle, Wallet, Briefcase, Truck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { usePredictionInteraction } from '../../hooks/use-learning-interactions'

// Data types
type BudgetCategory = 'personnel' | 'goods' | 'investments' | 'eu-projects'

interface YearlyData {
    year: number
    planned: number // Billions RON
    executed: number // Billions RON
    breakdown: Record<BudgetCategory, { planned: number; executed: number }>
}

const DEFAULT_YEAR = 2024

/**
 * Official Romanian Consolidated General Budget (Buget General Consolidat) data
 * Source: Ministry of Finance (mfinante.gov.ro), Fiscal Council, Court of Accounts
 */
const DATA: Record<number, YearlyData> = {
    2022: {
        year: 2022,
        planned: 600, // Estimate based on 553B executed
        executed: 553, // Official consolidated budget execution
        breakdown: {
            personnel: { planned: 120, executed: 118 }, // 98% - Official
            goods: { planned: 90, executed: 77 }, // 85%
            investments: { planned: 150, executed: 87 }, // 58% - Official 87B capital expenditure
            'eu-projects': { planned: 80, executed: 26 }, // 32% - PNRR/EU funds absorption
        },
    },
    2023: {
        year: 2023,
        planned: 650, // Estimate
        executed: 611, // Official consolidated budget execution
        breakdown: {
            personnel: { planned: 136, executed: 133 }, // 98% - Official
            goods: { planned: 100, executed: 85 }, // 85%
            investments: { planned: 163, executed: 101 }, // 62% - Official 101B capital expenditure
            'eu-projects': { planned: 95, executed: 33 }, // 35% - PNRR/EU funds absorption
        },
    },
    2024: {
        year: 2024,
        planned: 673, // Official planned budget
        executed: 727, // Official - 8% over budget (deficit 8.65% of GDP)
        breakdown: {
            personnel: { planned: 168, executed: 165 }, // 98% - Official (24% YoY growth)
            goods: { planned: 130, executed: 121 }, // 93% (21% YoY increase)
            investments: { planned: 218, executed: 120 }, // 55% - Official 120B capital expenditure
            'eu-projects': { planned: 110, executed: 33 }, // 30% - PNRR 29-37% achieved
        }
    }
}

const CATEGORY_ICONS: Record<BudgetCategory, React.ElementType> = {
    personnel: Briefcase,
    goods: Truck,
    investments: Building2,
    'eu-projects': Wallet,
}

function getRateColorClasses(rate: number) {
    const isLow = rate < 70
    const isHigh = rate > 90

    if (isLow) {
        return {
            bar: "bg-status-blocked-fg/50",
            icon: "bg-status-blocked-bg text-status-blocked-fg",
            text: "text-status-blocked-fg"
        }
    }
    if (isHigh) {
        return {
            bar: "bg-status-live-fg/50",
            icon: "bg-status-live-bg text-status-live-fg",
            text: "text-status-live-fg"
        }
    }
    return {
        bar: "bg-status-partial-fg/50",
        icon: "bg-status-partial-bg text-status-partial-fg",
        text: "text-status-partial-fg"
    }
}

interface PromiseTrackerProps {
    readonly locale: string
    readonly contentId: string
    readonly predictionId: string
    readonly contentVersion?: string
}

function InsightPill({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-tight border", className)}
        >
            {children}
        </motion.div>
    )
}

export function PromiseTracker({ locale, contentId, predictionId, contentVersion = 'v1' }: PromiseTrackerProps) {
    const CATEGORY_LABELS: Record<BudgetCategory, string> = {
        personnel: t`Personnel Costs`,
        goods: t`Goods & Services`,
        investments: t`Infrastructure`,
        'eu-projects': t`EU Projects`,
    }

    // Progress tracking hook
    const { reveals, isYearRevealed, getYearReveal, reveal, reset } = usePredictionInteraction({
        contentId,
        predictionId,
        contentVersion,
    })

    const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR)
    const [guess, setGuess] = useState(50)
    const [showBreakdown, setShowBreakdown] = useState(false)
    const [isRevealing, setIsRevealing] = useState(false)

    // Derive hasGuessed from persisted state
    const hasGuessed = isYearRevealed(String(selectedYear))

    const currentData = DATA[selectedYear]

    // Calculate actual execution rate for Investments
    const investmentData = currentData.breakdown.investments
    const actualRate = Math.round((investmentData.executed / investmentData.planned) * 100)

    // Restore guess from reveals if the year was previously revealed
    useEffect(() => {
        const yearReveal = getYearReveal(String(selectedYear))
        if (yearReveal) {
            setGuess(yearReveal.guess)
            setShowBreakdown(true)
        } else {
            setGuess(50)
            setShowBreakdown(false)
        }
    }, [selectedYear, getYearReveal, reveals])

    // Wrapper to simplify keeping the billions logic invisible if preferred, 
    // but "compact" notation is native.
    const formatBillions = (billions: number) => {
        // 1 billion = 1,000,000,000
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'RON',
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(billions * 1_000_000_000)
    }

    const handleYearChange = (yearStr: string) => {
        const year = parseInt(yearStr)
        setSelectedYear(year)
    }

    const handleSubmitGuess = async () => {
        if (isRevealing) return
        setIsRevealing(true)
        try {
            await reveal(String(selectedYear), guess, actualRate)
            setTimeout(() => setShowBreakdown(true), 800)
        } finally {
            setIsRevealing(false)
        }
    }

    const handleReset = async () => {
        await reset()
        setGuess(50)
        setShowBreakdown(false)
    }

    const containerVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } }
    }

    return (
        <div className="w-full max-w-4xl mx-auto mb-16 font-sans">
            <AnimatePresence mode="wait">
                {!hasGuessed ? (
                    <motion.div
                        key="guessing-phase"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <Card className="p-10 md:p-16 rounded-[3rem] bg-card border-border shadow-lg overflow-hidden relative border-none">
                            <div className="relative z-10 flex flex-col items-center text-center space-y-10">
                                {/* Year Selector */}
                                <div className="w-full flex justify-center">
                                    <Tabs
                                        value={selectedYear.toString()}
                                        onValueChange={handleYearChange}
                                        className="w-auto"
                                    >
                                        <TabsList className="grid grid-cols-3 w-[280px] h-12 bg-muted rounded-full p-1.5 gap-1">
                                            {[2022, 2023, 2024].map((year) => (
                                                <TabsTrigger
                                                    key={year}
                                                    value={year.toString()}
                                                    className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-sm font-bold text-muted-foreground data-[state=active]:text-foreground"
                                                >
                                                    {year}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                    </Tabs>
                                </div>

                                <div className="space-y-6 max-w-xl">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                        className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-primary/10 text-primary mb-2 shadow-inner"
                                    >
                                        <Building2 className="w-10 h-10" />
                                    </motion.div>
                                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground mt-6 leading-[0.95]">
                                        <Trans>How much was <span className="text-primary italic">built</span>?</Trans>
                                    </h2>
                                    <p className="text-xl text-muted-foreground font-medium leading-relaxed">
                                        <Trans>The government planned to spend <strong>{formatBillions(investmentData.planned)}</strong> on Infrastructure in {selectedYear}.</Trans>
                                        <br className="hidden md:block" />
                                        <Trans>What percentage was actually used?</Trans>
                                    </p>
                                </div>

                                <div className="w-full max-w-lg space-y-10">
                                    <div className="space-y-6">
                                        <div className="flex flex-col items-center">
                                            <span className="text-7xl md:text-8xl font-black tracking-tighter text-primary transition-all">
                                                {guess}%
                                            </span>
                                            <div className="mt-2 text-xs font-black uppercase tracking-widest text-muted-foreground block">{t`YOUR PREDICTION`}</div>
                                        </div>

                                        <div className="px-4">
                                            <Slider
                                                value={[guess]}
                                                onValueChange={(vals) => setGuess(vals[0])}
                                                max={100}
                                                step={1}
                                                className="py-6 scale-110 md:scale-125"
                                            />
                                            <div className="flex justify-between mt-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">
                                                <span>0%</span>
                                                <span>100%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => void handleSubmitGuess()}
                                        disabled={isRevealing}
                                        className="w-full h-20 rounded-[1.8rem] text-2xl font-black bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl group"
                                    >
                                        {t`Reveal Reality`} <ArrowRight className="ml-2 w-7 h-7 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </div>

                            {/* Decorative artifacts */}
                            <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-[20rem] h-[20rem] bg-primary/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        key="result-phase"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <Card className="rounded-[4rem] overflow-hidden border-none shadow-3xl bg-card transition-colors duration-500">
                            <div className="p-8 md:p-12 max-w-2xl mx-auto space-y-12">

                                {/* Header Section */}
                                <div className="text-center space-y-6">
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
                                        {selectedYear} {t`Reality Check`}
                                    </div>

                                    <div className="relative">
                                        <h2 className="text-[6rem] md:text-[8rem] font-[1000] text-foreground tracking-[-0.04em] leading-none drop-shadow-sm">
                                            {actualRate}%
                                        </h2>
                                        <div className="absolute -right-4 top-0 rotate-12">
                                            <div className={cn(
                                                "px-4 py-2 rounded-xl text-sm font-black text-background shadow-lg transform hover:scale-110 transition-transform",
                                                Math.abs(guess - actualRate) < 15 ? "bg-status-live-fg" : "bg-status-blocked-fg"
                                            )}>
                                                {Math.abs(guess - actualRate) < 15 ? t`Close!` : t`Way off!`}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center gap-3">
                                        <InsightPill className="bg-muted text-muted-foreground border-border">
                                            {t`Your guess`}: {guess}%
                                        </InsightPill>
                                        <InsightPill className="bg-primary/10 text-primary border-primary/20">
                                            <Building2 className="w-3 h-3" /> {t`Infrastructure`}
                                        </InsightPill>
                                    </div>
                                </div>

                                {/* Breakdown List */}
                                {showBreakdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center">
                                            <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">{t`Where did the money go?`}</h3>
                                        </div>

                                        <div className="rounded-[2.5rem] border border-border overflow-hidden bg-muted/30 divide-y divide-border">
                                            {(Object.entries(currentData.breakdown) as [BudgetCategory, { planned: number; executed: number }][]).map(([key, data], idx) => {
                                                const rate = Math.round((data.executed / data.planned) * 100)
                                                const colorClasses = getRateColorClasses(rate)
                                                const Icon = CATEGORY_ICONS[key]

                                                return (
                                                    <motion.div
                                                        key={key}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        className="p-6 flex items-center justify-between group hover:bg-muted/50 transition-colors relative overflow-hidden"
                                                    >
                                                        {/* Subtle Progress Bar Background */}
                                                        <div className="absolute bottom-0 left-0 h-1 bg-muted w-full" />
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${rate}%` }}
                                                            transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }}
                                                            className={cn("absolute bottom-0 left-0 h-1", colorClasses.bar)}
                                                        />

                                                        <div className="flex items-center gap-4 relative z-10">
                                                            <div className={cn("p-3 rounded-xl shadow-sm transition-colors", colorClasses.icon)}>
                                                                <Icon className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-black text-foreground">{CATEGORY_LABELS[key]}</div>
                                                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                                    {t`Planned`}: {formatBillions(data.planned)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right relative z-10">
                                                            <div className={cn("text-xl font-black tabular-nums", colorClasses.text)}>
                                                                {rate}%
                                                            </div>
                                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                                {t`Executed`}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )
                                            })}
                                        </div>
                                    </motion.div>
                                )}

                                {/* Insight Card */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="bg-status-partial-bg border border-status-partial-fg/30 rounded-[2rem] p-8 relative overflow-hidden"
                                >
                                    <div className="relative z-10 space-y-4">
                                        <div className="flex items-center gap-3 text-status-partial-fg">
                                            <AlertCircle className="w-5 h-5" />
                                            <h4 className="font-black text-sm uppercase tracking-widest">{t`The Pattern`}</h4>
                                        </div>
                                        <p className="text-lg font-medium text-status-partial-fg leading-relaxed">
                                            {t`Money gets redirected: salaries and social transfers often exceed initial plans (100%+), while infrastructure lags at 55-60% and EU projects at just 30-35%.`}
                                        </p>
                                    </div>
                                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-status-partial-fg/10 rounded-full blur-3xl pointer-events-none" />
                                </motion.div>

                                {/* Reset Button */}
                                <div className="flex justify-center pt-4">
                                    <Button
                                        variant="ghost"
                                        onClick={() => void handleReset()}
                                        className="h-12 px-6 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all font-bold uppercase tracking-widest text-xs"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        {t`Try Another Year`}
                                    </Button>
                                </div>

                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
