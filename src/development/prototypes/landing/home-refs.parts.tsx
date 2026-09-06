import type { CSSProperties, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { scraperDatasetCatalog } from '@/lib/scraper-references'
import { cn } from '@/lib/utils'
import { LANDING_GROUPS, visibleGroups } from './home.data'
import type { LandingEntry, LandingGroup } from './home.data'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/**
 * Structural parts distilled from ui8.ai/forge, vercel.com/ai-sdk and
 * opentrain.ai. Shared by both reference variants so the only difference
 * between them is the skin.
 *
 * What actually transferred from those three sites is structure, not colour:
 * the continuous architectural lattice behind content (OpenTrain), cells that
 * share borders instead of floating as separate cards (all three), an
 * asymmetric section header with the title left and the description right
 * (Vercel's "Scale with confidence"), display-scale type with tight tracking,
 * and small monospace labels.
 */

/**
 * The continuous lattice. An inline `<svg>` `<pattern>` rather than a
 * `bg-[url(…)]` or `bg-[linear-gradient(…)]` utility: prototype source is
 * scanned by Tailwind in full-checkout builds, so an arbitrary value carrying
 * a URL or a literal would ride into shipped CSS.
 */
export function GridLattice({
  className,
  cell = 120,
  id,
}: {
  readonly className?: string
  /** Spacing between lattice lines, in px. */
  readonly cell?: number
  /** Unique per instance — two <pattern> elements may not share an id. */
  readonly id: string
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    >
      <defs>
        <pattern id={id} width={cell} height={cell} patternUnits="userSpaceOnUse">
          <path
            d={`M ${cell} 0 L 0 0 0 ${cell}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Small monospace label. Numbering and section names only — never fake telemetry. */
export function MonoLabel({
  children,
  className,
}: {
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <span
      className={cn(
        'font-mono text-[0.625rem] uppercase leading-none tracking-[0.14em]',
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * Vercel's section header: title left, description right, both on the same
 * baseline band. Breaks symmetry without breaking alignment.
 */
export function SplitSectionHeader({
  index,
  title,
  description,
  className,
  labelClassName,
  descriptionClassName,
}: {
  readonly index: string
  readonly title: string
  readonly description: string
  readonly className?: string
  readonly labelClassName?: string
  readonly descriptionClassName?: string
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6', className)}>
      <div className="md:col-span-5">
        <MonoLabel className={labelClassName}>{index}</MonoLabel>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      <p className={cn('text-sm leading-relaxed md:col-span-6 md:col-start-7', descriptionClassName)}>
        {description}
      </p>
    </div>
  )
}

/**
 * Cells, not bubbles. One bordered rectangle divided by hairlines: each cell
 * rules on its top and left and pulls back a pixel, so a rule only ever falls
 * between two cells and the column count can change per breakpoint without
 * leaving a rule trailing past the content.
 */
export function LatticeGrid({
  children,
  className,
}: {
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <div className={cn('grid grid-cols-1 border sm:grid-cols-2 lg:grid-cols-3', className)}>
      {children}
    </div>
  )
}

export function LatticeCell({
  children,
  className,
}: {
  /** Omitted for the filler cells that close the tail of a row. */
  readonly children?: ReactNode
  readonly className?: string
}) {
  return <div className={cn('-ml-px -mt-px border-l border-t', className)}>{children}</div>
}

/** A domain, rendered as a cell of the lattice rather than as a floating card. */
export function DomainCell({
  entry,
  index,
  tone,
}: {
  readonly entry: LandingEntry
  readonly index: number
  readonly tone: 'light' | 'dark'
}) {
  const Icon = entry.icon
  const dark = tone === 'dark'

  return (
    <LatticeCell
      className={dark ? 'border-white/10' : 'border-border'}
    >
      <Link
        to={entry.to}
        preload="intent"
        className={cn(
          'group flex h-full flex-col p-5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset',
          dark
            ? 'text-neutral-100 hover:bg-white/5 focus-visible:ring-white/40'
            : 'text-foreground hover:bg-muted/50 focus-visible:ring-ring',
        )}
      >
        <span className="flex items-center justify-between">
          <Icon
            className={cn('size-4', dark ? 'text-neutral-400' : 'text-muted-foreground')}
          />
          <MonoLabel className={dark ? 'text-neutral-600' : 'text-muted-foreground/60'}>
            {String(index).padStart(2, '0')}
          </MonoLabel>
        </span>
        <span className="mt-4 block text-base font-semibold tracking-tight group-hover:underline">
          {entry.title}
        </span>
        <span
          className={cn(
            'mt-1.5 block text-sm leading-snug',
            dark ? 'text-neutral-400' : 'text-muted-foreground',
          )}
        >
          {entry.blurb}
        </span>
      </Link>
    </LatticeCell>
  )
}

/** Fills the tail of the last row so the lattice closes as a rectangle. */
export function LatticeFillers({
  count,
  tone,
}: {
  readonly count: number
  readonly tone: 'light' | 'dark'
}) {
  if (count <= 0) return null
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <LatticeCell
          key={i}
          className={cn('hidden lg:block', tone === 'dark' ? 'border-white/10' : 'border-border')}
        />
      ))}
    </>
  )
}

/** Number of empty cells needed to close a 3-column row. */
export const fillersFor = (length: number) => (3 - (length % 3)) % 3

/**
 * The metric strip the references all carry — with only figures this codebase
 * can actually stand behind. Everything here is derived at render from the
 * domain list and the scraper catalog, both local and real. No latency
 * readouts, no build numbers: fabricated telemetry on a public-money product
 * is a data-trust violation, not decoration.
 */
export function usePlatformFacts() {
  const groups = visibleGroups()
  const surfaces = groups.reduce((sum, group) => sum + group.entries.length, 0)
  const hidden = LANDING_GROUPS.reduce(
    (sum, group) => sum + group.entries.filter((entry) => entry.gate?.() === false).length,
    0,
  )
  return {
    groups,
    facts: [
      { value: String(surfaces), label: 'suprafețe publice' },
      { value: String(groups.length), label: 'domenii' },
      { value: String(scraperDatasetCatalog.length), label: 'seturi de date înregistrate' },
      {
        value: String(scraperDatasetCatalog.filter((dataset) => dataset.apiReady).length),
        label: 'servite live',
      },
    ],
    hidden,
  }
}

export function FactStrip({
  facts,
  tone,
}: {
  readonly facts: readonly { value: string; label: string }[]
  readonly tone: 'light' | 'dark'
}) {
  const dark = tone === 'dark'
  return (
    <LatticeGrid
      className={cn('grid-cols-2 sm:grid-cols-4 lg:grid-cols-4', dark ? 'border-white/10' : 'border-border')}
    >
      {facts.map((fact) => (
        <LatticeCell key={fact.label} className={dark ? 'border-white/10' : 'border-border'}>
          <div className="p-5">
            <div
              className={cn(
                'text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl',
                dark ? 'text-neutral-50' : 'text-foreground',
              )}
            >
              {fact.value}
            </div>
            <MonoLabel className={cn('mt-2 block', dark ? 'text-neutral-500' : 'text-muted-foreground')}>
              {fact.label}
            </MonoLabel>
          </div>
        </LatticeCell>
      ))}
    </LatticeGrid>
  )
}

/** Groups rendered as one continuous lattice, numbered. */
export function DomainLattice({
  groups,
  tone,
}: {
  readonly groups: readonly LandingGroup[]
  readonly tone: 'light' | 'dark'
}) {
  const dark = tone === 'dark'
  let running = 0

  return (
    <div className="space-y-10">
      {groups.map((group, groupIndex) => {
        const start = running
        running += group.entries.length
        return (
          <section key={group.key}>
            <div className="flex items-baseline gap-3">
              <MonoLabel className={dark ? 'text-neutral-600' : 'text-muted-foreground/60'}>
                {String(groupIndex + 1).padStart(2, '0')}
              </MonoLabel>
              <MonoLabel className={dark ? 'text-neutral-400' : 'text-muted-foreground'}>
                {group.title}
              </MonoLabel>
            </div>
            <LatticeGrid
              className={cn('mt-3', dark ? 'border-white/10' : 'border-border')}
            >
              {group.entries.map((entry, i) => (
                <DomainCell key={entry.title} entry={entry} index={start + i + 1} tone={tone} />
              ))}
              <LatticeFillers count={fillersFor(group.entries.length)} tone={tone} />
            </LatticeGrid>
          </section>
        )
      })}
    </div>
  )
}

/** Inline style is the escape hatch for values Tailwind would have to inline as literals. */
export const latticeTone = (color: string): CSSProperties => ({ color })
