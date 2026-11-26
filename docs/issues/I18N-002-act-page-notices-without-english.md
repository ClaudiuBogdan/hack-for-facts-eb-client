# I18N-002: The act page's own notices have no English text

**Status:** open (filed 26 November 2026). **Owner:** client-legislation. **Priority:** low; an English reader sees Romanian
sentences, nothing is wrong for a Romanian reader. **Related:** `src/locales/{ro,en}/messages.po`,
`src/features/legal/components/act-*.tsx`, `src/features/legal/components/reader/legal-reader-page.tsx`. Found while
moving the act page's redesign to the live page; kept out of that work's four parts on purpose.

## What happens

On `/legislation/acts/$actId`, 48 strings have the Romanian source as their English text, so the page shown in
English mixes English controls with Romanian notices. Their Romanian catalogue entry is empty, which is why nobody
noticed: an empty `ro` entry renders the `en` entry, and the `en` entry is the Romanian source (the extract fills it in
that way for a new id).

## The rule

The owner decided on 22 November 2026 that the legal content stays Romanian (acts, versions, units, labels taken from
the Portal) while the interface may be Romanian and English. The legislation session's reading for this page
(26 November 2026): our own notices about the data are interface and get an English text; anything quoted from the
Portal stays Romanian; a string that mixes our words with a Portal quote is asked about before it is translated.

## What to do

One commit after the act page's promotion, through the same review, with the catalogue note to root before the
catalogues change:

- fill the English text of every string marked **interface** below;
- fill its Romanian entry with the Romanian source **in the same commit**: with the `ro` entry left empty, the Romanian
  page would start showing the new English text;
- leave the strings marked **stays** as they are;
- ask the legislation session about the one marked **ask**;
- check both languages in a browser on an act with a consolidated form, one whose latest form has no text, and one the
  previous corpus does not hold.

## The strings

### Interface: 44 to translate


`act-anchors-band.tsx`

- "Trimiterile afirmate de portal nu sunt disponibile pentru acest act."
- "{shownCount, plural, one {cel puțin # ancoră} few {cel puțin # ancore} other {cel puțin # de ancore}}"
- "{totalCount, plural, one {# ancoră} few {# ancore} other {# de ancore}}"

`act-consolidation-banner.tsx`

- "Forma consolidată pe Portalul Legislativ"
- "Formă consolidată neoficială, cu caracter informativ."
- "Pentru a stabili dispozițiile aplicabile la o dată, consultați în Monitorul Oficial actul, republicările, actele modificatoare și dispozițiile tranzitorii relevante."

`act-default-notices.tsx`

- "Afișăm cea mai recentă versiune cu text, care nu este versiunea curentă."
- "Afișăm versiunea din {shownDate} ({shownKind}), care nu este versiunea curentă."
- "Cea mai recentă versiune a actului ({latestKind}, {latestDate}) nu are încă text disponibil."
- "Cea mai recentă versiune a actului nu are încă text disponibil."
- "Data acestei versiuni nu este cunoscută, deci nu o putem ordona față de celelalte versiuni. Afișăm singurul text disponibil."
- "Data acestei versiuni nu este cunoscută, deci nu o putem ordona față de celelalte versiuni. Afișăm una dintre versiunile cu text; celelalte se pot alege din listă."
- "Nu putem stabili versiunea curentă a actului. Afișăm un text disponibil, care poate să nu fie versiunea curentă."
- "Versiunile cu aceeași dată au fost ordonate după o regulă fixă, nu de un verificator."

`act-detail-header.tsx`

- "Starea, legăturile și rezumatul nu sunt disponibile pentru acest act: corpusul anterior nu îl conține."
- "Starea, legăturile și rezumatul provin din corpusul anterior."

`act-plain-summary.tsx`

- "Textul, pe legislatie.just.ro"

`act-provenance-notes.tsx`

- "Liniile de antet ale actului nu sunt repetate în corpul textului de mai sus acolo unde capul paginii afișează deja aceleași informații. Restul textului este reprodus întocmai din Portalul Legislativ."
- "Nu am putut lega acest act de un număr din Monitorul Oficial. Legătura dintre publicările din Monitor și actele din Portal Legislativ nu este sigură pentru toate actele."

`act-references-band.tsx`

- "Legăturile nu sunt disponibile pentru acest act."
- "Relații deduse automat din textul actelor — nu afirmate de portal (acelea apar la „Trimiteri afirmate de portal”). Doar potrivirile sigure sunt legături. O trimitere care nu se rezolvă la un act anume rămâne text citat."

`act-timeline-band.tsx`

- "Istoricul nu este disponibil pentru acest act."
- "Nu știm dacă lista este completă."

`act-version-selector.tsx`

- "Versiunea afișată: {0}"
- "alege o versiune"
- "{0} — text indisponibil"
- "{text} (afișată implicit)"
- "{text} (afișată implicit, nu e curentă)"
- "{text} (implicită)"

`act-versions-band.tsx`

- "O pagină a Portalului atribuită acestei forme este încă în verificare."
- "afișată implicit"
- "afișată implicit — nu este versiunea curentă"
- "forma afișată implicit"
- "textul nu este încă disponibil"
- "{newerNotAvailable, plural, one {O versiune fără text disponibil, de la aceeași dată sau mai nouă decât cea mai recentă versiune cu text.} few {# versiuni fără text disponibil, de la aceeași dată sau mai noi decât cea mai recentă versiune cu text.} other {# de versiuni fără text disponibil, de la aceeași dată sau mai noi decât cea mai recentă versiune cu text.}}"

`act-warnings.tsx`

- "Referințele sunt numărate pentru întregul act, nu față de versiunea afișată, deci pot fi și anterioare ei. Pentru dispozițiile aplicabile la o dată, consultă în Monitorul Oficial actul și actele modificatoare."
- "Textul afișat implicit este actul așa cum a fost publicat inițial. Nu include modificările ulterioare — pentru dispozițiile aplicabile, consultă în Monitorul Oficial actele modificatoare."
- "Textul afișat implicit este actul așa cum a fost publicat la {0}. Nu include modificările ulterioare — pentru dispozițiile aplicabile, consultă în Monitorul Oficial actele modificatoare."
- "Textul afișat implicit este actul așa cum a fost republicat la {0}. Referințele sunt numărate pentru întregul act, deci pot fi și anterioare republicării. Textul nu include modificările ulterioare — pentru dispozițiile aplicabile, consultă în Monitorul Oficial actele modificatoare."
- "Textul afișat implicit este o formă consolidată neoficială, cu caracter informativ. Referințele sunt numărate pentru întregul act, deci pot fi anterioare sau ulterioare acestei forme. Pentru dispozițiile aplicabile la o dată, consultă în Monitorul Oficial actul și actele modificatoare."

`reader/legal-reader-page.tsx`

- "Nu afișăm o formă consolidată fără mențiunea Portalului Legislativ și data ei, care lipsesc încă pentru această versiune."
- "Textul acestei versiuni are mai multe părți (antet și corp), pe care nu le afișăm încă împreună."
- "Textul nu este încă disponibil"
- "Versiunea există pe Portalul Legislativ, dar textul ei nu este încă încărcat aici."

### Stays as it is: 3

- "Art.": the law's own unit, abbreviated: stays Romanian (units stay Romanian).
- "Monitorul Oficial {moCitation}": the gazette's name and a citation: stays Romanian.
- "Portal": a source's short name: the same word in English.

### Ask first: 1

- "Portalul Legislativ indică „{note}”.": our words around a quote from the Portal (`{note}` is the Portal's own label): ask the legislation session before translating; the quote stays Romanian.
