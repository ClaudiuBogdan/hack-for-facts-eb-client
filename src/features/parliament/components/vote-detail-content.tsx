import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { ParliamentVoteDetail } from "@/schemas/parliament";
import { exportVoteDetailAsCsv } from "../api/parliament-api";
import { downloadCsv, formatVoteDayLong } from "../lib/formatting";
import { cn } from "@/lib/utils";
import {
  VOTE_DETAIL_SURFACE,
  voteDetailCardClassName,
  voteDetailPageContainerClassName,
} from "../lib/vote-detail-theme";
import { VoteDetailBreadcrumb } from "./vote-detail-breadcrumb";
import { VoteDetailHero } from "./vote-detail-hero";
import { VoteIndividualVotesSection } from "./vote-individual-votes-section";
import { VotePartyChart } from "./vote-party-chart";
import { VoteRelatedBillsCard } from "./vote-related-bills-card";

type Props = {
  readonly detail: ParliamentVoteDetail;
  readonly groupColors: Readonly<Record<string, string>>;
  readonly memberJudete: Readonly<Record<string, string>>;
};

/** UK Parliament division detail page */
export function VoteDetailContent({
  detail,
  groupColors,
  memberJudete,
}: Props) {
  // The SOURCE division number when there is one; otherwise the vote's date. The
  // old `?? 1` labelled every division-less vote "Divizare 1".
  const divisionLabel =
    detail.divisionNumber !== undefined
      ? `Divizare ${String(detail.divisionNumber)}`
      : `Vot din ${formatVoteDayLong(detail.heldAt)}`;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: VOTE_DETAIL_SURFACE }}
    >
      <VoteDetailBreadcrumb
        chamber={detail.chamber}
        divisionLabel={divisionLabel}
      />

      <VoteDetailHero detail={detail} />

      <div className={cn(voteDetailPageContainerClassName, "pb-8 pt-6")}>
        {/* The role-bearing edges when the server resolved any; otherwise the
            vote's own scalar bill key, which names no bill and carries no role
            but is still a true link. */}
        {detail.billLinks.length > 0 ? (
          <VoteRelatedBillsCard
            links={detail.billLinks}
            outcome={detail.outcome}
            voteSubject={detail.voteSubject}
          />
        ) : detail.relatedBillId ? (
          <div className="mb-6 border border-[#b1b4b6] bg-white px-5 py-4 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
            <p className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Vot asociat proiectului de lege
            </p>
            <Link
              to="/parlament/proiecte/$billId"
              params={{ billId: detail.relatedBillId }}
              className="mt-1 inline-block text-base font-bold text-[#1d70b8] underline underline-offset-2 hover:text-[#1d70b8]/80"
            >
              Vezi proiectul de lege
            </Link>
          </div>
        ) : null}

        {detail.sourceUrl ? (
          <a
            href={detail.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d70b8] underline underline-offset-2 hover:text-[#1d70b8]/80"
          >
            Sursa oficială a votului
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : null}

        <section className={cn(voteDetailCardClassName, "overflow-visible")}>
          <VotePartyChart
            embedded
            groups={detail.groupBreakdown}
            groupColors={groupColors}
            pentruTotal={detail.tally.pentru}
            impotrivaTotal={detail.tally.impotriva}
            onDownloadResults={() => {
              downloadCsv(
                `${detail.voteId}.csv`,
                exportVoteDetailAsCsv(detail),
              );
            }}
          />

          <div
            className="border-t border-[#b1b4b6] dark:border-[var(--pnrr-border)]"
            role="separator"
            aria-hidden
          />

          <VoteIndividualVotesSection
            embedded
            detail={detail}
            groupColors={groupColors}
            memberJudete={memberJudete}
          />
        </section>
      </div>
    </div>
  );
}
