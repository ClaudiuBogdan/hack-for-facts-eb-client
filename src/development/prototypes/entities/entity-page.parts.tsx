/**
 * The static vocabulary borrowed from the landing rewrite
 * (`src/development/prototypes/landing/home-refs.refined.tsx`), copied rather
 * than imported: the landing will be promoted and `git rm`'d, and a
 * cross-prototype import would go with it.
 *
 * Deliberately *not* borrowed: the landing's motion stack (scroll light,
 * section light, scramble, count-up, pixel field). This is a work surface;
 * `DESIGN.md` §Motion allows arrival and orientation only.
 */
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/**
 * The small mono caption. On this page it carries source and period, not
 * decoration, so it stays at `text-muted-foreground` (AA) — never `/50`.
 */
export function MonoLabel({ children, className, ...rest }: Readonly<ComponentPropsWithoutRef<'span'>>) {
  return (
    <span
      {...rest}
      className={cn('font-mono text-[0.625rem] uppercase leading-none tracking-[0.14em]', className)}
    >
      {children}
    </span>
  )
}

/** The content column with a 1px rule down each side. */
export function Frame({
  children,
  className,
  marker,
  as: Tag = 'div',
}: {
  readonly children: ReactNode
  readonly className?: string
  readonly marker?: string
  readonly as?: 'div' | 'section' | 'header' | 'footer'
}) {
  return (
    <Tag data-frame={marker} className={cn('relative mx-auto w-full max-w-6xl px-5 sm:px-8', className)}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-border" />
      <span aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-border" />
      {children}
    </Tag>
  )
}

/** Crosshair ticks at the top corners of a frame. */
export function CornerTicks() {
  const arm = 'absolute size-2 border-foreground/25'
  return (
    <span aria-hidden="true">
      <span className={cn(arm, '-left-px -top-px border-l border-t')} />
      <span className={cn(arm, '-right-px -top-px border-r border-t')} />
    </span>
  )
}

/** The brand-blue cross where a band's top rule meets the frame's side rules. */
export function CruxMarks() {
  const arm = 'absolute -translate-x-1/2 -translate-y-1/2 bg-primary'
  const left = 'left-0 top-0 ml-[0.5px] -mt-[0.5px]'
  const right = 'right-0 top-0 mr-[0.5px] -mt-[0.5px] translate-x-1/2'
  return (
    <span aria-hidden="true">
      <span className={cn(arm, left, 'h-3 w-0.5')} />
      <span className={cn(arm, left, 'h-0.5 w-3')} />
      <span className={cn(arm, right, 'h-3 w-0.5')} />
      <span className={cn(arm, right, 'h-0.5 w-3')} />
    </span>
  )
}

/**
 * The numbered section rail: `01  SINTEZĂ ————————— 07`. The right-hand
 * figure is the count of sections on the page, so a reader always knows how
 * far down they are. Renders the heading the section is named by.
 */
export function SectionRail({
  number,
  label,
  total,
  id,
  className,
}: {
  readonly number: string
  readonly label: string
  readonly total: number
  readonly id?: string
  readonly className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <MonoLabel className="text-primary tabular-nums">{number}</MonoLabel>
      <h2 id={id} className="scroll-mt-28 shrink-0">
        <MonoLabel className="text-foreground">{label}</MonoLabel>
      </h2>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <MonoLabel className="text-muted-foreground tabular-nums">
        {String(total).padStart(2, '0')}
      </MonoLabel>
    </div>
  )
}

/**
 * The data-trust label for fixture data. Every figure on this prototype comes
 * from a local stand-in, and `DESIGN.md` §Mock-First Contract says that must
 * be visible next to the figures, not in a doc.
 */
export function LocalDataBadge({ className }: { readonly className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border border-slate-300 bg-slate-100 px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      <MonoLabel>date locale de test</MonoLabel>
    </span>
  )
}

/**
 * `MUNICIPIUL CLUJ-NAPOCA` → `Municipiul Cluj-Napoca`. The served name is
 * upper-case; every place that prints it (hero, compact bar, rail) cases it
 * the same way. Romanian-only here; Lingui takes over at promotion.
 */
export function normalizeEntityDisplayName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('ro-RO')
    .replace(
      /(^|[\s-])(\p{L})/gu,
      (_match, prefix: string, character: string) => `${prefix}${character.toLocaleUpperCase('ro-RO')}`,
    )
}
