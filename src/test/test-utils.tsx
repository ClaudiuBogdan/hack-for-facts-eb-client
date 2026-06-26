/* eslint-disable react-refresh/only-export-components */
import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'

/**
 * Creates a fresh QueryClient for testing with retry disabled.
 * Each test should get its own QueryClient to avoid state leakage.
 */
export const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

/**
 * Default query client for simple tests.
 * For tests that need isolation, use createTestQueryClient() instead.
 */
const defaultQueryClient = createTestQueryClient()

/**
 * Options for customRender function
 */
type CustomRenderOptions = {
  /** Custom QueryClient instance. Use createTestQueryClient() for isolated tests. */
  queryClient?: QueryClient
} & Omit<RenderOptions, 'wrapper'>

/**
 * Wrapper component that provides all necessary providers for testing.
 */
function AllTheProviders({
  children,
  queryClient,
}: {
  readonly children: ReactNode
  readonly queryClient: QueryClient
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  )
}

/**
 * Custom render function that wraps components with all necessary providers.
 *
 * @example
 * ```tsx
 * import { render, screen } from '@/test/test-utils'
 *
 * it('renders component', () => {
 *   render(<MyComponent />)
 *   expect(screen.getByText('Hello')).toBeInTheDocument()
 * })
 * ```
 *
 * @example With custom QueryClient for isolated tests
 * ```tsx
 * import { render, createTestQueryClient } from '@/test/test-utils'
 *
 * it('isolated test', () => {
 *   const queryClient = createTestQueryClient()
 *   render(<MyComponent />, { queryClient })
 * })
 * ```
 */
function customRender(
  ui: ReactElement,
  { queryClient = defaultQueryClient, ...renderOptions }: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const Wrapper = ({ children }: { readonly children: ReactNode }) => (
    <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
  )

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'

// Override render with our custom render
export { customRender as render }
