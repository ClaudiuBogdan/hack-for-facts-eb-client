import type {
  ParliamentMember,
  MemberVoteChoice,
  VoteOutcome,
  VoteType,
} from "@/schemas/parliament";

export function formatMemberName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

export function formatMemberMandatePeriod(
  mandateStart?: string,
  mandateEnd?: string,
): string {
  if (!mandateStart) {
    if (!mandateEnd) return "Prezent";
    const end = new Intl.DateTimeFormat("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${mandateEnd.slice(0, 10)}T00:00:00Z`));
    return `Încheiat la ${end}`;
  }

  const start = new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${mandateStart.slice(0, 10)}T00:00:00Z`));

  if (!mandateEnd) {
    return `${start} – Prezent`;
  }

  const end = new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${mandateEnd.slice(0, 10)}T00:00:00Z`));

  return `${start} – ${end}`;
}

export function getChamberLabel(chamber: "camera" | "senat"): string {
  switch (chamber) {
    case "camera":
      return "Camera Deputaților";
    case "senat":
      return "Senat";
  }
}

export function getChamberShortLabel(chamber: "camera" | "senat"): string {
  return chamber === "camera" ? "Camera" : "Senat";
}

/**
 * Label for the assembly that held a VOTE — includes joint sittings, which the
 * member-facing `getChamberLabel` never sees. "Camerele reunite" is the
 * Constitution's own phrase (art. 65) for the two chambers sitting together.
 */
export function getVoteChamberLabel(
  chamber: "camera" | "senat" | "comun",
): string {
  switch (chamber) {
    case "comun":
      return "Camerele reunite";
    default:
      return getChamberLabel(chamber);
  }
}

export function getVoteChamberShortLabel(
  chamber: "camera" | "senat" | "comun",
): string {
  return chamber === "comun" ? "Camerele reunite" : getChamberShortLabel(chamber);
}

/**
 * Route param for `/parlament/voturi/$chamber/$voteId`, which accepts only
 * camera|senat. A joint sitting's detail page lives under `camera` — the
 * chamber segment is presentational, the vote is fetched by its key alone.
 */
export function toVoteDetailChamberParam(
  chamber: "camera" | "senat" | "comun",
): "camera" | "senat" {
  return chamber === "senat" ? "senat" : "camera";
}

export function getMemberChamberRoleLabel(chamber: "camera" | "senat"): string {
  return chamber === "camera" ? "deputat" : "senator";
}

export function formatMemberSalutation(member: ParliamentMember): string {
  return member.lastName;
}

export function getVoteTypeLabel(voteType: VoteType): string {
  return voteType === "deschis" ? "Vot deschis" : "Vot secret";
}

export function getMemberVoteChoiceLabel(choice: MemberVoteChoice): string {
  switch (choice) {
    case "pentru":
      return "Pentru";
    case "impotriva":
      return "Împotrivă";
    case "abtinere":
      return "Abținere";
    case "nu_a_votat":
      return "Nu a votat";
  }
}

export function getOutcomeVariant(
  outcome: VoteOutcome,
): "default" | "secondary" | "destructive" | "outline" {
  switch (outcome) {
    case "adoptat":
      return "default";
    case "respins":
      return "destructive";
    case "egalitate":
    case "necunoscut":
      return "outline";
  }
}

/**
 * Badge wording for a DIVISION's tally — not the bill's fate.
 *
 * "Adoptat" / "Respins" were the old labels, and they were wrong: the underlying
 * value is (pentru > impotriva), so a chamber voting to REJECT a bill produced
 * an "Adoptat" badge — on 2,995 of the 3,009 divisions the data itself calls a
 * final rejection. Whether the BILL passed is answered by voteLinks.role.
 */
export function getOutcomeLabel(outcome: VoteOutcome): string {
  switch (outcome) {
    case "adoptat":
      return "Majoritate pentru";
    case "respins":
      return "Majoritate împotrivă";
    case "egalitate":
      return "Egalitate";
    case "necunoscut":
      return "Rezultat nepublicat";
  }
}

/** Accent / border color for vote cards — adoptat vs respins vs no result. */
export function getVoteOutcomeAccentColor(outcome: VoteOutcome): string {
  switch (outcome) {
    case "egalitate":
    case "necunoscut":
      return "#505a5f";
    case "adoptat":
      return "#006435";
    case "respins":
      return "#9C051A";
  }
}

/** Left accent on member result cards — by individual vote choice */
export function getVoteChoiceAccentColor(choice: MemberVoteChoice): string {
  switch (choice) {
    case "pentru":
      return "#006435";
    case "impotriva":
      return "#9C051A";
    case "abtinere":
      return "#505a5f";
    case "nu_a_votat":
      return "#b1b4b6";
  }
}

/**
 * Short calendar date of a vote ("15 mai 2026"). DATE-ONLY on purpose: the source
 * column (`parliament.votes.vote_date`) is a DATE, so the client stamps midnight
 * to build a timestamp. Printing that midnight as "14:30"-style clock time would
 * invent a sitting time the source never recorded. Pinned to UTC on the date part
 * for the same reason as `formatVoteDayLong`.
 */
export function formatVoteDate(isoDate: string): string {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}

/**
 * Format ONLY the calendar date of an ISO value ("20 martie 2026"), pinned to
 * UTC on the date part. Vote `heldAt` values are date-only timestamps stamped
 * `T00:00:00+03:00` — formatting them in browser-local time shifts the day for
 * users west of Bucharest (a UTC browser shows 19 March for a 20 March vote).
 */
export function formatVoteDayLong(isoDate: string): string {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}

export function formatSyncDate(isoDate: string): string {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

/** Share of chamber seats highlighted by the current filters. */
export function formatSeatSharePercent(
  activeCount: number,
  totalSeats: number,
): string {
  if (totalSeats <= 0) {
    return "—";
  }

  const ratio = activeCount / totalSeats;
  const percent = ratio * 100;
  const maximumFractionDigits = ratio > 0 && ratio < 0.01 ? 1 : 0;

  return `${new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(percent)}%`;
}

/**
 * Meta line under a vote card: the SOURCE division number (when the source
 * recorded one) plus the vote's calendar date.
 *
 * `divisionNumber` is optional and is never synthesised. It used to be derived
 * from a card's position in the list ("Divizare 4/3/2/1" for the four most recent
 * votes), which is a real, checkable number in the official record — so inventing
 * it published a false fact. When the source has no division number we print the
 * date alone.
 *
 * The DATE still comes from `heldAt` and is still rendered date-only, because
 * `votes.vote_date` is a DATE column whose midnight we stamped ourselves. The
 * hour, when there is one, comes from a different place entirely: the timestamp
 * the chamber PRINTED (`heldAtSourceText`), read as text. That distinction is
 * the whole reason a clock time may appear here at all — see
 * `formatVotePrintedClock`. Callers without the source text (the vote list,
 * which does not request it) get the date alone, exactly as before.
 */
export function formatVoteDivisionMeta(
  vote: { readonly heldAt: string; readonly heldAtSourceText?: string },
  divisionNumber?: number,
): string {
  const clock = formatVotePrintedClock(vote.heldAtSourceText);
  const day = formatVoteDayLong(vote.heldAt);
  const formatted = clock ? `${day}, ora ${clock}` : day;
  return divisionNumber !== undefined && divisionNumber > 0
    ? `Divizare ${divisionNumber}: ${formatted}`
    : formatted;
}

/**
 * The shape the chambers actually print a division timestamp in: `20.12.2023
 * 16:16`. Measured on live data 2026-08-05 — all 14,158 rows that carry the
 * field match it exactly, and none deviates. Re-validate at full scale.
 */
const PRINTED_VOTE_TIMESTAMP = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/u;

/**
 * The clock time as the CHAMBER printed it, or nothing.
 *
 * This reads the hour out of the source string rather than off a Date, and that
 * is the whole point: `heldAt` is a DATE column parsed from this string's date
 * prefix, so it carries no time, and constructing a Date to format would stamp
 * a midnight of our own and then shift it into the reader's timezone — moving a
 * 09:30 Bucharest division to 06:30 for a UTC-3 reader, and across the day
 * boundary for some. The printed time is a source fact and stays one.
 *
 * A string that does not match the measured shape yields undefined, so a source
 * that changes format costs us the time rather than publishing a mis-sliced one.
 * There is deliberately NO cross-check against `heldAt` here: `heldAt` is
 * derived from this same string, so agreement would be true by construction and
 * would corroborate nothing.
 */
export function formatVotePrintedClock(
  sourceText: string | undefined,
): string | undefined {
  if (!sourceText) return undefined;
  const match = PRINTED_VOTE_TIMESTAMP.exec(sourceText.trim());
  if (!match) return undefined;
  // The shape check alone is not a validity check: "20.12.2023 29:99" matches
  // the pattern. Publishing "29:99" as a chamber's sitting time would be
  // printing garbage in the source's voice, so the numbers are checked too.
  const hours = Number(match[4]);
  const minutes = Number(match[5]);
  if (hours > 23 || minutes > 59) return undefined;
  return `${match[4]}:${match[5]}`;
}

export function formatBillUpdatedAt(isoDate: string): string {
  // `bills.last_event_date` is a DATE. Its midnight is an implementation detail,
  // not the time an event happened, so never publish it as a sourced clock time.
  return formatBillDate(isoDate);
}

export function formatBillDate(isoDate: string): string {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
