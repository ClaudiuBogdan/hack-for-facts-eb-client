import type { HomeCategoriesRead } from '../api/procurement-home-api'
import { READER_CATEGORIES, UNKNOWN_CATEGORY, type CategoryFigure } from './home-categories'
import type { NationalRead, RankedRow, RecentRecord } from './home-model'

/**
 * Builders for the front door's reads, shaped like the dev API's answer for
 * 2025 (measured 2026-09-26) and trimmed to what a test reads.
 */

const category = (key: string) => READER_CATEGORIES.find((entry) => entry.key === key)!

function row(key: string, label: string, count: number, value: number | null, share: number | null = null): RankedRow {
  return { key, label, count, value, share }
}

export function nationalRead(overrides: Partial<NationalRead> = {}): NationalRead {
  return {
    year: 2025,
    contract: { count: 39_539, valued: 28_839, value: 103_594_626_884, buyers: 3_446, suppliers: 8_614 },
    frameworks: 88_105,
    direct: { count: 2_014_671, valued: 2_011_031, value: 17_993_943_805, buyers: 14_660, suppliers: 93_119 },
    buyers: {
      contract: { rankedBy: 'count', rows: [row('1590120', 'Institutul Clinic Fundeni', 1_985, 119_300_000, 0.05)] },
      direct: {
        rankedBy: 'value',
        rows: [row('1590120', 'Regia Națională a Pădurilor Romsilva', 7_293, 93_900_000, 0.005), row('4204003', 'Institutul Clinic Fundeni', 3_647, 66_500_000, 0.004)],
      },
    },
    directSellers: { rankedBy: 'value', rows: [row('11805367', 'Selgros Cash & Carry SRL', 44_181, 68_800_000, 0.004)] },
    procedures: {
      rankedBy: 'count',
      rows: [
        row('Licitatie deschisa', 'Licitatie deschisa', 17_524, 72_791_764_938, 0.443),
        row('Procedura simplificata', 'Procedura simplificata', 11_508, 8_777_939_239, 0.291),
        row('Negociere fara publicare prealabila', 'Negociere fara publicare prealabila', 7_636, 7_084_361_381, 0.193),
      ],
    },
    counties: {
      contract: [
        { code: 'B', value: 60_260_000_000, count: 10_729 },
        { code: 'CJ', value: 8_890_000_000, count: 2_493 },
      ],
      direct: [
        { code: 'B', value: 2_380_000_000, count: 227_987 },
        { code: 'CJ', value: 783_700_000, count: 108_940 },
        { code: 'GR', value: 162_200_000, count: 14_763 },
      ],
    },
    directYears: [
      { year: 2019, value: 9_052_652_726, count: 1_627_228 },
      { year: 2024, value: 16_951_391_141, count: 1_736_703 },
      { year: 2025, value: 17_993_943_805, count: 2_014_671 },
      { year: 2026, value: 5_977_777_138, count: 705_798 },
    ],
    cutoff: { contract: '2026-05', direct: '2026-05' },
    consortium: { withheld: 54_297_167_559, total: 103_594_626_884 },
    ...overrides,
  }
}

function figure(key: string, value: number, count: number, share: number): CategoryFigure {
  return { category: category(key), value, count, share }
}

export function categoriesRead(overrides: Partial<HomeCategoriesRead> = {}): HomeCategoriesRead {
  return {
    contract: [
      figure('drumuri', 38_010_000_000, 1_198, 0.367),
      figure('cladiri', 14_940_000_000, 2_873, 0.144),
      figure('aparare', 10_520_000_000, 100, 0.102),
      { category: UNKNOWN_CATEGORY, value: 0, count: 1, share: 0 },
    ],
    direct: [figure('proiectare', 2_110_000_000, 77_776, 0.117), figure('cladiri', 1_800_000_000, 28_223, 0.1)],
    roadsConsortium: { withheld: 33_830_000_000, total: 38_010_000_000 },
    ...overrides,
  }
}

export function bigContract(overrides: Partial<RecentRecord> = {}): RecentRecord {
  return {
    id: '51107356',
    grain: 'contract',
    date: '2025-05-13',
    title: 'Proiectarea și execuția Autostrăzii Brașov – Târgu Mureș – Cluj – Oradea',
    cpvCode: '45233100',
    buyer: { cui: '16054368', name: 'Compania Națională de Administrare a Infrastructurii Rutiere' },
    winners: [
      { cui: '141792', name: 'Makyol Insaat' },
      { cui: '6630030432', name: 'Ozaltin Insaat' },
    ],
    value: 6_626_000_000,
    ...overrides,
  }
}
