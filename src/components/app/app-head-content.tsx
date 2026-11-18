import { useState } from 'react'
import { Asset, HeadContent, useLocation, useRouter, useTags } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import appCssHref from '@/index.css?url'
import appCssText from '@/index.css?inline'
import { getDeferredRootPreloads, withoutDeferredPreloads } from './head-preloads'
import { INLINE_STYLESHEET_PATHNAME, isStylesheetLink, readInlinedStylesheet } from './inline-stylesheet'
import { InlineStylesheet } from './inline-stylesheet-resource'

// The global stylesheet as text, for the landing's document. Only the server
// holds the string (`scripts/validate-build-output.mjs` checks it never reaches
// the browser's JavaScript, and that it equals the linked file); the browser
// reads back the `<style>` the server rendered.
const inlinedStylesheet = createIsomorphicFn()
  .server(() => appCssText)
  .client(() => readInlinedStylesheet(appCssHref))

/**
 * TanStack's `HeadContent`, without the root route's chunk preloads (see
 * `getDeferredRootPreloads`). The same tags render on the server and in the
 * browser, so hydration matches; a child route's own preloads stay.
 *
 * A document that starts on the landing carries the global stylesheet inline
 * instead of linking it: the heading, the largest paint, is in the server
 * HTML and waits only for the stylesheet, so a cold visit paints without a
 * second request. The choice is made once per document and kept through
 * client navigation, so the full stylesheet stays in the head whichever
 * route the reader moves to, and through the root's error page (see
 * `InlineStylesheet`). Every other document links the cacheable file.
 * See docs/performance/2026-11-17-landing/inline-landing-css.md.
 */
function BuildHeadContent() {
  const router = useRouter()
  const tags = useTags()
  const nonce = router.options.ssr?.nonce
  const startsOnLanding = useLocation({ select: (location) => location.pathname === INLINE_STYLESHEET_PATHNAME })
  // React gives a style resource no nonce unless the renderer gets a style nonce (TanStack passes one for
  // scripts only), so under a nonce-based CSP the landing keeps the link. No nonce is configured today.
  const [inlineCss] = useState(() => (startsOnLanding && !nonce ? inlinedStylesheet() : null))
  const deferred = getDeferredRootPreloads(router.ssr?.manifest)
  return (
    <>
      {withoutDeferredPreloads({ tags, deferred }).map((tag) => {
        if (inlineCss != null && isStylesheetLink(tag, appCssHref)) {
          return <InlineStylesheet key="inline-stylesheet" href={appCssHref} css={inlineCss} />
        }
        return <Asset {...tag} key={`tsr-meta-${JSON.stringify(tag)}`} nonce={nonce} />
      })}
    </>
  )
}

/**
 * The root's head. Under `vite dev` the manifest lists only the dev client
 * entry, and TanStack's development `HeadContent` also removes its SSR dev
 * styles once hydrated, so dev keeps it as is.
 */
export const AppHeadContent = import.meta.env.DEV ? HeadContent : BuildHeadContent
