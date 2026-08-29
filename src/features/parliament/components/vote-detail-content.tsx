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
        {/* W1.3 resolution contract. The role-bearing edges when the resolver
            asserted a bill; otherwise an EXPLICIT state, never a silent gap and
            never the legacy scalar key.

            The old fallback rendered `relatedBillId` whenever it happened to be
            set, which asserted a bill for divisions the resolver had refused to
            resolve. It is now reachable only when the resolver actually
            asserted one. */}
        {detail.billLinks.length > 0 ? (
          <VoteRelatedBillsCard
            links={detail.billLinks}
            outcome={detail.outcome}
            voteSubject={detail.voteSubject}
          />
        ) : detail.resolutionStatus === "conflict" ? (
          <div className="mb-6 border border-[#b1b4b6] bg-white px-5 py-4 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
            <p className="text-sm font-bold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Proiect de lege neconfirmat
            </p>
            <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Sursele indică mai multe proiecte de lege diferite pentru acest
              vot, așa că niciunul nu este prezentat ca fiind cel corect.
            </p>
          </div>
        ) : detail.resolutionStatus === "unresolved" ? (
          <div className="mb-6 border border-[#b1b4b6] bg-white px-5 py-4 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
            <p className="text-sm font-bold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Fără proiect de lege asociat
            </p>
            <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Nu există dovezi suficiente pentru a lega acest vot de un proiect
              de lege. Aceasta nu înseamnă că votul nu a avut unul.
            </p>
          </div>
        ) : detail.relatedBillId &&
          (detail.resolutionStatus === "resolved" ||
            detail.resolutionStatus === "adjudicated") ? (
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
