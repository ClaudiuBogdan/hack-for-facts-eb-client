/**
 * Regressions for the Parliament surfaces' factual claims.
 *
 * Every case here corresponds to something the UI used to ASSERT that the data
 * did not support: a division number derived from list position, a clock time on
 * a date-only vote, a member id invented for an unresolved ballot, a filler seat
 * rendered as a person, the current legislature stamped on a historical bill, and
 * "Vot final" applied to whichever vote happened to be newest.
 */
import { describe, expect, it } from "vitest";
import {
  ParliamentVoteDetailSchema,
  ParliamentSeatSchema,
} from "@/schemas/parliament";
import {
  isFinalBillVote,
  mapMember,
  mapVoteDetail,
  mapVoteListItem,
} from "../api/graphql/parliament-mappers";
import {
  formatBillUpdatedAt,
  formatMemberMandatePeriod,
  formatVoteDate,
  formatVoteDivisionMeta,
} from "./formatting";
import { buildChamberComposition } from "./chamber-composition";
import type {
  RawParliamentVoteDetail,
  RawParliamentVoteListNode,
} from "../api/graphql/parliament-queries";

const voteNode = (
  over: Partial<RawParliamentVoteListNode> = {},
): RawParliamentVoteListNode => ({
  voteKey: "senat:abc",
  chamber: "senat",
  voteDate: "2026-06-10",
  title: "Proiect de lege X",
  outcome: "adoptat",
  divisionNumber: null,
  billKey: null,
  tally: { pentru: 80, impotriva: 20, abtinere: 3, nuAVotat: 1, present: 104 },
  ...over,
});

describe("division numbers are sourced, never positional", () => {
  it("omits the label entirely when the source recorded no division number", () => {
    const vote = mapVoteListItem(voteNode());
    expect(vote.divisionNumber).toBeUndefined();
    expect(formatVoteDivisionMeta(vote, vote.divisionNumber)).toBe(
      "10 iunie 2026",
    );
  });

  it("prints the SOURCE number when there is one", () => {
    const vote = mapVoteListItem(voteNode({ divisionNumber: 3629 }));
    expect(formatVoteDivisionMeta(vote, vote.divisionNumber)).toBe(
      "Divizare 3629: 10 iunie 2026",
    );
  });
});

describe("vote dates render date-only", () => {
  it("never prints a clock time the source never recorded", () => {
    // `votes.vote_date` is a DATE column; the client stamps midnight to build a
    // timestamp, so any rendered "00:00" is the client's own invention.
    const formatted = formatVoteDate("2026-06-10T00:00:00+03:00");
    expect(formatted).not.toMatch(/\d{1,2}:\d{2}/u);
    expect(formatted).toContain("2026");
  });

  it("keeps the correct calendar day regardless of the reader timezone", () => {
    expect(
      formatVoteDivisionMeta({ heldAt: "2026-03-20T00:00:00+03:00" }),
    ).toBe("20 martie 2026");
  });
});

describe("bill event dates render date-only", () => {
  it("never presents a generated midnight as an official event time", () => {
    const formatted = formatBillUpdatedAt("2026-06-29T00:00:00+03:00");
    expect(formatted).toBe("29 iunie 2026");
    expect(formatted).not.toMatch(/\d{1,2}:\d{2}/u);
  });
});

describe("historical mandate periods do not say present", () => {
  it("uses the recorded end date when the start date is unavailable", () => {
    expect(formatMemberMandatePeriod(undefined, "2025-12-18")).toBe(
      "Încheiat la 18 decembrie 2025",
    );
  });
});

describe("unresolved ballots are not fabricated members", () => {
  const detailRaw = (mandateKey: string | null): RawParliamentVoteDetail => ({
    voteKey: "cdep:29892",
    chamber: "camera_deputatilor",
    voteDate: "2022-05-04",
    title: "T",
    outcome: "adoptat",
    divisionNumber: 3629,
    billKey: "12760",
    tally: { pentru: 1, impotriva: 0, abtinere: 0, nuAVotat: 0, present: 1 },
    groupBreakdown: [],
    ballots: {
      edges: [
        {
          node: {
            rowIndex: 42,
            memberName: "ABRUDEAN Mircea",
            groupName: "PNL",
            choice: "pentru",
            mandateKey,
            matchMethod: mandateKey ? "exact_token_set" : null,
            constituencyName: null,
          },
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  });

  it("leaves memberId ABSENT when the resolver could not match the ballot", () => {
    const detail = mapVoteDetail(detailRaw(null));
    const ballot = detail.memberVotes[0];

    expect(ballot?.memberId).toBeUndefined();
    // The old code produced `row-42`, which the UI linked to
    // /parlament/membri/row-42 — a page that cannot exist.
    expect(ballot?.memberId).not.toBe("row-42");
    // A stable RENDER key is still available.
    expect(ballot?.ballotKey).toBe("cdep:29892#42");
    expect(() => ParliamentVoteDetailSchema.parse(detail)).not.toThrow();
  });

  it("carries the mandate key through when the ballot DID resolve", () => {
    const detail = mapVoteDetail(detailRaw("1:2024:1"));
    expect(detail.memberVotes[0]?.memberId).toBe("1:2024:1");
  });
});

describe("hemicycle filler seats are not people", () => {
  const groups = [
    {
      groupId: "pnl-camera",
      name: "PNL",
      chamber: "camera" as const,
      memberCount: 3,
    },
  ];
  const members = [
    {
      memberId: "2:2024:1",
      firstName: "Ana",
      lastName: "Popescu",
      chamber: "camera" as const,
      groupId: "pnl-camera",
      groupName: "PNL",
      judetSlug: "cluj",
      judetName: "CLUJ",
    },
  ];

  it("gives the roster seat a memberId and the filler seats none", () => {
    const composition = buildChamberComposition("camera", groups, members, {
      "pnl-camera": "#2563eb",
    });

    expect(composition.totalSeats).toBe(3);
    const withMember = composition.seats.filter(
      (s) => s.memberId !== undefined,
    );
    const filler = composition.seats.filter((s) => s.memberId === undefined);
    expect(withMember).toHaveLength(1);
    expect(filler).toHaveLength(2);
    // The old filler ids ("pnl-camera-seat-1") looked like real member keys.
    for (const seat of filler) {
      expect(() => ParliamentSeatSchema.parse(seat)).not.toThrow();
      expect(seat.groupId).toBe("pnl-camera");
    }
  });
});

describe('"Vot final" requires an explicit link role', () => {
  it("accepts only final_adoption / final_rejection", () => {
    expect(isFinalBillVote({ linkRole: "final_adoption" })).toBe(true);
    expect(isFinalBillVote({ linkRole: "final_rejection" })).toBe(true);
  });

  it("rejects a merely-recent or procedural vote", () => {
    expect(isFinalBillVote({})).toBe(false);
    expect(isFinalBillVote({ linkRole: "amendment" })).toBe(false);
    expect(isFinalBillVote({ linkRole: "procedural" })).toBe(false);
  });
});

describe("current vs historical mandates", () => {
  const raw = {
    mandateKey: "2:2024:59",
    chamber: "camera_deputatilor",
    legislature: "2024",
    fullName: "Ciolacu Ion-Marcel",
    groupName: "PSD",
    constituencyName: "BUZĂU",
    birthDate: null,
  };

  it("carries the SC-1 seat lifecycle through to the UI shape", () => {
    const member = mapMember({
      ...raw,
      isCurrent: false,
      mandateEndDate: "2025-01-27",
      mandateEndReason: "demisie",
    });
    expect(member.isCurrent).toBe(false);
    expect(member.mandateEndDate).toBe("2025-01-27");
    expect(member.mandateEndReason).toBe("demisie");
  });

  it("marks a sitting member as current", () => {
    expect(mapMember({ ...raw, isCurrent: true }).isCurrent).toBe(true);
  });

  it("leaves the flag undefined when the surface did not request it", () => {
    // Undefined must NOT be read as "former" — the list/roster queries that skip
    // these fields would otherwise badge every member as an ended mandate.
    expect(mapMember(raw).isCurrent).toBeUndefined();
  });
});
