import type { z } from 'zod'

/**
 * A route's search (or params) schema, built the first time it is used.
 *
 * The router needs every route's `validateSearch` before the first render, so a
 * schema written at module scope is built on every page load, for every route,
 * whichever page was asked for. Wrapped in `lazySchema`, it is built when a route
 * that uses it is first matched, and then kept. See `docs/route-contracts.md`.
 *
 * It is a Standard Schema: the router validates through `~standard` (as it does a
 * Zod schema passed directly), so validation results, errors and the inferred
 * input and output types (typed links, `useSearch`) are the schema's own. `parse`
 * and `safeParse` delegate too, for code and tests that call the schema directly;
 * `schema()` returns the Zod schema itself.
 */
export interface LazySchema<T extends z.ZodType> {
  readonly '~standard': T['~standard']
  readonly parse: T['parse']
  readonly safeParse: T['safeParse']
  /** The Zod schema, built now if it was not yet. */
  readonly schema: () => T
}

/** What a lazy schema parses to: its Zod schema's output (`z.infer`). */
export type LazyOutput<L extends LazySchema<z.ZodType>> = z.output<ReturnType<L['schema']>>

export function lazySchema<T extends z.ZodType>(build: () => T): LazySchema<T> {
  let built: T | undefined
  const schema = () => (built ??= build())
  // `types` is type-level only in Zod (absent at run time); the router reads it only in types.
  const standard = {
    version: 1,
    vendor: 'zod',
    validate: (value: unknown) => schema()['~standard'].validate(value),
  } as unknown as T['~standard']
  return {
    '~standard': standard,
    parse: ((data: unknown, params?: unknown) => schema().parse(data, params as never)) as T['parse'],
    safeParse: ((data: unknown, params?: unknown) => schema().safeParse(data, params as never)) as T['safeParse'],
    schema,
  }
}
