import { act, StrictMode, type ReactNode } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { QueryClientProvider } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, render, screen, waitFor } from '@/test/test-utils'
import type { EntitySearchHit } from '@/schemas/entity-search'

/**
 * The plain field and its hand-over to the combobox, rendered against the real
 * combobox and hook with only the router and the API replaced. The module is
 * imported afresh for each test: whether the combobox has loaded is the
 * document's state, and each test starts before it has. Its arrival is held
 * at a gate each test opens, so the hand-over lands where the test says — a
 * test runner's click spans tasks a browser's does not.
 */

const gate = vi.hoisted(() => {
  const state = { calls: 0, open: () => {}, fail: () => {}, promise: Promise.resolve(), freshPage: true, reloads: 0 }
  const reset = () => {
    state.calls = 0
    state.reloads = 0
    state.freshPage = true
    state.promise = new Promise<void>((resolve, reject) => {
      state.open = resolve
      state.fail = () => reject(new Error('Failed to fetch dynamically imported module'))
    })
    // A failure nobody waits for is not this test's error.
    state.promise.catch(() => undefined)
  }
  reset()
  return { state, reset }
})
vi.mock('@/lib/chunk-recovery', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/chunk-recovery')>()),
  quietImport: <T,>(load: () => Promise<T>) => {
    gate.state.calls += 1
    return gate.state.promise.then(load)
  },
  reloadForFreshCode: () => {
    gate.state.reloads += 1
    return gate.state.freshPage
  },
}))

const navigate = vi.fn()
const searchEntities = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => navigate,
  useSearch: () => ({}),
}))
vi.mock('@/features/entity-search/api/entity-search-api.live', () => ({
  searchEntitiesLive: (...args: readonly unknown[]) => searchEntities(...args),
}))
vi.mock('@/lib/analytics', () => ({
  Analytics: { EVENTS: { EntitySearchPerformed: 'performed', EntitySearchSelected: 'selected' }, capture: vi.fn() },
}))

const IASI: EntitySearchHit = {
  id: 'organization:4541580', title: 'Municipiul Iași', docType: 'organization',
  href: '/entities/4541580', isExternal: false, identifiers: ['4541580'],
  countyName: 'Iași', subtitle: null, snippet: null, roles: ['organization'],
  isActive: true, docId: null, docKey: '4541580', url: null, score: null,
}
const response = (hits: readonly EntitySearchHit[]) => ({
  hits, degraded: false,
  generation: { generationId: 'entities_build_1759593600000_k3x9q2', registryScopeKey: 'onrc:published:41:3:7' },
  companyScope: 'onrc:published:41:3:7', companyContribution: 'CURRENT', companyContributionReason: null,
  continuation: { candidatesReturned: hits.length, nextOffset: null },
})

const SCOPE = { label: 'Firme', Icon: Building2 }

function viewport({ narrow }: { readonly narrow: boolean }) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: query.includes('max-width') ? narrow : false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
}

/** The combobox's input carries Base UI's id; the plain field's has none. */
const isCombobox = (element: HTMLElement) => element.id.startsWith('base-ui')
const field = () => screen.getByRole<HTMLInputElement>('combobox')
const group = () => screen.getByRole('group', { name: 'Căutare' })
async function handedOver(timeout = 1000) {
  await waitFor(() => expect(isCombobox(field())).toBe(true), { timeout })
  return field()
}
/** Lets the combobox in. */
const arrive = () => gate.state.open()

async function load() {
  vi.resetModules()
  return import('./deferred-landing-search')
}

beforeEach(() => {
  gate.reset()
  navigate.mockReset()
  searchEntities.mockReset()
  searchEntities.mockResolvedValue(response([IASI]))
  viewport({ narrow: true })
})

describe('DeferredLandingSearch', () => {
  it('server-renders the combobox’s field at rest, without its code', async () => {
    const { DeferredLandingSearch } = await load()
    const { LandingSearch } = await import('./landing-search')
    const plain = renderToString(<DeferredLandingSearch className="hero" fixedScope={SCOPE} placeholder="Nume sau CUI..." autoFocus />)
    const real = renderToString(
      <QueryClientProvider client={createTestQueryClient()}>
        <LandingSearch className="hero" fixedScope={SCOPE} placeholder="Nume sau CUI..." autoFocus />
      </QueryClientProvider>,
    )
    // The same box, pill, input and hint, attribute for attribute, less what is Base UI's own:
    // its ids, its list state and the hidden form input it puts beside the field.
    const own = (html: string) =>
      html
        .replace(/<input id="[^"]*-hidden-input"[^>]*>/, '')
        .replace(/ id="[^"]*"/g, '')
        .replace(/ data-list-empty=""/g, '')
    expect(own(plain)).toBe(own(real))
    expect(plain).toContain('role="combobox"')
    expect(plain).not.toMatch(/autofocus/i)
    expect(plain).not.toContain('base-ui')
  })

  it('fetches the combobox when the field is focused, and hands it the text and the caret', async () => {
    const { DeferredLandingSearch } = await load()
    const user = userEvent.setup()
    render(<DeferredLandingSearch fixedScope={SCOPE} />, { queryClient: createTestQueryClient() })
    expect(isCombobox(field())).toBe(false)
    expect(gate.state.calls).toBe(0)

    await user.click(field())
    expect(gate.state.calls).toBe(1)
    await user.type(field(), 'Iaș')
    expect(isCombobox(field())).toBe(false)
    arrive()
    const input = await handedOver()
    expect(input).toHaveValue('Iaș')
    expect(input).toHaveFocus()
    expect(input.selectionStart).toBe(3)
    // Typing goes on in the combobox, which searches what both fields were given.
    await user.type(input, 'i')
    expect(input).toHaveValue('Iași')
    await waitFor(() => expect(searchEntities).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'Iași' }), expect.any(AbortSignal)))
    await waitFor(() => expect(screen.getAllByRole('option').map((row) => row.getAttribute('href'))).toEqual(['/entities/4541580']))
  })

  it('loses no character typed while the combobox arrives', async () => {
    const { DeferredLandingSearch } = await load()
    const user = userEvent.setup()
    render(<DeferredLandingSearch />, { queryClient: createTestQueryClient() })
    await user.click(field())
    await user.keyboard('Municipiul ')
    // The combobox lands while the reader is still typing.
    arrive()
    await user.keyboard('Iasi')
    const input = await handedOver()
    expect(input).toHaveValue('Municipiul Iasi')
    expect(input).toHaveFocus()
  })

  it('keeps what was typed into the server’s field before the page hydrated, through the hand-over', async () => {
    const { DeferredLandingSearch } = await load()
    const queryClient = createTestQueryClient()
    const container = document.createElement('div')
    container.innerHTML = renderToString(<DeferredLandingSearch fixedScope={SCOPE} />)
    document.body.appendChild(container)
    // The reader types into the server's markup while the page's code is still on its way.
    const serverInput = container.querySelector('input')!
    serverInput.focus()
    serverInput.value = 'Iași'
    serverInput.setSelectionRange(2, 2)

    let root: Root | undefined
    await act(async () => {
      root = hydrateRoot(
        container,
        <QueryClientProvider client={queryClient}>
          <DeferredLandingSearch fixedScope={SCOPE} />
        </QueryClientProvider>,
      )
    })
    try {
      // The same node, its text now the field's own: the clear button stands where the shortcut hint was.
      expect(field()).toBe(serverInput)
      expect(serverInput).toHaveValue('Iași')
      expect(screen.getByRole('button', { name: 'Șterge căutarea' })).toBeInTheDocument()
      expect(serverInput.selectionStart).toBe(2)

      arrive()
      const input = await handedOver()
      expect(input).toHaveValue('Iași')
      expect(input).toHaveFocus()
      expect(input.selectionStart).toBe(2)
    } finally {
      act(() => root?.unmount())
      container.remove()
    }
  })

  it('keeps the keyboard ring only for keyboard focus, across the hand-over', async () => {
    const { DeferredLandingSearch } = await load()
    const user = userEvent.setup()
    render(
      <>
        <button type="button">before</button>
        <DeferredLandingSearch />
      </>,
      { queryClient: createTestQueryClient() },
    )
    await user.click(screen.getByRole('button', { name: 'before' }))
    await user.tab()
    expect(field()).toHaveFocus()
    expect(group().className).toContain('outline-ring')
    arrive()
    await handedOver()
    expect(field()).toHaveFocus()
    expect(group().className).toContain('outline-ring')
  })

  it('hands the focus on the clear button to the combobox’s clear button', async () => {
    const { DeferredLandingSearch } = await load()
    const user = userEvent.setup()
    render(<DeferredLandingSearch />, { queryClient: createTestQueryClient() })
    await user.click(field())
    await user.keyboard('Iasi')
    await user.tab()
    expect(screen.getByRole('button', { name: /[Șș]terge/u })).toHaveFocus()
    arrive()
    await handedOver()
    const clear = screen.getByRole('button', { name: /[Șș]terge/u })
    expect(clear).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(field()).toHaveValue('')
  })

  it('says so when the combobox cannot load, once the reader uses the field, and asks for a fresh page to try again', async () => {
    const { DeferredLandingSearch } = await load()
    const user = userEvent.setup()
    render(<DeferredLandingSearch />, { queryClient: createTestQueryClient() })
    await user.click(field())
    gate.state.fail()
    await new Promise((resolve) => setTimeout(resolve, 0))
    // Nothing is said for a background fetch alone, and the page is not reloaded.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(gate.state.reloads).toBe(0)
    await user.keyboard('Iasi')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Căutarea nu a răspuns.')
    // The failure is kept: focusing again does not ask for the same code.
    const calls = gate.state.calls
    await user.click(field())
    expect(gate.state.calls).toBe(calls)
    await user.click(screen.getByRole('button', { name: 'Încearcă din nou' }))
    expect(gate.state.reloads).toBe(1)
  })

  it('asks for the combobox again in place where no fresh page can be had (offline)', async () => {
    const { DeferredLandingSearch } = await load()
    const user = userEvent.setup()
    render(<DeferredLandingSearch />, { queryClient: createTestQueryClient() })
    await user.click(field())
    gate.state.fail()
    await user.keyboard('Iasi')
    await screen.findByRole('alert')
    // Offline: the retry fetches again, and this time the code comes.
    gate.state.freshPage = false
    const failed = gate.state.calls
    gate.reset()
    gate.state.freshPage = false
    arrive()
    await user.click(screen.getByRole('button', { name: 'Încearcă din nou' }))
    expect(gate.state.calls).toBeGreaterThan(0)
    expect(failed).toBeGreaterThan(0)
    const input = await handedOver()
    expect(input).toHaveValue('Iasi')
  })

  it('draws no ring for a pointer’s focus, before or after the hand-over', async () => {
    const { DeferredLandingSearch } = await load()
    const user = userEvent.setup()
    render(<DeferredLandingSearch />, { queryClient: createTestQueryClient() })
    await user.click(field())
    expect(group().className).not.toContain('outline-ring')
    arrive()
    await handedOver()
    expect(field()).toHaveFocus()
    expect(group().className).not.toContain('outline-ring')
  })

  it('takes the focus on a wide viewport once, and the combobox does not take it again', async () => {
    viewport({ narrow: false })
    const { DeferredLandingSearch } = await load()
    const user = userEvent.setup()
    render(
      <>
        <DeferredLandingSearch autoFocus />
        <button type="button">elsewhere</button>
      </>,
      { queryClient: createTestQueryClient() },
    )
    expect(field()).toHaveFocus()
    expect(group().className).not.toContain('outline-ring')
    // The reader moves on before the combobox arrives; its mount must not pull them back.
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    arrive()
    await handedOver()
    expect(screen.getByRole('button', { name: 'elsewhere' })).toHaveFocus()
  })

  it('leaves a narrow viewport unfocused, and fetches the combobox when the page is idle', async () => {
    const { DeferredLandingSearch } = await load()
    render(<DeferredLandingSearch autoFocus />, { queryClient: createTestQueryClient() })
    expect(field()).not.toHaveFocus()
    expect(gate.state.calls).toBe(0)
    arrive()
    // jsdom has no idle callback: the fallback delay brings it.
    await handedOver(3000)
    expect(field()).not.toHaveFocus()
  })

  it('waits for a composition to end before handing over', async () => {
    const { DeferredLandingSearch } = await load()
    render(<DeferredLandingSearch />, { queryClient: createTestQueryClient() })
    const input = field()
    fireEvent.compositionStart(input)
    fireEvent.focus(input)
    arrive()
    // The combobox is in, but the field is mid-word: it stays.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(isCombobox(field())).toBe(false)
    fireEvent.change(input, { target: { value: 'ș' } })
    fireEvent.compositionEnd(input)
    const combobox = await handedOver()
    expect(combobox).toHaveValue('ș')
  })

  it('empties the plain field on Escape, as the combobox’s second Escape does', async () => {
    const { DeferredLandingSearch } = await load()
    render(<DeferredLandingSearch />, { queryClient: createTestQueryClient() })
    const input = field()
    fireEvent.change(input, { target: { value: 'Iasi' } })
    expect(input).toHaveValue('Iasi')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input).toHaveValue('')
  })

  it('focuses the plain field on mod+K, as the combobox does', async () => {
    const { DeferredLandingSearch } = await load()
    render(<DeferredLandingSearch />, { queryClient: createTestQueryClient() })
    fireEvent.keyDown(document.body, { key: 'k', code: 'KeyK', ctrlKey: true })
    expect(field()).toHaveFocus()
  })

  it('draws the combobox at once where it has loaded already', async () => {
    const { DeferredLandingSearch } = await load()
    const user = userEvent.setup()
    const first = render(<DeferredLandingSearch />, { queryClient: createTestQueryClient() })
    arrive()
    await user.click(field())
    await handedOver()
    first.unmount()
    render(<DeferredLandingSearch />, { queryClient: createTestQueryClient() })
    expect(isCombobox(field())).toBe(true)
  })
})

describe('DeferredLandingSearch with a starting term (the landing’s /?q=)', () => {
  /** Server HTML for a field, put in the document as a page would get it. */
  function serve(element: ReactNode) {
    const container = document.createElement('div')
    container.innerHTML = renderToString(element)
    document.body.appendChild(container)
    return container
  }

  it('server-renders the term in the field, with the clear button in place of the shortcut hint', async () => {
    const { DeferredLandingSearch } = await load()
    const html = renderToString(<DeferredLandingSearch initialTerm="Iași" />)
    expect(html).toContain('value="Iași"')
    expect(html).toContain('aria-label="Șterge căutarea"')
  })

  it('shows markup-like text literally and adds no element', async () => {
    const { DeferredLandingSearch } = await load()
    const text = '<img src=x onerror="alert(1)"> & "q"'
    const container = serve(<DeferredLandingSearch initialTerm={text} />)
    try {
      expect(container.querySelector('img')).toBeNull()
      expect(container.querySelector('input')).toHaveValue(text)
    } finally {
      container.remove()
    }
  })

  it.each([
    ['replaced it', 'Cluj', 1],
    ['deleted it all', '', 0],
  ])('hydrates the server’s node with no error, and keeps what the reader did before: %s', async (_case, typed, caret) => {
    const { DeferredLandingSearch } = await load()
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const element = <DeferredLandingSearch initialTerm="Iași" />
    const container = serve(element)
    const serverInput = container.querySelector('input')!
    serverInput.focus()
    serverInput.value = typed
    serverInput.setSelectionRange(caret, caret)
    let root: Root | undefined
    try {
      await act(async () => {
        root = hydrateRoot(container, <QueryClientProvider client={createTestQueryClient()}>{element}</QueryClientProvider>)
      })
      expect(field()).toBe(serverInput)
      expect(serverInput).toHaveValue(typed)
      expect(serverInput.selectionStart).toBe(caret)
      arrive()
      const input = await handedOver()
      expect(input).toHaveValue(typed)
      expect(input).toHaveFocus()
      expect(errors).not.toHaveBeenCalled()
    } finally {
      errors.mockRestore()
      act(() => root?.unmount())
      container.remove()
    }
  })

  it('leaves the clear button the reader focused before hydration focused, on a wide viewport, through the hand-over', async () => {
    viewport({ narrow: false })
    const { DeferredLandingSearch } = await load()
    const element = <DeferredLandingSearch autoFocus initialTerm="Iași" />
    const container = serve(element)
    const serverClear = container.querySelector<HTMLButtonElement>('button[aria-label="Șterge căutarea"]')!
    serverClear.focus()
    let root: Root | undefined
    try {
      await act(async () => {
        root = hydrateRoot(
          container,
          <StrictMode>
            <QueryClientProvider client={createTestQueryClient()}>{element}</QueryClientProvider>
          </StrictMode>,
        )
      })
      expect(serverClear).toHaveFocus()
      arrive()
      await handedOver()
      expect(screen.getByRole('button', { name: /[Șș]terge/u })).toHaveFocus()
    } finally {
      act(() => root?.unmount())
      container.remove()
    }
  })

  it('where the combobox has loaded already, takes no focus the reader has put elsewhere', async () => {
    viewport({ narrow: false })
    const { DeferredLandingSearch } = await load()
    const first = render(<DeferredLandingSearch />, { queryClient: createTestQueryClient() })
    arrive()
    await handedOver(3000)
    first.unmount()
    const elsewhere = document.createElement('button')
    document.body.appendChild(elsewhere)
    elsewhere.focus()
    try {
      render(<DeferredLandingSearch autoFocus initialTerm="Iași" />, { queryClient: createTestQueryClient() })
      expect(isCombobox(field())).toBe(true)
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(elsewhere).toHaveFocus()
    } finally {
      elsewhere.remove()
    }
  })

  it('holds the hand-over for a composition its field saw begin only through its input (begun before hydration)', async () => {
    const { DeferredLandingSearch } = await load()
    render(<DeferredLandingSearch initialTerm="Iași" />, { queryClient: createTestQueryClient() })
    const input = field()
    fireEvent.input(input, { target: { value: 'Iașiș' }, isComposing: true })
    arrive()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(isCombobox(field())).toBe(false)
    fireEvent.compositionEnd(input)
    const combobox = await handedOver()
    expect(combobox).toHaveValue('Iașiș')
  })

  it('fetches the combobox at once for a queryable term, and at idle for a short one', async () => {
    const { DeferredLandingSearch } = await load()
    const short = render(<DeferredLandingSearch initialTerm="Ia" />, { queryClient: createTestQueryClient() })
    expect(gate.state.calls).toBe(0)
    short.unmount()
    render(<DeferredLandingSearch initialTerm="Iași" />, { queryClient: createTestQueryClient() })
    expect(gate.state.calls).toBe(1)
  })

  it('on a wide viewport, focuses the term with the caret after it, and shows its results once the combobox is in', async () => {
    viewport({ narrow: false })
    const { DeferredLandingSearch } = await load()
    render(<DeferredLandingSearch autoFocus initialTerm="Iași" />, { queryClient: createTestQueryClient() })
    expect(field()).toHaveFocus()
    expect(field().selectionStart).toBe(4)
    expect(field().selectionEnd).toBe(4)
    arrive()
    const input = await handedOver()
    expect(input).toHaveFocus()
    expect(input.selectionStart).toBe(4)
    await waitFor(() => expect(searchEntities).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'Iași' }), expect.any(AbortSignal)))
    await waitFor(() => expect(screen.getAllByRole('option').map((row) => row.getAttribute('href'))).toEqual(['/entities/4541580']))
  })

  it('where the combobox has loaded already, it takes the term, the focus and the caret, and shows the results', async () => {
    viewport({ narrow: false })
    const { DeferredLandingSearch } = await load()
    const first = render(<DeferredLandingSearch />, { queryClient: createTestQueryClient() })
    arrive()
    await handedOver(3000)
    first.unmount()
    render(<DeferredLandingSearch autoFocus initialTerm="Iași" />, { queryClient: createTestQueryClient() })
    const input = field()
    expect(isCombobox(input)).toBe(true)
    expect(input).toHaveValue('Iași')
    await waitFor(() => expect(input).toHaveFocus())
    expect(input.selectionStart).toBe(4)
    await waitFor(() => expect(screen.getAllByRole('option').map((row) => row.getAttribute('href'))).toEqual(['/entities/4541580']))
  })

  it('on a phone, shows the term without taking focus, and opens the results on the first tap', async () => {
    const { DeferredLandingSearch } = await load()
    const user = userEvent.setup()
    render(<DeferredLandingSearch autoFocus initialTerm="Iași" />, { queryClient: createTestQueryClient() })
    expect(field()).not.toHaveFocus()
    expect(field()).toHaveValue('Iași')
    arrive()
    const input = await handedOver()
    expect(input).not.toHaveFocus()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    await user.click(input)
    await waitFor(() => expect(screen.getAllByRole('option').map((row) => row.getAttribute('href'))).toEqual(['/entities/4541580']))
  })
})
