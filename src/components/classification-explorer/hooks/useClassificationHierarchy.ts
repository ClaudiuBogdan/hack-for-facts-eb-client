import { useMemo } from 'react'
import type {
  ClassificationType,
  ClassificationNode,
  ClassificationHierarchy,
} from '@/types/classification-explorer'
import {
  getParentCode,
  getAncestorCodes,
  findNodeByCode,
  getClassificationLevel,
} from '@/lib/classification-explorer-utils'
import { useClassificationData } from './useClassificationData'

/**
 * Hook to get hierarchy information for a specific classification code
 * Returns the node, its parents, children, and siblings
 */
export function useClassificationHierarchy(
  type: ClassificationType,
  code: string | undefined
): ClassificationHierarchy | null {
  const { treeData, getByCode } = useClassificationData(type)

  return useMemo(() => {
    if (!code) return null

    // Find the node in the tree
    const node = findNodeByCode(treeData, code)

    if (!node) {
      // If not found in tree, try to construct from flat data
      const flatNode = getByCode(code)
      if (!flatNode) return null

      // Create a basic node without children
      const basicNode: ClassificationNode = {
        code: flatNode.code,
        name: flatNode.name,
        description: flatNode.description,
        level: getClassificationLevel(flatNode.code),
        parent: getParentCode(flatNode.code) || undefined,
        children: [],
        hasChildren: false,
      }

      return {
        node: basicNode,
        parents: [],
        children: [],
        siblings: [],
      }
    }

    // Get parent nodes
    const ancestorCodes = getAncestorCodes(code)
    const parents: ClassificationNode[] = []
    for (const ancestorCode of ancestorCodes) {
      const parentNode = findNodeByCode(treeData, ancestorCode)
      if (parentNode) {
        parents.push(parentNode)
      }
    }

    // Children are already in the node
    const children = node.children

    // Get siblings (other children of the same parent)
    const siblings: ClassificationNode[] = []
    if (node.parent) {
      const parentNode = findNodeByCode(treeData, node.parent)
      if (parentNode) {
        // Get all children except the current node
        siblings.push(
          ...parentNode.children.filter((child) => child.code !== code)
        )
      }
    } else {
      // If no parent, siblings are other root nodes
      siblings.push(...treeData.filter((n) => n.code !== code))
    }

    return {
      node,
      parents,
      children: [...children],
      siblings,
    }
  }, [code, treeData, getByCode])
}
