import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBudgetItemAnalyticsTitle } from './use-budget-item-analytics-title'

const useClassificationDataMock = vi.fn()
const useEntityLabelMock = vi.fn()
const useFunctionalClassificationLabelMock = vi.fn()
const useEconomicClassificationLabelMock = vi.fn()

vi.mock('@/components/classification-explorer/hooks/useClassificationData', () => ({
  useClassificationData: (...args: unknown[]) => useClassificationDataMock(...args),
}))

vi.mock('@/hooks/filters/useFilterLabels', () => ({
  useFunctionalClassificationLabel: (...args: unknown[]) =>
    useFunctionalClassificationLabelMock(...args),
  useEconomicClassificationLabel: (...args: unknown[]) =>
    useEconomicClassificationLabelMock(...args),
  useEntityLabel: (...args: unknown[]) => useEntityLabelMock(...args),
}))

function createClassificationData(
  entries: ReadonlyArray<readonly [string, string]>,
) {
  const classificationMap = new Map(
    entries.map(([code, name]) => [
      code,
      {
        code,
        name,
      },
    ]),
  )

  return {
    flatClassifications: [],
    treeData: [],
    classificationMap,
    getByCode: (code: string) => classificationMap.get(code),
    isLoading: false,
  }
}

describe('useBudgetItemAnalyticsTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useClassificationDataMock.mockImplementation((type: 'functional' | 'economic') =>
      type === 'functional'
        ? createClassificationData([['65', 'Education']])
        : createClassificationData([['10.01', 'Salary expenses in cash']]),
    )
    useFunctionalClassificationLabelMock.mockReturnValue({
      map: (code: string) => `id::${code}`,
      add: vi.fn(),
      fetch: vi.fn(),
    })
    useEconomicClassificationLabelMock.mockReturnValue({
      map: (code: string) => `id::${code}`,
      add: vi.fn(),
      fetch: vi.fn(),
    })
    useEntityLabelMock.mockReturnValue({
      map: (cui: string) => {
        if (cui === '12345678') return 'Town Hall of Example'
        return `id::${cui}`
      },
      add: vi.fn(),
      fetch: vi.fn(),
    })
  })

  it('combines the entity, functional, and economic names when all labels resolve', () => {
    const { result } = renderHook(() =>
      useBudgetItemAnalyticsTitle({
        entityCui: '12345678',
        subjectLabel: 'Education salaries',
        language: 'en',
        functionalCode: '65.00',
        economicCode: '10.01.00',
      }),
    )

    expect(useClassificationDataMock).toHaveBeenNthCalledWith(1, 'functional')
    expect(useClassificationDataMock).toHaveBeenNthCalledWith(2, 'economic')
    expect(result.current.resolvedTitle).toBe(
      'Town Hall of Example · Education · Salary expenses in cash',
    )
    expect(result.current.seriesLabel).toBe(
      'Education · Salary expenses in cash',
    )
  })

  it('uses the entity plus the available classification name when only one code resolves', () => {
    const { result } = renderHook(() =>
      useBudgetItemAnalyticsTitle({
        entityCui: '12345678',
        subjectLabel: 'Education salaries',
        language: 'en',
        functionalCode: '65',
      }),
    )

    expect(result.current.resolvedTitle).toBe('Town Hall of Example · Education')
    expect(result.current.seriesLabel).toBe('Education')
  })

  it('falls back to classification names without the entity when the entity label is unresolved', () => {
    useEntityLabelMock.mockReturnValue({
      map: (cui: string) => `id::${cui}`,
      add: vi.fn(),
      fetch: vi.fn(),
    })

    const { result } = renderHook(() =>
      useBudgetItemAnalyticsTitle({
        entityCui: '99999999',
        subjectLabel: 'Education salaries',
        language: 'en',
        functionalCode: '65',
        economicCode: '10.01',
      }),
    )

    expect(result.current.resolvedTitle).toBe(
      'Education · Salary expenses in cash',
    )
    expect(result.current.seriesLabel).toBe(
      'Education · Salary expenses in cash',
    )
  })

  it('uses the names returned by the shared classification data source for locale-specific titles', () => {
    useClassificationDataMock.mockImplementation((type: 'functional' | 'economic') =>
      type === 'functional'
        ? createClassificationData([['65', 'Învățământ']])
        : createClassificationData([['10.01', 'Cheltuieli salariale în bani']]),
    )
    useEntityLabelMock.mockReturnValue({
      map: (cui: string) => (cui === '12345678' ? 'Primăria Exemplu' : `id::${cui}`),
      add: vi.fn(),
      fetch: vi.fn(),
    })

    const { result } = renderHook(() =>
      useBudgetItemAnalyticsTitle({
        entityCui: '12345678',
        subjectLabel: 'Salarii educație',
        language: 'ro',
        functionalCode: '65',
        economicCode: '10.01',
      }),
    )

    expect(result.current.resolvedTitle).toBe(
      'Primăria Exemplu · Învățământ · Cheltuieli salariale în bani',
    )
    expect(result.current.seriesLabel).toBe(
      'Învățământ · Cheltuieli salariale în bani',
    )
  })

  it('falls back to raw code labels when a manual prefix does not resolve', () => {
    const { result } = renderHook(() =>
      useBudgetItemAnalyticsTitle({
        entityCui: '12345678',
        subjectLabel: 'Old selection label',
        language: 'en',
        functionalCode: '65.99',
        economicCode: '10.01',
      }),
    )

    expect(result.current.resolvedTitle).toBe(
      'Town Hall of Example · fn:65.99 · Salary expenses in cash',
    )
    expect(result.current.seriesLabel).toBe(
      'fn:65.99 · Salary expenses in cash',
    )
  })

  it('uses the exact functional label store when the explorer map misses a detailed fn code', () => {
    useFunctionalClassificationLabelMock.mockReturnValue({
      map: (code: string) =>
        code === '74.05.02' ? 'Environmental protection monitoring' : `id::${code}`,
      add: vi.fn(),
      fetch: vi.fn(),
    })

    const { result } = renderHook(() =>
      useBudgetItemAnalyticsTitle({
        entityCui: '12345678',
        subjectLabel: 'Old selection label',
        language: 'en',
        functionalCode: '74.05.02',
      }),
    )

    expect(result.current.resolvedTitle).toBe(
      'Town Hall of Example · Environmental protection monitoring',
    )
    expect(result.current.seriesLabel).toBe(
      'Environmental protection monitoring',
    )
  })

  it('does not fall back to stale subject labels after manual code edits', () => {
    const { result } = renderHook(() =>
      useBudgetItemAnalyticsTitle({
        entityCui: '12345678',
        subjectLabel: 'Education salaries',
        language: 'en',
        economicCode: '10.99',
      }),
    )

    expect(result.current.resolvedTitle).toBe(
      'Town Hall of Example · ec:10.99',
    )
    expect(result.current.seriesLabel).toBe('ec:10.99')
  })

  it('falls back to the entity label when both analytics codes and subject label are empty', () => {
    const { result } = renderHook(() =>
      useBudgetItemAnalyticsTitle({
        entityCui: '12345678',
        subjectLabel: '',
        language: 'en',
      }),
    )

    expect(result.current.resolvedTitle).toBe('Town Hall of Example')
    expect(result.current.seriesLabel).toBe('Town Hall of Example')
  })
})
