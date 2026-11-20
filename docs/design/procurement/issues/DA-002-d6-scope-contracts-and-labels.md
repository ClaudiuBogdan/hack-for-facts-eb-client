# DA-002: D6 does not cover contract pages or organisation labels

**Status:** open (accepted gap, owner decision 2026-11-20). **Priority:** P3. Out of scope for the direct-purchase
release; recorded so it is not mistaken for a leak fix that was missed.

## Summary

D6 (a supplier's name only for a valid company CUI; everyone else "natural person") is enforced by the API for
direct purchases. The client applies it on the direct-purchase pages, analytics' direct-purchase questions and the
company page's public money (root, scope B; design §24.4).

It does not apply to:

- **contract pages:** a contract's own supplier is named as the API serves it. The contract page's direct-purchase
  context (`pairDirect`, `pairDirectValue`) is under D6;
- **organisation labels:** a name the registry gives an organisation code anywhere outside the surfaces above
  (search, entity and buyer labels).

## Decision

The owner, 2026-11-20, on DA-001 residual 10: "Please don't overcomplicate the codebase or ux. Do is simple to
implement. Document the other issues." D6 stays on direct-purchase surfaces only. No change is made for contracts
or labels.

## If it is taken up

The API would have to decide first: it is the one that withholds names. The client would then select the same
disclosure key on those reads and use the direct-purchase cache rules there (`lib/disclosure-cache.ts`).
