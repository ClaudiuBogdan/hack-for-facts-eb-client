import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type {
  ParliamentCommitteeMembership,
  ParliamentMember,
} from "@/schemas/parliament";
import {
  memberDetailSubsectionTitleClassName,
  memberDetailSubsectionIntroClassName,
} from "../lib/member-detail-theme";
import {
  committeeRoleLabel,
  formatCommitteeDate,
} from "../lib/committee-format";

type Props = {
  readonly member: ParliamentMember;
};

function formatInterval(m: ParliamentCommitteeMembership): string | null {
  const from = formatCommitteeDate(m.joinedDate);
  const to = formatCommitteeDate(m.leftDate);
  if (from && to) return `${from} – ${to}`;
  if (from) return `din ${from}`;
  if (to) return `până la ${to}`;
  return null;
}

function isHttp(url: string | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

function CommitteeRow({
  membership,
}: {
  readonly membership: ParliamentCommitteeMembership;
}) {
  const committee = membership.committee;
  const name = committee?.name ?? "Comisie";
  const url = committee?.sourceUrl;
  const committeeKey = committee?.committeeKey;
  const interval = formatInterval(membership);

  return (
    <li className="border border-[#b1b4b6] bg-white p-4 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {/*
            Prefer the INTERNAL committee page when we hold its key — the row used
            to send the reader straight off-site to cdep.ro even though
            /parlament/comisii/$committeeKey exists and shows the roster, linked
            bills and the official link. The official source stays available as a
            secondary link below.
          */}
          {committeeKey ? (
            <Link
              to="/parlament/comisii/$committeeKey"
              params={{ committeeKey }}
              className="text-base font-bold text-[#1d70b8] underline underline-offset-2 hover:text-[#1d70b8]/80"
            >
              {name}
            </Link>
          ) : isHttp(url) ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1.5 text-base font-bold text-[#1d70b8] underline underline-offset-2 hover:text-[#1d70b8]/80"
            >
              {name}
              <ExternalLink className="mt-1 h-4 w-4 shrink-0" aria-hidden />
            </a>
          ) : (
            <span className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {name}
            </span>
          )}
          {interval ? (
            <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {interval}
            </p>
          ) : null}
          {committeeKey && isHttp(url) ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#505a5f] underline underline-offset-2 hover:text-[#1d70b8] dark:text-[var(--pnrr-muted)]"
            >
              Sursa oficială
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </a>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="rounded-none bg-[#f3f0ff] px-2 py-1 text-xs font-semibold text-[#512178] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]">
            {committeeRoleLabel(membership.role)}
          </span>
          {membership.isBureau ? (
            <span className="rounded-none bg-[#eef7f1] px-2 py-1 text-xs font-semibold text-[#006435]">
              Birou
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** "Comisii" card list on the member overview tab. */
export function MemberCommitteesSection({ member }: Props) {
  const committees = member.committees ?? [];

  const emptyMessage =
    member.chamber === "senat"
      ? "Datele despre comisiile din legislaturile anterioare ale Senatului sunt în curs de integrare."
      : "Nu sunt disponibile date despre comisii pentru acest parlamentar.";

  return (
    <section className="space-y-4">
      <div>
        <h3 className={memberDetailSubsectionTitleClassName}>Comisii</h3>
        <p className={memberDetailSubsectionIntroClassName}>
          {member.isCurrent === false
            ? "Comisiile parlamentare înregistrate pentru acest mandat."
            : "Comisiile parlamentare din care face parte acest parlamentar."}
        </p>
      </div>

      {committees.length > 0 ? (
        <ul className="space-y-3">
          {committees.map((membership) => (
            <CommitteeRow
              key={membership.membershipKey}
              membership={membership}
            />
          ))}
        </ul>
      ) : (
        <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}
