import { AsyncLocalStorage } from 'node:async_hooks'
import { i18n, type I18n, type Messages } from '@lingui/core'

/**
 * One Lingui state per server request.
 *
 * Lingui's `i18n` is one object for the whole process, and every `t`, `<Trans>`
 * and `useLingui` reads it. The server renders requests concurrently and the
 * root's `beforeLoad` activates each request's language on that object, so a
 * render that resumed after an await printed the language and catalogs of
 * whichever request activated last (2026-10-28 review, REV-02).
 *
 * Lingui 6 keeps an instance's state in three fields: `_locale`, `_locales`
 * and `_messages`. On the server they become accessors over the current
 * request's state, which `runWithRequestI18n` keeps in AsyncLocalStorage
 * around the request handler. Outside a request (start-up, background work)
 * they read and write one shared state, as before. Only the server entry may
 * import this module.
 */
type LinguiState = {
  _locale: string
  _locales: string | readonly string[] | undefined
  _messages: Record<string, Messages>
}

const STATE_FIELDS = ['_locale', '_locales', '_messages'] as const

const requestState = new AsyncLocalStorage<LinguiState>()
let sharedState: LinguiState | null = null

function currentState(): LinguiState {
  const state = requestState.getStore() ?? sharedState
  if (!state) throw new Error('Lingui request scope used before installRequestScopedI18n')
  return state
}

/**
 * Routes the shared instance's state through the current request; call once,
 * before any catalog loads. `instance` is for tests, whose `@lingui/core` is a
 * stand-in.
 */
export function installRequestScopedI18n(instance: I18n = i18n): void {
  if (sharedState) return
  const fields = instance as unknown as LinguiState
  for (const field of STATE_FIELDS) {
    // A Lingui upgrade that renames these fields would otherwise bring the leak back silently.
    if (!Object.prototype.hasOwnProperty.call(instance, field)) {
      throw new Error(`Lingui's i18n has no own "${field}" field; the request scope needs updating`)
    }
  }
  sharedState = {
    _locale: fields._locale,
    _locales: fields._locales,
    _messages: fields._messages,
  }
  for (const field of STATE_FIELDS) {
    Object.defineProperty(instance, field, {
      configurable: true,
      enumerable: true,
      get: () => currentState()[field],
      set: (value: never) => {
        currentState()[field] = value
      },
    })
  }
}

/**
 * Runs a request with its own Lingui state, starting from the shared one: the
 * default language, already loaded. The request's activation then replaces its
 * messages for a language (`loadAndActivate`), so the shared catalogs are read,
 * never changed.
 */
export function runWithRequestI18n<T>(callback: () => T): T {
  const shared = sharedState
  if (!shared) throw new Error('runWithRequestI18n called before installRequestScopedI18n')
  return requestState.run(
    {
      _locale: shared._locale,
      _locales: shared._locales,
      _messages: { ...shared._messages },
    },
    callback,
  )
}
