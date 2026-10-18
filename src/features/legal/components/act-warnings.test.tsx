import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/test-utils'
import type { LegalActDetail } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import { legalActDetailRichFixture } from '../mocks/fixtures/legal-act-detail'
import { ActWarnings } from './act-warnings'

/**
 * The reference count is every incoming modification/completion reference on
 * the act, not dated against the text shown (I-22), so no headline says "since
 * publication". Law 95/2006 (act 65916) shows its 2015-08-28 republication, and
 * 106 of its 292 references come from earlier sources; 45 published-form texts
 * have earlier-dated references too.
 */
const withCanonical = (
  versionKind: string,
  versionDate: string | null,
  amendedAfterPublication = 292,
): LegalActDetail => {
  const canonical = legalActDetailRichFixture.canonical
  if (!canonical) throw new Error('the rich fixture has a canonical document')
  return {
    ...legalActDetailRichFixture,
    amendedAfterPublication,
    statusEvidence: { ...legalActDetailRichFixture.statusEvidence, contradictedAbrogations: 0 },
    canonical: { ...canonical, versionKind, versionDate },
  }
}

describe('ActWarnings — the time basis of the reference count (I-22)', () => {
  it.each(['original', 'corp', 'stub-header'])(
    'a %s text counts the references for the act and names its publication date',
    (kind) => {
      render(<ActWarnings act={withCanonical(kind, '2015-09-10', 295)} />)
      expect(
        screen.getByText('295 de referințe de modificare sau completare înregistrate pentru act.'),
      ).toBeInTheDocument()
      expect(screen.queryByText(/de la publicare/)).not.toBeInTheDocument()
      // The mocked Lingui runs in `en`, the locale the component formats with.
      expect(screen.getByText(/așa cum a fost publicat la/)).toHaveTextContent(
        `publicat la ${formatLegalDate('2015-09-10', 'en')}.`,
      )
    },
  )

  it('a republished text counts the references for the act, not since the republication', () => {
    render(<ActWarnings act={withCanonical('republicare', '2015-08-28')} />)
    expect(
      screen.getByText('292 de referințe de modificare sau completare înregistrate pentru act.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/de la publicare/)).not.toBeInTheDocument()
    const body = screen.getByText(/așa cum a fost republicat la/)
    expect(body).toHaveTextContent(`republicat la ${formatLegalDate('2015-08-28', 'en')}.`)
    expect(body).toHaveTextContent('pot fi și anterioare republicării')
    expect(screen.queryByText(/așa cum a fost publicat/)).not.toBeInTheDocument()
  })

  it('a republication without a date, or another kind, makes no date claim', () => {
    for (const [kind, date] of [
      ['republicare', null],
      ['consolidare', '2024-01-01'],
    ] as const) {
      const { unmount } = render(<ActWarnings act={withCanonical(kind, date, 2)} />)
      expect(
        screen.getByText('2 referințe de modificare sau completare înregistrate pentru act.'),
      ).toBeInTheDocument()
      expect(screen.getByText(/nu față de versiunea de mai jos/)).toBeInTheDocument()
      expect(screen.queryByText(/publicat/)).not.toBeInTheDocument()
      unmount()
    }
  })

  it('has the act-scoped headline in both catalogs, English translated, and no live "since publication" one', () => {
    const blocks = (locale: string) =>
      readFileSync(resolve(process.cwd(), `src/locales/${locale}/messages.po`), 'utf8').split('\n\n')
    // A live entry, not an obsolete `#~` one.
    const entry = (locale: string) =>
      blocks(locale).find((block) =>
        /^msgid "\{0, plural, one \{O referință de modificare sau completare înregistrată pentru act\.\}/m.test(
          block,
        ),
      )
    expect(entry('ro')).toMatch(/msgstr "\{0, plural, one \{O referință .* pentru act\.\}/)
    expect(entry('en')).toMatch(
      /msgstr "\{0, plural, one \{One amendment reference recorded for the act\.\} other \{# amendment references recorded for the act\.\}\}"/,
    )
    for (const locale of ['ro', 'en']) {
      expect(
        blocks(locale).filter((block) => /^msgid ".*referin.*de la publicare/m.test(block)),
      ).toEqual([])
      // Both new bodies are live entries too.
      for (const body of [
        /^msgid "Rezumatul și structura de mai jos descriu actul așa cum a fost republicat la \{0\}\. Referințele sunt numărate pentru întregul act, deci pot fi și anterioare republicării\./m,
        /^msgid "Referințele sunt numărate pentru întregul act, nu față de versiunea de mai jos, deci pot fi și anterioare ei\./m,
      ]) {
        expect(blocks(locale).filter((block) => body.test(block)), `${locale} ${String(body)}`).toHaveLength(1)
      }
    }
  })
})
