import { useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { motion } from 'framer-motion'
import { t } from '@lingui/core/macro'
import { Lightbulb } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ComparisonItem {
    id: string
    label: string
    value: number
    flag?: string
    isHighlighted?: boolean
}

type HighlightTone = 'primary' | 'blocked'

const HIGHLIGHT_TONES = {
    primary: { bar: 'bg-primary', onBar: 'text-primary-foreground', note: 'text-primary' },
    blocked: { bar: 'bg-status-blocked-fg', onBar: 'text-background', note: 'text-status-blocked-fg' },
} as const

interface InsightData {
    readonly title: string
    readonly content: string
    readonly revenue?: number
    readonly spending?: number
}

interface EUComparisonChartProps {
    title?: string
    items: ReadonlyArray<ComparisonItem>
    unit?: string
    averageValue?: number
    averageLabel?: string
    highlightLabel?: string
    /** `primary` marks "this is Romania"; `blocked` frames the highlighted figure as the adverse one. */
    highlightTone?: HighlightTone
    insight?: InsightData
}

function InsightBox({ insight, inView }: { insight: InsightData; inView: boolean }) {
    const hasGap = insight.revenue !== undefined && insight.spending !== undefined
    const gap = hasGap ? insight.spending! - insight.revenue! : 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 1.0, duration: 0.5 }}
            className="mt-8 p-6 rounded-2xl bg-status-partial-bg border border-status-partial-fg/30"
        >
            <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl bg-card shrink-0">
                    <Lightbulb className="w-5 h-5 text-status-partial-fg" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-status-partial-fg mb-2">
                        {insight.title}
                    </h4>
                    <p className="text-sm text-status-partial-fg mb-4">
                        {insight.content}
                    </p>

                    {hasGap && (
                        <div className="flex flex-wrap items-center gap-4 md:gap-6 pt-4 border-t border-status-partial-fg/30">
                            <div className="text-center rounded-xl px-3 py-2 bg-status-live-bg text-status-live-fg">
                                <div className="text-[10px] font-black uppercase tracking-widest mb-1">
                                    {t`Revenue`}
                                </div>
                                <div className="text-xl font-black tabular-nums">
                                    {insight.revenue}%
                                </div>
                            </div>
                            <div className="flex items-center gap-4 md:gap-6">
                                <div className="text-2xl font-black text-status-partial-fg">←</div>
                                <div className="text-center rounded-xl px-3 py-2 bg-status-blocked-bg text-status-blocked-fg">
                                    <div className="text-[10px] font-black uppercase tracking-widest mb-1">
                                        {t`Gap`}
                                    </div>
                                    <div className="text-xl font-black tabular-nums">
                                        {gap.toFixed(1)}%
                                    </div>
                                </div>
                                <div className="text-2xl font-black text-status-partial-fg">→</div>
                            </div>
                            <div className="text-center rounded-xl px-3 py-2 bg-card text-foreground">
                                <div className="text-[10px] font-black uppercase tracking-widest mb-1">
                                    {t`Spending`}
                                </div>
                                <div className="text-xl font-black tabular-nums">
                                    {insight.spending}%
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

export function EUComparisonChart({
    title = t`Revenue as % of GDP: EU Comparison`,
    items,
    unit = '%',
    averageValue,
    averageLabel = t`EU Average`,
    highlightLabel = t`One of the lowest`,
    highlightTone = 'primary',
    insight,
}: Readonly<EUComparisonChartProps>) {
    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.5,
    })

    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => b.value - a.value)
    }, [items])

    const tone = HIGHLIGHT_TONES[highlightTone]
    const maxValue = Math.max(...items.map(i => i.value), averageValue || 0) * 1.1

    return (
        <div ref={ref} className="w-full max-w-3xl mx-auto py-8">
            <Card className="p-4 md:p-10 rounded-[3rem] bg-card border-none shadow-sm relative overflow-hidden">

                {/* Header */}
                <div className="mb-10 text-center md:text-left">
                    <h3 className="text-2xl font-black text-foreground tracking-tight">{title}</h3>
                </div>

                {/* Chart Container */}
                <div className="relative space-y-3">

                    {/* Average Line */}
                    {averageValue && (
                        <div
                            className="absolute -top-3 bottom-0 border-l-2 border-dashed border-border z-10 pointer-events-none"
                            style={{ left: `${((averageValue / maxValue) * 100)}%` }}
                        >
                            <div className={cn(
                                "absolute top-0 -translate-y-full pb-2 text-[10px] uppercase font-black text-muted-foreground whitespace-nowrap",
                                (averageValue / maxValue) > 0.75 ? "right-2 text-right" : "left-0 -translate-x-1/2 text-center"
                            )}>
                                {averageLabel} ({averageValue}{unit})
                            </div>
                        </div>
                    )}

                    {sortedItems.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ width: 0, opacity: 0 }}
                            animate={inView ? { width: "100%", opacity: 1 } : { width: 0, opacity: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
                            className="relative z-10 group"
                        >
                            <div className="flex items-center gap-3 md:gap-4">
                                {/* Label */}
                                <div className="absolute left-4 z-10 w-28 md:w-36 text-left shrink-0">
                                    <span className={cn(
                                        "text-sm font-bold truncate block",
                                        item.isHighlighted ? tone.onBar : "text-background"
                                    )}>
                                        {item.flag && <span className="mr-2">{item.flag}</span>}
                                        {item.label}
                                    </span>
                                </div>

                                {/* Bar */}
                                <div className="flex-1 h-8 md:h-10 bg-card rounded-r-lg relative flex items-center">
                                    <motion.div
                                        className={cn(
                                            "h-full rounded-r-lg relative flex items-center justify-end px-2 transition-colors duration-200",
                                            item.isHighlighted
                                                ? tone.bar
                                                : "bg-chart-2 group-hover:brightness-90"
                                        )}
                                        initial={{ width: 0 }}
                                        animate={inView ? { width: `${(item.value / maxValue) * 100}%` } : { width: 0 }}
                                        transition={{ delay: index * 0.1, duration: 0.8, ease: "circOut" }}
                                    >
                                        <span className={cn(
                                            "text-sm font-black relative z-10",
                                            item.isHighlighted ? tone.onBar : "text-background"
                                        )}>
                                            {item.value}{unit}
                                        </span>
                                    </motion.div>

                                    {/* Annotation for Highlighted Item */}
                                    {item.isHighlighted && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                                            transition={{ delay: 1.5 }}
                                            className="absolute -right-4 hidden md:flex items-center gap-1.5 whitespace-nowrap"
                                        >
                                            <span className={cn(tone.note, "font-bold text-xs uppercase tracking-wide")}>← {highlightLabel}</span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                            {item.isHighlighted && (
                                <p className={cn(tone.note, "md:hidden mt-1 text-xs font-bold uppercase tracking-wide")}>← {highlightLabel}</p>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Insight Box */}
                {insight && <InsightBox insight={insight} inView={inView} />}

                {/* Footer info */}
                <div className="mt-10 pt-6 border-t border-border text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {t`Data: Eurostat 2024 (Provisional)`}
                    </p>
                </div>
            </Card>
        </div>
    )
}
