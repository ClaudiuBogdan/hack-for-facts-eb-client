import { Target, ExternalLink } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface PlatformMissionProps {
    title: string
    description?: string
    tasks: string[]
    actionLabel: string
    actionLink: string
}

export function PlatformMission({
    title,
    description,
    tasks,
    actionLabel,
    actionLink
}: PlatformMissionProps) {
    return (
        <Card className="p-6 md:p-10 rounded-[2.5rem] shadow-sm my-8 relative overflow-hidden">
            <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-foreground rounded-2xl text-background shadow-xl">
                        <Target className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{t`Platform Mission`}</div>
                        <h3 className="text-xl font-black text-foreground tracking-tight">{title}</h3>
                    </div>
                </div>

                {description && (
                    <p className="text-muted-foreground font-medium text-base leading-relaxed max-w-2xl">
                        {description}
                    </p>
                )}

                <ul className="grid grid-cols-1 gap-4">
                    {tasks.map((task, i) => (
                        <li key={i} className="flex items-start gap-4 p-4 bg-muted rounded-2xl border border-border scroll-mt-20">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-black mt-0.5">
                                {i + 1}
                            </span>
                            <span className="text-foreground font-bold leading-tight">{task}</span>
                        </li>
                    ))}
                </ul>

                <div className="pt-4">
                    <Button asChild className="rounded-2xl bg-primary hover:bg-primary text-primary-foreground font-black h-12 px-8 text-base shadow-2xl hover:ring-4 hover:ring-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <a href={actionLink} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-5 h-5 mr-3 text-primary-foreground" /> <span className="text-primary-foreground">{actionLabel}</span>
                    </a>
                </Button>
            </div>
        </div>
        </Card >
    )
}
