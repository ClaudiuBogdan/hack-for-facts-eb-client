import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChallengeEntityAnalysisHeader } from './challenge-entity-analysis-header'

vi.mock('@/components/ui/ResponsivePopover', () => ({
  ResponsivePopover: ({
    trigger,
    content,
    open,
    onOpenChange,
  }: any) => (
    <div>
      <div onClick={() => onOpenChange?.(!open)}>{trigger}</div>
      {open ? <div data-testid="responsive-popover-content">{content}</div> : null}
    </div>
  ),
}))

vi.mock('@/features/notifications/components/EntityNotificationBell', () => ({
  EntityNotificationBell: ({ triggerClassName }: { readonly triggerClassName?: string }) => (
    <button
      type="button"
      aria-label="Manage notifications"
      data-testid="entity-notification-bell"
      className={triggerClassName}
    />
  ),
}))

const entity = {
  cui: '4305857',
  name: 'Primăria Sibiu',
  uat: {
    name: 'Sibiu',
    county_name: 'Județul Sibiu',
    population: 134309,
  },
}

function renderHeader(languageQuery?: 'ro' | 'en') {
  return render(
    <ChallengeEntityAnalysisHeader
      entity={entity}
      selectedYear={2025}
      activeView="main-info"
      availableViews={[
        { id: 'main-info', label: languageQuery === 'en' ? 'Main Info' : 'Informații Principale' },
        { id: 'contracts', label: languageQuery === 'en' ? 'Contracts' : 'Contracte' },
        { id: 'commitments', label: languageQuery === 'en' ? 'Commitments' : 'Angajamente' },
        { id: 'ins', label: 'INS' },
      ]}
      availableYears={[2025, 2024, 2023]}
      onYearChange={vi.fn()}
      onViewChange={vi.fn()}
      showInflationBadge
      languageQuery={languageQuery}
    />,
  )
}

function setScrollPosition(nextY: number) {
  Object.defineProperty(window, 'pageYOffset', {
    configurable: true,
    writable: true,
    value: nextY,
  })
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value: nextY,
  })
  Object.defineProperty(document.documentElement, 'scrollTop', {
    configurable: true,
    writable: true,
    value: nextY,
  })
  fireEvent.scroll(window)
}

describe('ChallengeEntityAnalysisHeader', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    })
    Object.defineProperty(window, 'pageYOffset', {
      configurable: true,
      writable: true,
      value: 0,
    })
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0,
    })
    Object.defineProperty(document.documentElement, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 0,
    })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      queueMicrotask(() => callback(0))
      return 1
    })
  })

  it('keeps the compact header hidden on initial render', () => {
    renderHeader()

    expect(
      screen.queryByTestId('challenge-entity-compact-header'),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('entity-notification-bell')).toBeInTheDocument()
  })

  it('keeps the compact header hidden below the show threshold', async () => {
    renderHeader()

    setScrollPosition(250)

    await waitFor(() =>
      expect(
        screen.queryByTestId('challenge-entity-compact-header'),
      ).not.toBeInTheDocument(),
    )
  })

  it('shows the compact header after scrolling down past the threshold', async () => {
    renderHeader()

    setScrollPosition(340)

    await waitFor(() => {
      expect(
        screen.getByTestId('challenge-entity-compact-header'),
      ).toBeInTheDocument()
    })

    const compactHeader = screen.getByTestId('challenge-entity-compact-header')
    await waitFor(() => {
      expect(compactHeader).toHaveAttribute('aria-hidden', 'false')
    })
    expect(
      within(compactHeader).getByRole('button', { name: 'Primăria Sibiu' }),
    ).toBeInTheDocument()
    expect(within(compactHeader).getByText('Județul Sibiu')).toBeInTheDocument()
    expect(within(compactHeader).getByText('134.309 locuitori')).toBeInTheDocument()
    expect(within(compactHeader).getAllByText('2025')).not.toHaveLength(0)
  })

  it('renders the notification bell in the hero header only', async () => {
    renderHeader()

    expect(screen.getByTestId('entity-notification-bell')).toBeInTheDocument()

    setScrollPosition(340)

    const compactHeader = await screen.findByTestId(
      'challenge-entity-compact-header',
    )
    await waitFor(() => {
      expect(compactHeader).toHaveAttribute('aria-hidden', 'false')
    })

    expect(within(compactHeader).queryByTestId('entity-notification-bell')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('entity-notification-bell')).toHaveLength(1)
  })

  it('hides the compact header again when scrolling up', async () => {
    renderHeader()

    setScrollPosition(360)
    await waitFor(() => {
      expect(
        screen.getByTestId('challenge-entity-compact-header'),
      ).toBeInTheDocument()
    })

    setScrollPosition(330)

    await waitFor(() => {
      expect(
        screen.getByTestId('challenge-entity-compact-header'),
      ).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('hides the compact header when returning near the top', async () => {
    renderHeader()

    setScrollPosition(360)
    await waitFor(() => {
      expect(
        screen.getByTestId('challenge-entity-compact-header'),
      ).toBeInTheDocument()
    })

    setScrollPosition(120)

    await waitFor(() => {
      expect(
        screen.getByTestId('challenge-entity-compact-header'),
      ).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('includes reduced-motion-safe transition classes', async () => {
    renderHeader()

    setScrollPosition(340)

    await waitFor(() => {
      expect(
        screen.getByTestId('challenge-entity-compact-header'),
      ).toBeInTheDocument()
    })

    expect(screen.getByTestId('challenge-entity-compact-header')).toHaveClass(
      'motion-reduce:translate-y-0',
      'motion-reduce:transition-opacity',
    )
  })

  it('scrolls to the top when the compact header name is clicked', async () => {
    renderHeader()

    setScrollPosition(340)

    const compactHeader = await screen.findByTestId(
      'challenge-entity-compact-header',
    )
    await waitFor(() => {
      expect(compactHeader).toHaveAttribute('aria-hidden', 'false')
    })

    fireEvent.click(
      within(compactHeader).getByRole('button', { name: 'Primăria Sibiu' }),
    )

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    })
  })

  it('stops click propagation from the compact header', async () => {
    const onParentClick = vi.fn()

    render(
      <div onClick={onParentClick}>
        <ChallengeEntityAnalysisHeader
          entity={entity}
          selectedYear={2025}
          activeView="main-info"
          availableViews={[
            { id: 'main-info', label: 'Informații Principale' },
            { id: 'contracts', label: 'Contracte' },
            { id: 'commitments', label: 'Angajamente' },
            { id: 'ins', label: 'INS' },
          ]}
          availableYears={[2025, 2024, 2023]}
          onYearChange={vi.fn()}
          onViewChange={vi.fn()}
          showInflationBadge
        />
      </div>,
    )

    setScrollPosition(340)

    const compactHeader = await screen.findByTestId(
      'challenge-entity-compact-header',
    )
    await waitFor(() => {
      expect(compactHeader).toHaveAttribute('aria-hidden', 'false')
    })
    fireEvent.click(compactHeader)

    expect(onParentClick).not.toHaveBeenCalled()
  })

  it('omits the legacy entity chrome while keeping the year selector', () => {
    renderHeader()

    expect(screen.queryByText('Primăria Mea')).not.toBeInTheDocument()
    expect(screen.queryByText('Municipiu')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Copiază link' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Schimbă Primăria' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Selectează anul' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Alege vizualizarea entității' }),
    ).toHaveTextContent('Informații Principale')
  })

  it('localizes the remaining header copy in english', () => {
    renderHeader('en')

    expect(screen.getByText('134,309 inhabitants')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select year' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Choose entity view' }),
    ).toHaveTextContent('Main Info')
    expect(screen.queryByText('My City Hall')).not.toBeInTheDocument()
    expect(screen.queryByText('Municipality')).not.toBeInTheDocument()
    expect(screen.queryByText('Change City Hall')).not.toBeInTheDocument()
  })

  it('opens the entity menu and highlights the active view', () => {
    renderHeader()

    fireEvent.click(
      screen.getByRole('button', { name: 'Alege vizualizarea entității' }),
    )

    const menu = screen.getByTestId('challenge-entity-view-menu')
    expect(within(menu).getByText('Alege Vizualizarea')).toBeInTheDocument()
    expect(
      within(menu).getByRole('button', { name: 'Informații Principale' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(menu).getByRole('button', { name: 'Contracte' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onViewChange and closes the menu when a view is selected', () => {
    const onViewChange = vi.fn()

    render(
      <ChallengeEntityAnalysisHeader
        entity={entity}
        selectedYear={2025}
        activeView="main-info"
        availableViews={[
          { id: 'main-info', label: 'Informații Principale' },
          { id: 'contracts', label: 'Contracte' },
          { id: 'commitments', label: 'Angajamente' },
          { id: 'ins', label: 'INS' },
        ]}
        availableYears={[2025, 2024, 2023]}
        onYearChange={vi.fn()}
        onViewChange={onViewChange}
        showInflationBadge
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Alege vizualizarea entității' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Contracte' }))

    expect(onViewChange).toHaveBeenCalledWith('contracts')
    expect(
      screen.queryByTestId('challenge-entity-view-menu'),
    ).not.toBeInTheDocument()
  })

  it('opens the year menu and highlights the selected year', () => {
    renderHeader()

    fireEvent.click(screen.getByRole('button', { name: 'Selectează anul' }))

    const menu = screen.getByTestId('challenge-entity-year-menu')
    expect(within(menu).getByText('Selectează Anul')).toBeInTheDocument()
    expect(
      within(menu).getByRole('button', { name: '2025' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(menu).getByRole('button', { name: '2024' }),
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      within(menu).getByRole('button', { name: '2023' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onYearChange from year menu selection and closes menu', () => {
    const onYearChange = vi.fn()

    render(
      <ChallengeEntityAnalysisHeader
        entity={entity}
        selectedYear={2025}
        activeView="main-info"
        availableViews={[
          { id: 'main-info', label: 'Informații Principale' },
        ]}
        availableYears={[2025, 2024, 2023]}
        onYearChange={onYearChange}
        onViewChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Selectează anul' }))
    fireEvent.click(
      within(screen.getByTestId('challenge-entity-year-menu')).getByRole(
        'button',
        { name: '2024' },
      ),
    )

    expect(onYearChange).toHaveBeenCalledWith(2024)
    expect(
      screen.queryByTestId('challenge-entity-year-menu'),
    ).not.toBeInTheDocument()
  })

  it('shows year menu in compact header', async () => {
    const onYearChange = vi.fn()

    render(
      <ChallengeEntityAnalysisHeader
        entity={entity}
        selectedYear={2024}
        activeView="main-info"
        availableViews={[
          { id: 'main-info', label: 'Informații Principale' },
        ]}
        availableYears={[2025, 2024, 2023]}
        onYearChange={onYearChange}
        onViewChange={vi.fn()}
      />,
    )

    setScrollPosition(340)

    const compactHeader = await screen.findByTestId(
      'challenge-entity-compact-header',
    )
    await waitFor(() => {
      expect(compactHeader).toHaveAttribute('aria-hidden', 'false')
    })

    const yearButton = within(compactHeader).getByRole('button', { name: 'Selectează anul' })
    expect(yearButton).toBeInTheDocument()

    fireEvent.click(yearButton)

    const yearMenus = screen.getAllByTestId('challenge-entity-year-menu')
    const compactYearMenu = yearMenus[yearMenus.length - 1]
    fireEvent.click(
      within(compactYearMenu).getByRole('button', { name: '2023' }),
    )

    expect(onYearChange).toHaveBeenCalledWith(2023)
  })
})
