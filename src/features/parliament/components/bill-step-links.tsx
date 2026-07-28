import { Link } from '@tanstack/react-router'
import type {
  ParliamentBillStepLink,
  ParliamentBillTimelineStep,
} from '@/schemas/parliament'
import { chamberOfVoteKey } from '../lib/bill-step-format'

/**
 * The bodies a step touched, linked into the platform where we can resolve them.
 *
 * Every one of these comes from an anchor the chamber ITSELF printed on the
 * procedure table — never from matching a name. That distinction is the reason
 * the chips are trustworthy: the free-text committee column yields 4,147
 * distinct strings for 499 real committees (1.9% exact match), while the anchor
 * resolves at 99.88%.
 *
 * An unresolved link still renders, as plain text with its official source
 * link. `unresolved_registry` is not a gap in the record — the body is real and
 * we simply do not hold it — so saying nothing would be less honest than showing
 * the name without a route.
 */
/**
 * Everything that distinguishes one rendered chip from another.
 *
 * This is BOTH the dedupe identity and the React key, deliberately. Keying on
 * `sourceHref` alone was the bug: the source prints the same href under two
 * different captions often enough that those rows survive a dedupe and then
 * collide as siblings.
 */
function linkIdentity(link: ParliamentBillStepLink): string {
  return `${link.linkKind}|${link.targetKey ?? ''}|${link.sourceHref}|${link.sourceText ?? ''}`
}

/**
 * Collapse links that would render as the same chip.
 *
 * The API repeats an anchor that the database stores once — step 24 of bill
 * 23135 holds one `bill_step_links` row and arrives over GraphQL twice, down to
 * an identical `sourceHref`, so the resolver is fanning a join out. Left alone
 * that prints every committee twice.
 *
 * Deduping here is right regardless of who fixes the fan-out: the same committee
 * named the same way is one committee, and the identity we compare on is exactly
 * what the chip shows.
 */
function dedupeLinks(
  links: readonly ParliamentBillStepLink[],
): ParliamentBillStepLink[] {
  const seen = new Set<string>()
  return links.filter((link) => {
    const identity = linkIdentity(link)
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
}

export function StepLinks({
  step,
}: {
  readonly step: ParliamentBillTimelineStep
}) {
  if (step.links.length === 0) return null

  const links = dedupeLinks(step.links)
  const committees = links.filter((l) => l.linkKind === 'committee')
  const stenograms = links.filter(
    (l) => l.linkKind === 'stenogram' && l.resolutionStatus === 'linked',
  )
  const votes = links.filter(
    (l) => l.linkKind === 'vote' && l.resolutionStatus === 'linked',
  )
  // The act a step cites (the law it became, the decree that promulgated it, a
  // Constitutional Court decision) and the Monitorul Oficial issue it appeared
  // in. Both are shown by their PRINTED citation and open at the official page;
  // we hold no in-platform route for them.
  const citations = links.filter(
    (l) => l.linkKind === 'act' || l.linkKind === 'mo_issue',
  )
  if (
    committees.length === 0 &&
    stenograms.length === 0 &&
    votes.length === 0 &&
    citations.length === 0
  ) {
    return null
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {committees.map((link) =>
        link.targetKey ? (
          <Link
            key={linkIdentity(link)}
            to="/parlament/comisii/$committeeKey"
            params={{ committeeKey: link.targetKey }}
            className="inline-flex max-w-full items-center rounded-sm border border-[#b1b4b6] bg-white px-2 py-0.5 text-xs font-semibold text-[#1d70b8] hover:bg-[#f3f2f1] dark:bg-transparent"
          >
            <span className="truncate">{link.sourceText ?? 'Comisie'}</span>
          </Link>
        ) : (
          <a
            key={linkIdentity(link)}
            href={link.sourceHref}
            target="_blank"
            rel="noopener noreferrer"
            title="Comisia este publicată de sursă, dar nu figurează în registrul nostru"
            className="inline-flex max-w-full items-center rounded-sm border border-dashed border-[#b1b4b6] px-2 py-0.5 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]"
          >
            <span className="truncate">{link.sourceText ?? 'Comisie'}</span>
          </a>
        ),
      )}
      {votes.map((link) => (
        <Link
          key={linkIdentity(link)}
          to="/parlament/voturi/$chamber/$voteId"
          params={{
            chamber: chamberOfVoteKey(link.targetKey ?? ''),
            voteId: link.targetKey ?? '',
          }}
          className="inline-flex items-center rounded-sm border border-[#1d70b8] px-2 py-0.5 text-xs font-semibold text-[#1d70b8] hover:bg-[#f0f6fb]"
        >
          Votul
        </Link>
      ))}
      {citations.map((link) => (
        <a
          key={linkIdentity(link)}
          href={link.sourceHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center rounded-sm border border-[#512178] px-2 py-0.5 text-xs font-semibold text-[#512178] hover:bg-[#f6f2f9]"
        >
          <span className="truncate">
            {link.linkKind === 'mo_issue' ? 'Monitorul Oficial ' : ''}
            {link.sourceText ?? 'Act'}
          </span>
        </a>
      ))}
      {stenograms.map((link) => (
        <Link
          key={linkIdentity(link)}
          // The SITTING transcript, not a single speech: /stenograme/$speechKey
          // is a different surface and a session key there resolves to nothing.
          to="/parlament/stenograme/sedinte/$sessionKey"
          params={{ sessionKey: link.targetKey ?? '' }}
          className="inline-flex items-center rounded-sm border border-[#512178] px-2 py-0.5 text-xs font-semibold text-[#512178] hover:bg-[#f6f2f9]"
        >
          Dezbaterea
        </Link>
      ))}
    </div>
  )
}

/** The vote link and per-step documents a step carries, if any. */
export function StepActions({
  step,
}: {
  readonly step: ParliamentBillTimelineStep
}) {
  if (!step.voteId && step.docUrls.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
      {step.voteId ? (
        <Link
          to="/parlament/voturi/$chamber/$voteId"
          params={{
            chamber: chamberOfVoteKey(step.voteId),
            voteId: step.voteId,
          }}
          className="text-sm font-semibold text-[#1d70b8] underline underline-offset-4"
        >
          Vezi votul
        </Link>
      ) : null}
      {step.docUrls.map((url, index) => (
        <a
          // Position-qualified: the label is "Document N" by position, so a
          // repeated URL is still two distinct links and must not share a key.
          key={`${String(index)}-${url}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#1d70b8] underline underline-offset-4"
        >
          {step.docUrls.length > 1 ? `Document ${index + 1}` : 'Document'}
        </a>
      ))}
    </div>
  )
}
