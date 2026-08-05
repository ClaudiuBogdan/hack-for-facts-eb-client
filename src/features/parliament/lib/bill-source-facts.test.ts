/**
 * The open vocabularies the bill surfaces render, and what happens at their edges.
 *
 * Every case for a value we DO render is anchored to one that exists in live
 * data (measured 2026-08-05 over all 41,990 bills) — including the welded
 * prose, quoted verbatim from a row that carries it. The unrecognised-value
 * cases (`altceva`, `initiators:something-new`, `agenda`) are deliberately
 * INVENTED: their whole point is that the vocabulary is open and the source can
 * print something we have never seen, which by definition is not in the data
 * yet. Those are the cases that must return undefined rather than guess.
 */
import { describe, expect, it } from "vitest";
import {
  getDecisionChamberLabel,
  getInitiatorClassificationLabel,
  getInitiatorMethodExplanation,
  getLastEventSourceNote,
  getLawCharacterLabel,
  getUrgencyLabel,
} from "./bill-source-facts";

describe("decision chamber is matched, never printed raw", () => {
  it("labels the three values that cover 16,410 of the 16,421 populated rows", () => {
    // The DATABASE spelling: cedilla-below ţ (U+0163), which is NOT the comma-
    // below ț (U+021B) modern Romanian uses. A naive equality check fails here.
    expect(getDecisionChamberLabel("Camera Deputaţilor")).toBe(
      "Camera Deputaților",
    );
    expect(getDecisionChamberLabel("Senatul")).toBe("Senatul");
    expect(getDecisionChamberLabel("Camera Deputaţilor + Senatul")).toBe(
      "Camera Deputaților și Senatul",
    );
  });

  it("matches the same words typed with modern comma-below diacritics", () => {
    // Proof the fold is bidirectional: the source switching convention, or us
    // typing it correctly, must not silently stop matching.
    expect(getDecisionChamberLabel("Camera Deputaților")).toBe(
      "Camera Deputaților",
    );
  });

  it("DROPS the parser-welded prose rather than rendering it as a chamber", () => {
    // Verbatim from live `parliament.bills`: the CDep metadata parser spliced an
    // MP's name into the article reference ("...la Florin Iordacheart.73..."),
    // on 11 of 16,421 rows. Rendering this in a badge that expects "Senatul"
    // would publish a sentence no chamber ever printed.
    expect(
      getDecisionChamberLabel(
        "Senatul potrivit art.75 din Constitutia României, fiind initiativa legislativa cu caracter organic prevazuta la Florin Iordacheart.73 alin.3 lit.o",
      ),
    ).toBeUndefined();
  });

  it("drops the unwelded long form too — matching is exact, not prefix", () => {
    // The 3 clean rows of the same shape are dropped as well. That is the
    // intended trade: we do not have a short label for them, and a long
    // constitutional sentence in a chip slot is worse than no chip.
    expect(
      getDecisionChamberLabel(
        "Senatul potrivit art.75 din Constitutia României, fiind initiativa legislativa cu caracter organic prevazuta la art.73 alin.3 lit.o",
      ),
    ).toBeUndefined();
  });

  it("has nothing to say about an absent value", () => {
    expect(getDecisionChamberLabel(undefined)).toBeUndefined();
    expect(getDecisionChamberLabel("")).toBeUndefined();
  });
});

describe("law character", () => {
  it("says the KIND OF LAW, not the bare source token", () => {
    expect(getLawCharacterLabel("ordinar")).toBe("Lege ordinară");
    expect(getLawCharacterLabel("organic")).toBe("Lege organică");
    expect(getLawCharacterLabel("constitutional")).toBe(
      "Lege constituțională",
    );
  });

  it("drops a value the vocabulary does not contain", () => {
    expect(getLawCharacterLabel("altceva")).toBeUndefined();
  });
});

describe("urgency is a tri-state and stays one", () => {
  it("never renders the absence of a statement as a denial", () => {
    // 21,242 bills carry no procedure block at all. "Nu" would be a claim the
    // source did not make, and this is the single most likely place to make it.
    //
    // NOTE ON WHAT THIS DOES AND DOES NOT COVER: the Detalii tab never reaches
    // this branch — it omits the row entirely when `urgency` is undefined, so
    // the undefined case is guarded upstream of the label. This pins the
    // function's own behaviour so that a future caller which DOES pass
    // undefined cannot get a "Nu" out of it. The render-path guarantee is
    // covered by the mapper never producing `false` from a null (see
    // parliament-truthfulness.test.ts).
    expect(getUrgencyLabel(undefined)).not.toBe("Nu");
    expect(getUrgencyLabel(undefined)).toBe("Nu este precizat de sursă");
  });

  it("distinguishes a stated no from silence", () => {
    expect(getUrgencyLabel(false)).toBe("Nu");
    expect(getUrgencyLabel(true)).toBe("Da");
  });
});

describe("the initiator classification is presented as ours", () => {
  it("names the actor for each of the two values the server can produce", () => {
    expect(getInitiatorClassificationLabel({ value: "government" })).toBe(
      "Guvernul",
    );
    expect(getInitiatorClassificationLabel({ value: "parliamentary" })).toBe(
      "Parlamentari",
    );
  });

  it("explains WHICH rule produced it, for both live methods", () => {
    // Asserted in full, not by `toContain`: "Guvernul NU figurează…" contains
    // the same noun and means the opposite, so a substring check would pass an
    // inverted sentence.
    expect(getInitiatorMethodExplanation("initiators:guvern")).toBe(
      "Guvernul figurează în lista de inițiatori.",
    );
    expect(getInitiatorMethodExplanation("initiators:members")).toBe(
      "Lista de inițiatori conține doar parlamentari.",
    );
  });

  it("says nothing rather than inventing an explanation for a new rule", () => {
    expect(getInitiatorMethodExplanation("initiators:something-new")).toBe(
      undefined,
    );
    expect(getInitiatorMethodExplanation(undefined)).toBeUndefined();
  });
});

describe("last-event provenance", () => {
  it("explains a date that moved without the bill's own timeline changing", () => {
    expect(getLastEventSourceNote("votes")).toBe(
      "Cea mai recentă mișcare provine dintr-un vot, nu din fișa proiectului.",
    );
  });

  it("stays silent for a lane it has no wording for", () => {
    expect(getLastEventSourceNote("agenda")).toBeUndefined();
    expect(getLastEventSourceNote(undefined)).toBeUndefined();
  });
});
