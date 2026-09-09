import { describe, it, expect } from "vitest";
import { expandContractions, tokenizeWords, matchTargetPhrases, wordsPerMinute, wordOverlap } from "../shared/speech-compare.ts";

describe("expandContractions", () => {
  it("expands common contractions and lowercases", () => {
    expect(expandContractions("I've been blocked, it's fine")).toBe("i have been blocked, it is fine");
    expect(expandContractions("I’m still on it")).toBe("i am still on it");
  });
});

describe("tokenizeWords", () => {
  it("drops punctuation and keeps words", () => {
    expect(tokenizeWords("Heads up: this might slip!")).toEqual(["heads", "up", "this", "might", "slip"]);
  });
});

describe("matchTargetPhrases", () => {
  it("finds phrases regardless of contraction form", () => {
    const r = matchTargetPhrases("yesterday i have been working on the pipeline and i am blocked on access", ["I've been working on", "I'm blocked on", "heads up"]);
    expect(r.used).toEqual(["I've been working on", "I'm blocked on"]);
    expect(r.missing).toEqual(["heads up"]);
  });
  it("does not match partial words", () => {
    expect(matchTargetPhrases("we unblocked on time", ["blocked on"]).used).toEqual([]);
  });
});

describe("wordsPerMinute", () => {
  it("scales to 60 seconds and rounds", () => {
    expect(wordsPerMinute(75, 35)).toBe(129);
    expect(wordsPerMinute(10, 0)).toBe(0);
  });
});

describe("wordOverlap", () => {
  it("is 1 for the same sentence, contractions included", () => {
    expect(wordOverlap("we're still waiting on the security team", "We're still waiting on the security team.")).toBe(1);
    expect(wordOverlap("we are still waiting on the security team", "We're still waiting on the security team.")).toBe(1);
  });
  it("counts each target word once and returns 0 for an empty transcript", () => {
    expect(wordOverlap("the deploy failed", "The deploy failed because the token expired.")).toBeCloseTo(3 / 6);
    expect(wordOverlap("", "The deploy failed.")).toBe(0);
  });
});
