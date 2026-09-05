import type { PrototypeDefinition } from '@/development/harness/entry'

/**
 * Living template — copy this file to `<domain>/<name>.prototype.tsx`.
 *
 * Variants are zero-prop components that own their data: fixtures from the
 * feature's `mocks/`, or the feature's real hooks (the real QueryClient is in
 * the shell). Once you are iterating on a variant, move it to a sibling file
 * (`hello.dense.tsx`) so it hot-swaps instead of full-reloading.
 *
 * Rules that matter here (see `docs/design/prototyping.md`):
 * - variant keys match `^[a-z][a-z0-9-]*$` and are never `true`/`false`/`null`
 * - no arbitrary-value utility carrying text or a URL (`content-[…]`,
 *   `bg-[url(…)]`) — full-checkout CSS would carry the literal
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

function HelloDense() {
  return (
    <div className="p-6" data-dev-marker={PROTOTYPE_MARKER}>
      <h2 className="text-lg font-semibold">Hello, dense</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        One line, counts as chips. Swap this for the real thing you are deciding.
      </p>
      <div className="mt-3 flex gap-1.5">
        {['1.2k contracts', '318 suppliers', '4 years'].map((chip) => (
          <span key={chip} className="rounded border px-2 py-0.5 text-xs">
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}

function HelloAiry() {
  return (
    <div className="p-6" data-dev-marker={PROTOTYPE_MARKER}>
      <h2 className="text-2xl font-semibold tracking-tight">Hello, airy</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Two rows, counts as a stat band.
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
        {[
          ['Contracts', '1,204'],
          ['Suppliers', '318'],
          ['Years', '4'],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-lg font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export const prototype = {
  title: 'Example — hello',
  spec: 'docs/design/prototyping.md',
  variants: {
    dense: { title: 'Dense', component: HelloDense, note: 'counts as chips' },
    airy: { title: 'Airy', component: HelloAiry, note: 'counts as a stat band' },
  },
  compare: ['dense', 'airy'],
} satisfies PrototypeDefinition
