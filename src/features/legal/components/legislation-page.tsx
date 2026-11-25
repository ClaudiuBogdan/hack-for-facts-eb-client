import { LegislationHub } from './hub/legislation-hub'

/**
 * `/legislation`: the legislation hub (design: `docs/design/legal/main-page.md`). The module's front door:
 * find an act, see the corpus in a few figures and bands, and go on to the dedicated pages.
 */
export function LegislationPage({
  analyticsUnavailable = false,
}: {
  /** The server's analytics read was refused with 503: the figures band says so until a read succeeds. */
  readonly analyticsUnavailable?: boolean
}) {
  return <LegislationHub analyticsUnavailable={analyticsUnavailable} />
}
