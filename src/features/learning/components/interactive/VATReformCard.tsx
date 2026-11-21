import { t } from '@lingui/core/macro'
import { Scale, Calendar, FileText, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface VATReformCardProps {
  badge?: string
  title?: string
  description?: string
  dateLabel?: string
  date?: string
  oldRatesLabel?: string
  newRealityLabel?: string
  standardLabel?: string
  newLabel?: string
  essentialsLabel?: string
  unifiedLabel?: string
  explanationTitle?: string
  explanation?: string
}

export function VATReformCard({
  badge = t`Major Reform`,
  title = t`Law 141/2025`,
  description = t`The new fiscal reality affecting your wallet.`,
  dateLabel = t`Effective Date`,
  date = t`Aug 1, 2025`,
  oldRatesLabel = t`Old Rates`,
  newRealityLabel = t`New Reality`,
  standardLabel = t`Standard`,
  newLabel = t`New`,
  essentialsLabel = t`Essentials`,
  unifiedLabel = t`Unified`,
  explanationTitle = t`What this means`,
  explanation = t`The reform simplified the tax code but increased the burden on consumption. The "Essentials" category now consolidates food, books, and tourism under a single 11% rate.`
}: VATReformCardProps) {
  return (
    <div className="w-full mx-auto py-8 px-4 select-none">
      <Card className="rounded-[3rem] shadow-xl relative overflow-hidden group">
        
        {/* Header */}
        <div className="relative z-10 p-8 md:p-10 pb-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-4">
               <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-[11px] font-black uppercase tracking-widest text-foreground">
                <Scale className="w-3.5 h-3.5" /> {badge}
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-foreground">
                  {title}
                </h3>
                <p className="text-muted-foreground font-medium mt-1">
                  {description}
                </p>
              </div>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1 text-right">
               <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                  <Calendar className="w-3.5 h-3.5" /> {dateLabel}
               </div>
               <div className="text-lg font-black text-foreground">{date}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-8 md:p-10 space-y-8">
            
            {/* The Shift Visual */}
            <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                    <span>{oldRatesLabel}</span>
                    <span>{newRealityLabel}</span>
                </div>
                
                {/* Visual Connector Line */}
                <div className="relative py-2">
                   
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                       {/* Standard Rate */}
                       <div className="flex flex-col md:flex-row items-center justify-between bg-muted rounded-2xl p-6 md:px-8 gap-2 md:gap-0">
                            <div className="space-y-1 text-center md:text-left">
                                <div className="text-[10px] font-black uppercase tracking-widest text-foreground">{standardLabel}</div>
                                <div className="text-xl font-bold text-foreground line-through decoration-foreground/50">19%</div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90 md:rotate-0" />
                            <div className="space-y-1 text-center md:text-right">
                                <div className="text-[10px] font-black uppercase tracking-widest text-foreground">{newLabel}</div>
                                <div className="text-4xl font-black text-primary">21%</div>
                            </div>
                       </div>

                       {/* Essentials Rate */}
                       <div className="flex flex-col md:flex-row items-center justify-between bg-muted rounded-2xl p-6 md:px-8 gap-2 md:gap-0">
                            <div className="space-y-1 text-center md:text-left">
                                <div className="text-[10px] font-black uppercase tracking-widest text-foreground">{essentialsLabel}</div>
                                <div className="text-xl font-bold text-foreground line-through decoration-foreground/50">5-9%</div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90 md:rotate-0" />
                            <div className="space-y-1 text-center md:text-right">
                                <div className="text-[10px] font-black uppercase tracking-widest text-foreground">{unifiedLabel}</div>
                                <div className="text-4xl font-black text-primary">11%</div>
                            </div>
                       </div>
                   </div>
                </div>
            </div>

            {/* Impact Text */}
            <div className="flex items-start gap-4 p-6 rounded-3xl bg-primary/10">
                 <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                 <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">{explanationTitle}</h4>
                    <p className="text-sm text-foreground leading-relaxed font-medium">
                        {explanation}
                    </p>
                 </div>
            </div>
            
            <div className="md:hidden flex flex-col items-center gap-1 text-center pt-4 border-t border-border">
               <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                  <Calendar className="w-3.5 h-3.5" /> {dateLabel}
               </div>
               <div className="text-lg font-black text-foreground">{date}</div>
            </div>

        </div>
      </Card>
    </div>
  )
}
