import type { Db } from "./db.ts";
import type { Lesson } from "../shared/schema.ts";
import { latestAttemptsByExercise, latestWriting, countSpeaking, countCards } from "./repo.ts";

export type CompletionStatus = {
  quizPct: number; quizMin: number;
  writingScore: number | null; writingMin: number;
  speakingCount: number; speakingRequired: boolean;
  cardsAdded: boolean;
  met: boolean; missing: string[];
};

export function evaluateCompletion(db: Db, lesson: Lesson): CompletionStatus {
  const latest = latestAttemptsByExercise(db, lesson.id, "quiz");
  const correct = lesson.quiz.filter((q) => latest.get(q.id)?.correct === 1).length;
  const quizPct = lesson.quiz.length === 0 ? 0 : correct / lesson.quiz.length;
  const writingScore = latestWriting(db, lesson.id)?.score ?? null;
  const speakingCount = countSpeaking(db, lesson.id);
  const cardsAdded = countCards(db, lesson.id) >= lesson.srsCards.length;
  const { quizMin, writingMin, speakingRequired } = lesson.completion;

  const missing: string[] = [];
  if (quizPct < quizMin) missing.push(`Quiz: ${Math.round(quizPct * 100)}% (mínimo ${Math.round(quizMin * 100)}%)`);
  if (writingScore === null) missing.push("Escrita não enviada");
  else if (writingScore < writingMin) missing.push(`Escrita: nota ${writingScore} (mínimo ${writingMin})`);
  if (speakingRequired && speakingCount === 0) missing.push("Nenhuma gravação de fala registrada");

  return { quizPct, quizMin, writingScore, writingMin, speakingCount, speakingRequired, cardsAdded, met: missing.length === 0, missing };
}
