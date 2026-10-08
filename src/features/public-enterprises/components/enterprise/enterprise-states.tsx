import { Link, useParams } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { neutralEnterpriseTitle } from '../../lib/enterprise-head'
import { parsePublicEnterpriseCuiParam } from '../../lib/enterprise-cui'
import { Kicker, OutLink } from './enterprise-links'

/**
 * The enterprise route's own states: a CUI no list holds, a read that
 * failed. Each keeps the page's frame and its way back. Light enough for the
 * route's eager file, which registers the not-found page: a path its params
 * reject fails before the lazy file loads, and must still land here.
 */

/** The route's `notFound()` — a CUI no list holds, or a path that is not a CUI — in the page's own frame. */
export function PublicEnterpriseRouteNotFound() {
  const { cui } = useParams({ strict: false }) as { readonly cui?: string }
  const parsed = cui ? parsePublicEnterpriseCuiParam(cui) : null
  useClientDocumentTitle(parsed ? neutralEnterpriseTitle(parsed) : null)
  return <PublicEnterpriseNotFound cui={parsed} />
}

/** A CUI no list of public enterprises holds: said, with its company page and the way back. */
export function PublicEnterpriseNotFound({ cui }: { readonly cui: string | null }) {
  return (
    <section className="border-b">
      <RuledFrame className="py-14 sm:py-20">
        <Kicker place={null} />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t`Nu e o întreprindere publică`}</h1>
        <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
          {cui ? t`CUI-ul ${cui} nu e în nicio listă a întreprinderilor publice.` : t`Adresa nu numește un CUI.`}
        </p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          {cui ? (
            <OutLink page="company" cui={cui}>
              {t`Pagina firmei`}
            </OutLink>
          ) : null}
          <Link to="/public-enterprises" className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0">
            {t`Toate întreprinderile publice`}
          </Link>
        </div>
      </RuledFrame>
    </section>
  )
}

/** The enterprise's read failed: said, with a retry; never a blank page or a „not found". */
export function PublicEnterpriseLoadError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <section className="border-b">
      <RuledFrame className="py-14 sm:py-20">
        <Kicker place={null} />
        <MonoLabel className="mt-6 block text-muted-foreground">{t`Întreprindere publică`}</MonoLabel>
        <div className="mt-3">
          <HubLoadError onRetry={onRetry} />
        </div>
      </RuledFrame>
    </section>
  )
}
