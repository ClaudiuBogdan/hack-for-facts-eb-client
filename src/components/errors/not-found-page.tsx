import { Link, useLocation } from '@tanstack/react-router'
import { ArrowLeft, Home } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { AskedPath, ErrorScene, SCENE_BUTTON, SCENE_PICTURE } from './error-scene'
import { PageCharacter } from './page-character'

/** The site's main doors, for a reader whose address led nowhere. */
const SHORTCUTS = [
  { to: '/national-budget', label: () => t`Bugetul național` },
  { to: '/achizitii', label: () => t`Achiziții publice` },
  { to: '/companies', label: () => t`Companii` },
  { to: '/legislation', label: () => t`Legislație` },
  { to: '/map', label: () => t`Harta` },
] as const

const SHORTCUT_LINK = 'inline-flex min-h-11 items-center text-sm font-medium text-foreground transition-colors hover:text-primary @2xl:min-h-0'

/**
 * The page for an address that leads nowhere: the page character searching
 * with a magnifier, the address it was asked for, home and back, then one
 * quiet row of the site's main sections.
 */
export function NotFoundPage() {
  const { pathname } = useLocation()
  return (
    <ErrorScene
      caption="404"
      title={t`Fila asta lipsește din dosar`}
      lede={
        <Trans>
          Adresa <AskedPath path={pathname} /> nu duce la nicio pagină. Poate s-a mutat, sau adresa are o greșeală.
        </Trans>
      }
      picture={<PageCharacter mood="search" label={t`O filă desenată în pixeli care caută cu o lupă`} className={SCENE_PICTURE} />}
      actions={
        <>
          <Button asChild size="lg" className={SCENE_BUTTON}>
            <Link to="/">
              <Home aria-hidden="true" />
              {t`Mergi la prima pagină`}
            </Link>
          </Button>
          <Button variant="outline" size="lg" className={SCENE_BUTTON} onClick={() => window.history.back()}>
            <ArrowLeft aria-hidden="true" />
            {t`Înapoi`}
          </Button>
        </>
      }
    >
      <nav aria-label={t`Secțiunile site-ului`} className="mt-10">
        <span className="block text-sm text-muted-foreground">{t`Sau mergi direct la`}</span>
        <div className="mt-1 flex flex-wrap gap-x-5 @2xl:mt-2">
          {SHORTCUTS.map((shortcut) => (
            <Link key={shortcut.to} to={shortcut.to} className={SHORTCUT_LINK}>
              {shortcut.label()}
            </Link>
          ))}
        </div>
      </nav>
    </ErrorScene>
  )
}
