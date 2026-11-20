# DA-008: The contracts records list asked for a value order the spend gate refuses

**Status:** fixed (2026-11-20, on branch `feat/procurement-da-release-20261118`) · Filed 2026-11-20 (root, after the
Chronos dev deploy) · **Priority:** P2. The list showed no rows.

- **Seen:** on Chronos dev, `/procurement/analytics?tip=contracte&dupa=inregistrari` (contracts, 2025-06 to 2026-05)
  listed nothing. The records read asked for `sort: value_desc`, the default wherever a population has money
  (`analytics-model.ts`, `defaultRecordsSort`). The API refused it: `INVALID_INPUT` on `sort`, "a value order is
  unavailable: the spend gate withholds this grain's money". For the same scope, the figures carry
  `valueAwardedSum: null` and the caveat "spend answers abstain for grain 'contract' … (money is omitted, not
  zeroed)".
- **Why the API refuses:** an order by a withheld value would give the value away (root). The fault is the
  client's.
- **Fix:**
  - The figures read now asks for the API's money verdicts (`moneyVerdicts`); `awardedWithheld` is set where the
    verdict on `valueAwardedSum` is `abstained`.
  - `readRecords` (`procurement-analytics-api.ts`) reads the page again newest first when the API refuses the value
    order for this reason, and marks it `valueOrderWithheld`. The server render and the browser do the same under
    the same key, so the seed holds.
  - The list (`analytics-answer.tsx`, `AnswerRecords`) offers a value order, by the header or the phone's toggle,
    only while the figures say the awarded money is served. It is not offered before their verdict, without one, on
    a failed figures read, or after the list's own value order was refused. A value-ordered list can always switch
    to the newest first. The active order shown is the one the rows came in. The API serves
    no row's value where the gate abstains (`valueRon` is null).
  - Paging keeps the address's order, so each page falls back the same way.
- **Not changed:** the address keeps the population's default, so a value-ordered page still costs one refused read
  before the fallback. The production API does not serve `procurementStats` yet, so asking for `moneyVerdicts`
  changes nothing there.
