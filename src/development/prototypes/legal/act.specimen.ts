import type { LegalOutlineEntry } from '@/schemas/legal'
import type { TldfBlock, TldfLink, TldfMark, TldfMarkKind, TldfRun } from '@/features/legal/lib/tldf/types'

/**
 * A specimen text for the act page's prototype: one made-up document that holds every kind of element the text
 * format can carry (TLDF 1.1, 29 kinds) and every state a block can be in, so each can be judged in the new style
 * without hunting for an act that happens to have it. It is NOT an act's text: the page says so where it is shown.
 *
 * The shapes follow the real artifacts (`features/legal/mocks/fixtures/tldf/`) and the scrapper's spec
 * (`prod-db/TLDF_SCHEMA_SPEC.md` §3.2): a run's span covers its text only, its separator sits in the gap before
 * it; a block's span is the hull of its runs and descendants; marks are document-level spans over the folded text.
 * The builder below keeps one cursor over that folded text, so the spans are right by construction, and a test
 * checks the result against the feature's own schema and fold.
 */

type Inline = string | { readonly mark: TldfMarkKind; readonly text: string; readonly link?: TldfLink }
type Line = { readonly role?: 'ttl' | 'den' | 'bdy'; readonly sep?: '\n' | ' '; readonly text: Inline | readonly Inline[]; readonly struck?: 'partial' | 'full' }
type Flags = Partial<Pick<TldfBlock, 'struck' | 'struck_repealed' | 'annotation_role' | 'changed_since_base_form' | 'label' | 'number' | 'grid' | 'asset' | 'origin'>>
type Node = { readonly kind: string; readonly type: string; readonly lines?: readonly Line[]; readonly children?: readonly Node[]; readonly flags?: Flags }

/** The outline's fixed depth by kind (the server's grammar rank: carte 1 … articol 7; an annex restarts at 1). */
const DEPTH: Readonly<Record<string, number>> = { carte: 1, parte: 2, titlu: 3, capitol: 4, sectiune: 5, subcapitol: 6, articol: 7, anexa: 1, apendice: 2 }

export type Specimen = { readonly blocks: readonly TldfBlock[]; readonly marks: readonly TldfMark[]; readonly outline: readonly LegalOutlineEntry[] }

function compile(documentId: string, nodes: readonly Node[]): Specimen {
  let cursor = 0
  let first = true
  let count = 0
  const marks: TldfMark[] = []
  const outline: LegalOutlineEntry[] = []

  const build = (node: Node): TldfBlock => {
    const id = `s${String(++count)}`
    const anchor = cursor
    const depth = DEPTH[node.kind]
    const order = outline.length
    if (depth !== undefined) outline.push({ documentId, path: id, nodeKind: node.kind, label: null, numberKey: null, numberStatus: null, depth, orderIndex: order, charStart: null, charEnd: null })
    const content: TldfRun[] = []
    for (const line of node.lines ?? []) {
      const pieces = typeof line.text === 'string' || !Array.isArray(line.text) ? [line.text as Inline] : (line.text as readonly Inline[])
      // The very first run of a document has no separator before it.
      const sep = first ? undefined : (line.sep ?? '\n')
      first = false
      if (sep !== undefined) cursor += sep.length
      const start = cursor
      let text = ''
      for (const piece of pieces) {
        if (typeof piece === 'string') text += piece
        else {
          marks.push({ ordinal: marks.length, kind: piece.mark, span: [start + text.length, start + text.length + piece.text.length], ...(piece.link !== undefined && { link: piece.link }) })
          text += piece.text
        }
      }
      cursor = start + text.length
      content.push({ text, span: [start, cursor], ...(line.role !== undefined && { role: line.role }), ...(sep !== undefined && { sep }), ...(line.struck !== undefined && { struck: line.struck }) })
    }
    const children = (node.children ?? []).map(build)
    const starts = [...content.map((run) => run.span[0]), ...children.map((child) => child.span[0])]
    const span: [number, number] = starts.length === 0 ? [anchor, anchor] : [Math.min(...starts), cursor]
    if (depth !== undefined) {
      // As served: the outline's label is the block's label, the rank alone („Capitolul I"), never its name.
      const entry = outline[order]
      if (entry !== undefined) outline[order] = { ...entry, label: node.flags?.label ?? null, numberKey: node.flags?.number?.key ?? null, numberStatus: node.flags?.number ? 'parsed' : null, charStart: span[0], charEnd: span[1] }
    }
    return { id, kind: node.kind, type: node.type, span, content, ...(children.length > 0 && { children }), ...node.flags }
  }
  const blocks = nodes.map(build)
  return { blocks, marks, outline }
}

/* ── a small vocabulary for writing the specimen ─────────────────────────── */

const act = (text: string, actId: number): Inline => ({ mark: 'reference', text, link: { kind: 'act', target_act_id: actId, resolution: 'held' } })
const outside = (text: string, href: string): Inline => ({ mark: 'reference', text, link: { kind: 'external', href } })
const loose = (text: string): Inline => ({ mark: 'reference', text, link: { kind: 'act_missing_id' } })
const inside = (text: string): Inline => ({ mark: 'legal_ref', text })
const em = (mark: 'italic' | 'bold' | 'underline' | 'struck', text: string): Inline => ({ mark, text })

const container = (kind: string, type: string, rank: string, name: string | null, children: readonly Node[], flags?: Flags): Node => ({
  kind,
  type,
  lines: [{ role: 'ttl', text: rank }, ...(name !== null ? [{ role: 'den' as const, text: name }] : [])],
  children,
  flags: { label: rank, ...flags },
})
const article = (number: string, name: string | null, children: readonly Node[], flags?: Flags): Node =>
  container('articol', 'ART', `Articolul ${number}`, name, children, { number: { key: number, system: 'arabic' }, ...flags })
const item = (kind: 'alineat' | 'litera' | 'punct' | 'liniuta', type: string, marker: string, body: Inline | readonly Inline[], children: readonly Node[] = [], flags?: Flags): Node => ({
  kind,
  type,
  lines: [
    { role: 'ttl', text: marker },
    { role: 'bdy', text: body },
  ],
  children,
  ...(flags !== undefined && { flags }),
})
const al = (n: string, body: Inline | readonly Inline[], children: readonly Node[] = [], flags?: Flags) => item('alineat', 'ALN', `(${n})`, body, children, flags)
const lit = (letter: string, body: Inline | readonly Inline[], children: readonly Node[] = [], flags?: Flags) => item('litera', 'LIT', `${letter})`, body, children, flags)
const pct = (n: string, body: Inline | readonly Inline[], children: readonly Node[] = [], flags?: Flags) => item('punct', 'PCT', `${n}.`, body, children, flags)
const dash = (body: Inline | readonly Inline[]) => item('liniuta', 'LIN', '–', body)
const p = (body: Inline | readonly Inline[], flags?: Flags): Node => ({ kind: 'paragraf', type: 'PAR', lines: [{ text: body }], ...(flags !== undefined && { flags }) })
/** The apparatus line a consolidated form adds after a changed provision. */
const amended = (body: Inline | readonly Inline[]): Node => p(body, { annotation_role: 'amendment_note' })
const row = (cells: readonly (string | { readonly text: string; readonly cols?: number; readonly rows?: number })[]): Node => ({
  kind: 'rand',
  type: 'ROW',
  children: cells.map((cell) => {
    const text = typeof cell === 'string' ? cell : cell.text
    const grid = typeof cell === 'string' || (cell.cols === undefined && cell.rows === undefined) ? undefined : { cols: cell.cols ?? 1, rows: cell.rows ?? 1 }
    return { kind: 'celula', type: 'CEL', ...(text !== '' && { lines: [{ text }] }), ...(grid !== undefined && { flags: { grid } }) }
  }),
})
const table = (rows: readonly Node[]): Node => ({ kind: 'tabel', type: 'TBL', children: rows })

const PORTAL = 'https://legislatie.just.ro/Public/DetaliiDocument/178667'

const NODES: readonly Node[] = [
  { kind: 'titlu_act', type: 'DEN', lines: [{ text: 'LEGE nr. 98 din 19 mai 2016' }] },
  { kind: 'subtitlu_act', type: 'HDR', lines: [{ text: 'privind achizițiile publice' }] },
  { kind: 'emitent', type: 'EMT', lines: [{ role: 'ttl', text: 'EMITENT' }, { role: 'bdy', text: 'PARLAMENTUL' }], flags: { label: 'EMITENT' } },
  { kind: 'publicare', type: 'PUB', lines: [{ role: 'ttl', text: 'Publicat în' }, { role: 'bdy', text: 'MONITORUL OFICIAL nr. 390 din 23 mai 2016' }], flags: { label: 'Publicat în' } },
  {
    kind: 'nota',
    type: 'NTA',
    lines: [{ role: 'ttl', text: 'Notă' }],
    flags: { label: 'Notă' },
    // As served: a note's lines are notes of their own inside it.
    children: [
      { kind: 'nota', type: 'NTA', lines: [{ text: [act('Articolul XI din ORDONANȚA DE URGENȚĂ nr. 26 din 18 martie 2022', 252718), ', publicată în MONITORUL OFICIAL nr. 272 din 21 martie 2022 prevede:'] }] },
      { kind: 'nota', type: 'NTA', lines: [{ text: 'Articolul XI' }] },
      { kind: 'nota', type: 'NTA', lines: [{ text: ['(1) Prevederile ', inside('art. I'), ' și ', inside('II'), ' se aplică procedurilor de atribuire inițiate după data intrării în vigoare a prezentei ordonanțe de urgență.'] }] },
      { kind: 'nota', type: 'NTA', lines: [{ text: '(2) Procedurile de atribuire în curs de desfășurare la data intrării în vigoare a prezentei ordonanțe de urgență rămân supuse legislației în vigoare la data inițierii acestora. Prin procedură de atribuire în curs de desfășurare se înțelege orice procedură pentru care s-a transmis un anunț de participare, un anunț de participare simplificat sau, după caz, o invitație de participare până la data intrării în vigoare a prezentei ordonanțe de urgență.' }] },
      { kind: 'nota', type: 'NTA', lines: [{ text: ['(3) Prevederile ', inside('art. I'), ' și ', inside('II'), ' din prezenta ordonanță de urgență se aplică contractelor de achiziție publică încheiate de la data intrării în vigoare, iar la contractele aflate în derulare doar pentru situații juridice născute de la data intrării în vigoare a prezentei ordonanțe de urgență.'] }] },
      { kind: 'nota', type: 'NTA', lines: [{ text: ['(4) Prevederile ', inside('art. III'), ' din prezenta ordonanță de urgență se aplică numai contestațiilor, cererilor sau plângerilor formulate, respectiv termenelor de introducere a acțiunii începute de la intrarea în vigoare a prezentei ordonanțe de urgență.'] }] },
    ],
  },
  p('Parlamentul României adoptă prezenta lege.'),
  container('parte', 'PRT', 'Partea I', 'Regimul general al achizițiilor', [
    container('titlu', 'TTL', 'Titlul I', 'Dispoziții generale', [
      container('capitol', 'CAP', 'Capitolul I', 'Obiect, scop și principii', [
        container('sectiune', 'SEC', 'Secțiunea 1', 'Obiect și scop', [
          article('1', 'Obiectul legii', [
            p([
              'Prezenta lege reglementează modul de realizare a achizițiilor publice, procedurile de atribuire a contractelor de achiziție publică și de organizare a concursurilor de soluții, în acord cu ',
              outside('Directiva 2014/24/UE', 'https://eur-lex.europa.eu/eli/dir/2014/24/oj'),
              ' a Parlamentului European și a Consiliului.',
            ]),
          ]),
          article('2', 'Scop și principii', [
            al('1', 'Scopul prezentei legi îl constituie asigurarea cadrului legal necesar pentru a realiza achiziționarea de bunuri, servicii și lucrări în condiții de eficiență economică și socială.'),
            al('2', 'Principiile care stau la baza atribuirii contractelor de achiziție publică și a organizării concursurilor de soluții sunt:', [
              lit('a', 'nediscriminarea;'),
              lit('b', 'tratamentul egal;'),
              lit('c', 'recunoașterea reciprocă;'),
              lit('d', 'transparența;'),
              lit('e', 'proporționalitatea;'),
              lit('f', 'asumarea răspunderii.'),
            ]),
            al('3', ['Dispozițiile ', act('Legii nr. 99/2016', 178680), ' privind achizițiile sectoriale se aplică în mod corespunzător, cu respectarea ', loose('normelor metodologice de aplicare'), ', potrivit ', inside('art. 3 alin. (1) lit. f)'), '.']),
          ]),
        ]),
        container('sectiune', 'SEC', 'Secțiunea a 2-a', 'Definiții', [
          article('3', null, [
            al('1', 'În sensul prezentei legi, termenii și expresiile de mai jos au următoarele semnificații:', [
              lit('a', 'abatere profesională – orice comportament culpabil care afectează credibilitatea profesională a operatorului economic în cauză, cum ar fi:', [
                pct('1', 'încălcări ale drepturilor de proprietate intelectuală, săvârșite cu intenție sau din culpă gravă, inclusiv:', [dash('încălcări ale normelor de deontologie în sensul strict al profesiei;'), dash('orice fapte privind onestitatea profesională, constatate de o autoritate competentă.')]),
                pct('2', 'încălcări ale regulilor de concurență de tip cartel care vizează trucarea licitațiilor.'),
              ]),
              lit('b', ['achiziție sau achiziție publică – achiziția de lucrări, de produse sau de servicii prin intermediul unui contract de achiziție publică de către una ori mai multe autorități contractante de la operatori economici desemnați de către acestea, ', em('italic', 'indiferent dacă'), ' lucrările, produsele sau serviciile sunt destinate ori nu realizării unui interes public;']),
              lit('m', 'contract de achiziție publică de lucrări – contractul de achiziție publică care are ca obiect: fie exclusiv execuția, fie atât proiectarea, cât și execuția de lucrări în legătură cu una dintre activitățile prevăzute în anexa nr. 1;', [], { changed_since_base_form: true }),
              amended(['(la 28-07-2022, Litera m) din Alineatul (1), Articolul 3, Secțiunea a 2-a, Capitolul I a fost modificată de ', act('Punctul 1, Articolul I din LEGEA nr. 256 din 21 iulie 2022', 257743), ', publicată în MONITORUL OFICIAL nr. 744 din 25 iulie 2022)']),
              lit('n', ['contract de achiziție publică de produse – contractul care are ca obiect achiziția de produse prin cumpărare, inclusiv cu plata în rate, ', em('struck', 'închiriere, leasing cu sau'), ' fără opțiune de cumpărare;'], [], { struck: 'partial' }),
              lit('o', 'Abrogată.', [], { struck: 'full', struck_repealed: true }),
            ]),
            al('2', ['Termenele prevăzute în cuprinsul prezentei legi se calculează conform regulilor din ', em('bold', 'Codul de procedură civilă'), ', iar ', em('underline', 'ziua în care începe să curgă termenul'), ' nu se ia în calcul.']),
          ]),
        ]),
      ]),
      container('capitol', 'CAP', 'Capitolul II', 'Praguri și modificări', [
        container('subcapitol', 'SBC', 'Paragraful 1', 'Praguri valorice', [
          article('7', 'Praguri', [
            al('1', 'Procedurile de atribuire se aplică în cazul contractelor a căror valoare estimată, fără TVA, este egală sau mai mare decât pragurile de mai jos:'),
            table([
              row(['Tipul contractului', 'Autoritatea contractantă', 'Prag (lei, fără TVA)']),
              row([{ text: 'Lucrări', rows: 2 }, 'orice autoritate contractantă', '27.334.460']),
              row(['servicii sociale și alte servicii specifice', '3.669.050']),
              row(['Produse și servicii', 'autorități centrale', '705.819']),
              row([{ text: 'Pragurile se revizuiesc de Comisia Europeană la doi ani.', cols: 3 }]),
            ]),
            al('2', 'Pe coduri CPV, repartizarea este următoarea:'),
            table([
              row(['Cod CPV', 'Diviziune', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024']),
              row(['45000000-7', 'Lucrări de construcții', '5.225.000', '5.548.000', '5.548.000', '5.350.000', '5.350.000', '5.350.000', '5.382.000', '5.382.000', '5.538.000']),
              row(['33000000-0', 'Echipamente medicale', '135.000', '144.000', '144.000', '139.000', '139.000', '139.000', '140.000', '140.000', '143.000']),
              row(['72000000-5', 'Servicii IT', '135.000', '144.000', '', '139.000', '139.000', '139.000', '140.000', '140.000', '143.000']),
            ]),
          ]),
        ]),
        article('8', 'Modificarea unui alt act', [
          p(['La ', act('articolul 19 din Legea nr. 101/2016', 178684), ', alineatul (2) se modifică și va avea următorul cuprins:']),
          {
            kind: 'citat',
            type: 'CIT',
            children: [al('2', 'Contestația se formulează în termen de 10 zile, începând cu ziua următoare luării la cunoștință despre actul autorității contractante considerat nelegal.')],
          },
          p('„Art. 20. – Contestația se soluționează în termen de 20 de zile de la data primirii dosarului achiziției.”'),
          p('- - - - - - - - - - - -'),
        ]),
        article('9', 'Liste și figuri', [
          p('Documentația de atribuire cuprinde:'),
          {
            kind: 'lista',
            type: 'UL',
            children: [
              { kind: 'element_lista', type: 'LI', lines: [{ text: '• fișa de date a achiziției;' }], flags: { label: '•' } },
              { kind: 'element_lista', type: 'LI', lines: [{ text: '• caietul de sarcini sau documentul descriptiv;' }], flags: { label: '•' } },
            ],
          },
          {
            kind: 'lista',
            type: 'OL',
            children: [
              { kind: 'element_lista', type: 'LI', lines: [{ text: 'proiectul de contract;' }], flags: { label: 'I.', number: { key: 'I', system: 'roman' } } },
              { kind: 'element_lista', type: 'LI', lines: [{ text: 'formulare și modele de documente.' }], flags: { label: 'II.', number: { key: 'II', system: 'roman' } } },
            ],
          },
          p('Modelul ștampilei este prevăzut în figura de mai jos:'),
          { kind: 'imagine', type: 'IMG', flags: { asset: { width: 640, height: 240, alt: 'Modelul ștampilei' } } },
          { kind: 'imagine', type: 'IMG' },
          {
            kind: 'preformatat',
            type: 'PRE',
            lines: [
              { text: '┌──────────────┬──────────────┬──────────────┐' },
              { text: '│ Nr. crt.     │ Denumire     │ Valoare      │' },
              { text: '├──────────────┼──────────────┼──────────────┤' },
              { text: '│ 1            │ Garanție     │ 2%           │' },
              { text: '└──────────────┴──────────────┴──────────────┘' },
            ],
          },
        ]),
        article('10', null, [p('Prezenta lege intră în vigoare la 3 zile de la data publicării în Monitorul Oficial al României, Partea I.')]),
      ]),
    ]),
  ]),
  p('Această lege a fost adoptată de Parlamentul României, cu respectarea prevederilor art. 75 și ale art. 76 alin. (2) din Constituția României, republicată.'),
  {
    kind: 'semnatura',
    type: 'SMN',
    children: [
      { kind: 'semnatura', type: 'SMN', lines: [{ text: 'PREȘEDINTELE CAMEREI DEPUTAȚILOR' }] },
      { kind: 'semnatura', type: 'SMN', lines: [{ text: 'FLORIN IORDACHE' }] },
      { kind: 'semnatura', type: 'SMN', lines: [{ text: 'PREȘEDINTELE SENATULUI' }] },
      { kind: 'semnatura', type: 'SMN', lines: [{ text: 'CĂLIN-CONSTANTIN-ANTON POPESCU-TĂRICEANU' }] },
    ],
  },
  p('București, 19 mai 2016.'),
  p('Nr. 98.'),
  container(
    'anexa',
    'ANX',
    'Anexa nr. 1',
    'Lista activităților',
    [
      // An annex that is an act of its own keeps its own opening lines: the page head lifts only the act's.
      { kind: 'titlu_act', type: 'DEN', lines: [{ text: 'NORME din 19 mai 2016' }] },
      { kind: 'subtitlu_act', type: 'HDR', lines: [{ text: 'privind lista activităților de lucrări' }] },
      { kind: 'emitent', type: 'EMT', lines: [{ role: 'ttl', text: 'EMITENT' }, { role: 'bdy', text: 'GUVERNUL' }], flags: { label: 'EMITENT' } },
      { kind: 'publicare', type: 'PUB', lines: [{ role: 'ttl', text: 'Publicat în' }, { role: 'bdy', text: 'MONITORUL OFICIAL nr. 390 bis din 23 mai 2016' }], flags: { label: 'Publicat în' } },
      p('Activitățile prevăzute la art. 3 alin. (1) lit. m) sunt cele din nomenclatorul CPV, diviziunea 45.'),
      container('apendice', 'APN', 'Apendice la anexa nr. 1', null, [p(['Sursa: ', outside('Portalul Legislativ', PORTAL), '.'])]),
    ],
    { number: { key: '1', system: 'arabic' } },
  ),
  { kind: 'paragraf', type: 'TEXT', lines: [{ text: 'Text din afara oricărei clase din gramatica Portalului, păstrat ca paragraf.' }], flags: { origin: 'unmarked' } },
]

/** The document id the specimen's outline carries (not a served document). */
export const SPECIMEN_DOCUMENT_ID = 'specimen'

export const ACT_SPECIMEN: Specimen = compile(SPECIMEN_DOCUMENT_ID, NODES)
