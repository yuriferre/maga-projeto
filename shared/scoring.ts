import type { Exercise } from "./schema.ts";
import { expandContractions } from "./speech-compare.ts";

/** Normaliza resposta livre: minúsculas, aspas retas, espaços únicos, sem pontuação final nem aspas nas pontas. */
export function normalizeAnswer(s: string): string {
  return s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^["']+|["']+$/g, "")
    .replace(/[.!?,;:]+$/g, "")
    .trim();
}

export function isAccepted(answer: string, accepted: string[]): boolean {
  const a = normalizeAnswer(expandContractions(answer));
  return accepted.some((x) => normalizeAnswer(expandContractions(x)) === a);
}

export type ExerciseResponse = number | string | string[] | Record<string, string>;
export type CheckResult = { correct: boolean; expected: string; given: string };

export function checkExercise(ex: Exercise, response: ExerciseResponse): CheckResult {
  switch (ex.type) {
    case "multiple_choice": {
      const idx = typeof response === "number" ? response : -1;
      return { correct: idx === ex.answer, expected: ex.options[ex.answer] ?? "", given: ex.options[idx] ?? String(response) };
    }
    case "fill_blank":
    case "error_correction":
    case "translate": {
      const given = typeof response === "string" ? response : "";
      return { correct: isAccepted(given, ex.accepted), expected: ex.accepted[0] ?? "", given };
    }
    case "reorder": {
      const given = Array.isArray(response) ? response.join(" ") : typeof response === "string" ? response : "";
      return { correct: normalizeAnswer(given) === normalizeAnswer(ex.answer), expected: ex.answer, given };
    }
    case "match": {
      const given = response !== null && typeof response === "object" && !Array.isArray(response) ? response : {};
      const correct = ex.pairs.every((p) => given[p.left] === p.right) && Object.keys(given).length === ex.pairs.length;
      return {
        correct,
        expected: ex.pairs.map((p) => `${p.left} → ${p.right}`).join("; "),
        given: Object.entries(given).map(([l, r]) => `${l} → ${r}`).join("; "),
      };
    }
    case "free_text": {
      const given = typeof response === "string" ? response : "";
      const words = given.trim().split(/\s+/).filter(Boolean).length;
      return { correct: words >= (ex.minWords ?? 1), expected: ex.model ?? "", given };
    }
  }
}
