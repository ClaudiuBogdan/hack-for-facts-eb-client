import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn, formatNumber } from '@/lib/utils'

type CampaignParticipantsRankedListEntry = {
  readonly sirutaCode: string
  readonly uatName: string
  readonly count: number
}

type CampaignParticipantsRankedListProps = {
  readonly locale: 'en' | 'ro'
  readonly totalParticipants: number
  readonly entries: readonly CampaignParticipantsRankedListEntry[]
  readonly currentSirutaCode?: string | null
  readonly onSelectEntry: (entry: CampaignParticipantsRankedListEntry) => void
  readonly className?: string
}

export function CampaignParticipantsRankedList({
  locale,
  totalParticipants,
  entries,
  currentSirutaCode,
  onSelectEntry,
  className,
}: CampaignParticipantsRankedListProps) {
  const [isOpen, setIsOpen] = useState(false)

  const sortedEntries = useMemo(() => {
    return [...entries].sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count
      }

      return left.uatName.localeCompare(right.uatName, locale === 'en' ? 'en' : 'ro')
    })
  }, [entries, locale])

  if (sortedEntries.length === 0) {
    return null
  }

  const isRomanian = locale === 'ro'
  const totalLabel = isRomanian
    ? totalParticipants === 1
      ? 'participant'
      : 'participanți'
    : totalParticipants === 1
      ? 'participant'
      : 'participants'
  const listLabel = isRomanian ? 'Localități active' : 'Active localities'
  const localitiesLabel =
    sortedEntries.length === 1
      ? isRomanian
        ? '1 localitate activă'
        : '1 active locality'
      : isRomanian
        ? `${formatNumber(sortedEntries.length, 'standard')} localități active`
        : `${formatNumber(sortedEntries.length, 'standard')} active localities`
  const countColumnLabel = isRomanian ? 'Nr. participanți' : 'Participants'

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        'rounded-2xl border border-border/60 bg-background/90 shadow-sm',
        className,
      )}
    >
      <CollapsibleTrigger className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/20">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            {isRomanian ? 'Participare în campanie' : 'Campaign participation'}
          </p>
          <p className="flex flex-wrap items-end gap-x-2 gap-y-1 text-foreground">
            <span className="text-3xl font-black tracking-tight tabular-nums">
              {formatNumber(totalParticipants, 'standard')}
            </span>
            <span className="pb-1 text-sm font-semibold text-muted-foreground">
              {totalLabel}
            </span>
            <span className="pb-1 text-sm font-semibold text-muted-foreground/60">
              •
            </span>
            <span className="pb-1 text-sm font-semibold text-muted-foreground">
              {localitiesLabel}
            </span>
          </p>
        </div>

        <div className="shrink-0 pt-1 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c91d00]">
            {listLabel}
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
            <span>{isOpen ? (isRomanian ? 'Ascunde' : 'Hide') : (isRomanian ? 'Vezi lista' : 'Show list')}</span>
            <ChevronDown
              aria-hidden="true"
              className={cn('h-4 w-4 transition-transform', isOpen ? 'rotate-180' : 'rotate-0')}
            />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border/50 px-3 pb-3 pt-3">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/80">
            {isRomanian ? 'Localitate' : 'Locality'}
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/80">
            {countColumnLabel}
          </span>
        </div>
        <ScrollArea className="h-72 pr-2">
          <div className="space-y-1">
            {sortedEntries.map((entry, index) => {
              const isCurrent = currentSirutaCode === entry.sirutaCode

              return (
                <button
                  key={entry.sirutaCode}
                  type="button"
                  onClick={() => {
                    onSelectEntry(entry)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                    isCurrent
                      ? 'border-[#ef2d00]/20 bg-[#ef2d00]/5'
                      : 'border-transparent bg-muted/15',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-black text-background">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {entry.uatName}
                      </p>
                      {isCurrent ? (
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c91d00]">
                          {isRomanian ? 'Actual' : 'Current'}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-[#ef2d00]/10 px-2.5 py-1 text-xs font-semibold text-[#c91d00]">
                    {formatNumber(entry.count, 'standard')}
                  </span>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  )
}
