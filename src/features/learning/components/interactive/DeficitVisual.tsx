import { Card } from '@/components/ui/card'
import { t } from '@lingui/core/macro'

export function DeficitVisual() {
   return (
      <div className="w-full my-8">
         <Card className="p-6 md:p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 text-center">
               <div className="space-y-3 flex-1 min-w-0 max-w-48">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground truncate">{t`Revenue`}</div>
                  <div className="text-2xl md:text-3xl lg:text-4xl font-black text-status-live-fg tracking-tighter shrink-0">34.2%</div>
               </div>

               <div className="text-3xl font-black text-muted-foreground select-none hidden lg:block shrink-0 mt-4">-</div>

               <div className="space-y-3 flex-1 min-w-0 max-w-48">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground truncate">{t`Spending`}</div>
                  <div className="text-2xl md:text-3xl lg:text-4xl font-black text-foreground tracking-tighter shrink-0">43.5%</div>
               </div>

               <div className="text-3xl font-black text-muted-foreground select-none hidden lg:block shrink-0 mt-4">=</div>

               <div className="space-y-3 flex-1 min-w-0 max-w-60">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground truncate">{t`The Deficit`}</div>
                  <div className="text-2xl md:text-3xl lg:text-4xl font-black text-status-blocked-fg tracking-tighter shrink-0">−9.3%</div>
               </div>
            </div>
         </Card>
      </div>
   )
}
