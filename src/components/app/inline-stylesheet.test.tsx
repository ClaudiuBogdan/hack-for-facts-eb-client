import type { RouterManagedTag } from '@tanstack/react-router'
import { act, type ReactNode } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { isStylesheetLink, readInlinedStylesheet } from './inline-stylesheet'
import { InlineStylesheet } from './inline-stylesheet-resource'

const HREF = '/assets/index-abc.css'
const CSS = 'a>b{color:red}.md\\:p-6{content:"&</"}'

describe('isStylesheetLink', () => {
  it('matches the stylesheet link with that address', () => {
    expect(isStylesheetLink({ tag: 'link', attrs: { rel: 'stylesheet', href: HREF } }, HREF)).toBe(true)
  })

  it('leaves other stylesheets, preloads and tags alone', () => {
    const others: RouterManagedTag[] = [
      { tag: 'link', attrs: { rel: 'stylesheet', href: '/assets/maplibre-gl-1.css' } },
      { tag: 'link', attrs: { rel: 'preload', as: 'style', href: HREF } },
      { tag: 'link', attrs: { rel: 'modulepreload', href: '/assets/index-a.js' } },
      { tag: 'meta', attrs: { charSet: 'utf-8' } },
    ]
    for (const tag of others) expect(isStylesheetLink(tag, HREF)).toBe(false)
  })
})

describe('InlineStylesheet', () => {
  // The root route's shape: the shell renders the document, and the root's error component replaces it.
  function Document({ shell, sheet }: { readonly shell: boolean; readonly sheet: ReactNode }) {
    return (
      <html lang="ro">
        <head>
          <meta charSet="utf-8" />
          {shell ? sheet : null}
        </head>
        <body>{shell ? <main>page</main> : <main>error</main>}</body>
      </html>
    )
  }

  let root: Root | null = null
  afterEach(() => {
    act(() => root?.unmount())
    root = null
  })

  async function hydrateThenReplaceShell(sheet: ReactNode) {
    const html = renderToString(<Document shell sheet={sheet} />)
    document.documentElement.innerHTML = html.replace(/^<html[^>]*>|<\/html>$/g, '')
    const serverText = readInlinedStylesheet(HREF)
    const errors: unknown[] = []
    await act(async () => {
      root = hydrateRoot(document, <Document shell sheet={sheet} />, { onRecoverableError: (error) => errors.push(error) })
    })
    const hydratedText = readInlinedStylesheet(HREF)
    await act(async () => root?.render(<Document shell={false} sheet={sheet} />))
    return { serverText, hydratedText, errors, afterError: document.head.querySelectorAll('style').length }
  }

  it('renders the sheet as written, hydrates it, and keeps it when the shell is replaced', async () => {
    const result = await hydrateThenReplaceShell(<InlineStylesheet href={HREF} css={CSS} />)

    expect(result.serverText).toBe(CSS)
    expect(result.hydratedText).toBe(CSS)
    expect(result.errors).toEqual([])
    expect(result.afterError).toBe(1)
    expect(readInlinedStylesheet(HREF)).toBe(CSS)
  })

  it('(control) an ordinary style would leave with the shell', async () => {
    const result = await hydrateThenReplaceShell(<style data-href={HREF}>{CSS}</style>)

    expect(result.hydratedText).toBe(CSS)
    expect(result.afterError).toBe(0)
  })
})

describe('readInlinedStylesheet', () => {
  it('finds the sheet in a tag React joined with other resources, and nothing for another address', () => {
    const head = document.createElement('head')
    head.innerHTML = `<style data-precedence="default" data-href="/a.css ${HREF}">x{}</style>`
    expect(readInlinedStylesheet(HREF, head)).toBe('x{}')
    expect(readInlinedStylesheet('/other.css', head)).toBeNull()
  })
})
