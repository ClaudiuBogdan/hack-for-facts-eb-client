import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowUp, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { LegalOutlineEntry } from '@/schemas/legal'
import { outlineAncestors, tocLabel } from '../../lib/legal-outline'
import { ACT_CONTROL, ACT_GRID, ACT_GRID_THREE, ACT_TO_START } from './act-page-grid'
import { ArticleNumber, ContentsToggle } from './legal-reader-toc'

type Props = {
  /** What the bar says when the reader is in no place of the outline (the preamble, or before the text). */
  readonly citation: string
  readonly outline: readonly LegalOutlineEntry[]
  readonly activePath: string | null
  /** The shown version's one-line name, for „Forma din …"; null when no version's text is on the page. */
  readonly shownName: string | null
  /** The name starts with a date („Forma din 23 mai 2016, …"). Without one the name stands alone: „din" needs a date. */
  readonly shownDated: boolean
  /** The box about the text shows: from 88rem it names the version itself, and the bar heads it. */
  readonly about: boolean
  /** The act's head has left the screen: the way back to the start shows. */
  readonly away: boolean
  readonly onToStart: () => void
  readonly collapsed: boolean
  readonly onToggleFold: () => void
  readonly sheetOpen: boolean
  readonly onSheetOpenChange: (open: boolean) => void
  /** The contents as the phone's sheet shows them. */
  readonly sheetContents: ReactNode
}

/**
 * The reading bar (owner, 26 November 2026, the act page's redesign): it stays at the top while the text scrolls, so
 * the reader always knows where in the act they are and which version of its text they read. Its left cell heads
 * the contents' box hung under it (the box's frame runs up through the bar); its right cell, from 88rem, heads the
 * box about the text shown.
 */
export function ActReadingBar({
  citation,
  outline,
  activePath,
  shownName,
  shownDated,
  about,
  away,
  onToStart,
  collapsed,
  onToggleFold,
  sheetOpen,
  onSheetOpenChange,
  sheetContents,
}: Props) {
  const docked = outline.length > 0
  // A switch only where there is something to fold: an outline of articles alone has one level.
  const foldable = outline.some((entry) => entry.nodeKind !== 'articol')
  const active = outline.find((entry) => entry.path === activePath)
  const ancestors = outlineAncestors(outline, activePath)
  return (
    <div className="sticky top-0 z-20 border-y bg-background print:hidden">
      <div className={cn(ACT_GRID, 'items-center', about && ACT_GRID_THREE)}>
        {/* Docked: the contents' frame runs up through the bar, which is its head. */}
        <div className={cn('hidden items-center justify-between text-sm font-medium lg:flex', docked && 'self-stretch border-x pl-3 pr-1.5')}>
          <Trans>Cuprins</Trans>
          {foldable ? <ContentsToggle collapsed={collapsed} onToggle={onToggleFold} /> : null}
        </div>
        <div className="flex min-h-12 min-w-0 items-center gap-3">
          {docked ? (
            <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
              <SheetTrigger asChild>
                <Button variant="outline" className={cn(ACT_CONTROL, 'shrink-0 gap-2 px-3 shadow-none lg:hidden')}>
                  <List className="size-4" aria-hidden />
                  <Trans>Cuprins</Trans>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(22rem,88vw)] gap-0 overflow-y-auto p-0" aria-describedby={undefined}>
                <SheetHeader className="flex-row items-center gap-2 space-y-0 border-b py-1 pl-4 pr-12 text-left">
                  <SheetTitle className="text-base">
                    <Trans>Cuprins</Trans>
                  </SheetTitle>
                  {foldable ? <ContentsToggle collapsed={collapsed} onToggle={onToggleFold} touch /> : null}
                </SheetHeader>
                {sheetContents}
              </SheetContent>
            </Sheet>
          ) : null}
          {/* The place first, then the version in what room is left: the place takes the width it needs and the
              version's name is cut at its end (its date comes first, and the box above the text names it whole).
              Seen at 1024 px: the version's 350 px left „Titlul II Impozitu…" of the place. The space between them is
              the version's own padding: a column gap would take 12 px from the place on a phone, where no version shows. */}
          <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-baseline">
            {/* The place changes with every scroll: it is not announced. */}
            <p className="flex min-w-0 items-baseline text-sm text-muted-foreground">
              {active === undefined ? (
                <span className="truncate">{citation}</span>
              ) : (
                <>
                  {/* The chapter and section give way first; the place itself is cut only when it alone is wider than
                      its room (a heading's whole name on a phone). From `sm` only. */}
                  {ancestors.length > 0 ? (
                    <>
                      <span className="hidden min-w-0 shrink-[999] truncate sm:inline">
                        {ancestors
                          .slice(-2)
                          .map((entry) => tocLabel(entry))
                          .join(' › ')}
                      </span>
                      <span aria-hidden className="hidden shrink-0 px-1.5 sm:inline">
                        ›
                      </span>
                    </>
                  ) : null}
                  <span className="min-w-0 truncate font-medium text-foreground">
                    <ArticleNumber value={tocLabel(active)} />
                  </span>
                </>
              )}
            </p>
            {shownName !== null ? (
              // With the box at the right, the box itself names the version on a wide screen.
              <p className={cn('hidden min-w-0 truncate pl-3 text-right text-sm text-muted-foreground md:block', about && 'min-[88rem]:hidden')}>
                {shownDated ? <Trans>Forma din {shownName}</Trans> : shownName}
              </p>
            ) : null}
          </div>
          {away ? (
            <button
              type="button"
              onClick={onToStart}
              aria-label={t`Înapoi la începutul actului`}
              className="inline-flex size-11 shrink-0 items-center justify-center gap-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:h-10 sm:w-auto sm:px-2"
            >
              <ArrowUp className="size-4" aria-hidden />
              <span aria-hidden className="hidden sm:inline">
                <Trans>La început</Trans>
              </span>
            </button>
          ) : null}
        </div>
        {about ? (
          <div className="hidden items-center self-stretch border-x px-3 text-sm font-medium min-[88rem]:flex">
            <Trans>Versiunea textului</Trans>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * The floating way back to the act's start (owner, 26 November 2026: both the bar's and a floating one). `column`
 * stands 16 px right of the reading column from 72rem, riding the window's lower edge (it lives at the column's end,
 * sticky); `corner` sits fixed in the corner below that width, above the app's bottom menu and its feedback button.
 */
export function ActToStartButton({ placement, onToStart }: { readonly placement: 'column' | 'corner'; readonly onToStart: () => void }) {
  const button = (className: string) => (
    <button type="button" onClick={onToStart} aria-label={t`Înapoi la începutul actului`} title={t`Înapoi la începutul actului`} className={cn(ACT_TO_START, className)}>
      <ArrowUp className="size-4" aria-hidden />
    </button>
  )
  if (placement === 'corner') {
    return button('fixed bottom-24 right-4 z-30 size-11 sm:bottom-20 sm:right-[2.125rem] sm:size-10 min-[72rem]:hidden print:hidden')
  }
  return (
    <div className="pointer-events-none sticky bottom-20 z-30 hidden h-0 min-[72rem]:block print:hidden">
      {button('pointer-events-auto absolute bottom-0 left-full ml-4 size-10')}
    </div>
  )
}
