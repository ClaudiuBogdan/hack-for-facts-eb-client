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
  getFinalBillVoteVerdict,
  isFinalBillVote,
  mapBillDetail,
  mapBillSummary,
  mapMember,
  mapVoteDetail,
  mapVoteListItem,
} from "../api/graphql/parliament-mappers";
import {
  formatBillUpdatedAt,
  formatMemberMandatePeriod,
  formatVoteDate,
  formatVoteDivisionMeta,
  formatVotePrintedClock,
} from "./formatting";
import { buildChamberComposition } from "./chamber-composition";
import type {
  RawParliamentBillDetail,
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

describe("the printed division time is source text, not a formatted Date", () => {
  it("shows the hour the CHAMBER printed, exactly as printed", () => {
    expect(
      formatVoteDivisionMeta({
        heldAt: "2023-12-20T00:00:00+03:00",
        heldAtSourceText: "20.12.2023 16:16",
      }),
    ).toBe("20 decembrie 2023, ora 16:16");
  });

  it("does not shift the hour into the reader's timezone", () => {
    // The whole reason this is read out of the string: a Date built from the
    // printed timestamp would be rendered in the viewer's zone, moving a 09:30
    // Bucharest division to 06:30 for a UTC-3 reader. The output is byte-equal
    // to the source's clock, whatever TZ the test process runs in.
    const meta = formatVoteDivisionMeta({
      heldAt: "2018-05-09T00:00:00+03:00",
      heldAtSourceText: "09.05.2018 10:10",
    });
    expect(meta).toContain("ora 10:10");
  });

  it("prints no time for the 6,702 Senate divisions that carry none", () => {
    // Senate votes have the field empty on 100% of rows. A fallback that
    // invented an hour here would be inventing it for a third of the corpus.
    const meta = formatVoteDivisionMeta({
      heldAt: "2026-06-10T00:00:00+03:00",
    });
    expect(meta).toBe("10 iunie 2026");
    expect(meta).not.toMatch(/\d{1,2}:\d{2}/u);
  });

  it("drops a timestamp that does not match the measured source shape", () => {
    // All 14,158 populated rows are `DD.MM.YYYY HH:MM` today. If that ever
    // changes we lose the hour rather than publish a mis-sliced one.
    expect(formatVotePrintedClock("marți, 20 decembrie, seara")).toBeUndefined();
    expect(formatVotePrintedClock("2023-12-20T16:16:00Z")).toBeUndefined();
    expect(formatVotePrintedClock("")).toBeUndefined();
    // Shape is not validity: this MATCHES the pattern and is not a time.
    // Publishing "29:99" would be printing garbage in the chamber's voice.
    expect(formatVotePrintedClock("20.12.2023 29:99")).toBeUndefined();
    expect(formatVotePrintedClock("20.12.2023 24:00")).toBeUndefined();
    // Positive controls: the real shape, and both ends of the valid range.
    expect(formatVotePrintedClock("20.12.2023 16:16")).toBe("16:16");
    expect(formatVotePrintedClock("20.12.2023 00:00")).toBe("00:00");
    expect(formatVotePrintedClock("20.12.2023 23:59")).toBe("23:59");
  });

  it("carries the source text through the mapper without reformatting it", () => {
    const detail = mapVoteDetail({
      voteKey: "cdep:29892",
      chamber: "camera_deputatilor",
      voteDate: "2022-05-04",
      voteDateTimeText: "04.05.2022 12:19",
      title: "T",
      outcome: "adoptat",
      divisionNumber: 3629,
      billKey: "12760",
      tally: { pentru: 1, impotriva: 0, abtinere: 0, nuAVotat: 0, present: 1 },
      groupBreakdown: [],
      ballots: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
    });
    expect(detail.heldAtSourceText).toBe("04.05.2022 12:19");
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
            positionKey: "cdep:29892#native:42",
            rowIndex: 42,
            memberName: "ABRUDEAN Mircea",
            groupName: "PNL",
            choice: "pentru",
            positionStatus: "confirmed",
            observationCount: 1,
            observedChoices: ["pentru"],
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
    expect(ballot?.ballotKey).toBe("cdep:29892#native:42");
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

describe("what a final vote decided is the MOTION composed with the RESULT", () => {
  it("claims NOTHING for a motion that carried on the counts", () => {
    // `pentru > impotriva` is not proof a motion carried in law. cdep:33731
    // (PL 12/2024, Codul civil — "lege organica") stands 164–60 with
    // outcome='adoptat', and the official CDep page says "nu a fost întrunita
    // majoritatea calificata": it FAILED. Reading the counts as a verdict put
    // "Adoptat" over an official rejection on at least 20 final-vote links.
    expect(
      getFinalBillVoteVerdict({
        linkRole: "final_adoption",
        outcome: "adoptat",
      }),
    ).toBeUndefined();
    // Same for a rejection report that carried: it too needed a majority the
    // tally does not encode.
    expect(
      getFinalBillVoteVerdict({
        linkRole: "final_rejection",
        outcome: "adoptat",
      }),
    ).toBeUndefined();
  });

  it("reads a DEFEATED adoption motion as a rejection", () => {
    // The inverse trap, and the more common one: 441 links in prod. On L334/2026
    // the Senate voted 7–49–44 against adopting the bill, and role-only reading
    // badged that "Adoptat".
    expect(
      getFinalBillVoteVerdict({
        linkRole: "final_adoption",
        outcome: "respins",
      }),
    ).toBe("respins");
  });

  it("refuses to call a DEFEATED rejection motion either thing", () => {
    // cdep:28593, 140–155, subject "Vot final respingere": the chamber declined
    // to throw the bill out. CDep's own event says so —
    // "vot final respingere - fără majoritate calificată" — and the bill ran four
    // more years before being rejected in 2025. Calling it "Respins" inverts it.
    expect(
      getFinalBillVoteVerdict({
        linkRole: "final_rejection",
        outcome: "respins",
        voteSubject: "Vot final respingere",
      }),
    ).toBe("rejection_failed");
  });

  it("will not claim a defeated rejection on an UNCORROBORATED role", () => {
    // cdep:27636. Production role says `final_rejection`, but the official CDep
    // page reads "Vot final Adoptare PL 448/2020 … - lege ordinara", 7–163–122:
    // an ADOPTION that failed. The role is simply wrong, and its subject is null,
    // so there is no second witness. Announcing "Respingerea nu a trecut" here
    // states the opposite of what happened; abstaining does not.
    expect(
      getFinalBillVoteVerdict({
        linkRole: "final_rejection",
        outcome: "respins",
      }),
    ).toBeUndefined();
    // A subject that talks about something else is not corroboration either.
    expect(
      getFinalBillVoteVerdict({
        linkRole: "final_rejection",
        outcome: "respins",
        voteSubject: "Vot final",
      }),
    ).toBeUndefined();
  });

  it("answers nothing when no result was established", () => {
    for (const outcome of ["egalitate", "necunoscut"] as const) {
      expect(
        getFinalBillVoteVerdict({ linkRole: "final_adoption", outcome }),
      ).toBeUndefined();
      expect(
        getFinalBillVoteVerdict({ linkRole: "final_rejection", outcome }),
      ).toBeUndefined();
    }
  });

  it("answers nothing for a vote the source never called final", () => {
    expect(getFinalBillVoteVerdict({ outcome: "adoptat" })).toBeUndefined();
    expect(
      getFinalBillVoteVerdict({ linkRole: "amendment", outcome: "adoptat" }),
    ).toBeUndefined();
    expect(
      getFinalBillVoteVerdict({ linkRole: "procedural", outcome: "adoptat" }),
    ).toBeUndefined();
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

describe("who initiated a bill has ONE producer, and it is the evidence", () => {
  const billRaw = (
    over: Partial<RawParliamentBillDetail> = {},
  ): RawParliamentBillDetail => ({
    billKey: "senat:804-2007",
    plxNumber: null,
    plxYear: null,
    senateNumber: "804",
    senateYear: 2007,
    title: "Lege pentru modificarea L. nr. 84/1995",
    finalLawNumber: null,
    finalLawYear: null,
    statusText: null,
    // The 350 disagreeing bills carry no `tip_initiativa` — but that does NOT
    // mean the text rule had nothing to read, which is what I first claimed.
    // It falls back to the TITLE, and only 7 of the 350 reach the bare default.
    // The other 343 are titles the rule read and misread (250 of them beginning
    // "Proiect de lege…" on bills the initiators list says are parliamentary).
    billType: null,
    lastEventDate: "2008-02-11",
    events: [],
    documents: [],
    initiators: [],
    relatedVotes: [],
    actLinks: [],
    ...over,
  });

  it("prefers the server's evidence over the text rule's reading", () => {
    // Live bill senat:804-2007. cdep.ro prints "5 deputati+senatori" and
    // "Propunere legislativa" on the linked project page — checked directly,
    // 2026-08-05. The text rule said `guvern`; the initiators list says
    // otherwise and wins.
    const bill = mapBillSummary(billRaw({ initiatorType: "parliamentary" }));
    expect(bill.billType).toBe("parlamentar");
  });

  it("overrides even an explicit 'Proiect de lege' TITLE — the 250-row majority", () => {
    // This is what the disagreements actually look like, and the case the
    // previous fixture missed: the title states one thing about the DOCUMENT
    // and the initiators list states another about the ACTOR. Only the second
    // answers "who initiated this".
    const bill = mapBillSummary(
      billRaw({
        title: "Proiect de lege privind modificarea unor acte normative",
        initiatorType: "parliamentary",
      }),
    );
    expect(bill.billType).toBe("parlamentar");
  });

  it("prefers it in the other direction too", () => {
    // Live bill senat:372-2001, whose cdep.ro page prints "Initiator: Guvern".
    const bill = mapBillSummary(
      billRaw({
        title: "Propunere legislativă privind ratificarea unui acord",
        initiatorType: "government",
      }),
    );
    expect(bill.billType).toBe("guvern");
  });

  it("does not call a law APPROVING an ordinance an ordinance", () => {
    // Every one of the 121 live bills that reached the text rule's `ordonanta`
    // branch is titled like this — "Lege pentru aprobarea Ordonanţei
    // Guvernului nr. X". The branch fires on the substring "ordonanţ" anywhere
    // in the title, so it labelled all 121 "Ordonanță de urgență": a false
    // statement about what the act IS. There was a carve-out preserving that
    // answer over the server's classification; it is gone.
    const bill = mapBillSummary(
      billRaw({
        title:
          "Lege pentru aprobarea Ordonanţei Guvernului nr. 20/1995 din 4 august 1995 privind măsuri pentru prevenirea inflaţiei",
        initiatorType: "government",
      }),
    );
    expect(bill.billType).toBe("guvern");
    expect(bill.billType).not.toBe("ordonanta");
  });

  it("still reads `ordonanta` from the text when there is no classification", () => {
    // The branch is not dead: it remains the only signal for a bill the server
    // has not classified. No live bill is in that position today, which is why
    // this is a fixture rather than a measured population.
    const bill = mapBillSummary(
      billRaw({ billType: "Ordonanţă de urgenţă nr. 21/2012" }),
    );
    expect(bill.billType).toBe("ordonanta");
  });

  it("leaves the text rule untouched on the 22,706 bills with no classification", () => {
    const bill = mapBillSummary(
      billRaw({ billType: "Propunere legislativa pentru X" }),
    );
    expect(bill.billType).toBe("parlamentar");
  });

  it("never attributes a parliamentary bill to the Government when the members are unresolved", () => {
    // 1,244 live bills are classified parliamentary from their own mentions
    // list but have no RESOLVED member rows. This used to print "Guvernul
    // României" as the initiator — naming the wrong actor outright.
    const detail = mapBillDetail(
      billRaw({ initiatorType: "parliamentary", initiators: [] }),
    );
    expect(detail.initiator.type).toBe("parlamentar");
    expect(detail.initiator.departmentName).toBeUndefined();
    expect(detail.initiator.memberName).toBeUndefined();
  });

  it("keeps the classification and the rule that produced it together", () => {
    const detail = mapBillDetail(
      billRaw({
        initiatorType: "parliamentary",
        initiatorTypeMethod: "initiators:members",
        initiatorTypeConfidence: "high",
      }),
    );
    expect(detail.initiatorClassification).toEqual({
      value: "parliamentary",
      method: "initiators:members",
      confidence: "high",
    });
  });

  it("drops a classification value it cannot explain", () => {
    const detail = mapBillDetail(billRaw({ initiatorType: "unknown-bucket" }));
    expect(detail.initiatorClassification).toBeUndefined();
  });
});

describe("bill source facts are carried without being asserted", () => {
  const billRaw = (
    over: Partial<RawParliamentBillDetail> = {},
  ): RawParliamentBillDetail => ({
    billKey: "12760",
    plxNumber: "237",
    plxYear: 2012,
    senateNumber: null,
    senateYear: null,
    title: "Proiect de Lege X",
    finalLawNumber: null,
    finalLawYear: null,
    statusText: null,
    billType: "Proiect de Lege X",
    lastEventDate: "2023-12-29",
    events: [],
    documents: [],
    initiators: [],
    relatedVotes: [],
    actLinks: [],
    ...over,
  });

  it("keeps a null urgency null — it must never arrive as `false`", () => {
    // The 21,242 bills with no procedure block. `false` here would silently
    // become a rendered "Nu", which is a statement the source never made.
    const detail = mapBillDetail(billRaw({ procedureUrgency: null }));
    expect(detail.procedure.urgency).toBeUndefined();
  });

  it("keeps an explicit false as false", () => {
    const detail = mapBillDetail(billRaw({ procedureUrgency: false }));
    expect(detail.procedure.urgency).toBe(false);
  });

  it("drops a source link that is not an absolute URL, and keeps the right URL on the right key", () => {
    const detail = mapBillDetail(
      billRaw({
        cdepProjectUrl: "www.cdep.ro/relative",
        senateDetailUrl: "https://www.senat.ro/fisa",
        senateOpinionsUrl: "https://www.senat.ro/avize",
      }),
    );
    // Assert the PAIRING, not just which keys survived: a mapper that kept the
    // right key with the wrong href would satisfy a keys-only assertion.
    expect(detail.sourceLinks.map((l) => [l.key, l.url])).toEqual([
      ["senateDetail", "https://www.senat.ro/fisa"],
      ["senateOpinions", "https://www.senat.ro/avize"],
    ]);
  });

  it("drops a scheme-only URL rather than throwing on the whole page", () => {
    // "http://" passes a startsWith check but fails z.string().url(), and that
    // failure happens inside ParliamentBillDetailSchema.parse — it would take
    // the entire bill page down, not just the link.
    expect(() =>
      mapBillDetail(billRaw({ cdepProjectUrl: "http://" })),
    ).not.toThrow();
    expect(
      mapBillDetail(billRaw({ cdepProjectUrl: "http://" })).sourceLinks,
    ).toEqual([]);
  });

  it("drops a date it cannot parse instead of crashing the renderer", () => {
    // toIsoDate PASSES THROUGH what it does not recognise, so "x" would reach
    // formatBillDate and raise RangeError: Invalid time value during render.
    const detail = mapBillDetail(
      billRaw({ firstEventDate: "x", sourceUpdatedAt: "not-a-date" }),
    );
    expect(detail.firstEventAt).toBeUndefined();
    expect(detail.sourceCapturedAt).toBeUndefined();
    // Positive control: a real value still comes through.
    expect(
      mapBillDetail(billRaw({ firstEventDate: "2012-06-12" })).firstEventAt,
    ).toContain("2012-06-12");
  });

  it("builds a government registration only when BOTH halves are present", () => {
    expect(
      mapBillDetail(billRaw({ governmentENumber: "123", governmentEYear: null }))
        .governmentRegistration,
    ).toBeUndefined();
    expect(
      mapBillDetail(
        billRaw({ governmentENumber: "123", governmentEYear: "2024" }),
      ).governmentRegistration,
    ).toBe("E 123/2024");
  });

  it("names the capture timestamp as OURS, not as the bill's freshness", () => {
    // 34,224 of 41,990 bills share one backfill stamp, so this is emphatically
    // not "when the chamber last touched the bill". The field name is the guard.
    const detail = mapBillDetail(
      billRaw({ sourceUpdatedAt: "2026-06-28T23:22:55.272Z" }),
    );
    expect(detail.sourceCapturedAt).toBe("2026-06-28T23:22:55.272Z");
    expect(detail).not.toHaveProperty("sourceUpdatedAt");
  });
});
