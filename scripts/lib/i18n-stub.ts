/** `@/lib/i18n` for scripts: its catalogs load through `import.meta.glob`, which only Vite provides. */
export const DEFAULT_LOCALE = 'ro' as const
export const LOCALE_COOKIE_NAME = 'user-locale'
export type SupportedLocale = 'ro' | 'en'

export function normalizeLocale(value: string | null | undefined): SupportedLocale | null {
  return value === 'ro' || value === 'en' ? value : null
}
