# Legislation English glossary

The English renderings used by the legislation pages (`src/features/legal`,
`src/routes/legislation`). Romanian is the source language of these messages:
the English text goes in `src/locales/en/messages.po`, and every translated
entry also sets `src/locales/ro/messages.po` to the Romanian text, because an
empty `ro` entry falls back to the English one.

Chosen 2026-10-19 when the 389 untranslated legislation messages were filled.
Keep new messages consistent with this table.

## Status

| Romanian | English |
|---|---|
| În vigoare | In force |
| Modificat | Amended |
| Abrogat | Repealed |
| Abrogat parțial | Partially repealed |
| Suspendat | Suspended |
| Ieșit din vigoare | No longer in force (the status folds several causes, so not "expired") |
| Statut necunoscut | Unknown status |
| statut | status |
| intrare în vigoare | entry into force |

## Events and relations

| Romanian | English event | English relation (verb) |
|---|---|---|
| abrogare totală / parțială, abrogă | full / partial repeal | repeals |
| modificare, modifică | amendment | amends |
| completare, completează | supplement | supplements |
| suspendare, suspendă | suspension | suspends |
| încetarea suspendării | end of suspension | |
| republicare | republication | |
| rectificare, rectifică | correction (not "revision", the budget sense) | corrects |
| ieșire din vigoare | ceasing to be in force | |
| promulgare | promulgation | |
| aprobarea unei OUG / OG | approval of an emergency ordinance / ordinance | approves |
| respinge | | rejects |
| face referire la | | refers to |

## Act types and issuers

| Romanian | English |
|---|---|
| Lege | Law |
| Ordonanță de urgență (OUG) | Emergency ordinance |
| Ordonanță (OG) | Ordinance |
| Hotărâre | Decision (hotărâre) |
| Decizie | Decision (decizie) |
| Ordin | Order |
| Decret | Decree |
| Normă, Regulament, Instrucțiuni, Circulară, Comunicat, Acord, Protocol, Raport | Norm, Regulation, Instructions, Circular, Communiqué, Agreement, Protocol, Report |
| Anexă / Anexe | Annex / Annexes |
| Act normativ | Legal act |
| Guvernul României, Prim-ministrul, Președintele României, Parlamentul României | Government of Romania, Prime Minister, President of Romania, Parliament of Romania |
| Curtea Constituțională | Constitutional Court |
| Camera Deputaților, Senatul | Chamber of Deputies, Senate |

"Hotărâre" and "decizie" both translate as "decision"; the act-type labels
keep the Romanian word so the two types stay distinct in one filter list.
Citations and search examples ("Legea 53/2003", "OUG 57/2019", "Codul
muncii") stay in Romanian: they are search keys in the corpus language.
English glosses follow a Romanian phrase example where it helps ("Codul
muncii" (Labour Code)).

## Publication

| Romanian | English |
|---|---|
| Monitorul Oficial | Official Gazette (glossed "(Monitorul Oficial)" on first use) |
| număr / ediție (of the Gazette) | issue |
| Partea I … Partea a VII-a | Part I … Part VII |
| publicare / publicație | publication |
| Portal Legislativ | Portal Legislativ (proper name) |
| fișa actului | act page |
| expresie (of the text) | expression |
| text consolidat / formă consolidată | consolidated text / form |
| trimitere, citare | reference, citation |

Numbers use English separators ("1,103,595", "56.9%").

## Not yet translated (recorded decisions pending)

- `act-versions-band.tsx` version-kind labels and the reader table's
  `aria-label` are hard-coded Romanian (a source change plus extract).
- The "nr." / "din" citation connectors in `act-detail-header.tsx` and the
  gazette directory are deliberately Romanian.
- `LEGAL_ORIGINAL_TEXT_CAVEAT` mirrors the server's Romanian text.
