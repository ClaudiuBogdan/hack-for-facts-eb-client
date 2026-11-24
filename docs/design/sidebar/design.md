# Sidebar: structure

Status: approved and built (owner, 24 November 2026). The first of three
steps: structure, then behaviour (opening, pinning, tooltips, animation), then
performance.

## Why

At 1440×900 the expanded sidebar shows 9 of its 15 sections. Întreprinderi
publice, Legislație, Justiție, Parlament, Alegeri and Statistici sit below a
scroll with no cue, under about 400px of settings: three currency rows, Nominal
and Real, two languages. The collapsed icon rail cuts off the same six. The
list is flat, while the landing page groups the same sections in four.

## Goals and non-goals

- Every section fits on a 900px-tall screen, expanded and collapsed.
- Sections are grouped, so a visitor scans four headings, not fifteen rows.
- Settings appear only where they change something.
- Not in this step: hover versus click to open, pinning, tooltips, animation,
  the mobile dock, performance.

## Approaches

1. Move the landing's list to a shared file that both read.
2. The sidebar imports the landing's file where it is.
3. **Chosen (owner):** the sidebar keeps its own list. It gives the freedom to
   word, order and group the sidebar differently from the landing when that
   reads better. No test ties the two lists together. Adding a section means
   adding it to both, on purpose.

## The design

```
[logo] Transparenta.eu
  Acasă
BANII PUBLICI
  Buget național
  Achiziții publice
  PNRR
INSTITUȚII ȘI ORGANIZAȚII
  Instituții publice
  Firme
  Întreprinderi publice
  ONG-uri
LEGE, JUSTIȚIE ȘI ALEGERI
  Legislație
  Justiție
  Parlament
  Alegeri
STATISTICI ȘI INSTRUMENTE
  Hartă
  Grafice
  Statistici INS
──────────
[€]  Monedă   [ RON | EUR | USD ]   ← only on pages that read these settings
[🏷]  Prețuri  [ Nominal | Real  ]
[🇷🇴]  Limbă    [ RO    |    EN   ]   ← always; collapsed, only the icons show
[IN] Invitat
```

- **Sections.** The 15 current links, grouped as above. „Tablou de bord”
  becomes „Acasă”: `/` is the landing page now. The groups start as the
  landing's four. The sidebar list stays its own
  (`src/components/sidebar/nav-main.tsx`), so the two can diverge later. Labels use the landing's wording (Romanian source, sentence
  case: „Buget național”).
- **Group headings.** Shown when expanded. In the collapsed rail each keeps
  its height and shows as a thin rule, so the icons stay put when the sidebar
  opens under the pointer. *(Builder's call.)*
- **Settings block.** Currency and Nominal/Real are global settings, read by
  a few pages only. The block shows only the controls the current page reads:

  | Pages | Controls |
  |---|---|
  | `/entities/…`, `/primarie/<cui>/…` (entity pages and the budget challenge), `/map`, `/maps/…`, `/charts`, `/entity-analytics`, `/budget-explorer` | currency, Nominal/Real |
  | `/pnrr` (the overview; its subpages show source currencies) | currency |
  | everything else | none |

  The page list is `src/components/sidebar/display-settings.ts`. A page that starts
  reading the settings is added there. The route is known on the server, so
  the first render is already correct and nothing flickers. The controls stay
  bound to the server's cookie values (`initialCurrency`,
  `initialInflationAdjusted`), as today.
- **Language.** A full-width `RO | EN` row above the account, always
  visible (owner: kept in the sidebar rather than the account menu, then given
  its own row above the account).
- **Controls.** Each setting is one row of pressed/unpressed buttons
  (`segmented-choice.tsx`): a label on the left, the buttons across the rest
  of the row. Buttons are 32px tall, 40px on a phone (owner: easy to hit). The
  collapsed rail hides the settings and the language; hovering opens it.
  Behaviour is unchanged: currency reloads the page, prices update the URL,
  language reloads in the new language.
- **Collapsed rail.** Each setting the page offers shows its current value
  as one icon, no text, at the start of its own row: the rail shows the icon
  exactly where the opened sidebar has it (owner, 24 November): Banknote for
  lei, Euro, DollarSign; Tag for nominal prices, ShoppingBasket for real
  (what the money buys); the Romanian or UK flag for the language. The full
  name is the tooltip and what a screen reader says („Monedă: EUR”). The marks
  are not controls; hover or keyboard focus opens the rail. Opened, the icon
  stays and the row reads `[icon] Monedă [RON|EUR|USD]`. *(Icons are the
  builder's picks.)*
- **Opening.** The settings keep the sidebar's full width while the rail
  widens (the footer clips them), so nothing squeezes. Each row's icon stays
  in place; the label and buttons fade in after 100ms, as the navigation
  labels appear (owner, 24 November). No fade with reduced motion.
- **Keyboard.** Keyboard focus opens the rail as hover does, so the settings
  it hides stay reachable; Escape, or choosing a link, hands focus back and
  closes it. A click does not hold it open. The language buttons are named
  „Română” and „English” for screen readers; group headings are `h2`.
- **Fit.** Sections need 636px. Measured with the sidebar open, sections
  height / space for them: 1440×790 viewport (a 1440×900 laptop in Chrome)
  636/627 on pages without the settings, 636/539 with them; 1366×657
  viewport 636/494 and 636/406. On a laptop the last group still goes under
  the scroll on settings pages: a scroll cue, or folding the settings, is for
  the behaviour step.
- **Account.** Polished (owner, 24 November): a guest shows a person icon,
  not the initials „IN”; the avatar sits on the rail's icon line, collapsed
  and open; the menu no longer repeats a guest's name at its top; every label
  is translated („Temă”, was "Theme"); the chosen theme is a quiet fill like
  the settings, not the brand colour. The account button keeps one size and
  no padding open or collapsed, so no icon in the sidebar moves when it opens.
  Its name and arrow fade in with the setting rows. Checked in dark mode too.
- **Phone.** The sheet shows the same content in the same order.

## Open

- On a phone the footer takes about a third of the sheet; the sections
  scroll above it.
- Removing the unused template parts (`TeamSwitcher`, `NavProjects`,
  `MobileSidebarFab`) after the owner says yes.
