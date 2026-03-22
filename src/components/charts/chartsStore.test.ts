import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Lingui modules before importing anything that uses them
vi.mock('@lingui/core/macro', () => ({
  msg: (strings: TemplateStringsArray) => strings[0],
  t: (strings: TemplateStringsArray) => strings[0],
}))

vi.mock('@lingui/core', () => ({
  i18n: {
    _: (msg: unknown) => (typeof msg === 'string' ? msg : String(msg)),
  },
}))

// Mock generateRandomColor since it's used in charts schema defaults
vi.mock('@/components/charts/components/chart-renderer/utils', () => ({
  generateRandomColor: vi.fn(() => '#0000ff'),
}))

// Mock Analytics
vi.mock('@/lib/analytics', () => ({
  Analytics: {
    capture: vi.fn(),
    EVENTS: {
      ChartDeleted: 'chart_deleted',
      ChartOpened: 'chart_opened',
    },
  },
}))

import { getChartsStore, type StoredChart, type ChartCategory, type ChartsBackupFile } from './chartsStore'
import type { Chart } from '@/schemas/charts'

// ============================================================================
// TEST HELPERS
// ============================================================================

const createMockChart = (id: string, overrides?: Partial<Chart>): Chart => ({
  id,
  title: `Test Chart ${id}`,
  config: {
    chartType: 'line',
    color: '#0088FE',
    showGridLines: true,
    showLegend: true,
    showTooltip: true,
    editAnnotations: true,
    showAnnotations: true,
  },
  series: [],
  annotations: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const createMockStoredChart = (id: string, overrides?: Partial<StoredChart>): StoredChart => ({
  ...createMockChart(id),
  favorite: false,
  deleted: false,
  categories: [],
  ...overrides,
})

const createMockCategory = (id: string, name: string): ChartCategory => ({
  id,
  name,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

// ============================================================================
// SETUP
// ============================================================================

describe('chartsStore', () => {
  let mockStorage: Record<string, string>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockStorage = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key]
      }),
      clear: vi.fn(() => {
        mockStorage = {}
      }),
    })
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // loadSavedCharts
  // ============================================================================
  describe('loadSavedCharts', () => {
    it('should return empty array when no charts are stored', () => {
      const store = getChartsStore()

      const charts = store.loadSavedCharts()

      expect(charts).toEqual([])
    })

    it('should load charts from localStorage', () => {
      const chart = createMockStoredChart('chart-1')
      mockStorage['saved-charts'] = JSON.stringify([chart])

      const store = getChartsStore()
      const charts = store.loadSavedCharts()

      expect(charts).toHaveLength(1)
      expect(charts[0].id).toBe('chart-1')
    })

    it('should filter out deleted charts when filterDeleted is true', () => {
      const charts = [
        createMockStoredChart('chart-1'),
        createMockStoredChart('chart-2', { deleted: true }),
      ]
      mockStorage['saved-charts'] = JSON.stringify(charts)

      const store = getChartsStore()
      const result = store.loadSavedCharts({ filterDeleted: true })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('chart-1')
    })

    it('should include deleted charts when filterDeleted is false', () => {
      const charts = [
        createMockStoredChart('chart-1'),
        createMockStoredChart('chart-2', { deleted: true }),
      ]
      mockStorage['saved-charts'] = JSON.stringify(charts)

      const store = getChartsStore()
      const result = store.loadSavedCharts({ filterDeleted: false })

      expect(result).toHaveLength(2)
    })

    it('should sort charts by createdAt when sort is true', () => {
      const oldDate = new Date('2020-01-01').toISOString()
      const newDate = new Date('2024-01-01').toISOString()
      const charts = [
        createMockStoredChart('old', { createdAt: oldDate }),
        createMockStoredChart('new', { createdAt: newDate }),
      ]
      mockStorage['saved-charts'] = JSON.stringify(charts)

      const store = getChartsStore()
      const result = store.loadSavedCharts({ sort: true })

      expect(result[0].id).toBe('new')
      expect(result[1].id).toBe('old')
    })

    it('should handle invalid JSON in localStorage', () => {
      mockStorage['saved-charts'] = 'invalid json'

      const store = getChartsStore()
      const charts = store.loadSavedCharts()

      expect(charts).toEqual([])
    })

    it('should filter out invalid chart objects', () => {
      const validChart = createMockStoredChart('valid')
      const invalidChart = { id: 'invalid' } // Missing required fields
      mockStorage['saved-charts'] = JSON.stringify([validChart, invalidChart])

      const store = getChartsStore()
      const charts = store.loadSavedCharts()

      expect(charts.some(c => c.id === 'valid')).toBe(true)
    })
  })

  // ============================================================================
  // saveChartToLocalStorage
  // ============================================================================
  describe('saveChartToLocalStorage', () => {
    it('should save a new chart to localStorage', () => {
      const store = getChartsStore()
      const chart = createMockChart('new-chart')

      store.saveChartToLocalStorage(chart)

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved).toHaveLength(1)
      expect(saved[0].id).toBe('new-chart')
    })

    it('should not duplicate existing chart', () => {
      const existing = createMockStoredChart('existing')
      mockStorage['saved-charts'] = JSON.stringify([existing])

      const store = getChartsStore()
      store.saveChartToLocalStorage(createMockChart('existing'))

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved).toHaveLength(1)
    })

    it('should prepend new chart to existing charts', () => {
      const existing = createMockStoredChart('existing')
      mockStorage['saved-charts'] = JSON.stringify([existing])

      const store = getChartsStore()
      store.saveChartToLocalStorage(createMockChart('new'))

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved[0].id).toBe('new')
      expect(saved[1].id).toBe('existing')
    })
  })

  // ============================================================================
  // updateChartInLocalStorage
  // ============================================================================
  describe('updateChartInLocalStorage', () => {
    it('should update an existing chart', () => {
      const chart = createMockStoredChart('chart-1', { title: 'Original' })
      mockStorage['saved-charts'] = JSON.stringify([chart])

      const store = getChartsStore()
      store.updateChartInLocalStorage(createMockChart('chart-1', { title: 'Updated' }))

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved[0].title).toBe('Updated')
    })

    it('should preserve other properties when updating', () => {
      const chart = createMockStoredChart('chart-1', { favorite: true, categories: ['cat1'] })
      mockStorage['saved-charts'] = JSON.stringify([chart])

      const store = getChartsStore()
      store.updateChartInLocalStorage(createMockChart('chart-1', { title: 'Updated' }))

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved[0].favorite).toBe(true)
      expect(saved[0].categories).toEqual(['cat1'])
    })

    it('should move updated chart to the top', () => {
      const charts = [
        createMockStoredChart('chart-1'),
        createMockStoredChart('chart-2'),
      ]
      mockStorage['saved-charts'] = JSON.stringify(charts)

      const store = getChartsStore()
      store.updateChartInLocalStorage(createMockChart('chart-2'))

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved[0].id).toBe('chart-2')
    })
  })

  // ============================================================================
  // deleteChart
  // ============================================================================
  describe('deleteChart', () => {
    it('should mark chart as deleted', () => {
      const chart = createMockStoredChart('chart-1')
      mockStorage['saved-charts'] = JSON.stringify([chart])

      const store = getChartsStore()
      store.deleteChart('chart-1')

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved[0].deleted).toBe(true)
    })

    it('should not affect other charts', () => {
      const charts = [
        createMockStoredChart('chart-1'),
        createMockStoredChart('chart-2'),
      ]
      mockStorage['saved-charts'] = JSON.stringify(charts)

      const store = getChartsStore()
      store.deleteChart('chart-1')

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved.find((c: StoredChart) => c.id === 'chart-2')?.deleted).toBe(false)
    })
  })

  // ============================================================================
  // toggleChartFavorite
  // ============================================================================
  describe('toggleChartFavorite', () => {
    it('should toggle favorite from false to true', () => {
      const chart = createMockStoredChart('chart-1', { favorite: false })
      mockStorage['saved-charts'] = JSON.stringify([chart])

      const store = getChartsStore()
      store.toggleChartFavorite('chart-1')

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved[0].favorite).toBe(true)
    })

    it('should toggle favorite from true to false', () => {
      const chart = createMockStoredChart('chart-1', { favorite: true })
      mockStorage['saved-charts'] = JSON.stringify([chart])

      const store = getChartsStore()
      store.toggleChartFavorite('chart-1')

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved[0].favorite).toBe(false)
    })

    it('should do nothing for non-existent chart', () => {
      const chart = createMockStoredChart('chart-1')
      mockStorage['saved-charts'] = JSON.stringify([chart])

      const store = getChartsStore()
      store.toggleChartFavorite('non-existent')

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved).toHaveLength(1)
      expect(saved[0].favorite).toBe(false)
    })
  })

  // ============================================================================
  // Categories
  // ============================================================================
  describe('loadCategories', () => {
    it('should return empty array when no categories exist', () => {
      const store = getChartsStore()

      const categories = store.loadCategories()

      expect(categories).toEqual([])
    })

    it('should load categories from localStorage', () => {
      const category = createMockCategory('cat-1', 'Test Category')
      mockStorage['chart-categories'] = JSON.stringify([category])

      const store = getChartsStore()
      const categories = store.loadCategories()

      expect(categories).toHaveLength(1)
      expect(categories[0].name).toBe('Test Category')
    })

    it('should sort categories by name', () => {
      const categories = [
        createMockCategory('cat-b', 'Bravo'),
        createMockCategory('cat-a', 'Alpha'),
      ]
      mockStorage['chart-categories'] = JSON.stringify(categories)

      const store = getChartsStore()
      const result = store.loadCategories()

      expect(result[0].name).toBe('Alpha')
      expect(result[1].name).toBe('Bravo')
    })
  })

  describe('createCategory', () => {
    it('should create a new category', () => {
      const store = getChartsStore()

      const category = store.createCategory('New Category')

      expect(category.name).toBe('New Category')
      expect(category.id).toBeDefined()
    })

    it('should throw error for empty name', () => {
      const store = getChartsStore()

      expect(() => store.createCategory('')).toThrow()
      expect(() => store.createCategory('   ')).toThrow()
    })

    it('should throw error for duplicate name', () => {
      const existing = createMockCategory('cat-1', 'Existing')
      mockStorage['chart-categories'] = JSON.stringify([existing])

      const store = getChartsStore()

      expect(() => store.createCategory('Existing')).toThrow()
      expect(() => store.createCategory('EXISTING')).toThrow() // Case insensitive
    })
  })

  describe('renameCategory', () => {
    it('should rename an existing category', () => {
      const category = createMockCategory('cat-1', 'Old Name')
      mockStorage['chart-categories'] = JSON.stringify([category])

      const store = getChartsStore()
      store.renameCategory('cat-1', 'New Name')

      const saved = JSON.parse(mockStorage['chart-categories'])
      expect(saved[0].name).toBe('New Name')
    })

    it('should update the updatedAt timestamp', () => {
      const oldDate = new Date('2020-01-01').toISOString()
      const category = createMockCategory('cat-1', 'Old Name')
      category.updatedAt = oldDate
      mockStorage['chart-categories'] = JSON.stringify([category])

      const store = getChartsStore()
      store.renameCategory('cat-1', 'New Name')

      const saved = JSON.parse(mockStorage['chart-categories'])
      expect(new Date(saved[0].updatedAt).getTime()).toBeGreaterThan(new Date(oldDate).getTime())
    })
  })

  describe('deleteCategory', () => {
    it('should delete a category', () => {
      const category = createMockCategory('cat-1', 'Test')
      mockStorage['chart-categories'] = JSON.stringify([category])

      const store = getChartsStore()
      store.deleteCategory('cat-1')

      const saved = JSON.parse(mockStorage['chart-categories'])
      expect(saved).toHaveLength(0)
    })

    it('should remove category from all charts', () => {
      const category = createMockCategory('cat-1', 'Test')
      const chart = createMockStoredChart('chart-1', { categories: ['cat-1', 'cat-2'] })
      mockStorage['chart-categories'] = JSON.stringify([category])
      mockStorage['saved-charts'] = JSON.stringify([chart])

      const store = getChartsStore()
      store.deleteCategory('cat-1')

      const savedCharts = JSON.parse(mockStorage['saved-charts'])
      expect(savedCharts[0].categories).toEqual(['cat-2'])
    })
  })

  describe('toggleChartCategory', () => {
    it('should add category to chart', () => {
      const chart = createMockStoredChart('chart-1', { categories: [] })
      mockStorage['saved-charts'] = JSON.stringify([chart])

      const store = getChartsStore()
      store.toggleChartCategory('chart-1', 'cat-1')

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved[0].categories).toContain('cat-1')
    })

    it('should remove category from chart', () => {
      const chart = createMockStoredChart('chart-1', { categories: ['cat-1'] })
      mockStorage['saved-charts'] = JSON.stringify([chart])

      const store = getChartsStore()
      store.toggleChartCategory('chart-1', 'cat-1')

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved[0].categories).not.toContain('cat-1')
    })
  })

  // ============================================================================
  // Backup & Import
  // ============================================================================
  describe('createBackup', () => {
    it('should create backup with charts and categories', () => {
      const chart = createMockStoredChart('chart-1')
      const category = createMockCategory('cat-1', 'Test')
      mockStorage['saved-charts'] = JSON.stringify([chart])
      mockStorage['chart-categories'] = JSON.stringify([category])

      const store = getChartsStore()
      const backup = store.createBackup()

      expect(backup.type).toBe('charts-backup')
      expect(backup.version).toBe(1)
      expect(backup.charts).toHaveLength(1)
      expect(backup.categories).toHaveLength(1)
      expect(backup.exportedAt).toBeDefined()
    })

    it('should include deleted charts in backup', () => {
      const charts = [
        createMockStoredChart('chart-1'),
        createMockStoredChart('chart-2', { deleted: true }),
      ]
      mockStorage['saved-charts'] = JSON.stringify(charts)

      const store = getChartsStore()
      const backup = store.createBackup()

      expect(backup.charts).toHaveLength(2)
    })
  })

  describe('previewImport', () => {
    it('should return preview with unique chart count', () => {
      const backup: ChartsBackupFile = {
        type: 'charts-backup',
        version: 1,
        charts: [createMockStoredChart('new-chart')],
        categories: [],
      }

      const store = getChartsStore()
      const result = store.previewImport(backup)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.preview.totalCharts).toBe(1)
        expect(result.preview.unique).toBe(1)
        expect(result.preview.conflicts).toHaveLength(0)
      }
    })

    it('should detect conflicts with existing charts', () => {
      const existing = createMockStoredChart('chart-1', { title: 'Existing' })
      mockStorage['saved-charts'] = JSON.stringify([existing])

      const backup: ChartsBackupFile = {
        type: 'charts-backup',
        version: 1,
        charts: [createMockStoredChart('chart-1', { title: 'Imported' })],
        categories: [],
      }

      const store = getChartsStore()
      const result = store.previewImport(backup)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.preview.conflicts).toHaveLength(1)
        expect(result.preview.conflicts[0].currentTitle).toBe('Existing')
        expect(result.preview.conflicts[0].importedTitle).toBe('Imported')
      }
    })

    it('should return error for invalid backup format', () => {
      const store = getChartsStore()
      // The schema has defaults for all fields and passthrough, so { invalid: 'data' }
      // will parse successfully with empty arrays. To actually fail, we need to provide
      // wrong types for fields that exist in the schema.
      const result = store.previewImport({ charts: 'not-an-array' })

      expect(result.ok).toBe(false)
    })
  })

  describe('importBackup', () => {
    it('should import unique charts', () => {
      const backup: ChartsBackupFile = {
        type: 'charts-backup',
        version: 1,
        charts: [createMockStoredChart('new-chart')],
        categories: [],
      }

      const store = getChartsStore()
      const result = store.importBackup(backup, 'skip')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.result.added).toBe(1)
      }

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved).toHaveLength(1)
    })

    it('should skip conflicting charts when strategy is skip', () => {
      const existing = createMockStoredChart('chart-1', { title: 'Existing' })
      mockStorage['saved-charts'] = JSON.stringify([existing])

      const backup: ChartsBackupFile = {
        type: 'charts-backup',
        version: 1,
        charts: [createMockStoredChart('chart-1', { title: 'Imported' })],
        categories: [],
      }

      const store = getChartsStore()
      const result = store.importBackup(backup, 'skip')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.result.skipped).toBe(1)
      }

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved[0].title).toBe('Existing')
    })

    it('should replace conflicting charts when strategy is replace', () => {
      const existing = createMockStoredChart('chart-1', { title: 'Existing', favorite: true })
      mockStorage['saved-charts'] = JSON.stringify([existing])

      const backup: ChartsBackupFile = {
        type: 'charts-backup',
        version: 1,
        charts: [createMockStoredChart('chart-1', { title: 'Imported' })],
        categories: [],
      }

      const store = getChartsStore()
      const result = store.importBackup(backup, 'replace')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.result.replaced).toBe(1)
      }

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved[0].title).toBe('Imported')
      expect(saved[0].favorite).toBe(true) // Preserved
    })

    it('should duplicate charts when strategy is keep-both', () => {
      const existing = createMockStoredChart('chart-1', { title: 'Existing' })
      mockStorage['saved-charts'] = JSON.stringify([existing])

      const backup: ChartsBackupFile = {
        type: 'charts-backup',
        version: 1,
        charts: [createMockStoredChart('chart-1', { title: 'Imported' })],
        categories: [],
      }

      const store = getChartsStore()
      const result = store.importBackup(backup, 'keep-both')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.result.duplicated).toBe(1)
      }

      const saved = JSON.parse(mockStorage['saved-charts'])
      expect(saved).toHaveLength(2)
    })

    it('should import new categories', () => {
      const backup: ChartsBackupFile = {
        type: 'charts-backup',
        version: 1,
        charts: [],
        categories: [createMockCategory('cat-1', 'New Category')],
      }

      const store = getChartsStore()
      store.importBackup(backup, 'skip')

      const saved = JSON.parse(mockStorage['chart-categories'])
      expect(saved).toHaveLength(1)
    })

    it('should match categories by name during import', () => {
      const existing = createMockCategory('existing-id', 'Same Name')
      mockStorage['chart-categories'] = JSON.stringify([existing])

      const backup: ChartsBackupFile = {
        type: 'charts-backup',
        version: 1,
        charts: [createMockStoredChart('chart-1', { categories: ['imported-id'] })],
        categories: [createMockCategory('imported-id', 'Same Name')],
      }

      const store = getChartsStore()
      store.importBackup(backup, 'skip')

      const savedCharts = JSON.parse(mockStorage['saved-charts'])
      expect(savedCharts[0].categories).toContain('existing-id')
    })

    it('returns an error and rolls back categories when chart persistence fails', () => {
      const existingCategory = createMockCategory('existing-category', 'Existing Category')
      mockStorage['chart-categories'] = JSON.stringify([existingCategory])

      vi.mocked(localStorage.setItem).mockImplementation((key: string, value: string) => {
        if (key === 'saved-charts') {
          throw new DOMException('Quota exceeded', 'QuotaExceededError')
        }

        mockStorage[key] = value
      })

      const backup: ChartsBackupFile = {
        type: 'charts-backup',
        version: 1,
        charts: [createMockStoredChart('new-chart', { categories: ['new-category'] })],
        categories: [createMockCategory('new-category', 'New Category')],
      }

      const store = getChartsStore()
      const result = store.importBackup(backup, 'skip')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Failed to persist imported charts')
      }

      expect(mockStorage['saved-charts']).toBeUndefined()
      expect(JSON.parse(mockStorage['chart-categories'])).toEqual([existingCategory])
    })
  })
})
