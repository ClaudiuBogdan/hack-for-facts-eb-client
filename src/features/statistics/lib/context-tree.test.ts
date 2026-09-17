import { describe, expect, it } from 'vitest'
import type { StatisticsContextNode } from '@/schemas/statistics'
import type { StatisticsContextTreeNode } from './context-tree'
import {
  buildStatisticsContextTree,
  cleanContextName,
  contextAncestorCodes,
  indexStatisticsContextTree,
  isRootContextCode,
  isSelectableContextLevel,
} from './context-tree'

/** Every test builds in Romanian unless it is about the language itself. */
const tree = (nodes: readonly StatisticsContextNode[], locale = 'ro') =>
  buildStatisticsContextTree(nodes, locale)

const node = (
  code: string,
  level: number,
  parentCode: string | null,
  nameRo: string | null,
  nameEn: string | null = null,
): StatisticsContextNode => ({ code, level, parentCode, nameRo, nameEn })

/** A slice of the live tree: two domains, three groups, four subdomains. */
const LIVE_SLICE: readonly StatisticsContextNode[] = [
  node('1', 0, null, 'A. STATISTICA SOCIALA'),
  node('2', 0, null, 'B. STATISTICA ECONOMICA'),
  node('10', 1, '1', 'A.1 POPULATIE SI STRUCTURA DEMOGRAFICA Comunicate de presa'),
  node(
    '15',
    1,
    '1',
    'A.4 FORTA DE MUNCA Forta de munca si castiguri salariale-Comunicate de presa ; Ocuparea si somajul-Comunicate de presa',
  ),
  node('40', 1, '2', 'B.4 PRETURI Comunicate de presa'),
  node('1012', 2, '10', '2. POPULATIA DUPA DOMICILIU'),
  node('1010', 2, '10', '1. POPULATIA REZIDENTA'),
  node('1508', 2, '15', '4. SOMERI INREGISTRATI'),
  node('4000', 2, '40', '1. INDICII PRETURILOR DE CONSUM'),
]

describe('cleanContextName', () => {
  it('drops the press-release caption INS glues to a group name', () => {
    expect(cleanContextName('A.1 POPULATIE SI STRUCTURA DEMOGRAFICA Comunicate de presa')).toBe(
      'A.1 POPULATIE SI STRUCTURA DEMOGRAFICA',
    )
  })

  it('drops two captioned links and the hyphen that joined the first', () => {
    expect(
      cleanContextName(
        'A.4 FORTA DE MUNCA Forta de munca si castiguri salariale-Comunicate de presa ; Ocuparea si somajul-Comunicate de presa',
      ),
    ).toBe('A.4 FORTA DE MUNCA')
  })

  it('drops the „Detalii" link a domain name carries', () => {
    expect(cleanContextName('H. DEZVOLTARE DURABILA - Tinte 2030 ( Detalii )')).toBe(
      'H. DEZVOLTARE DURABILA',
    )
  })

  it('leaves a sentence-case subdomain name alone', () => {
    const target = '2. Reducerea cu cel putin jumatate a numarului de cetateni'
    expect(cleanContextName(target)).toBe(target)
  })

  it('keeps the whole name when the cut would leave nothing', () => {
    expect(cleanContextName('Comunicate de presa')).toBe('Comunicate de presa')
  })
})

describe('buildStatisticsContextTree', () => {
  it('nests groups and subdomains under their domain', () => {
    const [social, economic] = tree(LIVE_SLICE)

    expect(social?.children.map((child) => child.code)).toEqual(['10', '15'])
    expect(social?.children[0]?.children.map((child) => child.label)).toEqual([
      '1. POPULATIA REZIDENTA',
      '2. POPULATIA DUPA DOMICILIU',
    ])
    expect(economic?.children.map((child) => child.code)).toEqual(['40'])
    expect(economic?.children[0]?.children.map((child) => child.code)).toEqual(['4000'])
  })

  it('shows the product label for a domain and the INS name below it', () => {
    const [social] = tree(LIVE_SLICE)

    expect(social?.label).toBe('Social')
    expect(social?.children[1]?.label).toBe('A.4 FORTA DE MUNCA')
  })

  it('orders domains as the registry does, whatever the server sent', () => {
    const reversed = [...LIVE_SLICE].reverse()

    expect(tree(reversed).map((root) => root.code)).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8',
    ])
  })

  it('keeps the eight known domains even when the server sends no tree', () => {
    const domains = tree([])

    expect(domains.map((root) => root.label)).toEqual([
      'Social', 'Economic', 'Finance', 'Justice', 'Environment',
      'Utilities & territory', 'SDG 2020', 'SDG 2030',
    ])
    expect(domains.every((root) => root.children.length === 0)).toBe(true)
  })

  it('keeps a domain the registry does not know, after the ones it does', () => {
    const domains = tree([
      ...LIVE_SLICE,
      node('9', 0, null, 'I. STATISTICA NOUA'),
      node('9010', 2, '9', '1. SERIE NOUA'),
    ])
    const unknown = domains[domains.length - 1]

    expect(domains).toHaveLength(9)
    expect(unknown?.code).toBe('9')
    expect(unknown?.label).toBe('I. STATISTICA NOUA')
    expect(unknown?.children.map((child) => child.code)).toEqual(['9010'])
  })

  it('shows the INS name in the reader\'s language, whichever INS published', () => {
    const nodes = [
      node('1', 0, null, 'A. STATISTICA SOCIALA', 'A. SOCIAL STATISTICS'),
      node('10', 1, '1', 'A.1 POPULATIE Comunicate de presa', 'A.1 POPULATION Press releases'),
      node('1010', 2, '10', '1. POPULATIA REZIDENTA', null),
    ]

    const english = tree(nodes, 'en')[0]?.children[0]
    expect(english?.label).toBe('A.1 POPULATION')
    expect(english?.children[0]?.label).toBe('1. POPULATIA REZIDENTA')

    expect(tree(nodes, 'ro')[0]?.children[0]?.label).toBe('A.1 POPULATIE')
  })

  it('survives a cycle instead of recursing forever', () => {
    // The same code arrives twice with two parents — the shape an unordered
    // paged read can produce — which makes 10 its own grandchild.
    const domains = tree([
      node('1', 0, null, 'A. STATISTICA SOCIALA'),
      node('10', 1, '1', 'A.1 POPULATIE'),
      node('1012', 2, '10', '2. POPULATIA DUPA DOMICILIU'),
      node('10', 1, '1012', 'A.1 POPULATIE, iar'),
    ])

    const group = domains[0]?.children[0]
    expect(group?.code).toBe('10')
    expect(group?.children.map((child) => child.code)).toEqual(['1012'])
    // The walk stops where it would repeat itself.
    expect(group?.children[0]?.children).toEqual([])
  })

  it('indexes a cyclic tree once and stops the ancestor walk', () => {
    // A tree that already carries a cycle, as if it came from somewhere else.
    const child: StatisticsContextTreeNode = {
      code: '1012',
      label: 'copil',
      level: 2,
      children: [],
    }
    const parent: StatisticsContextTreeNode = {
      code: '10',
      label: 'părinte',
      level: 1,
      children: [child],
    }
    ;(child as { children: readonly StatisticsContextTreeNode[] }).children = [parent]

    const index = indexStatisticsContextTree([parent])

    expect([...index.keys()]).toEqual(['10', '1012'])
    expect(contextAncestorCodes(index, '1012')).toEqual(['10'])
    expect(contextAncestorCodes(index, '10')).toEqual([])
  })

  it('falls back to the code when a node has no name at all', () => {
    const domains = tree([node('1', 0, null, null), node('1010', 2, '1', null)])

    expect(domains[0]?.children[0]?.label).toBe('1010')
  })
})

describe('indexStatisticsContextTree and contextAncestorCodes', () => {
  const index = indexStatisticsContextTree(tree(LIVE_SLICE))

  it('names the codes to open so a subdomain is visible', () => {
    expect(contextAncestorCodes(index, '1508')).toEqual(['15', '1'])
  })

  it('opens nothing for a domain, for nothing selected, or for an unknown code', () => {
    expect(contextAncestorCodes(index, '1')).toEqual([])
    expect(contextAncestorCodes(index, undefined)).toEqual([])
    expect(contextAncestorCodes(index, '9999')).toEqual([])
  })

  it('carries the label of every node for chips to read', () => {
    expect(index.get('1012')?.node.label).toBe('2. POPULATIA DUPA DOMICILIU')
    // The nine nodes of the slice plus the six domains the server did not send.
    expect(index.size).toBe(LIVE_SLICE.length + 6)
  })
})

describe('selection rules', () => {
  it('filters on domains and subdomains, opens groups', () => {
    expect(isSelectableContextLevel(0)).toBe(true)
    expect(isSelectableContextLevel(1)).toBe(false)
    expect(isSelectableContextLevel(2)).toBe(true)
  })

  it('knows which codes are domains', () => {
    expect(isRootContextCode('1')).toBe(true)
    expect(isRootContextCode('8')).toBe(true)
    expect(isRootContextCode('10')).toBe(false)
    expect(isRootContextCode('1012')).toBe(false)
  })
})
