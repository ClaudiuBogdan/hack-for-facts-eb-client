import { useEffect, useMemo, useRef, useState } from 'react'
import { Home, RefreshCcw } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { env } from '@/config/env'
import { attemptChunkRecovery } from '@/lib/chunk-recovery'
import { classifyError, getTechnicalMessage, isUpdateAvailableError, messages } from '@/lib/errors-utils'
import { initSentry, withSentry } from '@/lib/sentry'
import { ErrorScene, SCENE_BUTTON, SCENE_PICTURE } from './error-scene'
import { PageCharacter } from './page-character'

type GlobalErrorPageProps = {
  readonly error: unknown
}

type UnknownError = {
  [key: string]: unknown
}

function isErrorLike(value: unknown): value is { message?: string; stack?: string; cause?: unknown; error?: unknown } {
  if (!value || typeof value !== 'object') return false
  const typed = value as UnknownError
  return typeof typed.name === 'string' || typeof typed.message === 'string' || typeof typed.stack === 'string'
}

function getRootError(error: unknown, seen = new Set<unknown>()): Error | unknown {
  if (!error || seen.has(error)) return error
  if (error instanceof Error) return error
  if (isErrorLike(error)) {
    const candidate = error as UnknownError
    seen.add(error)
    for (const next of [candidate.cause, candidate.error]) {
      const nested = getRootError(next, seen)
      if (nested) return nested
    }
  }
  return error
}

// Hard navigations: a page that failed on a stale chunk needs the new deploy's HTML and assets, not a router transition.
const hardReloadPage = () => window.location.reload()
const navigateHomeAndReload = () => window.location.assign('/')

/** How long the torn page takes to rejoin before the reload: the transition's four steps. */
const MEND_MS = 320

/**
 * The page for a render that failed, and for a new deploy found mid-read.
 *
 * The page character, torn in two: it rejoins while reload is hovered or
 * focused, and a click rejoins it, then reloads. A new deploy shows it fresh,
 * waving. No technical details: the error goes to Sentry (when the reader
 * allows it), and the reader gets what to do next. A stale chunk first tries
 * the automatic recovery, behind a plain spinner, so this page never flashes
 * before the reload.
 */
export function GlobalErrorPage({ error }: GlobalErrorPageProps) {
  const classifiedError = useMemo(() => classifyError(error), [error])
  const technicalMessage = useMemo(() => getTechnicalMessage(error), [error])
  const isUpdateError = useMemo(() => isUpdateAvailableError(error), [error])
  const [isRecovering, setIsRecovering] = useState(false)
  const errorFingerprint = useMemo(() => {
    if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack }
    return { name: typeof error, message: typeof error === 'string' ? error : 'Unknown error', stack: null }
  }, [error])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      initSentry(undefined)
      const rootError = getRootError(error)
      withSentry((Sentry) =>
        Sentry.withScope((scope) => {
          scope.setLevel('error')
          scope.setTag('source', 'global-error-page')
          scope.setTag('error_name', errorFingerprint.name)
          scope.setContext('global_error', {
            technicalMessage,
            classifiedTitle: classifiedError.title.id,
            classifiedMessage: classifiedError.friendlyMessage.id,
            route: window.location.pathname,
            query: window.location.search,
            wrappedErrorClass: typeof error,
            rootErrorMessage: rootError instanceof Error ? rootError.message : typeof rootError,
            rootErrorName: rootError instanceof Error ? rootError.name : 'Object',
          })
          Sentry.captureException(rootError)
        }),
      )
    } catch {
      // Keep rendering unaffected if Sentry is unavailable.
    }
    if (env.NODE_ENV === 'development') console.error('A global error was caught:', error)
  }, [classifiedError.friendlyMessage.id, classifiedError.title.id, error, errorFingerprint, technicalMessage])

  useEffect(() => {
    if (!isUpdateError) return
    setIsRecovering(attemptChunkRecovery(error))
  }, [error, isUpdateError])

  if (isUpdateError && isRecovering) {
    return (
      <div className="flex min-h-[70svh] w-full items-center justify-center bg-background p-6">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const kind: ErrorKind = isUpdateError ? 'update' : classifiedError.friendlyMessage === messages.invalidUrlIssue ? 'address' : 'broken'
  return <ErrorPageView kind={kind} />
}

/** What the reader is told: the page broke, its address can't be read, or a new deploy came out. */
export type ErrorKind = 'broken' | 'address' | 'update'

/**
 * The error page as the reader sees it, apart from the error's handling
 * (Sentry, chunk recovery), so it can be shown on its own.
 */
export function ErrorPageView({ kind }: { readonly kind: ErrorKind }) {
  const [mended, setMended] = useState(false)
  const reloading = useRef(false)
  const update = kind === 'update'

  const reload = () => {
    if (reloading.current) return
    reloading.current = true
    setMended(true)
    const still = update || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(hardReloadPage, still ? 0 : MEND_MS)
  }
  // Pointing at reload mends the page; leaving lets it fall apart again, unless the reload is under way.
  const mendWhilePointed = {
    onPointerEnter: () => setMended(true),
    onPointerLeave: () => setMended(reloading.current),
    onFocus: () => setMended(true),
    onBlur: () => setMended(reloading.current),
  }

  const lede =
    kind === 'update'
      ? t`Am publicat o versiune nouă a site-ului cât timp citeai. Reîncarcă pagina ca s-o primești.`
      : kind === 'address'
        ? t`Adresa are un parametru pe care nu-l putem citi. Deschide pagina dintr-un link bun, sau pornește de la prima pagină.`
        : t`Nu s-a putut afișa. De obicei o reîncărcare o lipește la loc; dacă nu, pornește de la prima pagină.`

  return (
    <ErrorScene
      alert
      title={update ? t`A ieșit o ediție nouă` : t`Pagina s-a rupt`}
      lede={lede}
      picture={
        update ? (
          <PageCharacter mood="fresh" label={t`O filă desenată în pixeli, proaspăt scrisă, care face cu mâna`} className={SCENE_PICTURE} />
        ) : (
          <PageCharacter mood="torn" mended={mended} label={t`O filă desenată în pixeli, ruptă în două, care strânge ochii`} className={SCENE_PICTURE} />
        )
      }
      actions={
        <>
          <Button size="lg" className={SCENE_BUTTON} onClick={reload} {...mendWhilePointed}>
            <RefreshCcw aria-hidden="true" />
            {t`Reîncarcă pagina`}
          </Button>
          <Button variant="outline" size="lg" className={SCENE_BUTTON} onClick={navigateHomeAndReload}>
            <Home aria-hidden="true" />
            {t`Mergi la prima pagină`}
          </Button>
        </>
      }
    />
  )
}

export default GlobalErrorPage
