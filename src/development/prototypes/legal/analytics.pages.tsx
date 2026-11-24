import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { ArrowLeft, Link2, Search, SlidersHorizontal } from 'lucide-react'
import { HeadlinePhrase } from '@/components/filters/filter-sheet/headline-phrase'
import { Chip, Group, Row, SHEET_CLOSE } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { HUB_BESIDE_TITLE_CLASS, HUB_SHORTCUT_LINK_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import {
  BAND_LABEL,
  DEFAULT_QUERY,
  DYN_LABEL,
  FX,
  GROUP_LABEL,
  GROUP_ORDER,
  KIND_LABEL,
  LENS_LABEL,
  LENS_READY,
  LENSES,
  TYPE_LABEL,
  YEAR_MAX,
  YEAR_MIN,
  bandOfType,
  figures,
  fmt,
  grid,
  isFiltered,
  pct,
  rank,
  searchOf,
  series,
  slug,
  useQuery,
  type Form,
  type Lens,
  type Order,
  type Query,
} from './analytics.model'
import { MAP, mapFilter } from './analytics.map'
import { CrossGrid, MapThemeTable, RankedTable, SourceLine, StackedYears, TestDataTag, TopicMap } from './analytics.parts'

const D = FX.dims

/** The prototype's own address for a question on another page (the harness's `v` picks the page). */
function hrefOf(page: 'poarta' | 'analiza' | 'tema', q: Query = DEFAULT_QUERY): string {
  const params = new URLSearchParams({ v: page })
  for (const [k, v] of Object.entries(searchOf(q))) if (v !== undefined) params.set(k, v)
  return `/development/legal/analytics?${params.toString()}`
}

const NOTES: readonly string[] = [
  'Instantaneu: corpusul servit la 18 noiembrie 2026. Legile consolidate pe mai multe pagini, ordonanțele de urgență și o parte din ordine lipsesc mai des (21.593 de acte fără text în index: 40% din OUG, 38% din OG, 16% din ordine).',
  'Felul actului e citit din titlu (reguli, v5): 12,4% din acte rămân neîncadrate; 6% sunt încadrate prin reguli de rezervă (marcate în date).',
  'Emitentul e scris în sursă la 66% din acte; pentru legi, ordonanțe și decrete e derivat din tip și dată. Liniile de minister unesc denumiri succesive.',
  'Stocul („legislația așa cum este") lasă deoparte actele care modifică, abrogă, rectifică sau promulgă: conținutul lor trăiește în textul consolidat. Definiție provizorie; starea (în vigoare/abrogat) nu e un filtru aici.',
  'Versiunile consolidate sunt ale Portalului, neoficiale, și doar pentru actele pe care Portalul le consolidează (LEG-X3AV).',
  'Lanțurile (ordonanță → lege, decret → lege, decizie CCR → act) sunt rezolvate din titluri; deciziile Curții sunt citări, nu efecte.',
  'Harta temelor și pagina de temă folosesc date de test până la potrivirea pe întregul corpus.',
]

// ───────────────────────────────────────────────────── front door ──

type Board = 'modificate' | 'contestate' | 'versiuni'

/** `/legislation` (§4.1): search first, the figures, then four bands that each open the analysis on its view. */
export function FrontDoor() {
  const [board, setBoard] = useState<Board>('modificate')
  const all = figures(DEFAULT_QUERY)
  const older = all.total - series(DEFAULT_QUERY, 'felul', 1).years.reduce((s, y) => s + y.values.reduce((a, b) => a + b, 0), 0)
  const ord = FX.ordinances
  const neverApproved = ord.years.reduce((s, y) => s + (y.oug[2] ?? 0) + (y.og[2] ?? 0), 0)
  const ordinances = ord.years.reduce((s, y) => s + (y.oug[0] ?? 0) + (y.oug[1] ?? 0) + (y.oug[2] ?? 0) + (y.og[0] ?? 0) + (y.og[1] ?? 0) + (y.og[2] ?? 0), 0)
  const facts: HubFact[] = [
    fact('acte', all.total, 0, '', t`acte în corpus`, t`servite la ${FX.stamp.snapshotDate}`, hrefOf('analiza')),
    fact('reguli', (all.rules / all.total) * 100, 1, '%', t`stabilesc reguli`, t`din ${fmt(all.total)} de acte, după titlu`, hrefOf('analiza', { ...DEFAULT_QUERY, felul: 'rule-making' })),
    fact('ordonante', (neverApproved / ordinances) * 100, 1, '%', t`ordonanțe fără lege de aprobare găsită`, t`din ${fmt(ordinances)} ordonanțe`, '#lanturi'),
    fact('harta', (all.withText / all.total) * 100, 1, '%', t`acte cu text în index`, t`pot fi puse pe hartă`, hrefOf('analiza', { ...DEFAULT_QUERY, vedere: 'tema' })),
  ]
  const boardRows = [...FX.acts]
    .sort((a, b) => (board === 'modificate' ? b.am - a.am : board === 'contestate' ? b.cc - a.cc : b.v - a.v))
    .slice(0, 8)
  const byGroup = series({ ...DEFAULT_QUERY }, 'felul', 6)
  const months = FX.months
  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <section className="border-b">
        <RuledFrame marker="hero" className="py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <MonoLabel className="block text-primary">{t`Legislație`}</MonoLabel>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {t`Legile României,`}
                <br />
                {t`numărate și puse în ordine.`}
              </h1>
              <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
                {t`${fmt(all.total)} de acte, cele mai multe din ${YEAR_MIN}–${YEAR_MAX} (${fmt(older)} mai vechi sau fără an), așa cum le servea Portalul Legislativ la ${FX.stamp.snapshotDate}: ce fac, cine le emite, cum se leagă între ele.`}
              </p>
              <label className="mt-7 flex min-h-12 items-center gap-2 border bg-background px-3">
                <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                <input className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/70" placeholder={t`Caută o lege, un ordin, un articol…`} disabled />
              </label>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1">
                <span className="text-sm text-muted-foreground">{t`Sau mergi direct la`}</span>
                <a className={HUB_SHORTCUT_LINK_CLASS} href={hrefOf('analiza')}>{t`Analiză`}</a>
                <a className={HUB_SHORTCUT_LINK_CLASS} href={hrefOf('analiza', { ...DEFAULT_QUERY, vedere: 'tema' })}>{t`Teme`}</a>
                <a className={HUB_SHORTCUT_LINK_CLASS} href="#lanturi">{t`Ordonanțe și legi`}</a>
                <a className={HUB_SHORTCUT_LINK_CLASS} href="#monitorul">{t`Monitorul Oficial`}</a>
              </div>
            </div>
            <aside className="border bg-card/80 p-5 lg:col-span-5">
              <IndicatorToggle<Board>
                label={t`Clasament`}
                value={board}
                onChange={setBoard}
                options={[
                  { key: 'modificate', label: t`Cele mai modificate` },
                  { key: 'contestate', label: t`Contestate la CCR` },
                  { key: 'versiuni', label: t`Cele mai multe versiuni` },
                ]}
              />
              <ol className="mt-4 space-y-2.5">
                {boardRows.map((a, j) => (
                  <li key={a.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] gap-2 text-sm">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{j + 1}</span>
                    <span className="line-clamp-2">{a.title}</span>
                    <span className="tabular-nums text-muted-foreground">{board === 'modificate' ? a.am : board === 'contestate' ? a.cc : a.v}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-muted-foreground">
                {board === 'modificate'
                  ? t`Acte modificate, numărate din titlurile actelor care le modifică (${fmt(FX.amendments.status.resolved ?? 0)} rezolvate din ${fmt(Object.values(FX.amendments.status).reduce((s, n) => s + n, 0))}).`
                  : board === 'contestate'
                    ? t`Acte numite în titlul unei decizii a Curții Constituționale: citări, nu efecte. Codurile sunt numărate separat.`
                    : t`Versiuni consolidate de Portal (neoficiale), doar pentru actele pe care le consolidează.`}
              </p>
            </aside>
          </div>
        </RuledFrame>
      </section>
      <section className="border-b">
        <RuledFrame>
          <HubFiguresBand facts={facts} locale="ro" />
        </RuledFrame>
      </section>
      <Band id="harta" index={t`01 / Teme`} title={t`Harta temelor`} lede={t`Actele care stabilesc reguli, grupate după textul lor. Celulele arată câte acte sunt într-un loc; numele temelor stau la centrul lor.`} aside={<a className={HUB_SHORTCUT_LINK_CLASS} href={hrefOf('analiza', { ...DEFAULT_QUERY, vedere: 'tema' })}>{t`Deschide harta`}</a>}>
        <TopicMap count={mapFilter(null, null)} selectedTopic={null} onSelectTopic={(topic) => topic !== null && window.location.assign(`${hrefOf('tema')}&tema=${topic}`)} compact />
      </Band>
      <Band id="ani" index={t`02 / Timp`} title={t`Ce s-a publicat pe an`} lede={t`Actele fiecărui an, după felul lor. Anii fără dată (${fmt(byGroup.unknownYear)} acte) nu sunt pe grafic.`} aside={<a className={HUB_SHORTCUT_LINK_CLASS} href={hrefOf('analiza', { ...DEFAULT_QUERY, forma: 'timp' })}>{t`Analiza în timp`}</a>}>
        <StackedYears years={byGroup.years} labels={byGroup.labels} caption={t`acte pe an`} />
      </Band>
      <Band id="lanturi" index={t`03 / Legături`} title={t`Ordonanțe, legi și decrete`} lede={t`Ce lege a aprobat sau a respins fiecare ordonanță, cât a durat, și ce lege promulgă fiecare decret: citite din titluri.`}>
        <ChainFigures />
      </Band>
      <Band id="monitorul" index={t`04 / Monitorul Oficial`} title={t`Ultimele 36 de luni`} lede={t`Actele publicate în fiecare lună, după tip, din data primei publicări.`}>
        <StackedYears
          years={months.map((m, j) => ({ year: j, values: m.bands }))}
          labels={[...BAND_LABEL]}
          caption={t`acte pe lună, ${months[0]?.month} – ${months[months.length - 1]?.month}`}
          axis={[months[0]?.month ?? '', months[months.length - 1]?.month ?? '']}
          footnote={t`Luna instantaneului e incompletă.`}
        />
      </Band>
      <RuledFrame className="py-8">
        <SourceLine notes={NOTES} />
      </RuledFrame>
    </div>
  )
}

function fact(key: string, value: number, digits: number, unit: string, label: string, note: string, href: string): HubFact {
  return {
    key,
    value,
    digits,
    unit: unit || undefined,
    label,
    note,
    link: (children: ReactNode, className: string) => (
      <a href={href} className={className}>
        {children}
      </a>
    ),
  }
}

function Band({ id, index, title, lede, aside, children }: { readonly id: string; readonly index: string; readonly title: string; readonly lede: string; readonly aside?: ReactNode; readonly children: ReactNode }) {
  return (
    <section id={id} className="border-b">
      <RuledFrame className="py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <HubSectionHead index={index} title={title} lede={lede} aside={aside} />
          </div>
          <div className={cn('min-w-0 lg:col-span-8', HUB_BESIDE_TITLE_CLASS)}>{children}</div>
        </div>
      </RuledFrame>
    </section>
  )
}

function ChainFigures() {
  const o = FX.ordinances
  const tot = (k: 'oug' | 'og', j: number) => o.years.reduce((s, y) => s + (y[k][j] ?? 0), 0)
  const rows = (['oug', 'og'] as const).map((k) => ({ k, approved: tot(k, 0), rejected: tot(k, 1), none: tot(k, 2) }))
  const recent = o.years.filter((y) => y.year >= 2010)
  const p = FX.promulgation
  return (
    <div className="space-y-8">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <MonoLabel>{t`ordonanțe`}</MonoLabel>
            </TableHead>
            <TableHead className="text-right">
              <MonoLabel>{t`aprobate`}</MonoLabel>
            </TableHead>
            <TableHead className="text-right">
              <MonoLabel>{t`respinse`}</MonoLabel>
            </TableHead>
            <TableHead className="text-right">
              <MonoLabel>{t`fără lege găsită`}</MonoLabel>
            </TableHead>
            <TableHead className="text-right">
              <MonoLabel>{t`zile până la lege (mediana)`}</MonoLabel>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.k}>
              <TableCell className="py-1.5">{r.k === 'oug' ? t`de urgență` : t`simple`}</TableCell>
              <TableCell className="py-1.5 text-right tabular-nums">{fmt(r.approved)}</TableCell>
              <TableCell className="py-1.5 text-right tabular-nums">{fmt(r.rejected)}</TableCell>
              <TableCell className="py-1.5 text-right tabular-nums">{fmt(r.none)}</TableCell>
              <TableCell className="py-1.5 text-right tabular-nums">{fmt(o.daysByType[r.k]?.median ?? 0)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <StackedYears
        years={recent.map((y) => ({ year: y.year, values: [(y.oug[0] ?? 0) + (y.og[0] ?? 0), (y.oug[1] ?? 0) + (y.og[1] ?? 0), (y.oug[2] ?? 0) + (y.og[2] ?? 0)] }))}
        labels={[t`aprobate`, t`respinse`, t`fără lege găsită`]}
        caption={t`ordonanțe pe anul ordonanței, din 2010`}
        footnote={t`${fmt(o.laws)} legi de aprobare sau respingere în corpus; ${fmt(o.resolved)} legate de ordonanța lor, ${fmt(o.notInCorpus)} numesc o ordonanță care lipsește din corpus. Zile între publicări: mediana ${fmt(o.days.median ?? 0)}, între ${fmt(o.days.p25 ?? 0)} și ${fmt(o.days.p75 ?? 0)}. Aprobarea cu modificări nu se vede în titlu.`}
      />
      <p className="text-sm text-muted-foreground">
        {t`Decrete de promulgare: ${fmt(p.status.resolved ?? 0)} din ${fmt(Object.values(p.status).reduce((s, n) => s + n, 0))} legate de legea lor, după titlul legii. De la decret la publicarea legii: mediana ${fmt(p.days.median ?? 0)} zile.`}
      </p>
    </div>
  )
}

// ───────────────────────────────────────────────────── analysis page ──

/** `/legislation/analytics` (§4.2): the question as the headline, the population, the lens, the answer, the acts. */
export function AnalysisPage() {
  const [q, move] = useQuery()
  const [sheet, setSheet] = useState(false)
  const [fine, setFine] = useState(false)
  const f = figures(q)
  const population = q.populatie === 'stoc' ? t`legislația așa cum este` : t`ce s-a publicat`
  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <section className="border-b">
        <RuledFrame className="py-10 sm:py-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a href={hrefOf('poarta')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t`Legislație`}
            </a>
            <MonoLabel className="text-muted-foreground">{t`Date din ${FX.stamp.snapshotDate}`}</MonoLabel>
          </div>
          <MonoLabel className="mt-6 block text-primary">{t`Analiză`}</MonoLabel>
          <Headline q={q} move={move} onOpen={() => setSheet(true)} />
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <button type="button" onClick={() => setSheet(true)} className="font-medium text-foreground underline-offset-4 hover:underline">
              {t`+ Adaugă un filtru`}
            </button>
            <button type="button" onClick={() => setSheet(true)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              {t`Filtre`}
            </button>
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label={t`Copiază adresa întrebării`}
              title={t`Copiază adresa întrebării`}
              onClick={() => void navigator.clipboard?.writeText(window.location.href)}
            >
              <Link2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </RuledFrame>
      </section>
      <nav className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur" aria-label={t`Populația`}>
        <RuledFrame className="flex flex-wrap items-center justify-between gap-3 py-3">
          <IndicatorToggle<'flux' | 'stoc'>
            label={t`Populația`}
            value={q.populatie}
            onChange={(populatie) => move({ ...q, populatie })}
            options={[
              { key: 'flux', label: t`Flux · ce s-a publicat` },
              { key: 'stoc', label: t`Stoc · legislația așa cum este` },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {q.populatie === 'stoc'
              ? t`Un rând pe act de bază; modificările trăiesc în textul consolidat.`
              : t`Fiecare act publicat, la data lui.`}
          </p>
        </RuledFrame>
      </nav>
      <section className="border-b">
        <RuledFrame>
          <HubFiguresBand
            locale="ro"
            facts={[
              fact('sel', f.total, 0, '', t`acte în selecție`, t`din ${fmt(f.all)} (${population})`, '#raspuns'),
              fact('reguli', f.total ? (f.rules / f.total) * 100 : 0, 1, '%', t`stabilesc reguli`, t`din ${fmt(f.total)}, după titlu`, '#raspuns'),
              fact('text', f.total ? (f.withText / f.total) * 100 : 0, 1, '%', t`au text în index`, t`${fmt(f.withText)} pot fi puse pe hartă`, '#raspuns'),
            ]}
          />
        </RuledFrame>
      </section>
      <section id="raspuns" className="border-b" aria-label={t`Răspunsul`}>
        <RuledFrame className="py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <MonoLabel className="block text-muted-foreground">{t`Privește după`}</MonoLabel>
              <IndicatorToggle<Lens>
                className="mt-2 grid-flow-row grid-cols-3"
                label={t`Privește după`}
                value={q.vedere}
                onChange={(vedere) => move({ ...q, vedere, forma: vedere === 'tema' ? 'clasament' : q.forma })}
                options={LENSES.map((key) => ({ key, label: LENS_READY[key] ? LENS_LABEL[key] : `${LENS_LABEL[key]} · ${t`în curând`}` }))}
              />
            </div>
            {q.vedere !== 'tema' && LENS_READY[q.vedere] ? (
              <IndicatorToggle<Form>
                label={t`Forma răspunsului`}
                value={q.forma}
                onChange={(forma) => move({ ...q, forma })}
                options={[
                  { key: 'clasament', label: t`Clasament` },
                  { key: 'timp', label: t`În timp` },
                  { key: 'grila', label: t`Grilă` },
                ]}
              />
            ) : null}
          </div>
          <div className="mt-6">
            <Answer q={q} move={move} fine={fine} setFine={setFine} />
          </div>
        </RuledFrame>
      </section>
      <ActsBand q={q} move={move} />
      <RuledFrame className="py-8">
        <SourceLine notes={NOTES} />
      </RuledFrame>
      <FilterSheet q={q} move={move} open={sheet} onOpenChange={setSheet} />
    </div>
  )
}

/** The headline: the question, each filter a phrase that opens the panel and whose ✕ drops it. */
function Headline({ q, move, onOpen }: { readonly q: Query; readonly move: (q: Query) => void; readonly onOpen: () => void }) {
  const typeText = q.tip.length ? q.tip.map((i) => TYPE_LABEL[D.types[i] ?? ''] ?? '').join(', ') : t`de orice tip`
  const yearText = q.an ? (q.an.from === q.an.to ? t`din ${q.an.from}` : t`din ${q.an.from}–${q.an.to}`) : t`din ${YEAR_MIN}–${YEAR_MAX}`
  const issuerText = q.emitent === null ? t`de la orice emitent` : t`de la ${D.issuers[q.emitent]?.name ?? ''}`
  const felulText = q.felul === null ? t`de orice fel` : t`care ${GROUP_LABEL[q.felul] ?? KIND_LABEL[q.felul] ?? q.felul}`
  const dynText = q.dinamica === null ? null : t`cu ${DYN_LABEL[q.dinamica]}`
  const phrase = (text: string, set: boolean, clear: () => void) =>
    set ? <HeadlinePhrase text={text} removeLabel={t`Scoate filtrul ${text}`} onOpen={onOpen} onRemove={clear} /> : <span role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} className="cursor-pointer underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em]">{text}</span>
  return (
    <h1 className="mt-3 max-w-[30ch] text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-4xl">
      {t`Acte`} {phrase(typeText, q.tip.length > 0, () => move({ ...q, tip: [] }))}, {phrase(yearText, q.an !== null, () => move({ ...q, an: null }))},{' '}
      {phrase(issuerText, q.emitent !== null, () => move({ ...q, emitent: null }))}, {phrase(felulText, q.felul !== null, () => move({ ...q, felul: null }))}
      {dynText ? <>, {phrase(dynText, true, () => move({ ...q, dinamica: null }))}</> : null}
      {', '}
      <span className="text-muted-foreground">{t`toate domeniile, toate temele`}</span>
    </h1>
  )
}

function Answer({ q, move, fine, setFine }: { readonly q: Query; readonly move: (q: Query) => void; readonly fine: boolean; readonly setFine: (fine: boolean) => void }) {
  const [topic, setTopic] = useState<number | null>(null)
  if (!LENS_READY[q.vedere]) {
    return (
      <div className="border border-dashed p-8 text-sm text-muted-foreground">
        {t`Domeniile (16, scrise de AI pe corpusul anterior) intră aici după ce le măsurăm acoperirea pe corpusul nou și după clasificatorul care le duce la toate actele.`}
      </div>
    )
  }
  if (q.vedere === 'tema') {
    const bands = q.tip.length ? [...new Set(q.tip.map(bandOfType))] : null
    const count = mapFilter(bands, q.an)
    const tp = topic === null ? null : MAP.topics[topic]
    return (
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <TopicMap count={count} selectedTopic={topic} onSelectTopic={setTopic} />
          <p className="mt-3 text-xs text-muted-foreground">{t`Harta de test se repictează doar după tip și perioadă; emitentul, felul și dinamica se vor aplica pe datele reale.`}</p>
        </div>
        <div className="lg:col-span-4">
          {tp ? (
            <div className="border bg-card/80 p-5">
              <TestDataTag />
              <h3 className="mt-3 text-lg font-semibold">{tp.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tp.keywords.join(' · ')}</p>
              <p className="mt-3 text-sm tabular-nums">{t`${fmt(tp.size)} acte · stabilitate ${pct(tp.stability, 0)}`}</p>
              <a className={cn(HUB_SHORTCUT_LINK_CLASS, 'mt-3')} href={`${hrefOf('tema')}&tema=${tp.id}`}>{t`Pagina temei`}</a>
            </div>
          ) : (
            <MapThemeTable count={count} onSelectTheme={(th) => setTopic(MAP.topics.find((x) => x.theme === th)?.id ?? null)} />
          )}
        </div>
      </div>
    )
  }
  if (q.forma === 'timp') {
    const s = series(q, q.vedere)
    return <StackedYears years={s.years} labels={s.labels} caption={t`acte pe an, după ${LENS_LABEL[q.vedere].toLowerCase()}`} footnote={s.unknownYear ? t`${fmt(s.unknownYear)} acte fără an nu sunt pe grafic.` : undefined} />
  }
  if (q.forma === 'grila') {
    const other: Lens[] = (['felul', 'tip', 'emitent', 'dinamica'] as Lens[]).filter((l) => l !== q.vedere)
    const cu = other.includes(q.cu) ? q.cu : other[0]!
    const g = grid(q, q.vedere, cu)
    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <MonoLabel className="text-muted-foreground">{t`încrucișat cu`}</MonoLabel>
          <IndicatorToggle<Lens> label={t`A doua privire`} value={cu} onChange={(next) => move({ ...q, cu: next })} options={other.map((key) => ({ key, label: LENS_LABEL[key] }))} />
        </div>
        <CrossGrid rows={g.rows} cols={g.cols} cells={g.cells} rowCaption={LENS_LABEL[q.vedere]} />
      </div>
    )
  }
  const r = rank(q, q.vedere, q.vedere === 'felul' && fine)
  const coverage =
    q.vedere === 'felul'
      ? t`Felul e citit din titlu; „neîncadrate" sunt actele pe care regulile nu le prind.`
      : q.vedere === 'emitent'
        ? t`Emitenții sunt linii (denumiri succesive unite); la legi, ordonanțe și decrete emitentul e derivat din tip și dată.`
        : q.vedere === 'dinamica'
          ? t`Versiuni consolidate de Portal, numărate din formele actului.`
          : t`Tipul normalizat (19 valori).`
  return (
    <div>
      {q.vedere === 'felul' ? (
        <IndicatorToggle<'grupe' | 'feluri'>
          className="mb-4"
          label={t`Nivelul`}
          value={fine ? 'feluri' : 'grupe'}
          onChange={(v) => setFine(v === 'feluri')}
          options={[
            { key: 'grupe', label: t`Grupe (7)` },
            { key: 'feluri', label: t`Feluri (${D.kinds.length})` },
          ]}
        />
      ) : null}
      <RankedTable
        rows={r.rows}
        total={r.total}
        limit={25}
        caption={LENS_LABEL[q.vedere]}
        denominator={coverage}
        pickedKey={q.vedere === 'felul' ? q.felul : null}
        onPick={(key) => {
          if (q.vedere === 'felul') move({ ...q, felul: q.felul === key ? null : key })
          else if (q.vedere === 'tip') move({ ...q, tip: q.tip.length === 1 && D.types[q.tip[0]!] === key ? [] : [D.types.indexOf(key)] })
          else if (q.vedere === 'emitent') move({ ...q, emitent: q.emitent === Number(key) ? null : Number(key) })
          else if (q.vedere === 'dinamica') move({ ...q, dinamica: q.dinamica === Number(key) ? null : Number(key) })
        }}
      />
    </div>
  )
}

/** The acts under the answer: a fixture sample, sortable, each row opening the act (not wired here). */
function ActsBand({ q, move }: { readonly q: Query; readonly move: (q: Query) => void }) {
  const rows = FX.acts.filter((a) => {
    if (q.an && (a.y < q.an.from || a.y > q.an.to)) return false
    if (q.tip.length && !q.tip.includes(a.t)) return false
    if (q.emitent !== null && a.i !== q.emitent) return false
    if (q.felul !== null && D.kinds[a.k]?.key !== q.felul && D.kinds[a.k]?.group !== q.felul) return false
    if (q.dinamica !== null && (a.v === 0 ? 0 : a.v <= 2 ? 1 : a.v <= 9 ? 2 : 3) !== q.dinamica) return false
    return true
  })
  const key = (a: (typeof rows)[number]) => (q.ordine === 'modificari' ? a.am : q.ordine === 'decizii' ? a.cc : q.ordine === 'versiuni' ? a.v : a.y)
  const sorted = [...rows].sort((a, b) => key(b) - key(a)).slice(0, 25)
  const f = figures(q)
  return (
    <section className="border-b">
      <RuledFrame className="py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <HubSectionHead index={t`Actele`} title={t`Actele din selecție`} lede={t`Un eșantion de ${fmt(FX.acts.length)} acte (cele mai modificate, contestate, reemise și câte 40 din fiecare grupă), nu toată selecția de ${fmt(f.total)}.`} />
          <IndicatorToggle<Order>
            label={t`Ordonează după`}
            value={q.ordine}
            onChange={(ordine) => move({ ...q, ordine })}
            options={[
              { key: 'modificari', label: t`Modificări` },
              { key: 'decizii', label: t`Decizii CCR` },
              { key: 'versiuni', label: t`Versiuni` },
              { key: 'an', label: t`An` },
            ]}
          />
        </div>
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>
                <MonoLabel>{t`act`}</MonoLabel>
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <MonoLabel>{t`felul`}</MonoLabel>
              </TableHead>
              <TableHead className="text-right">
                <MonoLabel>{t`modif.`}</MonoLabel>
              </TableHead>
              <TableHead className="text-right">
                <MonoLabel>{t`CCR`}</MonoLabel>
              </TableHead>
              <TableHead className="text-right">
                <MonoLabel>{t`vers.`}</MonoLabel>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="py-1.5">
                  <span className="line-clamp-2">{a.title}</span>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {TYPE_LABEL[D.types[a.t] ?? ''] ?? ''} · {a.y || '—'} · {D.issuers[a.i]?.name ?? ''} · #{a.id}
                  </span>
                </TableCell>
                <TableCell className="hidden py-1.5 text-sm text-muted-foreground sm:table-cell">{KIND_LABEL[D.kinds[a.k]?.key ?? ''] ?? ''}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{a.am || '—'}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{a.cc || '—'}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{a.v || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-3 text-xs text-muted-foreground">{t`Primele ${sorted.length} din ${rows.length} acte ale eșantionului din selecție.`}</p>
      </RuledFrame>
    </section>
  )
}

/** The whole filter set (G6): from the right on a desktop, from the bottom on a phone. */
function FilterSheet({ q, move, open, onOpenChange }: { readonly q: Query; readonly move: (q: Query) => void; readonly open: boolean; readonly onOpenChange: (open: boolean) => void }) {
  const [issuerSearch, setIssuerSearch] = useState('')
  const typeCounts = rank(q, 'tip')
  const toggleType = (i: number) => move({ ...q, tip: q.tip.includes(i) ? q.tip.filter((x) => x !== i) : [...q.tip, i] })
  const years = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, j) => YEAR_MIN + j)
  const issuers = D.issuers.map((x, j) => ({ ...x, j })).filter((x) => slug(x.name).includes(slug(issuerSearch)))
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" closeClassName={SHEET_CLOSE} className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t`Filtre`}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 divide-y">
          <Group title={t`Când`}>
            <Row label={t`De la`}>
              <select className="min-h-11 w-full border bg-background px-2 text-base sm:min-h-10 sm:text-sm" value={q.an?.from ?? YEAR_MIN} onChange={(e) => move({ ...q, an: { from: Number(e.target.value), to: Math.max(Number(e.target.value), q.an?.to ?? YEAR_MAX) } })}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Row>
            <Row label={t`Până la`}>
              <select className="min-h-11 w-full border bg-background px-2 text-base sm:min-h-10 sm:text-sm" value={q.an?.to ?? YEAR_MAX} onChange={(e) => move({ ...q, an: { from: Math.min(Number(e.target.value), q.an?.from ?? YEAR_MIN), to: Number(e.target.value) } })}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Row>
          </Group>
          <Group title={t`Ce`}>
            <Row label={t`Tip`}>
              <div className="grid grid-cols-2 gap-1">
                {D.types.map((ty, i) => {
                  const n = typeCounts.rows.find((r) => r.key === ty)?.n ?? 0
                  return (
                    <button key={ty} type="button" aria-pressed={q.tip.includes(i)} onClick={() => toggleType(i)} className={cn('flex min-h-11 items-center justify-between gap-2 border px-2 text-left text-sm sm:min-h-10', q.tip.includes(i) ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted')}>
                      <span className="truncate">{TYPE_LABEL[ty] ?? ty}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{fmt(n)}</span>
                    </button>
                  )
                })}
              </div>
            </Row>
            <Row label={t`Felul`}>
              <div className="grid gap-1">
                {GROUP_ORDER.map((g) => (
                  <button key={g} type="button" aria-pressed={q.felul === g} onClick={() => move({ ...q, felul: q.felul === g ? null : g })} className={cn('min-h-11 border px-2 text-left text-sm sm:min-h-10', q.felul === g ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted')}>
                    {GROUP_LABEL[g]}
                  </button>
                ))}
              </div>
            </Row>
            <Row label={t`Versiuni`}>
              <div className="grid grid-cols-2 gap-1">
                {DYN_LABEL.map((l, j) => (
                  <button key={l} type="button" aria-pressed={q.dinamica === j} onClick={() => move({ ...q, dinamica: q.dinamica === j ? null : j })} className={cn('min-h-11 border px-2 text-left text-sm sm:min-h-10', q.dinamica === j ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted')}>
                    {l}
                  </button>
                ))}
              </div>
            </Row>
          </Group>
          <Group title={t`Cine`}>
            <Row label={t`Emitent`}>
              {q.emitent !== null ? (
                <Chip label={D.issuers[q.emitent]?.name ?? ''} onClear={() => move({ ...q, emitent: null })} />
              ) : (
                <>
                  <input value={issuerSearch} onChange={(e) => setIssuerSearch(e.target.value)} placeholder={t`Caută un emitent`} className="min-h-11 w-full border bg-background px-2.5 text-base sm:min-h-10 sm:text-sm" />
                  <div className="max-h-72 overflow-y-auto border">
                    {issuers.map((x) => (
                      <button key={x.name} type="button" onClick={() => move({ ...q, emitent: x.j })} className="flex min-h-11 w-full items-center justify-between gap-3 px-2.5 text-left text-sm hover:bg-muted sm:min-h-10">
                        <span className="truncate">{x.name}</span>
                        <span className="text-xs text-muted-foreground">{x.family}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Row>
          </Group>
          <Group title={t`Despre ce`}>
            <p className="text-sm text-muted-foreground">{t`Domeniul și tema vin după potrivirea pe tot corpusul (în curând).`}</p>
          </Group>
        </div>
        {isFiltered(q) ? (
          <button type="button" onClick={() => move({ ...DEFAULT_QUERY, populatie: q.populatie, vedere: q.vedere, forma: q.forma })} className="mt-6 min-h-11 w-full border text-sm hover:bg-muted">
            {t`Scoate toate filtrele`}
          </button>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

// ───────────────────────────────────────────────────── topic page ──

/** A topic's page (§4.3) on the placeholder map: every figure is test data and says so. */
export function TopicPage() {
  const [q] = useQuery()
  const [selected, setSelected] = useState<number | null>(null)
  const id = selected ?? q.tema ?? 0
  const tp = MAP.topics[id] ?? MAP.topics[0]!
  const theme = MAP.themes[tp.theme]!
  const cells = MAP.cells.filter((c) => c.topic === tp.id)
  const bands = BAND_LABEL.map((_, j) => cells.reduce((s, c) => s + (c.bands[j] ?? 0), 0))
  const eras = [0, 1, 2, 3].map((j) => cells.reduce((s, c) => s + (c.eras[j] ?? 0), 0))
  const total = bands.reduce((s, n) => s + n, 0) || 1
  const neighbours = MAP.topics
    .filter((x) => x.id !== tp.id)
    .map((x) => ({ x, d: Math.hypot(x.x - tp.x, x.y - tp.y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6)
  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <section className="border-b">
        <RuledFrame className="py-10 sm:py-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a href={hrefOf('analiza', { ...DEFAULT_QUERY, vedere: 'tema' })} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t`Harta temelor`}
            </a>
            <TestDataTag />
          </div>
          <MonoLabel className="mt-6 block text-primary">{t`Temă · ${theme.name}`}</MonoLabel>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{tp.name}</h1>
          <p className="mt-3 text-base text-muted-foreground">{t`Cuvinte-cheie (generate automat): ${tp.keywords.join(', ')}.`}</p>
        </RuledFrame>
      </section>
      <section className="border-b">
        <RuledFrame>
          <HubFiguresBand
            locale="ro"
            facts={[
              fact('size', tp.size, 0, '', t`acte în subiect`, t`date de test`, '#profil'),
              fact('stab', tp.stability * 100, 0, '%', t`stabilitate la repotriviri`, t`date de test`, '#profil'),
              fact('vecini', neighbours.length, 0, '', t`subiecte vecine`, t`cele mai apropiate`, '#vecini'),
            ]}
          />
        </RuledFrame>
      </section>
      <Band id="profil" index={t`01 / Profil`} title={t`Tip și epocă`} lede={t`Cum se împart actele subiectului pe tipuri și pe decenii (date de test).`}>
        <div className="grid gap-8 sm:grid-cols-2">
          <ProfileBars labels={[...BAND_LABEL]} values={bands} total={total} />
          <ProfileBars labels={['1990–1999', '2000–2009', '2010–2019', '2020–2026']} values={eras} total={eras.reduce((s, n) => s + n, 0) || 1} />
        </div>
      </Band>
      <Band id="harta" index={t`02 / Locul pe hartă`} title={t`Unde stă subiectul`} lede={t`Celulele subiectului, conturate; un clic pe altă celulă deschide alt subiect.`}>
        <TopicMap count={mapFilter(null, null)} selectedTopic={tp.id} onSelectTopic={(x) => setSelected(x)} compact />
      </Band>
      <Band id="vecini" index={t`03 / Vecini`} title={t`Subiecte apropiate`} lede={t`Cele mai apropiate subiecte pe hartă; actele centrale și cele mai citate vin cu datele reale.`}>
        <ol className="divide-y border-y">
          {neighbours.map(({ x, d }) => (
            <li key={x.id}>
              <button type="button" onClick={() => setSelected(x.id)} className="flex min-h-11 w-full items-center justify-between gap-3 py-1.5 text-left text-sm hover:bg-muted/50">
                <span>{x.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{t`distanță ${d.toFixed(1)} · ${fmt(x.size)} acte`}</span>
              </button>
            </li>
          ))}
        </ol>
      </Band>
      <RuledFrame className="py-8">
        <SourceLine notes={NOTES} />
      </RuledFrame>
    </div>
  )
}

function ProfileBars({ labels, values, total }: { readonly labels: readonly string[]; readonly values: readonly number[]; readonly total: number }) {
  return (
    <ul className="space-y-2">
      {labels.map((l, j) => (
        <li key={l} className="grid grid-cols-[9rem_minmax(0,1fr)_3.5rem] items-center gap-2 text-sm">
          <span className="truncate text-muted-foreground">{l}</span>
          <span className="h-2 bg-muted">
            <span className="block h-2 bg-chart-1" style={{ width: `${((values[j] ?? 0) / total) * 100}%` }} />
          </span>
          <span className="text-right text-xs tabular-nums">{pct((values[j] ?? 0) / total, 0)}</span>
        </li>
      ))}
    </ul>
  )
}
