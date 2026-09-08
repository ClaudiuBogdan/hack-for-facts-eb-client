import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MonoLabel } from './home-refs.mono-label'
import { CONTRIBUTORS, REPO_URL, type Person, type Portrait } from './about.people'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/**
 * The landing's frame, repeated here.
 *
 * `home-refs.refined.tsx` keeps its own copy private, and the variants have to
 * sit on the same rails to be judged against the bands above them — the 5/6
 * split, the hairline edges and the max width are the geometry being compared,
 * not decoration. On promotion this collapses back into the one in the landing.
 */
export function Frame({
  children,
  className,
}: {
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <div className={cn('relative mx-auto w-full max-w-6xl px-5 sm:px-8', className)}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-border" />
      <span aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-border" />
      {children}
    </div>
  )
}

/**
 * `DESIGN.md` §Mock-First Contract: stand-in content is never presented as
 * served truth. Everything below the founder is placeholder, so every variant
 * says so once, at the top, in the reader's line of sight rather than in a
 * tooltip.
 */
export function ProvisionalNotice() {
  return (
    <p className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 border border-dashed px-3 py-2">
      <MonoLabel className="text-primary">Conținut provizoriu</MonoLabel>
      <span className="text-xs leading-relaxed text-muted-foreground">
        Reale: portretul, numele, LinkedIn-ul și GitHub-ul. Textele sunt schițe
        de rescris; numele, rolurile, portretele și linkurile îngerilor sunt de
        umplutură.
      </span>
    </p>
  )
}

const SOCIAL = {
  linkedin: {
    label: 'LinkedIn',
    path: 'M20.447 20.452h-3.554V14.87c0-1.332-.024-3.048-1.86-3.048-1.862 0-2.146 1.453-2.146 2.953v5.677H9.332V9h3.414v1.561h.049c.476-.9 1.637-1.848 3.367-1.848 3.6 0 4.264 2.37 4.264 5.451v6.288zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM6.993 20.452H3.678V9h3.315v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.226 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  facebook: {
    label: 'Facebook',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  github: {
    label: 'GitHub',
    path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
} as const

type SocialKind = keyof typeof SOCIAL

/**
 * Brand marks are drawn inline because lucide dropped them — there is no
 * `Linkedin` or `Facebook` export in lucide-react v1. `AppFooter.tsx` already
 * carries the LinkedIn path this way; these are the same glyphs, so the app has
 * one drawing of each rather than two that drift.
 *
 * The 16px glyph sits in a 24px box: WCAG 2.2 §2.5.8 is about the target, not
 * the picture, and an icon-only link is exactly the case it was written for.
 */
function SocialGlyph({ kind }: { readonly kind: SocialKind }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" role="img" aria-hidden="true" focusable="false">
      <path d={SOCIAL[kind].path} />
    </svg>
  )
}

const SOCIAL_TARGET_CLASS =
  'flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring'

export function SocialRow({ person, className }: { readonly person: Person; readonly className?: string }) {
  const entries = (Object.keys(SOCIAL) as readonly SocialKind[])
    .map((kind) => ({ kind, href: person.links[kind] }))
    .filter((entry): entry is { kind: SocialKind; href: string } => entry.href !== undefined)

  if (entries.length === 0) return null

  return (
    <ul className={cn('-ml-1 flex items-center gap-0.5', className)}>
      {entries.map(({ kind, href }) => (
        <li key={kind}>
          {href === '#' ? (
            /* A stand-in profile. Same box, same glyph, no navigation — a link
               that goes nowhere is worse than a control that says it is not
               ready yet. */
            <span className={cn(SOCIAL_TARGET_CLASS, 'cursor-default opacity-40')}>
              <SocialGlyph kind={kind} />
              <span className="sr-only">
                {SOCIAL[kind].label} — link indisponibil
              </span>
            </span>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`${person.name} pe ${SOCIAL[kind].label}`}
              className={SOCIAL_TARGET_CLASS}
            >
              <SocialGlyph kind={kind} />
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * `DESIGN.md` §Delivery, to the letter: everything that configures loading
 * lives on the `<img>`, the `<img src>` *is* the webp fallback, and both
 * formats are the same crop at the same pixel size.
 *
 * `alt=""` on purpose — the name is the adjacent text. Describing the portrait
 * as well makes a screen reader say the person twice.
 */
export function PortraitPicture({
  portrait,
  className,
}: {
  readonly portrait: Portrait
  readonly className?: string
}) {
  return (
    <picture>
      {portrait.avif === undefined ? null : <source type="image/avif" srcSet={portrait.avif} />}
      <img
        src={portrait.webp}
        alt=""
        width={portrait.width}
        height={portrait.height}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        className={cn('h-auto w-full select-none', className)}
        draggable={false}
      />
    </picture>
  )
}

/**
 * The pending portrait.
 *
 * Drawn rather than photographed, on the same 4:5 crop the real art uses, so a
 * missing angel reads as a slot waiting for a picture — not as a person whose
 * photo failed to load, and not as a stock face standing in for a real one.
 *
 * Held at 16% because it sits next to a photographic collage: at full muted
 * grey the flat silhouette carried more visual mass than the real portrait and
 * the placeholders won the row.
 */
export function PendingPortrait({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 80 100"
      className={cn('w-full text-muted-foreground', className)}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {/* `fillOpacity` rather than an `opacity-*` utility: the scale has gaps
          (there is no `opacity-15`), and an unknown class here fails loudly —
          the shard renders solid and the placeholder outweighs the photograph
          next to it. The SVG attribute has no scale to fall off. */}
      <polygon points="18,30 40,8 66,26 70,58 52,74 22,66" className="fill-current" fillOpacity={0.06} />
      <polygon points="52,16 74,34 65,54" className="fill-current" fillOpacity={0.09} />
      <polygon points="10,50 26,42 24,74" className="fill-current" fillOpacity={0.09} />
      <circle cx="40" cy="40" r="16" className="fill-current" fillOpacity={0.18} />
      <path d="M12 100c0-15.5 12.5-28 28-28s28 12.5 28 28z" className="fill-current" fillOpacity={0.18} />
    </svg>
  )
}

/** The band's heading, on the landing's numbered-label pattern. */
export function BandHead({ title, lead }: { readonly title: ReactNode; readonly lead?: ReactNode }) {
  return (
    <>
      <MonoLabel className="block text-primary">03 / Oameni</MonoLabel>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {lead === undefined ? null : (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{lead}</p>
      )}
    </>
  )
}

/**
 * The third tier.
 *
 * Measured on 8 September 2026: one human across the three repositories. So it
 * is written as the invitation it is, and the avatar row is sized for the day
 * that stops being true — `+N` appears the moment there are more faces than
 * fit, and nothing about the layout has to change.
 */
export function ContributorStrip({ className }: { readonly className?: string }) {
  const shown = CONTRIBUTORS.slice(0, 8)
  const overflow = CONTRIBUTORS.length - shown.length

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t pt-5', className)}>
      <div className="flex items-center gap-3">
        <ul className="flex items-center -space-x-2">
          {shown.map((contributor) => (
            <li key={contributor.login}>
              <a
                href={contributor.url}
                target="_blank"
                rel="noreferrer noopener"
                title={contributor.login}
                className="block rounded-full ring-2 ring-background transition-transform hover:z-10 hover:scale-110 focus-visible:outline-hidden focus-visible:ring-ring"
              >
                <img
                  src={contributor.avatar}
                  alt={contributor.login}
                  width={160}
                  height={160}
                  loading="lazy"
                  decoding="async"
                  className="size-8 rounded-full bg-muted"
                />
              </a>
            </li>
          ))}
          {overflow > 0 && (
            <li className="flex size-8 items-center justify-center rounded-full border bg-card ring-2 ring-background">
              <MonoLabel className="text-muted-foreground">+{overflow}</MonoLabel>
            </li>
          )}
        </ul>
        <p className="text-sm text-muted-foreground">
          Codul e deschis. Deocamdată e scris de o singură mână.
        </p>
      </div>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        Contribuie pe GitHub
        <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
      </a>
    </div>
  )
}

/** The one way out of the band: the page that holds the long version. */
export function ReadMoreLink({ className }: { readonly className?: string }) {
  return (
    <a
      href="/development/landing/about?v=page"
      className={cn(
        'group inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      Despre proiect
      <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  )
}
