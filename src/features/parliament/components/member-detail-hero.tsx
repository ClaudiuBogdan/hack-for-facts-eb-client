import { Link } from "@tanstack/react-router";
import type { ParliamentMember } from "@/schemas/parliament";
import { cn } from "@/lib/utils";
import {
  formatMemberName,
  formatVoteDayLong,
  getMemberChamberRoleLabel,
} from "../lib/formatting";
import {
  getMemberDetailHeroColor,
  memberDetailPageContainerClassName,
} from "../lib/member-detail-theme";

type Props = {
  readonly member: ParliamentMember;
};

const INITIALS_BG = ["#f3f2f1", "#ede7f6", "#e8f5e9", "#fff3e0"] as const;

function getMemberInitials(member: ParliamentMember): string {
  return `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();
}

function getInitialsBackground(memberId: string): string {
  const index =
    Array.from(memberId).reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    INITIALS_BG.length;
  return INITIALS_BG[index] ?? INITIALS_BG[0];
}

/**
 * A mandate row outlives the seat (SC-1) — a replaced or deceased member keeps
 * every attributed vote, question and initiative. Say so plainly instead of
 * describing a historical mandate in the present tense.
 */
function endedMandateNote(member: ParliamentMember): string | null {
  if (member.isCurrent !== false) return null;
  const when = member.mandateEndDate
    ? formatVoteDayLong(member.mandateEndDate)
    : null;
  const why = member.mandateEndReason?.trim();
  if (when && why) return `Mandat încheiat la ${when} (${why}).`;
  if (when) return `Mandat încheiat la ${when}.`;
  if (why) return `Mandat încheiat (${why}).`;
  return "Mandat încheiat.";
}

/** Chamber-colored member hero with constituency and group context. */
export function MemberDetailHero({ member }: Props) {
  const memberName = formatMemberName(member.firstName, member.lastName);
  const roleLabel = getMemberChamberRoleLabel(member.chamber);
  const endedNote = endedMandateNote(member);
  const isFormer = endedNote !== null;

  return (
    <section
      className="py-8 text-white"
      style={{ backgroundColor: getMemberDetailHeroColor(member.chamber) }}
    >
      <div
        className={cn(
          memberDetailPageContainerClassName,
          "grid gap-8 lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-end",
        )}
      >
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wide text-white/85">
            {member.chamber === "camera"
              ? "Camera Deputaților"
              : "Senatul României"}
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.75rem]">
            {memberName}
          </h1>
          {isFormer ? (
            <p className="mt-3 inline-block border-2 border-white/70 px-3 py-1 text-sm font-bold uppercase tracking-wide text-white">
              Mandat încheiat
            </p>
          ) : null}
          <p className="mt-4 text-base leading-7 text-white/90 sm:text-lg">
            {memberName} {isFormer ? "a fost" : "este"} {roleLabel} pentru
            circumscripția{" "}
            <Link
              to="/parlament"
              search={{ tab: "grupuri", judet: member.judetSlug }}
              className="font-semibold underline underline-offset-4 hover:text-white"
            >
              {member.judetName}
            </Link>
            , {isFormer ? "fost membru" : "membru"} al grupului{" "}
            <Link
              to="/parlament/grupuri/$groupId"
              params={{ groupId: member.groupId }}
              className="font-semibold underline underline-offset-4 hover:text-white"
            >
              {member.groupName}
            </Link>
            .
          </p>
          {endedNote ? (
            <p className="mt-3 text-sm font-semibold text-white/85">
              {endedNote} Voturile, întrebările și inițiativele de mai jos rămân
              atribuite acestui mandat.
            </p>
          ) : null}
          {member.role ? (
            <p className="mt-3 text-sm font-semibold text-white/85">
              {member.role}
            </p>
          ) : null}
        </div>

        <div className="lg:-mb-14 lg:justify-self-end">
          <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_4px_14px_rgba(11,12,12,0.2)] sm:h-44 sm:w-44 lg:h-52 lg:w-52">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={`Portret ${memberName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#512178] sm:text-5xl"
                style={{
                  backgroundColor: getInitialsBackground(member.memberId),
                }}
                aria-label={`Inițiale ${getMemberInitials(member)}`}
              >
                {getMemberInitials(member)}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
