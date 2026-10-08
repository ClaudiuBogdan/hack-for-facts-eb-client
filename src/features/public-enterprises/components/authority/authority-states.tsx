import { Link, useParams } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { neutralAuthorityTitle } from '../../lib/authority-portfolio-head'
import { parsePublicEnterpriseCuiParam } from '../../lib/enterprise-cui'
import { Kicker } from '../enterprise/enterprise-links'

/**
 * The portfolio route's own states: an authority the snapshot does not hold,
 * a read that failed. Each keeps the page's frame and its way back. Light
 * enough for the route's eager file, which registers the not-found page: a
 * path its params reject fails before the lazy file loads.
 */

const TEXT_LINK = 'inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'

/** No current enterprise's edge names this CUI (or the snapshot predates it): said, with the way back; no link a 404 might answer. */
export function AuthorityPortfolioNotFound({ cui }: { readonly cui: string | null }) {
  return (
    <section className="border-b">
      <RuledFrame className="py-14 sm:py-20">
        <Kicker place={null} />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t`Nicio întreprindere publică sub această autoritate`}</h1>
        <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
          {cui
            ? t`Nici lista ANAF, nici anunțurile de selecție AMEPIP nu pun vreo întreprindere publică sub CUI-ul ${cui}, în copia pe care o are pagina.`
            : t`Adresa nu numește un CUI.`}
        </p>
        <div className="mt-5">
          <Link to="/public-enterprises" className={TEXT_LINK}>
            {t`Toate întreprinderile publice`}
          </Link>
        </div>
      </RuledFrame>
    </section>
  )
}

/** The route's `notFound()` — an authority the snapshot does not hold, or a path that is not a CUI — in the page's own frame. */
export function AuthorityPortfolioRouteNotFound() {
  const { cui } = useParams({ strict: false }) as { readonly cui?: string }
  const parsed = cui ? parsePublicEnterpriseCuiParam(cui) : null
  useClientDocumentTitle(parsed ? neutralAuthorityTitle(parsed) : null)
  return <AuthorityPortfolioNotFound cui={parsed} />
}

/** The portfolio's read failed: said, with a retry; never a blank page or a „not found". */
export function AuthorityPortfolioLoadError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <section className="border-b">
      <RuledFrame className="py-14 sm:py-20">
        <Kicker place={null} />
        <MonoLabel className="mt-6 block text-muted-foreground">{t`Întreprinderile unei autorități`}</MonoLabel>
        <div className="mt-3">
          <HubLoadError onRetry={onRetry} />
        </div>
      </RuledFrame>
    </section>
  )
}
