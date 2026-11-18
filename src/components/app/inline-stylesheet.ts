import type { RouterManagedTag } from '@tanstack/react-router'

/** The only page whose document inlines the global stylesheet: the landing, the most common cold entry. */
export const INLINE_STYLESHEET_PATHNAME = '/'

/** Whether a head tag is the link to the stylesheet at `href`. */
export function isStylesheetLink(tag: RouterManagedTag, href: string): boolean {
  return tag.tag === 'link' && tag.attrs?.rel === 'stylesheet' && tag.attrs.href === href
}

/**
 * The text of the inlined stylesheet the server rendered for `href`, or null.
 * React renders a style resource as `<style data-href="…" data-precedence="…">`;
 * on the server it may join several resources of one precedence into one tag,
 * whose `data-href` then lists them all.
 */
export function readInlinedStylesheet(href: string, root: ParentNode = document.head): string | null {
  for (const style of root.querySelectorAll<HTMLStyleElement>('style[data-href]')) {
    if ((style.getAttribute('data-href') ?? '').split(' ').includes(href)) return style.textContent
  }
  return null
}
