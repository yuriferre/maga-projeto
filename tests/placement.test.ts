import { describe, it, expect } from "vitest";
import { loadContent } from "../shared/content-loader.ts";
import { placementExercises } from "../shared/schema.ts";
import { computePlacementResult, missingForFinish, placementWeakTags, suggestLevel, parsePlacementAssessment, type PlacementInputs } from "../server/placement.ts";
import type { AttemptRow, WritingRow, SpeakingRow } from "../server/repo.ts";

const content = loadContent("content");
const p = content.placement;
const all = placementExercises(p);
const T = "2026-09-09T12:00:00.000Z";

let seq = 0;
function attempt(exerciseId: string, correct: boolean, tags: string[], answer = "x"): AttemptRow {
  return { id: ++seq, lesson_id: "placement", exercise_id: exerciseId, block: "placement", type: "multiple_choice", correct: correct ? 1 : 0, answer, score: null, tags_json: JSON.stringify(tags), ts: T };
}
/** Responde todos os itens; `isCorrect` decide item a item. */
function answers(isCorrect: (id: string) => boolean): Map<string, AttemptRow> {
  return new Map(all.map(({ exercise }) => [exercise.id, attempt(exercise.id, isCorrect(exercise.id), exercise.tags)]));
}
const writing = (score: number | null): WritingRow => ({ id: 1, lesson_id: "placement", text: "t", feedback_json: "{}", score, ts: T });
const speaking = (score: number, readAloudPct: number, selfConfidence: number | null): SpeakingRow =>
  ({ id: 1, lesson_id: "placement", mode: "A", transcript: "t", metrics_json: JSON.stringify({ readAloudPct }), score, self_confidence: selfConfidence, ts: T });
const inputs = (o: Partial<PlacementInputs>): PlacementInputs => ({ attempts: new Map(), writing: undefined, speaking: undefined, ...o });

describe("suggestLevel (regra de corte da trilha)", () => {
  it.each<[number, number | null, 1 | 2 | 3]>([
    [0.59, 5, 1], [0.6, 3, 2], [0.6, 2, 1], [0.8, 4, 2], [0.8, 5, 2], [0.81, 4, 3], [0.81, 3, 2], [1, 5, 3], [0.9, null, 1],
  ])("pct %s + escrita %s → nível %s", (pct, w, level) => {
    expect(suggestLevel(pct, w)).toBe(level);
  });
});

describe("computePlacementResult", () => {
  it("scores blocks from the latest attempt per exercise and builds radar, weak tags and items", () => {
    const att = answers((id) => !id.startsWith("PL-l")); // erra só a escuta
    const r = computePlacementResult(p, inputs({ attempts: att, writing: writing(4), speaking: speaking(3.5, 0.8, 4) }), T);
    expect(r.version).toBe(1);
    expect(r.itemCount).toBe(38);
    expect(r.correct).toBe(32);
    expect(r.pct).toBeCloseTo(32 / 38);
    expect(r.blocks.listening).toEqual({ correct: 0, total: 6, pct: 0 });
    expect(r.blocks.reading).toEqual({ correct: 12, total: 12, pct: 1 });
    expect(r.level).toBe(3);
    expect(r.writingScore).toBe(4);
    expect(r.speaking).toEqual({ score: 3.5, readAloudPct: 0.8, selfConfidence: 4 });
    expect(r.radar).toEqual({ REA: 1, VOC: 1, LIS: 0, WRI: 0.8, SPK: 0.7, PRO: 0.8, CNF: 0.8 });
    expect(r.weakTags).toContain("comp.listening");
    expect(r.weakTags).not.toContain("comp.reading");
    expect(r.items).toHaveLength(38);
    expect(r.items.find((i) => i.id === "PL-l01")).toEqual({ id: "PL-l01", block: "listening", correct: false, answer: "x" });
    expect(r.finishedAt).toBe(T);
  });
  it("leaves the PRO axis null when metrics_json has no readAloudPct", () => {
    const row: SpeakingRow = { id: 1, lesson_id: "placement", mode: "A", transcript: "t", metrics_json: "{}", score: 3, self_confidence: null, ts: T };
    const r = computePlacementResult(p, inputs({ attempts: answers(() => true), writing: writing(3), speaking: row }), T);
    expect(r.speaking?.readAloudPct).toBeNull();
    expect(r.radar.PRO).toBeNull();
    expect(r.radar.SPK).toBeCloseTo(0.6);
    expect(r.radar.CNF).toBeNull();
  });
  it("leaves speaking axes null without a speaking session and applies the writing floor", () => {
    const r = computePlacementResult(p, inputs({ attempts: answers(() => true), writing: writing(3) }), T);
    expect(r.speaking).toBeNull();
    expect(r.radar.SPK).toBeNull();
    expect(r.radar.PRO).toBeNull();
    expect(r.radar.CNF).toBeNull();
    expect(r.level).toBe(2);
  });
});

describe("placementWeakTags", () => {
  it("returns tags with error rate ≥ 50%, most errors first, ties alphabetical", () => {
    const rows = [
      attempt("a", false, ["gram.since-for", "br.doubt"]), attempt("b", false, ["gram.since-for"]),
      attempt("c", true, ["br.doubt"]), attempt("d", true, ["gram.by-until"]), attempt("e", true, ["br.doubt"]),
      attempt("f", false, ["br.until-by"]), attempt("g", false, ["br.actually"]),
    ];
    expect(placementWeakTags(rows)).toEqual(["gram.since-for", "br.actually", "br.until-by"]);
  });
});

describe("missingForFinish", () => {
  it("lists unanswered exercises and a writing without self score", () => {
    const att = answers(() => true);
    att.delete("PL-g05");
    expect(missingForFinish(p, inputs({ attempts: att, writing: writing(null) }))).toEqual({ exercises: ["PL-g05"], writing: true });
    expect(missingForFinish(p, inputs({ attempts: answers(() => true), writing: writing(3) }))).toEqual({ exercises: [], writing: false });
    expect(missingForFinish(p, inputs({ attempts: answers(() => true) })).writing).toBe(true);
  });
});

describe("parsePlacementAssessment", () => {
  it("parses score_json into result", () => {
    const parsed = parsePlacementAssessment({ id: 7, kind: "placement", ref: "placement", score_json: JSON.stringify({ level: 2, pct: 0.7 }), ts: T });
    expect(parsed).toMatchObject({ id: 7, ts: T, result: { level: 2, pct: 0.7 } });
  });
});
