import { useId, type ReactNode } from 'react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { cn } from '@/lib/utils'

/**
 * The band the not-found and error pages stand on, in the landing's skin: the
 * lattice, the ruled frame and the crossing marks where its bottom rule meets
 * the frame; Inter, one navy accent. Words on the left, the page character on
 * the right; on a narrow page the character leads, smaller, so it is seen
 * before the buttons.
 *
 * Sized by its container, not the window: it stands beside the sidebar in the
 * shell, and alone when the root itself failed.
 */
export function ErrorScene({
  picture,
  caption,
  title,
  lede,
  actions,
  children,
  alert = false,
}: {
  readonly picture: ReactNode
  /** A code above the title (`404`); mono, since it is read as a code. */
  readonly caption?: string
  readonly title: string
  readonly lede: ReactNode
  readonly actions: ReactNode
  /** Under the actions: the not-found page's shortcuts. */
  readonly children?: ReactNode
  /** An error announces itself; a missing page is just a page. */
  readonly alert?: boolean
}) {
  const id = useId().replace(/[^\w-]/g, '')
  return (
    <div className="@container relative w-full bg-background" role={alert ? 'alert' : undefined} aria-labelledby={`${id}-title`}>
      <section className="relative border-b">
        <TwoLayerLattice idPrefix={id} />
        <RuledFrame className="flex min-h-[70svh] items-center py-14 @3xl:py-20">
          <div className="grid w-full grid-cols-1 items-center gap-6 @3xl:grid-cols-12 @3xl:gap-8">
            <div className="min-w-0 @3xl:col-span-7">
              {caption ? <MonoLabel className="mb-4 block text-sm text-primary">{caption}</MonoLabel> : null}
              <h1
                id={`${id}-title`}
                className="text-[2.5rem] font-extrabold leading-[0.96] tracking-[-0.04em] text-balance text-foreground @2xl:text-6xl @5xl:text-7xl"
              >
                {title}
              </h1>
              <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground">{lede}</p>
              <div className="mt-8 flex flex-col gap-3 @md:flex-row">{actions}</div>
              {children}
            </div>
            <div className="order-first flex justify-start @3xl:order-none @3xl:col-span-5 @3xl:justify-end">{picture}</div>
          </div>
          <span className="absolute inset-x-0 top-full z-10 mt-px">
            <CruxMarks />
          </span>
        </RuledFrame>
      </section>
    </div>
  )
}

/** The picture's size in the scene: small where it leads the words, large beside them. */
export const SCENE_PICTURE = 'size-36 @3xl:size-76 @5xl:size-84'

/** A button in the scene's action row: full width on a phone, its own width beside another. */
export const SCENE_BUTTON = 'w-full @md:w-auto'

/** The address a reader asked for, inline in a sentence: read character by character, so mono. */
export function AskedPath({ path, className }: { readonly path: string; readonly className?: string }) {
  return <code className={cn('rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground [overflow-wrap:anywhere]', className)}>{path}</code>
}
