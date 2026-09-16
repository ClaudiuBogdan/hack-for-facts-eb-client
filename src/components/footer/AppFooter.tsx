import { useRef, type ReactElement } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import logo from '@/assets/logo/logo.png'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { useSentryConsent } from '@/hooks/useSentryConsent'
import { openSentryFeedback } from '@/lib/sentry'
import { FOOTER_SCENE_CLEAR_PX, FooterScene, FooterSceneStyles, useFooterScene } from './footer-scene'

/**
 * The app-wide footer, on the landing's skin: the ruled frame, mono column
 * captions, and the drifting horizon behind the last rows of text.
 *
 * It lives inside `SidebarInset`, so it sits under whatever page is open and
 * mounts once for the whole session. The scene is gated until the footer is a
 * viewport away and paused when it is off screen (see `footer-scene.tsx`), so
 * a page that is never scrolled to the bottom pays nothing for it.
 *
 * What is here and what is not is recorded in `docs/design/landing/design.md`.
 */

type FooterLink =
  | { readonly label: MessageDescriptor; readonly to: LinkProps['to'] }
  | { readonly label: MessageDescriptor; readonly href: string }

type FooterColumn = {
  readonly key: 'platform' | 'legal' | 'project'
  readonly title: MessageDescriptor
  readonly links: readonly FooterLink[]
}

const REPO_URL = 'https://github.com/ClaudiuBogdan/hack-for-facts-eb-client'
const STATUS_URL = 'https://status.transparenta.eu'

/**
 * Deliberately short. A footer that lists every surface competes with the
 * landing's own index, and on every other page it competes with the sidebar.
 * Cookie settings is added at render, because its link carries the current
 * location so the settings page can come back.
 */
const COLUMNS: readonly FooterColumn[] = [
  {
    key: 'platform',
    title: msg`Platformă`,
    links: [
      { label: msg`Analiza entităților`, to: '/entity-analytics' },
      { label: msg`Hărți`, to: '/map' },
      { label: msg`Grafice`, to: '/charts' },
    ],
  },
  {
    key: 'legal',
    title: msg`Legal`,
    links: [
      { label: msg`Politica de confidențialitate`, to: '/privacy' },
      { label: msg`Termeni și condiții`, to: '/terms' },
      { label: msg`Politica de cookie-uri`, to: '/cookie-policy' },
    ],
  },
  {
    key: 'project',
    title: msg`Proiect`,
    links: [
      { label: msg`Cod sursă pe GitHub`, href: REPO_URL },
      { label: msg`Raportează o problemă`, href: `${REPO_URL}/issues` },
      { label: msg`Stare sistem`, href: STATUS_URL },
    ],
  },
]

/** Each link is a full-width 44px row on a phone and a line of text from `sm`. */
const LINK_CLASS =
  'block py-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-sm sm:inline sm:py-0'

export function AppFooter(): ReactElement {
  const { i18n } = useLingui()
  const location = useLocation()
  const showSentryFeedback = useSentryConsent()
  const isPnrrPage = /(^|\/)pnrr(\/|$)/.test(location.pathname)
  const footerRef = useRef<HTMLElement>(null)
  useFooterScene(footerRef)

  const redirect = `${location.pathname}${location.searchStr ?? ''}`

  return (
    /* `relative` so the scene has something to be absolute against, and the
       content carries `z-10` so the range rises *behind* the last rows of text
       rather than over them. */
    <footer ref={footerRef} className="relative overflow-hidden border-t bg-background">
      <FooterSceneStyles />
      <FooterScene />
      {/* The frame does not take pointer events and its two content blocks do.
          Its box covers the whole footer, padding included, so as a `z-10`
          positioned element it swallowed every click meant for the sky
          underneath — the clouds could not be grabbed anywhere the padding
          reached, which was everywhere. */}
      <RuledFrame className="pointer-events-none relative z-10 pt-14">
        {/* Padding rather than a height, so the footer is as tall as its own
            text plus room for the vista. The figure comes from the scene, so
            the two cannot drift apart: the text stops above the highest cloud,
            and the peaks rise behind it. */}
        <div style={{ paddingBottom: FOOTER_SCENE_CLEAR_PX }}>
          <div className="pointer-events-auto grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <img src={logo} alt="" className="size-5 rounded-sm" />
                <span className="font-semibold text-foreground">Transparenta.eu</span>
              </div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                <Trans>
                  Banii publici, deciziile și documentele care le însoțesc — într-un singur loc, cu
                  sursa și data lângă fiecare cifră.
                </Trans>
              </p>
              {showSentryFeedback ? (
                <button
                  type="button"
                  onClick={() => openSentryFeedback?.()}
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-sm sm:min-h-0"
                >
                  <Trans>Trimite feedback</Trans>
                </button>
              ) : null}
            </div>
            {/* One navigation landmark for the footer, not one per column. A nav
                per column takes its name from the column, and two landmarks with
                the same role and a generic name are indistinguishable in the
                landmark list a screen reader offers. `display: contents` because
                the columns are grid children of the block above and a real box
                here would break the row. The column titles stay visual — the
                lists inside carry the structure. */}
            <nav aria-label={t`Navigare footer`} className="contents">
              {COLUMNS.map((column) => (
                <div key={column.key}>
                  <MonoLabel className="text-muted-foreground/70">{i18n._(column.title)}</MonoLabel>
                  <ul className="mt-1 space-y-0 sm:mt-4 sm:space-y-2.5">
                    {column.links.map((link) => (
                      <li key={'to' in link ? link.to : link.href}>
                        {'to' in link ? (
                          <Link to={link.to} className={LINK_CLASS}>
                            {i18n._(link.label)}
                          </Link>
                        ) : (
                          <a href={link.href} target="_blank" rel="noreferrer noopener" className={LINK_CLASS}>
                            {i18n._(link.label)}
                          </a>
                        )}
                      </li>
                    ))}
                    {column.key === 'legal' ? (
                      <li>
                        <Link to="/cookies" search={{ redirect }} className={LINK_CLASS}>
                          <Trans>Setări cookie-uri</Trans>
                        </Link>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
          <div className="pointer-events-auto mt-12 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-t pt-5">
            <MonoLabel className="block max-w-xl leading-relaxed text-muted-foreground/70">
              {isPnrrPage ? (
                <Trans>
                  Date PNRR: Ministerul Investițiilor și Proiectelor Europene ·{' '}
                  <a
                    href="https://mfe.gov.ro/pnrr-dashboard"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    mfe.gov.ro/pnrr-dashboard
                  </a>
                </Trans>
              ) : (
                <Trans>
                  Date din surse oficiale · Transparență bugetară, ANAF / Ministerul Finanțelor ·{' '}
                  <a
                    href="https://mfinante.gov.ro/transparenta-bugetara"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    mfinante.gov.ro
                  </a>
                </Trans>
              )}
            </MonoLabel>
            <MonoLabel className="text-muted-foreground/70">
              © {new Date().getFullYear()} Transparenta.eu
            </MonoLabel>
          </div>
        </div>
      </RuledFrame>
    </footer>
  )
}
