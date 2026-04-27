import type { ClassificationType } from '@/types/classification-explorer'

export const DISALLOWED_ELEMENTS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button']

export const CLASSIFICATION_BASE_PATH: Record<ClassificationType, string> = {
  functional: '/classifications/functional',
  economic: '/classifications/economic',
}

export function isSafeExternalHref(href: string | undefined): boolean {
  if (!href) return false
  return href.startsWith('http://') || href.startsWith('https://')
}

export function isSafeInternalAppHref(href: string | undefined): boolean {
  if (!href) return false
  return href.startsWith('/') && !href.startsWith('//')
}

export function extractClassificationCodeFromHref(href: string | undefined): string | null {
  if (!href) return null

  const path = href.trim().split('#')[0]?.split('?')[0] ?? ''
  const lastSegment = path.split('/').filter(Boolean).pop()
  if (!lastSegment) return null

  const normalizedCode = lastSegment.replace(/\.md$/i, '')
  return /^[0-9]+(?:\.[0-9]+)*$/.test(normalizedCode) ? normalizedCode : null
}

export function resolveClassificationHref(
  href: string | undefined,
  type: ClassificationType
): string | null {
  if (isSafeInternalAppHref(href)) {
    return href ?? null
  }

  const classificationCode = extractClassificationCodeFromHref(href)
  if (!classificationCode) {
    return null
  }

  return `${CLASSIFICATION_BASE_PATH[type]}/${classificationCode}`
}
