import type { ReactNode } from 'react'

/**
 * The global stylesheet as a React style resource, in the place of its link.
 *
 * A resource (`href` + `precedence`), like TanStack's own stylesheet link, is
 * never removed once in the document: when the browser renders the document
 * again rather than hydrating it (a failed root's page, ERR-002), the page keeps
 * its styles. An ordinary `<style>` would go with the server's markup.
 * `precedence="default"` is the group TanStack gives its stylesheet
 * links. React writes a group's links before its inline styles, so this keeps
 * the linked page's order only because it replaces the group's one global
 * link; other sheets (MapLibre's) are added by Vite after it, as before.
 */
export function InlineStylesheet({ href, css }: { readonly href: string; readonly css: string }): ReactNode {
  return (
    <style href={href} precedence="default">
      {css}
    </style>
  )
}
