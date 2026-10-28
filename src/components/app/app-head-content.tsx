import { Asset, HeadContent, useRouter, useTags } from '@tanstack/react-router'
import { getDeferredRootPreloads, withoutDeferredPreloads } from './head-preloads'

/**
 * TanStack's `HeadContent`, without the root route's chunk preloads (see
 * `getDeferredRootPreloads`). The same tags render on the server and in the
 * browser, so hydration matches; a child route's own preloads stay.
 */
function BuildHeadContent() {
  const router = useRouter()
  const tags = useTags()
  const nonce = router.options.ssr?.nonce
  const deferred = getDeferredRootPreloads(router.ssr?.manifest)
  return (
    <>
      {withoutDeferredPreloads({ tags, deferred }).map((tag) => (
        <Asset {...tag} key={`tsr-meta-${JSON.stringify(tag)}`} nonce={nonce} />
      ))}
    </>
  )
}

/**
 * The root's head. Under `vite dev` the manifest lists only the dev client
 * entry, and TanStack's development `HeadContent` also removes its SSR dev
 * styles once hydrated, so dev keeps it as is.
 */
export const AppHeadContent = import.meta.env.DEV ? HeadContent : BuildHeadContent
