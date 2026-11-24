import type { ReactElement, ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import { ChevronUp, CircleHelp, Copy, MessageSquare, MessageSquarePlus, Send, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/** Stands in for the real form (Sentry feedback), so the prototype opens nothing. */
function useOpenFeedback() {
  const { t } = useLingui()
  return () => toast.info(t`Aici se deschide formularul de feedback.`)
}

/**
 * A slice of a page with its bottom-right corner, where the button lives. The real
 * button is `fixed` to the viewport; here it is `absolute` to the slice, so the
 * versions sit side by side.
 */
function Stage({ children }: { readonly children: ReactNode }) {
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative h-80 overflow-hidden rounded-md border bg-background">
      <div className="space-y-3 p-5" aria-hidden>
        <div className="h-5 w-2/5 rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted/70" />
        <div className="h-3 w-3/5 rounded bg-muted/70" />
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="h-20 rounded border" />
          <div className="h-20 rounded border" />
          <div className="h-20 rounded border" />
        </div>
        <div className="h-3 w-4/5 rounded bg-muted/70" />
        <div className="h-3 w-2/3 rounded bg-muted/70" />
      </div>
      {children}
    </div>
  )
}

/** The help menu without feedback: the button itself opens feedback. */
function HelpMenu({ trigger }: { readonly trigger: ReactElement }) {
  const { t } = useLingui()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-60">
        <DropdownMenuLabel>{t`Ai nevoie de ajutor?`}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => toast.info(t`Aici se deschide raportul de problemă.`)}>
          <TriangleAlert className="size-4" />
          {t`Raportează o problemă`}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => toast.info(t`Aici se deschide e-mailul.`)}>
          <Send className="size-4" />
          {t`Scrie-ne`}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast.success(t`Adresa a fost copiată.`)}>
          <Copy className="size-4" />
          {t`Copiază adresa de e-mail`}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const INNER_FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-inset'
const OUTER_FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

/** A: one navy pill split in two. Feedback in one click, the arrow opens the rest. */
export function SplitNavy() {
  const { t } = useLingui()
  const openFeedback = useOpenFeedback()
  return (
    <Stage>
      <div className="absolute right-4 bottom-4 inline-flex h-10 items-stretch overflow-hidden rounded-full bg-primary text-primary-foreground shadow-md">
        <button type="button" onClick={openFeedback} className={cn('inline-flex items-center gap-2 pr-3 pl-4 text-sm font-semibold hover:bg-primary-foreground/10', INNER_FOCUS, 'focus-visible:ring-primary-foreground')}>
          <MessageSquarePlus className="size-4" aria-hidden />
          {t`Feedback`}
        </button>
        <span aria-hidden className="my-2.5 w-px bg-primary-foreground/30" />
        <HelpMenu
          trigger={
            <button type="button" aria-label={t`Ajutor`} className={cn('px-2.5 hover:bg-primary-foreground/10 data-[state=open]:bg-primary-foreground/15', INNER_FOCUS, 'focus-visible:ring-primary-foreground')}>
              <ChevronUp className="size-4" aria-hidden />
            </button>
          }
        />
      </div>
    </Stage>
  )
}

/**
 * B: the same split pill in the lime accent, readable in both themes (dark text
 * on lime always; today's button turns its text light in dark mode).
 */
export function SplitLime() {
  const { t } = useLingui()
  const openFeedback = useOpenFeedback()
  return (
    <Stage>
      <div className="absolute right-4 bottom-4 inline-flex h-10 items-stretch overflow-hidden rounded-full bg-(--pnrr-green) text-neutral-950 shadow-md ring-1 ring-neutral-950/10">
        <button type="button" onClick={openFeedback} className={cn('inline-flex items-center gap-2 pr-3 pl-4 text-sm font-semibold hover:bg-neutral-950/5', INNER_FOCUS, 'focus-visible:ring-neutral-950')}>
          <MessageSquarePlus className="size-4" aria-hidden />
          {t`Feedback`}
        </button>
        <span aria-hidden className="my-2.5 w-px bg-neutral-950/20" />
        <HelpMenu
          trigger={
            <button type="button" aria-label={t`Ajutor`} className={cn('px-2.5 hover:bg-neutral-950/5 data-[state=open]:bg-neutral-950/10', INNER_FOCUS, 'focus-visible:ring-neutral-950')}>
              <ChevronUp className="size-4" aria-hidden />
            </button>
          }
        />
      </div>
    </Stage>
  )
}

/** C: two matched buttons in one row: a labelled feedback pill and a round help button. */
export function Pair() {
  const { t } = useLingui()
  const openFeedback = useOpenFeedback()
  return (
    <Stage>
      <div className="absolute right-4 bottom-4 flex items-center gap-2">
        <HelpMenu
          trigger={
            <button type="button" aria-label={t`Ajutor`} className={cn('inline-flex size-10 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-md hover:text-foreground data-[state=open]:text-foreground', OUTER_FOCUS)}>
              <CircleHelp className="size-5" aria-hidden />
            </button>
          }
        />
        <button type="button" onClick={openFeedback} className={cn('inline-flex h-10 items-center gap-2 rounded-full bg-primary pr-4 pl-3.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90', OUTER_FOCUS)}>
          <MessageSquarePlus className="size-4" aria-hidden />
          {t`Feedback`}
        </button>
      </div>
    </Stage>
  )
}

/** D: a quiet card-coloured pill: labelled, bordered like the rest of the app, the icon carries the colour. */
export function Quiet() {
  const { t } = useLingui()
  const openFeedback = useOpenFeedback()
  return (
    <Stage>
      <div className="absolute right-4 bottom-4 inline-flex h-10 items-stretch overflow-hidden rounded-full border bg-background text-foreground shadow-md">
        <button type="button" onClick={openFeedback} className={cn('inline-flex items-center gap-2 pr-3 pl-4 text-sm font-semibold hover:bg-muted', INNER_FOCUS, 'focus-visible:ring-ring')}>
          <MessageSquarePlus className="size-4 text-primary" aria-hidden />
          {t`Feedback`}
        </button>
        <span aria-hidden className="my-2.5 w-px bg-border" />
        <HelpMenu
          trigger={
            <button type="button" aria-label={t`Ajutor`} className={cn('px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted', INNER_FOCUS, 'focus-visible:ring-ring')}>
              <ChevronUp className="size-4" aria-hidden />
            </button>
          }
        />
      </div>
    </Stage>
  )
}

/**
 * E: a tab on the right edge, half-way down: always visible, never over the
 * page's own bottom-right content. Help stays a small round button in the corner.
 */
export function EdgeTab() {
  const { t } = useLingui()
  const openFeedback = useOpenFeedback()
  return (
    <Stage>
      <button
        type="button"
        onClick={openFeedback}
        className={cn('absolute top-1/2 right-0 inline-flex -translate-y-1/2 rotate-180 items-center gap-2 rounded-r-md bg-primary px-2 py-3 text-sm font-semibold text-primary-foreground shadow-md [writing-mode:vertical-rl] hover:bg-primary/90', OUTER_FOCUS)}
      >
        <MessageSquarePlus className="size-4 rotate-90" aria-hidden />
        {t`Feedback`}
      </button>
      <HelpMenu
        trigger={
          <button type="button" aria-label={t`Ajutor`} className={cn('absolute right-4 bottom-4 inline-flex size-10 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-md hover:text-foreground data-[state=open]:text-foreground', OUTER_FOCUS)}>
            <CircleHelp className="size-5" aria-hidden />
          </button>
        }
      />
    </Stage>
  )
}

/** Today, for reference: the lime square and the round navy button, stacked. */
export function Current() {
  const { t } = useLingui()
  const openFeedback = useOpenFeedback()
  return (
    <Stage>
      <button type="button" onClick={openFeedback} className="absolute right-4 bottom-20 inline-flex h-10 items-center gap-2 bg-(--pnrr-green) pr-4 pl-3 text-sm font-bold text-(--pnrr-fg)">
        <MessageSquarePlus className="size-4" aria-hidden />
        {t`Feedback`}
      </button>
      <HelpMenu
        trigger={
          <button type="button" aria-label={t`Ajutor`} className="absolute right-4 bottom-4 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <MessageSquare className="size-6" aria-hidden />
          </button>
        }
      />
    </Stage>
  )
}
